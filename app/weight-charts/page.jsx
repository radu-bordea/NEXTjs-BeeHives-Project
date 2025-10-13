"use client";

/**
 * WeightChartsPage
 * -------------------------------------------------------
 * Compare "weight" across multiple beehive scales.
 *
 * KEY IDEAS:
 * - We fetch /api/scales to list all scales.
 * - User picks a date range + resolution (daily/hourly).
 * - For each selected scale, we fetch /api/scale-data/[scaleId].
 * - We normalize timestamps into "buckets" (hour or day) so
 *   multiple series align on the same X-axis points.
 * - Two views:
 *     1) Overlay: one chart with multiple lines (one per scale)
 *     2) Small multiples: a mini-chart per scale
 *
 * Perf notes:
 * - Basic in-memory cache (cacheRef) avoids re-fetching the same
 *   selection/time/resolution combo while the page is open.
 */

import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";
import Spinner from "../components/Spinner";
import SpinnerSmall from "../components/SpinnerSmall";

/* =========================================================
   Small UI helper: custom DatePicker trigger button
   - forwardRef so DatePicker can focus the underlying button
   - purely presentational
========================================================= */
const CustomInputButton = forwardRef(function CustomInputButton(
  { value, onClick },
  ref
) {
  return (
    <button
      onClick={onClick}
      ref={ref}
      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-xl shadow transition text-xs sm:text-sm cursor-pointer"
    >
      📅 <span>{value || "Choose date"}</span>
    </button>
  );
});

/* =========================================================
   Colors & formatting helpers
   - colorFor: deterministic color per scale (stable legend)
   - toIsoNoMs: nicer ISO string (remove milliseconds)
   - formatDateTick: x-axis tick text (hourly vs daily)
   - formatNum: round numbers to 2 decimals for UI
========================================================= */
const COLORS = [
  "#1e88e5", // blue
  "#fb8c00", // orange
  "#43a047", // green
  "#e53935", // red
  "#8e24aa", // purple
  "#00acc1", // cyan
  "#7cb342", // lime green
  "#f4511e", // deep orange
  "#5e35b1", // indigo
  "#00897b", // teal
  "#6d4c41", // brown
  "#3949ab", // blue indigo
  "#c0ca33", // yellow-green
  "#5c6bc0", // soft blue
  "#0097a7", // cyan teal
  "#d81b60", // pink
  "#757575", // grey
  "#9ccc65", // light green
  "#ffb300", // amber
  "#8d6e63", // warm brown
];


