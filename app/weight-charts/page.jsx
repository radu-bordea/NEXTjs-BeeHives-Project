"use client";

/**
 * WeightChartsPage (i18n)
 * Compare "weight" across multiple beehive scales.
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
import SpinnerSmall from "../components/SpinnerSmall";
import * as htmlToImage from "html-to-image";
import { useLang } from "../components/LanguageProvider"; // ⬅️ i18n

/* ====================== UI helpers ====================== */
const CustomInputButton = forwardRef(function CustomInputButton(
  { value, onClick },
  ref
) {
  const { t } = useLang();
  return (
    <button
      onClick={onClick}
      ref={ref}
      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-xl shadow transition text-xs sm:text-sm cursor-pointer"
    >
      📅 <span>{value || t("weightCharts.datepicker.choose")}</span>
    </button>
  );
});

/* ====================== Colors & format ====================== */
const COLORS = [
  "#1e88e5","#fb8c00","#43a047","#e53935","#8e24aa",
  "#00acc1","#7cb342","#f4511e","#5e35b1","#00897b",
  "#6d4c41","#3949ab","#c0ca33","#5c6bc0","#0097a7",
  "#d81b60","#757575","#9ccc65","#ffb300","#8d6e63",
];

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
function formatNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return (Math.round(v * 100) / 100).toFixed(2);
}

