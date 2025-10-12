"use client";

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

// ---------- Small UI helpers ----------
const CustomInputButton = forwardRef(function CustomInputButton(
  { value, onClick },
  ref
) {
  return (
    <button
      onClick={onClick}
      ref={ref}
      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-xl shadow transition text-xs sm:text-sm"
    >
      📅 <span>{value || "Choose date"}</span>
    </button>
  );
});

const COLORS = [
  "#1e88e5",
  "#fb8c00",
  "#43a047",
  "#e53935",
  "#8e24aa",
  "#00acc1",
  "#7cb342",
  "#f4511e",
  "#5e35b1",
  "#00897b",
  "#6d4c41",
  "#3949ab",
  "#c0ca33",
  "#5c6bc0",
  "#0097a7",
];

// deterministic color by scale id/name
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

// Normalize timestamps so different scales align on the same x points.
// For "daily" -> truncate to midnight UTC; for "hourly" -> truncate to the hour.
function normalizeTimeBucket(iso, resolution) {
  const d = new Date(iso);
  if (resolution === "hourly") {
    d.setUTCMinutes(0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return toIsoNoMs(d.toISOString());
}

// Merge multiple series into a single array keyed by time bucket.
// Each selected scale contributes a column `${scaleKey}` (weight only).
function mergeToOverlay(datasetMap, resolution) {
  const bucketMap = new Map();
  for (const [scaleKey, rows] of Object.entries(datasetMap)) {
    for (const r of rows) {
      const bucket = normalizeTimeBucket(r.time, resolution);
      const existing = bucketMap.get(bucket) || { time: bucket };
      // prefer "weight" field; if not present, try 'Weight' or lower-case variants
      const w =
        r.weight ??
        r.Weight ??
        r.WEIGHT ??
        (typeof r.value === "number" ? r.value : undefined);
      if (typeof w === "number" && Number.isFinite(w)) {
        existing[scaleKey] = w;
      }
      bucketMap.set(bucket, existing);
    }
  }
  // sort by time ascending
  return [...bucketMap.values()].sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );
}

export default function WeightChartsPage() {
  // -------------------- State --------------------
  const [scales, setScales] = useState([]); // {scale_id, name, ...}
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]); // array of scale_id strings
  const [resolution, setResolution] = useState("daily"); // 'daily' | 'hourly'
  const [viewMode, setViewMode] = useState("overlay"); // 'overlay' | 'smallmult'

  const now = () => new Date();
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };
  const [startDate, setStartDate] = useState(addDays(now(), -14));
  const [endDate, setEndDate] = useState(now());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // cache data to avoid refetch if parameters are unchanged
  // key: `${scaleId}|${resolution}|${startISO}|${endISO}`
  const cacheRef = useRef(new Map());

  // -------------------- Fetch scales list --------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scales");
        const json = await res.json();
        const list = Array.isArray(json.scales) ? json.scales : [];
        setScales(list);
        // preselect up to 3 scales for a quick start
        setSelectedIds((prev) =>
          prev.length ? prev : list.slice(0, 3).map((s) => String(s.scale_id))
        );
      } catch (e) {
        console.error(e);
        setError("Failed to load scales.");
      }
    })();
  }, []);

  // Filtered list by search
  const filteredScales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scales;
    return scales.filter((s) => {
      const a = (s.name || "").toLowerCase();
      const b = String(s.scale_id).toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [search, scales]);

  // -------------------- Fetch data for selected scales --------------------
  const [dataByScale, setDataByScale] = useState({}); // { [scaleKey]: [{time, weight,...}] }

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      if (!selectedIds.length) {
        setDataByScale({});
        return;
      }
      setLoading(true);
      setError("");

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      try {
        const results = await Promise.all(
          selectedIds.map(async (scaleId) => {
            const key = `${scaleId}|${resolution}|${startISO}|${endISO}`;
            if (cacheRef.current.has(key)) {
              return { scaleId, rows: cacheRef.current.get(key) };
            }
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
            cacheRef.current.set(key, rows);
            return { scaleId, rows };
          })
        );

        if (!isCancelled) {
          const next = {};
          for (const { scaleId, rows } of results) {
            // keep only rows with a numeric weight
            next[String(scaleId)] = (rows || []).filter(
              (r) =>
                typeof (r?.weight ?? r?.Weight ?? r?.WEIGHT) === "number" &&
                Number.isFinite(r.weight ?? r.Weight ?? r.WEIGHT)
            );
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

    return () => {
      isCancelled = true;
    };
  }, [selectedIds, resolution, startDate, endDate]);

  // -------------------- Derived data for charts --------------------
  // Overlay: single dataset with columns per scale.
  const overlayData = useMemo(() => {
    return mergeToOverlay(dataByScale, resolution);
  }, [dataByScale, resolution]);

  // Identify series keys present in overlayData (the selected scales that have any points)
  const overlaySeriesKeys = useMemo(() => {
    const keys = new Set();
    for (const row of overlayData) {
      for (const k of Object.keys(row)) {
        if (k !== "time") keys.add(k);
      }
    }
    return [...keys];
  }, [overlayData]);

  // Small multiples: keep each selected scale’s raw rows (already filtered to weight)
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

  // -------------------- UI actions --------------------
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

  // -------------------- Render --------------------
  return (
    <div className="p-4 space-y-4">
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

      {/* Controls row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Scale selector */}
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
              className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Select All (filtered)
            </button>
            <button
              onClick={clearAll}
              className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Clear
            </button>
          </div>

          <div className="max-h-60 overflow-auto pr-1 space-y-1">
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

        {/* Time & resolution */}
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
              className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Last 7 days
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Last 30 days
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
            >
              Last 90 days
            </button>
          </div>

          <div className="mt-2">
            <div className="font-semibold text-sm mb-1">Resolution</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResolution("daily")}
                className={`px-2 py-1 text-xs rounded ${
                  resolution === "daily"
                    ? "bg-green-700 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setResolution("hourly")}
                className={`px-2 py-1 text-xs rounded ${
                  resolution === "hourly"
                    ? "bg-blue-700 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Hourly
              </button>
            </div>
          </div>
        </div>

        {/* View mode */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">View</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="viewmode"
              className="accent-blue-600"
              checked={viewMode === "overlay"}
              onChange={() => setViewMode("overlay")}
            />
            Overlay (one chart, many lines)
          </label>
          <label className="flex items-center gap-2 text-sm">
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
            Tip: Overlay is great for quick comparison; small multiples help when lines overlap heavily.
          </div>
        </div>

        {/* Legend preview (colors per selected scale) */}
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
      {error && (
        <div className="text-red-500 text-sm">
          ❌ {error}
        </div>
      )}
      {loading && (
        <div className="text-gray-500 text-sm">Loading data…</div>
      )}

      {/* Charts */}
      {!loading && selectedIds.length > 0 && (
        <>
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
                    tickFormatter={(v) => (typeof v === "number" ? `${formatNum(v)}` : "")}
                    label={{ value: "Weight (kg)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    labelFormatter={(v) =>
                      new Date(v).toLocaleString()
                    }
                    formatter={(value, key) => {
                      // key is the scaleId; show scale name
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
            // Small multiples
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {smallMultiples.map(({ id, name, rows }) => (
                <div key={id} className="rounded-xl border p-2">
                  <div className="text-sm font-semibold mb-1">{name}</div>
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={rows
                          .map((r) => ({
                            time: toIsoNoMs(r.time),
                            weight: r.weight ?? r.Weight ?? r.WEIGHT,
                          }))
                          .sort(
                            (a, b) => new Date(a.time) - new Date(b.time)
                          )}
                      >
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                        <XAxis
                          dataKey="time"
                          tickFormatter={(v) => formatDateTick(v, resolution)}
                          minTickGap={20}
                        />
                        <YAxis
                          tickFormatter={(v) =>
                            typeof v === "number" ? `${formatNum(v)}` : ""
                          }
                        />
                        <Tooltip
                          labelFormatter={(v) =>
                            new Date(v).toLocaleString()
                          }
                          formatter={(value) => [`${formatNum(value)} kg`, "Weight"]}
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
              ))}
              {!smallMultiples.length && (
                <div className="text-sm text-gray-500">
                  No data in selected window.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && selectedIds.length === 0 && (
        <div className="text-sm text-gray-500">
          Select at least one scale to display charts.
        </div>
      )}
    </div>
  );
}