// Deterministic color by scale id/name (hash → palette index)
function colorFor(key) {
  const n =
    Math.abs([...String(key)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) %
    COLORS.length;
  return COLORS[n];
}

function toIsoNoMs(dateLike) {
  try {
    return new Date(dateLike).toISOString().replace(/\.\d{3}Z$/, "Z");
  } catch {
    return "";
  }
}

function formatDateTick(iso, resolution) {
  const d = new Date(iso);
  return resolution === "hourly"
    ? d.toLocaleString(undefined, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleDateString(undefined, {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      });
}

function formatNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return (Math.round(v * 100) / 100).toFixed(2);
}

/* =========================================================
   Time bucketing
   WHY: Real data timestamps rarely line up perfectly. To compare
   lines on the same X axis, we "bucket" timestamps:
   - hourly → round down to the start of the hour (UTC)
   - daily  → round down to midnight (UTC)
   NOTE: We use UTC here for deterministic bucketing across environments.
========================================================= */
function normalizeTimeBucket(iso, resolution) {
  const d = new Date(iso);
  if (resolution === "hourly") {
    d.setUTCMinutes(0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return toIsoNoMs(d.toISOString());
}

/* =========================================================
   mergeToOverlay(datasetMap, resolution)
   INPUT:
   - datasetMap: { [scaleId]: Array<Row> }, where Row has at least { time, weight? }
   - resolution: "hourly" | "daily"
   OUTPUT:
   - Array of rows: [{ time, "<scaleIdA>": 12.3, "<scaleIdB>": 13.1, ... }]
   PURPOSE:
   - Build a single dataset keyed by time bucket so Recharts can
     render multiple <Line dataKey=scaleId> series on one chart.
   - Handles different field casings (weight/Weight/WEIGHT).
========================================================= */
function mergeToOverlay(datasetMap, resolution) {
  const bucketMap = new Map();

  for (const [scaleKey, rows] of Object.entries(datasetMap)) {
    for (const r of rows) {
      // 1) Choose the bucket for this row (aligns across scales)
      const bucket = normalizeTimeBucket(r.time, resolution);

      // 2) Either start a new row or build on the existing row at that time
      const existing = bucketMap.get(bucket) || { time: bucket };

      // 3) Extract weight; tolerate different casings & a 'value' fallback
      const w =
        r.weight ??
        r.Weight ??
        r.WEIGHT ??
        (typeof r.value === "number" ? r.value : undefined);

      // 4) Only keep numeric values (skip missing or bad data)
      if (typeof w === "number" && Number.isFinite(w)) {
        existing[scaleKey] = w;
      }

      bucketMap.set(bucket, existing);
    }
  }

  // 5) Convert map → sorted array (ascending by time)
  return [...bucketMap.values()].sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );
}

/* =========================================================
   Main page component
========================================================= */
export default function WeightChartsPage() {
  // ----------- Core state (UI + data) -----------
  const [scales, setScales] = useState([]); // from /api/scales
  const [search, setSearch] = useState(""); // filter string for the picker
  const [selectedIds, setSelectedIds] = useState([]); // which scales are selected
  const [resolution, setResolution] = useState("daily"); // daily | hourly
  const [viewMode, setViewMode] = useState("overlay"); // overlay | smallmult

  // Date range controls (default last 14 days → "quick to good")
  const now = () => new Date();
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };
  const [startDate, setStartDate] = useState(addDays(now(), -14));
  const [endDate, setEndDate] = useState(now());

  // Network/UI flags
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Small in-memory cache to avoid re-fetching same params during the session
  // key shape: `${scaleId}|${resolution}|${startISO}|${endISO}`
  const cacheRef = useRef(new Map());

  // ----------- 1) Load the available scales once -----------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scales");
        const json = await res.json();
        const list = Array.isArray(json.scales) ? json.scales : [];
        setScales(list);

        // UX: preselect a few so the first render shows lines immediately
        setSelectedIds((prev) =>
          prev.length ? prev : list.slice(0, 3).map((s) => String(s.scale_id))
        );
      } catch (e) {
        console.error(e);
        setError("Failed to load scales.");
      }
    })();
  }, []);

  // ----------- Derived: filter scales by search -----------
  const filteredScales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scales;
    return scales.filter((s) => {
      const a = (s.name || "").toLowerCase();
      const b = String(s.scale_id).toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [search, scales]);

  // ----------- 2) Fetch data for the selected scales -----------
  // dataByScale shape: { [scaleId]: Array<Row> }
  const [dataByScale, setDataByScale] = useState({});

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      // If nothing is selected, clear data and bail
      if (!selectedIds.length) {
        setDataByScale({});
        return;
      }

      setLoading(true);
      setError("");

      // These two values define the "window" we’ll request from the API
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      try {
        // Fetch all selected series in parallel (Promise.all)
        const results = await Promise.all(
          selectedIds.map(async (scaleId) => {
            const key = `${scaleId}|${resolution}|${startISO}|${endISO}`;

            // 1) Return cached rows if we already fetched this exact window
            if (cacheRef.current.has(key)) {
              return { scaleId, rows: cacheRef.current.get(key) };
            }

            // 2) Otherwise fetch from your API
            const url = `/api/scale-data/${encodeURIComponent(
              scaleId
            )}?resolution=${encodeURIComponent(
              resolution
            )}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(
              endISO
            )}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch error ${res.status}`);

            const rows = await res.json();

            // 3) Cache the raw rows for this exact key
            cacheRef.current.set(key, rows);
            return { scaleId, rows };
          })
        );

        // 4) When all come back, sanitize/normalize into dataByScale
        if (!isCancelled) {
          const next = {};
          for (const { scaleId, rows } of results) {
            // We only keep rows with numeric weight (skip corrupted/empty)
            next[String(scaleId)] = (rows || []).filter((r) => {
              const w = r?.weight ?? r?.Weight ?? r?.WEIGHT;
              return typeof w === "number" && Number.isFinite(w);
            });
          }
          setDataByScale(next);
        }
      } catch (e) {
        console.error(e);
        if (!isCancelled) setError("Failed to load scale data.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    // Cleanup: if dependencies change quickly, ignore outdated results
    return () => {
      isCancelled = true;
    };
  }, [selectedIds, resolution, startDate, endDate]);

  // ----------- 3) Build overlay dataset & series keys -----------
  // overlayData: [{ time, "<scaleIdA>": 12.3, "<scaleIdB>": 13.1, ... }]
  const overlayData = useMemo(() => {
    return mergeToOverlay(dataByScale, resolution);
  }, [dataByScale, resolution]);

  // overlaySeriesKeys: ["<scaleIdA>", "<scaleIdB>", ...]
  // (Recharts needs to know which <Line dataKey> to render)
  const overlaySeriesKeys = useMemo(() => {
    const keys = new Set();
    for (const row of overlayData) {
      for (const k of Object.keys(row)) {
        if (k !== "time") keys.add(k);
      }
    }
    return [...keys];
  }, [overlayData]);

  // ----------- 4) Build data for small multiples -----------
  // An array like: [{ id, name, rows: [{time, weight}, ...] }, ...]
  const smallMultiples = useMemo(() => {
    return selectedIds
      .map((id) => ({
        id,
        name:
          scales.find((s) => String(s.scale_id) === String(id))?.name ||
          `ID: ${id}`,
        rows: dataByScale[String(id)] || [],
      }))
      .filter((s) => s.rows.length > 0);
  }, [selectedIds, dataByScale, scales]);

  // ----------- UI actions -----------
  const selectAll = () =>
    setSelectedIds(filteredScales.map((s) => String(s.scale_id)));
  const clearAll = () => setSelectedIds([]);
  const toggleId = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const setQuickRange = (days) => {
    const n = now();
    setStartDate(addDays(n, -days));
    setEndDate(n);
  };

  /* =========================================================
     Render
     - Controls (selector, date range, resolution, view)
     - Error/loading states
     - Chart area (overlay OR small multiples)
  ========================================================= */
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">⚖️ Weight Charts — Compare Scales</h1>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/scales"
            className="px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ← Back to Scales
          </Link>
        </div>
      </div>

      {/* Controls grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* A) Scale selector (search + list + actions) */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Select Scales</span>
            <span className="text-xs text-gray-500">
              {selectedIds.length} selected
            </span>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or id..."
            className="w-full text-sm px-2 py-1 mb-2 rounded border bg-white dark:bg-black dark:text-white"
          />

          <div className="flex gap-2 mb-2">
            <button
              onClick={selectAll}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              Select All (filtered)
            </button>
            <button
              onClick={clearAll}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Fixed-height scrollable list (same visual size as before) */}
          <div className="h-40 overflow-y-auto pr-2 space-y-1">
            {filteredScales.map((s) => {
              const id = String(s.scale_id);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center justify-between gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <span className="truncate">
                    {s.name || `ID: ${id}`}{" "}
                    <span className="text-xs text-gray-500">({id})</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(id)}
                    className="accent-blue-600"
                  />
                </label>
              );
            })}
            {!filteredScales.length && (
              <div className="text-xs text-gray-500">No matches</div>
            )}
          </div>
        </div>

        {/* B) Time range & resolution */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">Time Range</div>
          <div className="flex flex-wrap gap-2">
            <DatePicker
              selected={startDate}
              onChange={(d) => setStartDate(d)}
              showTimeSelect={resolution === "hourly"}
              dateFormat={
                resolution === "hourly" ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy"
              }
              customInput={<CustomInputButton />}
              maxDate={endDate}
            />
            <DatePicker
              selected={endDate}
              onChange={(d) => setEndDate(d)}
              showTimeSelect={resolution === "hourly"}
              dateFormat={
                resolution === "hourly" ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy"
              }
              customInput={<CustomInputButton />}
              minDate={startDate}
              maxDate={now()}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setQuickRange(7)}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              Last 90 days
            </button>
          </div>

          <div className="mt-2">
            <div className="font-semibold text-sm mb-1">Resolution</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResolution("daily")}
                className={`px-2 py-1 text-xs rounded cursor-pointer ${
                  resolution === "daily"
                    ? "bg-green-700 text-white hover:bg-green-800"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setResolution("hourly")}
                className={`px-2 py-1 text-xs rounded cursor-pointer ${
                  resolution === "hourly"
                    ? "bg-blue-700 text-white hover:bg-blue-800"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Hourly
              </button>
            </div>
          </div>
        </div>

        {/* C) View mode toggle */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">View</div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="viewmode"
              className="accent-blue-600"
              checked={viewMode === "overlay"}
              onChange={() => setViewMode("overlay")}
            />
            Overlay (one chart, many lines)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="viewmode"
              className="accent-blue-600"
              checked={viewMode === "smallmult"}
              onChange={() => setViewMode("smallmult")}
            />
            Small multiples (one per scale)
          </label>

          <div className="text-xs text-gray-500">
            Tip: Overlay is great for quick comparison; small multiples help
            when lines overlap heavily.
          </div>
        </div>

        {/* D) Legend preview (color chips) */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">Legend</div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => {
              const name =
                scales.find((s) => String(s.scale_id) === String(id))?.name ||
                `ID: ${id}`;
              const color = colorFor(id);
              return (
                <span
                  key={id}
                  className="px-2 py-1 text-xs rounded border"
                  style={{ borderColor: color, color }}
                  title={name}
                >
                  ● {name}
                </span>
              );
            })}
            {!selectedIds.length && (
              <span className="text-xs text-gray-500">No scales selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Error / Loading */}
      {error && <div className="text-red-500 text-sm">❌ {error}</div>}
      {loading && (
        <div className="text-gray-500 text-sm">
          <SpinnerSmall mt="mt-36" mx="mx-auto" w="w-48" h="h-48" border="border-blue-600" />
        </div>
      )}

      {/* Charts area */}
      {!loading && selectedIds.length > 0 && (
        <>
          {/* Overlay view: one chart, many lines */}
          {viewMode === "overlay" ? (
            <div className="w-full h-[420px] md:h-[540px] rounded-xl border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overlayData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v) => formatDateTick(v, resolution)}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={["dataMin - 5", "dataMax + 5"]} // adds ±0.5 kg
                    tickFormatter={(v) =>
                      typeof v === "number" ? `${formatNum(v)}` : ""
                    }
                    label={{
                      value: "Weight (kg)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleString()}
                    formatter={(value, key) => {
                      // 'key' is the scaleId here; show a friendly name
                      const s =
                        scales.find(
                          (sc) => String(sc.scale_id) === String(key)
                        ) || {};
                      const label = s.name || `ID: ${key}`;
                      return [`${formatNum(value)} kg`, label];
                    }}
                  />
                  <Legend
                    formatter={(key) => {
                      const s =
                        scales.find(
                          (sc) => String(sc.scale_id) === String(key)
                        ) || {};
                      return s.name || `ID: ${key}`;
                    }}
                  />

                  {/* One <Line> per selected series key */}
                  {overlaySeriesKeys.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colorFor(key)}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            // Small multiples view: one mini chart per scale
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {smallMultiples.map(({ id, name, rows }) => {
                // build & sort the series for this scale
                const series = rows
                  .map((r) => ({
                    time: toIsoNoMs(r.time),
                    weight: r.weight ?? r.Weight ?? r.WEIGHT,
                  }))
                  .sort((a, b) => new Date(a.time) - new Date(b.time));

                // compute dynamic Y padding (10% of span; minimum 0.5)
                const vals = series
                  .map((d) => d.weight)
                  .filter((v) => typeof v === "number" && Number.isFinite(v));
                const yMin = vals.length ? Math.min(...vals) : 0;
                const yMax = vals.length ? Math.max(...vals) : 1;
                const span = Math.max(yMax - yMin, 0.0001);
                const pad = Math.max(span * 0.1, 0.5); // 10% or at least 0.5 kg

                return (
                  <div key={id} className="rounded-xl border p-2">
                    <div className="text-sm font-semibold mb-1">{name}</div>
                    <div className="w-full h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            strokeOpacity={0.4}
                          />
                          <XAxis
                            dataKey="time"
                            tickFormatter={(v) => formatDateTick(v, resolution)}
                            minTickGap={20}
                          />
                          <YAxis
                            domain={[yMin - pad, yMax + pad]} // add top/bottom air
                            tickFormatter={(v) =>
                              typeof v === "number" ? `${formatNum(v)}` : ""
                            }
                          />
                          <Tooltip
                            labelFormatter={(v) => new Date(v).toLocaleString()}
                            formatter={(value) => [
                              `${formatNum(value)} kg`,
                              "Weight",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke={colorFor(id)}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}

              {!smallMultiples.length && (
                <div className="text-sm text-gray-500">
                  No data in selected window.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state when nothing selected */}
      {!loading && selectedIds.length === 0 && (
        <div className="text-sm text-gray-500">
          Select at least one scale to display charts.
        </div>
      )}
    </div>
  );
}