/* ====================== Time helpers ====================== */
function normalizeTimeBucket(iso, resolution) {
  const d = new Date(iso);
  if (resolution === "hourly") {
    d.setUTCMinutes(0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return toIsoNoMs(d.toISOString());
}

/* ====================== Merge to overlay ====================== */
function mergeToOverlay(datasetMap, resolution) {
  const bucketMap = new Map();
  for (const [scaleKey, rows] of Object.entries(datasetMap)) {
    for (const r of rows) {
      const bucket = normalizeTimeBucket(r.time, resolution);
      const existing = bucketMap.get(bucket) || { time: bucket };
      const w =
        r?.weight ?? r?.Weight ?? r?.WEIGHT ??
        (typeof r?.value === "number" ? r.value : undefined);
      if (typeof w === "number" && Number.isFinite(w)) {
        existing[scaleKey] = w;
      }
      bucketMap.set(bucket, existing);
    }
  }
  return [...bucketMap.values()].sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );
}

/* ====================== Page ====================== */
export default function WeightChartsPage() {
  const { t, lang } = useLang(); // ⬅️ translations + locale
  const locale = lang === "sv" ? "sv-SE" : "en-US";

  // Core state
  const [scales, setScales] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [resolution, setResolution] = useState("daily"); // daily | hourly
  const [viewMode, setViewMode] = useState("overlay"); // overlay | smallmult
  const captureRef = useRef(null);

  // Date range
  const now = () => new Date();
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const [startDate, setStartDate] = useState(addDays(now(), -14));
  const [endDate, setEndDate] = useState(now());

  // Network / cache
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cacheRef = useRef(new Map());

  // Load scales once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scales");
        const json = await res.json();
        const list = Array.isArray(json.scales) ? json.scales : [];
        setScales(list);
        setSelectedIds((prev) =>
          prev.length ? prev : list.slice(0, 3).map((s) => String(s.scale_id))
        );
      } catch (e) {
        console.error(e);
        setError(t("weightCharts.errors.loadScales"));
      }
    })();
  }, [t]);

  // Filter
  const filteredScales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scales;
    return scales.filter((s) => {
      const a = (s.name || "").toLowerCase();
      const b = String(s.scale_id).toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [search, scales]);

  // Fetch data for selected
  const [dataByScale, setDataByScale] = useState({});
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
            next[String(scaleId)] = (rows || []).filter((r) => {
              const w = r?.weight ?? r?.Weight ?? r?.WEIGHT;
              return typeof w === "number" && Number.isFinite(w);
            });
          }
          setDataByScale(next);
        }
      } catch (e) {
        console.error(e);
        if (!isCancelled) setError(t("weightCharts.errors.loadData"));
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [selectedIds, resolution, startDate, endDate, t]);

  // Overlay dataset & series keys
  const overlayData = useMemo(
    () => mergeToOverlay(dataByScale, resolution),
    [dataByScale, resolution]
  );
  const overlaySeriesKeys = useMemo(() => {
    const keys = new Set();
    for (const row of overlayData) {
      for (const k of Object.keys(row)) if (k !== "time") keys.add(k);
    }
    return [...keys];
  }, [overlayData]);

  // Small multiples
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

  // UI actions
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

  const handleScreenshot = async () => {
    if (!captureRef.current) return;
    try {
      const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "weight-screenshot.png";
      link.click();
    } catch (err) {
      console.error("❌ Screenshot failed:", err);
      alert(t("weightCharts.errors.screenshot"));
    }
  };

  // Locale-aware tick formatter
  const formatDateTick = (iso, res) => {
    const d = new Date(iso);
    return res === "hourly"
      ? d.toLocaleString(locale, {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : d.toLocaleDateString(locale, {
          year: "2-digit",
          month: "2-digit",
          day: "2-digit",
        });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">{t("weightCharts.title")}</h1>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/scales"
            className="px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ← {t("weightCharts.back")}
          </Link>
        </div>
      </div>

      {/* Controls grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* A) Selector */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">{t("weightCharts.select")}</span>
            <span className="text-xs text-gray-500">
              {selectedIds.length} {t("weightCharts.selected")}
            </span>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("weightCharts.searchPlaceholder")}
            className="w-full text-sm px-2 py-1 mb-2 rounded border"
          />

          <div className="flex gap-2 mb-2">
            <button
              onClick={selectAll}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              {t("weightCharts.selectAll")}
            </button>
            <button
              onClick={clearAll}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              {t("weightCharts.clear")}
            </button>
          </div>

          <div className="h-40 overflow-y-auto pr-2 space-y-1">
            {filteredScales.map((s) => {
              const id = String(s.scale_id);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center justify-between gap-2 text-sm px-2 py-1 rounded hover:bg-neutral-500 hover:text-neutral-200 cursor-pointer"
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
              <div className="text-xs text-gray-500">
                {t("weightCharts.noMatches")}
              </div>
            )}
          </div>
        </div>

        {/* B) Time & resolution */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">{t("weightCharts.timeRange")}</div>
          <div className="flex flex-wrap gap-2">
            <DatePicker
              selected={startDate}
              onChange={(d) => setStartDate(d)}
              showTimeSelect={resolution === "hourly"}
              dateFormat={resolution === "hourly" ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy"}
              customInput={<CustomInputButton />}
              maxDate={endDate}
            />
            <DatePicker
              selected={endDate}
              onChange={(d) => setEndDate(d)}
              showTimeSelect={resolution === "hourly"}
              dateFormat={resolution === "hourly" ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy"}
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
              {t("chart.quick.last7")}
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              {t("chart.quick.last30")}
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
            >
              {t("weightCharts.quick.last90")}
            </button>
          </div>

          <div className="mt-2">
            <div className="font-semibold text-sm mb-1">{t("weightCharts.resolution")}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResolution("daily")}
                className={`px-2 py-1 text-xs rounded cursor-pointer ${
                  resolution === "daily"
                    ? "bg-green-700 text-white hover:bg-green-800"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("resolution.daily")}
              </button>
              <button
                onClick={() => setResolution("hourly")}
                className={`px-2 py-1 text-xs rounded cursor-pointer ${
                  resolution === "hourly"
                    ? "bg-blue-700 text-white hover:bg-blue-800"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("resolution.hourly")}
              </button>
            </div>
          </div>
        </div>

        {/* C) View mode */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">{t("weightCharts.view")}</div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="viewmode"
              className="accent-blue-600"
              checked={viewMode === "overlay"}
              onChange={() => setViewMode("overlay")}
            />
            {t("weightCharts.view.overlay")}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="viewmode"
              className="accent-blue-600"
              checked={viewMode === "smallmult"}
              onChange={() => setViewMode("smallmult")}
            />
            {t("weightCharts.view.smallmult")}
          </label>

          <div className="text-xs text-gray-500">
            {t("weightCharts.tip")}
          </div>
        </div>

        {/* D) Legend */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="font-semibold text-sm">{t("weightCharts.legend")}</div>
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
              <span className="text-xs text-gray-500">
                {t("weightCharts.noSelected")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error / Loading */}
      {error && <div className="text-red-500 text-sm">❌ {error}</div>}
      {loading && (
        <div className="text-gray-500 text-sm">
          <SpinnerSmall
            mt="mt-36"
            mx="mx-auto"
            w="w-48"
            h="h-48"
            border="border-blue-600"
          />
        </div>
      )}

      {/* Charts */}
      {!loading && selectedIds.length > 0 && (
        <>
          {viewMode === "overlay" ? (
            <div
              ref={captureRef}
              className="w-full h-[420px] md:h-[540px] rounded-xl border p-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overlayData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v) => formatDateTick(v, resolution)}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={["dataMin - 5", "dataMax + 5"]}
                    tickFormatter={(v) =>
                      typeof v === "number" ? `${formatNum(v)}` : ""
                    }
                    label={{
                      value: t("metric.weight"), // localized axis label
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleString(locale)}
                    formatter={(value, key) => {
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
            <div
              ref={captureRef}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {smallMultiples.map(({ id, name, rows }) => {
                const series = rows
                  .map((r) => ({
                    time: toIsoNoMs(r.time),
                    weight: r.weight ?? r.Weight ?? r.WEIGHT,
                  }))
                  .sort((a, b) => new Date(a.time) - new Date(b.time));

                const vals = series
                  .map((d) => d.weight)
                  .filter((v) => typeof v === "number" && Number.isFinite(v));
                const yMin = vals.length ? Math.min(...vals) : 0;
                const yMax = vals.length ? Math.max(...vals) : 1;
                const span = Math.max(yMax - yMin, 0.0001);
                const pad = Math.max(span * 0.1, 0.5);

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
                            domain={[yMin - pad, yMax + pad]}
                            tickFormatter={(v) =>
                              typeof v === "number" ? `${formatNum(v)}` : ""
                            }
                          />
                          <Tooltip
                            labelFormatter={(v) =>
                              new Date(v).toLocaleString(locale)
                            }
                            formatter={(value) => [
                              `${formatNum(value)} kg`,
                              t("metric.weight"),
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
                  {t("weightCharts.noDataWindow")}
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleScreenshot}
              className="text-sm p-1 rounded cursor-pointer bg-red-300 hover:bg-red-400 hover:text-neutral-200 text-neutral-950"
            >
              {t("chart.screenshot")}
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && selectedIds.length === 0 && (
        <div className="text-sm text-gray-500">
          {t("weightCharts.empty")}
        </div>
      )}
    </div>
  );
}
