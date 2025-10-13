"use client";

import React, { useEffect, useMemo, useState, forwardRef } from "react";
import { use } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  ResponsiveContainer,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSession } from "next-auth/react";

// Custom DatePicker button (unchanged)
const CustomInputButton = forwardRef(function CustomInputButton(
  { value, onClick },
  ref
) {
  return (
    <button
      onClick={onClick}
      ref={ref}
      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl shadow transition"
    >
      📅 <span>{value || "Valitse päivä"} </span>
    </button>
  );
});

// ------------ helpers for dynamic metrics ------------
const METRIC_COLOR_FALLBACKS = [
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
];

// prefer nice colors for known keys; others get a fallback
const KNOWN_COLORS = {
  weight: "#fb8c00",
  yield: "#43a047",
  temperature: "#e53935",
  humidity: "#1e88e5",
  brood: "#8e24aa",
  rain: "#1976d2",
  wind_speed: "#00acc1",
  wind_direction: "#6d4c41",
};

// pretty labels & units by heuristic
function prettyLabel(k) {
  const map = {
    time: "Time",
    weight: "Weight (kg)",
    temperature: "Temperature (°C)",
    humidity: "Humidity (%)",
    yield: "Yield (%)",
    brood: "Brood (count)",
    rain: "Rain (mm)",
    wind_speed: "Wind Speed",
    wind_direction: "Wind Direction (°)",
  };
  if (map[k]) return map[k];
  // fallback: Title Case + no unit
  return k
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function inferUnit(k) {
  if (/humidity|yield|percent/gi.test(k)) return "%";
  if (/temp|temperature/gi.test(k)) return "°C";
  if (/rain|precip/gi.test(k)) return "mm";
  if (/direction|dir/gi.test(k)) return "°";
  return ""; // default none
}

function isNumeric(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// unwrap angles to avoid 360→0 jumps (for wind_direction)
function unwrapAngles(points, key) {
  let last = null;
  let offset = 0;
  return points.map((p) => {
    const v = p[key];
    if (!isNumeric(v)) return { ...p, [key]: v };
    let val = v + offset;
    if (last != null) {
      const diff = v + offset - last;
      if (diff > 180) {
        offset -= 360;
        val = v + offset;
      } else if (diff < -180) {
        offset += 360;
        val = v + offset;
      }
    }
    last = val;
    return { ...p, [key]: val };
  });
}

// choose chart type based on name/value pattern
function chooseChartType(metricKey) {
  // name hints
  if (/rain|precip|humidity/gi.test(metricKey)) return "bar";
  // default numeric → line
  return "line";
}

export default function ScaleDetailPage({ params: rawParams }) {
  // Unwrap params promise (Next.js)
  const params = use(rawParams);
  const { scale_id } = params;
  const { data: session, status } = useSession(); // current user session

  const [scales, setScales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedResolution, setSelectedResolution] = useState("daily");

  // ---- timeframe & dates (unchanged) ----
  const [timeframe, setTimeframe] = useState(7);
  const now = () => new Date();
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };
  const [startDate, setStartDate] = useState(addDays(now(), -timeframe));
  const [endDate, setEndDate] = useState(now());

  const diffDaysInclusive = (start, end) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.ceil((end - start) / msPerDay));
  };
  const currentSpanDays = diffDaysInclusive(startDate, endDate);

  useEffect(() => {
    setTimeframe(diffDaysInclusive(startDate, endDate));
  }, [startDate, endDate]);

  const setQuickRange = (days) => {
    const n = now();
    setStartDate(addDays(n, -days));
    setEndDate(n);
  };

  const shiftWindow = (days) => {
    const n = now();
    let newStart = addDays(startDate, days);
    let newEnd = addDays(endDate, days);
    if (newEnd > n) {
      const overshoot = newEnd - n;
      newEnd = n;
      newStart = new Date(newStart - overshoot);
    }
    if (newStart >= newEnd) newStart = addDays(newEnd, -1);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const goToday = () => {
    const n = now();
    setStartDate(addDays(n, -currentSpanDays));
    setEndDate(n);
  };

  // ---------- DYNAMIC METRICS STATE ----------
  const [activeMetric, setActiveMetric] = useState(null); // was "weight"
  const [activeScale, setActiveScale] = useState("TJUDÖ");

  // y-axis domain
  const [yDomain, setYDomain] = useState([0, 10]);

  // formatters (keep your date formats)
  const formatDate = (value) => {
    const date = new Date(value);
    return selectedResolution === "hourly"
      ? date.toLocaleString("fi-FI", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : date.toLocaleDateString("fi-FI", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  };

  const formatY = (value, metricKey) => {
    const unit = metricKey ? inferUnit(metricKey) : "";
    if (typeof value === "number") {
      const rounded = (Math.round(value * 100) / 100).toFixed(2);
      return unit ? `${rounded} ${unit}` : rounded;
    }
    return value;
  };

  const zoomInY = () => {
    const [min, max] = yDomain;
    const range = max - min;
    setYDomain([min + range * 0.1, max - range * 0.1]);
  };
  const zoomOutY = () => {
    const [min, max] = yDomain;
    const range = max - min;
    setYDomain([min - range * 0.1, max + range * 0.1]);
  };
  const resetY = () => {
    if (!activeMetric) return;
    const values = chartData
      .map((e) => e[activeMetric])
      .filter((v) => isNumeric(v));
    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.5 || 1;
      setYDomain([min - padding, max + padding]);
    }
  };

  const hasDataForKey = (key) =>
    chartData.some((entry) => isNumeric(entry[key]));

  // Fetch scales (unchanged)
  useEffect(() => {
    const fetchScales = async () => {
      try {
        const res = await fetch("/api/scales");
        const data = await res.json();
        setScales(data.scales || []);
      } catch (err) {
        console.error("❌ Error loading scales:", err);
      }
    };
    fetchScales();
  }, []);

  // -------- FETCH DATA (slightly changed to keep fields dynamic) --------
  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();
        const res = await fetch(
          `/api/scale-data/${scale_id}?resolution=${selectedResolution}&start=${encodeURIComponent(
            startISO
          )}&end=${encodeURIComponent(endISO)}`
        );
        const json = await res.json();

        // Keep all fields as-is, just ensure time is present
        const formatted = json.map((entry) => ({
          ...entry,
          time: entry.time,
        }));

        setChartData(formatted);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // NOTE: no dependency on activeMetric here; metric choice shouldn't refetch
  }, [scale_id, selectedResolution, startDate, endDate]);

  // --------- DISCOVER METRICS DYNAMICALLY ----------
  const discoveredMetrics = useMemo(() => {
    // Gather keys (exclude non-metrics)
    const keySet = new Set();
    for (const row of chartData) {
      if (!row) continue;
      for (const k of Object.keys(row)) {
        if (k === "_id" || k === "time" || k === "scale_id" || k === "__v")
          continue;
        keySet.add(k);
      }
    }
    // Only keep numeric metrics that actually have data in the window
    const numeric = [];
    for (const k of keySet) {
      const hasNumeric = chartData.some((r) => isNumeric(r[k]));
      if (hasNumeric) numeric.push(k);
    }

    // Preferred order if present, then alphabetical rest
    const preferredOrder = [
      "weight",
      "temperature",
      "humidity",
      "yield",
      "brood",
      "rain",
      "wind_speed",
      "wind_direction",
    ];
    const preferred = preferredOrder.filter((k) => numeric.includes(k));
    const rest = numeric
      .filter((k) => !preferred.includes(k))
      .sort((a, b) => a.localeCompare(b));

    return [...preferred, ...rest];
  }, [chartData]);

  // pick an active metric when data or list changes
  useEffect(() => {
    if (activeMetric && discoveredMetrics.includes(activeMetric)) return;
    // prefer weight if available; else first metric
    const next =
      discoveredMetrics.find((m) => m === "weight") ||
      discoveredMetrics[0] ||
      null;
    setActiveMetric(next || null);
  }, [discoveredMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // compute y-domain (auto-fit) whenever metric or data changes
  useEffect(() => {
    if (!activeMetric) return;

    // if wind direction, unwrap first so the domain doesn't get 360→0 jumps
    const rows = /wind[_-]?dir|direction/i.test(activeMetric)
      ? unwrapAngles(chartData, activeMetric)
      : chartData;

    const [low, high] = computeYDomain(activeMetric, rows);
    setYDomain([low, high]);
  }, [activeMetric, chartData]);

  // pick a color for a metric
  const metricColor = (key) => {
    if (KNOWN_COLORS[key]) return KNOWN_COLORS[key];
    const i =
      Math.abs([...key].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) %
      METRIC_COLOR_FALLBACKS.length;
    return METRIC_COLOR_FALLBACKS[i];
  };

  const selectedScale = scales.find(
    (s) => String(s.scale_id) === String(scale_id)
  );

  // keep activeScale text (unchanged)
  useEffect(() => {
    if (selectedScale?.name) setActiveScale(selectedScale.name);
  }, [selectedScale?.name]);

  // build the metric tabs from discovered metrics
  const metricTabs = (
    <div className="w-full overflow-x-auto touch-pan-x mb-3">
      <div className="flex gap-1 w-max whitespace-nowrap px-2">
        {discoveredMetrics.map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            className={`px-2 py-1 text-xs sm:text-sm rounded cursor-pointer ${
              activeMetric === metric
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            title={prettyLabel(metric)}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
        {!discoveredMetrics.length && (
          <span className="text-xs text-gray-500 px-2">No metrics</span>
        )}
      </div>
    </div>
  );

  // prepare series data per active metric (handle wind direction unwrap)
  const seriesData = useMemo(() => {
    if (!activeMetric) return chartData;
    if (/wind[_-]?dir|direction/i.test(activeMetric)) {
      return unwrapAngles(chartData, activeMetric);
    }
    return chartData;
  }, [chartData, activeMetric]);

  // Compute a nice Y domain for the current metric and data.
  // - Percent-like metrics ("yield", "humidity", "percent") get a smart treatment:
  //   * if their range is small, we center and pad tightly (but keep within [0,100])
  //   * if their range is big, we just use [0,100]
  // - Others get min/max with padding.
  function computeYDomain(metricKey, dataRows) {
    const isPercent = /humidity|yield|percent/i.test(metricKey);
    const values = dataRows
      .map((r) => r?.[metricKey])
      .filter((v) => typeof v === "number" && Number.isFinite(v));
    if (!values.length) return [0, 1];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 0.0001);
    const mid = (min + max) / 2;

    // generous padding for readability
    const pad = span * 0.3;

    if (isPercent) {
      // If the band is small (e.g. 0–10%), fit tightly but clamp to [0,100]
      const SMALL_RANGE_THRESHOLD = 30; // tweak as you like
      if (span <= SMALL_RANGE_THRESHOLD) {
        let low = Math.max(0, min - pad);
        let high = Math.min(100, max + pad);

        // ensure a minimum visible span so it doesn't look flat
        const MIN_SPAN = 5; // e.g., always show at least 5 percentage points
        if (high - low < MIN_SPAN) {
          const half = MIN_SPAN / 2;
          low = Math.max(0, mid - half);
          high = Math.min(100, mid + half);
          // if we still hit the boundary, expand the other side
          if (high - low < MIN_SPAN) {
            if (low === 0) high = Math.min(100, low + MIN_SPAN);
            else if (high === 100) low = Math.max(0, high - MIN_SPAN);
          }
        }
        return [low, high];
      }
      // Large variation: standard % axis
      return [0, 100];
    }

    // Non-percent metrics: min/max with padding; ensure at least tiny span
    const low = min - pad;
    const high = max + pad;
    return [low, high];
  }

  return (
    <div className="p-2 dark:text-gray-400">
      {/* Header + Date pickers ,+ quick range + scales + metric + chart + zoom */}
      <div className="flex flex-col md:flex-row justify-center items-center md:gap-2 mb-4 shadow-md shadow-amber-200 rounded-lg">
        <h1 className="text-sm font-bold mb-2">
          📊 {selectedScale?.name || `ID: ${scale_id}`}
        </h1>

        {/* Quick range & window controls (unchanged) */}
        <div className="flex flex-wrap items-center justify-center gap-2  mb-2 md:ml-3">
          <button
            onClick={() => setQuickRange(7)}
            className="px-3 py-1 text-xs sm:text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Last 7 days
          </button>
          <button
            onClick={() => setQuickRange(30)}
            className="px-3 py-1 text-xs sm:text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Last 30 days
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1 text-xs sm:text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            title="Keep same span, end at today"
          >
            Today
          </button>

          <div className="mx-2 h-5 w-px bg-gray-300" />

          <button
            onClick={() => shiftWindow(-currentSpanDays)}
            className="px-2 py-1 text-xs sm:text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            title="Shift window backward by current span"
          >
            ← Prev {currentSpanDays}d
          </button>
          <button
            onClick={() => shiftWindow(currentSpanDays)}
            className="px-2 py-1 text-xs sm:text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            title="Shift window forward by current span"
            disabled={addDays(endDate, currentSpanDays) > now()}
          >
            Next {currentSpanDays}d →
          </button>
          <span className="text-xs text-gray-500 ml-2">
            (showing {timeframe} days)
          </span>
        </div>

        {/* Date pickers (unchanged) */}
        <div className="flex mb-4 mt-2 justify-center gap-2 text-xs sm:text-sm ">
          <DatePicker
            selected={startDate}
            onChange={(d) => setStartDate(d)}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={
              selectedResolution === "hourly"
                ? "dd.MM.yyyy HH:mm"
                : "dd.MM.yyyy"
            }
            customInput={<CustomInputButton />}
            maxDate={endDate}
          />
          <DatePicker
            selected={endDate}
            onChange={(d) => setEndDate(d)}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={
              selectedResolution === "hourly"
                ? "dd.MM.yyyy HH:mm"
                : "dd.MM.yyyy"
            }
            customInput={<CustomInputButton />}
            minDate={startDate}
            maxDate={now()}
          />
        </div>
      </div>

      {/* Scales (unchanged) */}
      <div className="w-full overflow-x-auto touch-pan-x mb-3">
        <div className="flex gap-1 w-max whitespace-nowrap px-2">
          {scales.map((scale) => (
            <Link
              key={scale.scale_id}
              href={`/scales/${scale.scale_id}`}
              onClick={() => setActiveScale(scale.name)}
              className={`shrink-0 px-3 py-1 text-xs sm:text-sm rounded cursor-pointer ${
                activeScale === scale.name
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {scale.name || `ID: ${scale.scale_id}`}
            </Link>
          ))}
        </div>
      </div>

      {/* Metric tabs: now dynamic */}
      {metricTabs}

      {/* Download CSV (current view) — unchanged */}
      {status === "authenticated" &&
        session?.user?.isAdmin &&
        chartData &&
        chartData.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            <a
              className="bg-indigo-700 text-white px-3 py-2 rounded hover:bg-indigo-600"
              href={`/api/scale-data/${encodeURIComponent(
                String(scale_id)
              )}?resolution=${encodeURIComponent(
                selectedResolution
              )}&start=${encodeURIComponent(
                startDate.toISOString()
              )}&end=${encodeURIComponent(endDate.toISOString())}&format=csv`}
            >
              ⬇️ Download CSV all metrics (current view)
            </a>
          </div>
        )}

      {/* Loading */}
      {loading && (
        <div className="text-center mb-4 text-gray-500">Loading data...</div>
      )}

      {/* Chart (now auto-picks chart type & units per metric) */}
      {!loading && activeMetric && hasDataForKey(activeMetric) && (
        <div className="w-full h-[350px] md:h-[550px]">
          <ResponsiveContainer width="100%" height="100%">
            {chooseChartType(activeMetric) === "bar" ? (
              <BarChart data={seriesData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis dataKey="time" tickFormatter={formatDate} />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => formatY(v, activeMetric)}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value) => [
                    formatY(value, activeMetric),
                    prettyLabel(activeMetric),
                  ]}
                />
                <Legend formatter={() => prettyLabel(activeMetric)} />
                <Bar dataKey={activeMetric} fill={metricColor(activeMetric)} />
              </BarChart>
            ) : (
              <LineChart data={seriesData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis dataKey="time" tickFormatter={formatDate} />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => formatY(v, activeMetric)}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value) => [
                    formatY(value, activeMetric),
                    prettyLabel(activeMetric),
                  ]}
                />
                <Legend formatter={() => prettyLabel(activeMetric)} />
                <Line
                  dataKey={activeMetric}
                  stroke={metricColor(activeMetric)}
                  strokeWidth={2}
                  type="monotone"
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Y-axis zoom & resolution buttons (unchanged) */}
      <div className="flex flex-wrap gap-2 justify-center mb-2">
        <button
          className="w-8 px-1 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-400 cursor-pointer"
          onClick={zoomInY}
          title="Zoom in Y"
        >
          +
        </button>
        <button
          className="w-8 px-1 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-400 cursor-pointer"
          onClick={zoomOutY}
          title="Zoom out Y"
        >
          -
        </button>
        <button
          className="px-2 text-sm py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-400"
          onClick={resetY}
          title="Auto fit Y to data"
        >
          Reset Y
        </button>

        <div className="mx-2 h-5 w-px bg-gray-300" />

        <button
          onClick={() => setSelectedResolution("daily")}
          className={`px-2 text-sm py-1 rounded cursor-pointer ${
            selectedResolution === "daily"
              ? "bg-green-700 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setSelectedResolution("hourly")}
          className={`px-2 text-sm py-1 rounded cursor-pointer ${
            selectedResolution === "hourly"
              ? "bg-blue-700 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Hourly
        </button>
      </div>

      {/* No data */}
      {!loading && (!activeMetric || !hasDataForKey(activeMetric)) && (
        <div className="text-center text-red-500 mt-6">
          ❌ No data available for {activeMetric || "selected metric"}.
        </div>
      )}
    </div>
  );
}
