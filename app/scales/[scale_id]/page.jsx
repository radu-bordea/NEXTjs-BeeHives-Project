"use client";

import React, { useEffect, useMemo, useState, forwardRef, useRef } from "react";
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
import * as htmlToImage from "html-to-image";
import { useLang } from "../../components/LanguageProvider" // ⬅️ add

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

// we’ll translate legend/axis labels via t()
function prettyLabel(k, t) {
  const keyMap = {
    time: "metric.time",
    weight: "metric.weight",
    temperature: "metric.temperature",
    humidity: "metric.humidity",
    yield: "metric.yield",
    brood: "metric.brood",
    rain: "metric.rain",
    wind_speed: "metric.wind_speed",
    wind_direction: "metric.wind_direction",
  };
  const i18nKey = keyMap[k];
  if (i18nKey) return t(i18nKey);
  // fallback: Title Case
  return String(k)
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
  if (/weight/gi.test(k)) return "kg";
  return "";
}

function isNumeric(v) {
  return typeof v === "number" && Number.isFinite(v);
}

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

function chooseChartType(metricKey) {
  if (/rain|precip|humidity/gi.test(metricKey)) return "bar";
  return "line";
}

export default function ScaleDetailPage({ params: rawParams }) {
  const params = use(rawParams);
  const { scale_id } = params;
  const { data: session, status } = useSession();

  const { t, lang } = useLang(); // ⬅️ translations

  const [scales, setScales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedResolution, setSelectedResolution] = useState("daily");
  const captureRef = useRef(null);

  // ---- timeframe & dates ----
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
  const [activeMetric, setActiveMetric] = useState(null);
  const [activeScale, setActiveScale] = useState("");

  // y-axis domain
  const [yDomain, setYDomain] = useState([0, 10]);

  // locale-aware x-axis formatter
  const formatDate = (value) => {
    const date = new Date(value);
    const locale = lang === "sv" ? "sv-SE" : "en-US";
    return selectedResolution === "hourly"
      ? date.toLocaleString(locale, {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : date.toLocaleDateString(locale, {
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

  // Fetch scales
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

  // FETCH DATA
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
  }, [scale_id, selectedResolution, startDate, endDate]);

  // DISCOVER METRICS
  const discoveredMetrics = useMemo(() => {
    const keySet = new Set();
    for (const row of chartData) {
      if (!row) continue;
      for (const k of Object.keys(row)) {
        if (k === "_id" || k === "time" || k === "scale_id" || k === "__v")
          continue;
        keySet.add(k);
      }
    }
    const numeric = [];
    for (const k of keySet) {
      const hasNumeric = chartData.some((r) => isNumeric(r[k]));
      if (hasNumeric) numeric.push(k);
    }

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

  // pick default metric
  useEffect(() => {
    if (activeMetric && discoveredMetrics.includes(activeMetric)) return;
    const next =
      discoveredMetrics.find((m) => m === "weight") ||
      discoveredMetrics[0] ||
      null;
    setActiveMetric(next || null);
  }, [discoveredMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // compute y domain when metric/data changes
  useEffect(() => {
    if (!activeMetric) return;
    const rows = /wind[_-]?dir|direction/i.test(activeMetric)
      ? unwrapAngles(chartData, activeMetric)
      : chartData;
    const [low, high] = computeYDomain(activeMetric, rows);
    setYDomain([low, high]);
  }, [activeMetric, chartData]);

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

  useEffect(() => {
    if (selectedScale?.name) setActiveScale(selectedScale.name);
  }, [selectedScale?.name]);

  // metric tabs (translated)
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
            title={prettyLabel(metric, t)}
          >
            {prettyLabel(metric, t)}
          </button>
        ))}
        {!discoveredMetrics.length && (
          <span className="text-xs text-gray-500 px-2">
            {t("chart.noMetrics")}
          </span>
        )}
      </div>
    </div>
  );

  const seriesData = useMemo(() => {
    if (!activeMetric) return chartData;
    if (/wind[_-]?dir|direction/i.test(activeMetric)) {
      return unwrapAngles(chartData, activeMetric);
    }
    return chartData;
  }, [chartData, activeMetric]);

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
    const pad = span * 0.3;

    if (isPercent) {
      const SMALL_RANGE_THRESHOLD = 30;
      if (span <= SMALL_RANGE_THRESHOLD) {
        let low = Math.max(0, min - pad);
        let high = Math.min(100, max + pad);
        const MIN_SPAN = 5;
        if (high - low < MIN_SPAN) {
          const half = MIN_SPAN / 2;
          low = Math.max(0, mid - half);
          high = Math.min(100, mid + half);
          if (high - low < MIN_SPAN) {
            if (low === 0) high = Math.min(100, low + MIN_SPAN);
            else if (high === 100) low = Math.max(0, high - MIN_SPAN);
          }
        }
        return [low, high];
      }
      return [0, 100];
    }

    const low = min - pad;
    const high = max + pad;
    return [low, high];
  }

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
      link.download = "scale-metric.png";
      link.click();
    } catch (err) {
      console.error("❌ Screenshot failed:", err);
      alert(t("chart.screenshotError"));
    }
  };

  // Custom DatePicker button (localized)
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
        📅 <span>{value || t("chart.datepicker.select")} </span>
      </button>
    );
  });

  return (
    <div className="p-2 dark:text-gray-400">
      {/* Header / controls */}
      <div className="flex flex-col md:flex-row justify-center items-center md:gap-2 mb-4 shadow-md shadow-amber-200 rounded-lg">
        <h1 className="text-sm font-bold mb-2">
          📊 {selectedScale?.name || `ID: ${scale_id}`}
        </h1>

        {/* quick ranges + window shift */}
        <div className="flex flex-wrap items-center justify-center gap-2  mb-2 md:ml-3">
          <button
            onClick={() => setQuickRange(7)}
            className="px-3 py-1 text-xs sm:text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            {t("chart.quick.last7")}
          </button>
          <button
            onClick={() => setQuickRange(30)}
            className="px-3 py-1 text-xs sm:text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            {t("chart.quick.last30")}
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1 text-xs sm:text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            title={t("chart.quick.todayTitle")}
          >
            {t("chart.quick.today")}
          </button>

          <div className="mx-2 h-5 w-px bg-gray-300" />

          <button
            onClick={() => shiftWindow(-currentSpanDays)}
            className="px-2 py-1 text-xs sm:text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            title={t("chart.window.prevTitle")}
          >
            {t("chart.window.prev")} {currentSpanDays}
            {t("chart.window.daysShort")}
          </button>
          <button
            onClick={() => shiftWindow(currentSpanDays)}
            className="px-2 py-1 text-xs sm:text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            title={t("chart.window.nextTitle")}
            disabled={addDays(endDate, currentSpanDays) > now()}
          >
            {t("chart.window.next")} {currentSpanDays}
            {t("chart.window.daysShort")}
          </button>
          <span className="text-xs text-gray-500 ml-2">
            {t("chart.window.showingPrefix")} {timeframe}{" "}
            {t("chart.window.showingSuffix")}
          </span>
        </div>

        {/* Date pickers */}
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

      {/* capture area */}
      <div ref={captureRef} className="py-2">
        {/* scales list */}
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

        {/* Metric tabs */}
        {metricTabs}

        {/* Download CSV (admin) */}
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
                ⬇️ {t("chart.downloadCsvAll")}
              </a>
            </div>
          )}

        {/* Loading */}
        {loading && (
          <div className="text-center mb-4 text-gray-500">
            {t("chart.loading")}
          </div>
        )}

        {/* Chart */}
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
                      prettyLabel(activeMetric, t),
                    ]}
                  />
                  <Legend formatter={() => prettyLabel(activeMetric, t)} />
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
                      prettyLabel(activeMetric, t),
                    ]}
                  />
                  <Legend formatter={() => prettyLabel(activeMetric, t)} />
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

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          <button
            className="w-8 px-1 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
            onClick={zoomInY}
            title={t("chart.zoomIn")}
          >
            +
          </button>
          <button
            className="w-8 px-1 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
            onClick={zoomOutY}
            title={t("chart.zoomOut")}
          >
            -
          </button>
          <button
            className="px-2 text-sm py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={resetY}
            title={t("chart.resetYTitle")}
          >
            {t("chart.resetY")}
          </button>

          <div className="mx-2 h-5 w-px bg-gray-300" />

          <button
            onClick={() => setSelectedResolution("daily")}
            className={`px-2 text-sm py-1 rounded cursor-pointer ${
              selectedResolution === "daily"
                ? "bg-green-700 text-white hover:bg-green-800"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {t("resolution.daily")}
          </button>
          <button
            onClick={() => setSelectedResolution("hourly")}
            className={`px-2 text-sm py-1 rounded cursor-pointer ${
              selectedResolution === "hourly"
                ? "bg-blue-700 hover:bg-blue-800 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            {t("resolution.hourly")}
          </button>
          <button
            onClick={handleScreenshot}
            className="text-sm p-1 rounded cursor-pointer bg-red-300 hover:bg-red-400 hover:text-neutral-200 text-neutral-950"
          >
            {t("chart.screenshot")}
          </button>
        </div>
      </div>

      {/* No data */}
      {!loading && (!activeMetric || !hasDataForKey(activeMetric)) && (
        <div className="text-center text-red-500 mt-6">
          ❌ {t("chart.noDataPrefix")} {activeMetric || t("chart.noDataDefault")}
          .
        </div>
      )}
    </div>
  );
}
