"use client";

import React, { useEffect, useState, forwardRef } from "react";
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

// Custom DatePicker button
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

export default function ScaleDetailPage({ params: rawParams }) {
  // Unwrap params promise safely (Next.js Route Handlers)
  const params = use(rawParams);
  const { scale_id } = params;

  const [scales, setScales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedResolution, setSelectedResolution] = useState("daily");

  // ---- timeframe & dates ----
  // NOTE: `timeframe` is the *displayed* number of days. It now auto-syncs with any date change.
  const [timeframe, setTimeframe] = useState(7); // days

  // Small date helpers kept as-is
  const now = () => new Date();
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  // Initial window: last `timeframe` days ending now
  const [startDate, setStartDate] = useState(addDays(now(), -timeframe));
  const [endDate, setEndDate] = useState(now());

  /**
   * 🧠 DEV NOTE — Best Option:
   * Keep `timeframe` in sync with any date change (manual pickers, quick buttons, shifting).
   * We use an inclusive diff (partial days count as 1). This prevents stale labels like "7" or "30"
   * when users choose a custom range.
   */
  const diffDaysInclusive = (start, end) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    // Use ceil so partial days count; clamp to min 1 day.
    return Math.max(1, Math.ceil((end - start) / msPerDay));
  };

  // Current span derived from dates (used for shift buttons and "Today")
  const currentSpanDays = diffDaysInclusive(startDate, endDate);

  // Auto-sync timeframe whenever start or end changes (covers all entry points)
  useEffect(() => {
    setTimeframe(diffDaysInclusive(startDate, endDate));
  }, [startDate, endDate]);

  // Set last N days and keep end at "now"
  const setQuickRange = (days) => {
    const n = now();
    setStartDate(addDays(n, -days));
    setEndDate(n);
    // No need to manually setTimeframe here; the effect above will sync it
  };

  // Slide window by current span
  const shiftWindow = (days) => {
    const n = now();
    let newStart = addDays(startDate, days);
    let newEnd = addDays(endDate, days);

    // Don't allow future
    if (newEnd > n) {
      const overshoot = newEnd - n;
      newEnd = n;
      newStart = new Date(newStart - overshoot);
    }
    if (newStart >= newEnd) newStart = addDays(newEnd, -1);

    setStartDate(newStart);
    setEndDate(newEnd);
    // timeframe auto-updates via useEffect
  };

  const goToday = () => {
    const n = now();
    setStartDate(addDays(n, -currentSpanDays));
    setEndDate(n);
    // timeframe auto-updates via useEffect
  };

  const lineMetrics = ["weight", "yield", "temperature", "brood"];
  const barMetric = "humidity";
  const metrics = [...lineMetrics, barMetric];

  const [activeMetric, setActiveMetric] = useState("weight");
  const [activeScale, setActiveScale] = useState("TJUDÖ"); // initial fallback

  const [yDomain, setYDomain] = useState([0, 10]);

  const metricColors = {
    weight: "#fb8c00", // Orange
    yield: "#43a047", // Green
    temperature: "#e53935", // Red
    brood: "#c274d6", // Purple
    humidity: "#1e88e5", // Blue
  };

  const getMetricLabel = (metric) => {
    switch (metric) {
      case "weight":
        return "Weight (kg)";
      case "temperature":
        return "Temperature (°C)";
      case "yield":
        return "Yield (%)";
      case "humidity":
        return "Humidity (%)";
      case "brood":
        return "Brood (count)";
      default:
        return metric;
    }
  };

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

  const formatY = (value) =>
    typeof value === "number" ? value.toFixed(2) : value;

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
    const values = chartData
      .map((e) => e[activeMetric])
      .filter((v) => v !== null && v !== undefined);
    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.5 || 1;
      setYDomain([min - padding, max + padding]);
    }
  };

  const hasDataForKey = (key) =>
    chartData.some((entry) => entry[key] !== null && entry[key] !== undefined);

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

  // Fetch chart data whenever controls change (unchanged except comments)
  useEffect(() => {
    if (!activeMetric) return;
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
          weight: entry.weight ?? null,
          yield: entry.yield ?? null,
          temperature: entry.temperature ?? null,
          brood: entry.brood ?? null,
          humidity: entry.humidity ?? null,
        }));
        setChartData(formatted);

        // Auto-fit Y domain to the selected metric
        const values = formatted
          .map((e) => e[activeMetric])
          .filter((v) => v !== null && v !== undefined);
        if (values.length) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const padding = (max - min) * 0.5 || 1;
          setYDomain([min - padding, max + padding]);
        }
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeMetric, scale_id, selectedResolution, startDate, endDate]);

  const selectedScale = scales.find(
    (s) => String(s.scale_id) === String(scale_id)
  );

  // keep activeScale in sync with the selected route-derived scale
  useEffect(() => {
    if (selectedScale?.name) setActiveScale(selectedScale.name);
  }, [selectedScale?.name]);

  return (
    <div className="p-2 dark:text-gray-400">
      {/* Header + Date pickers ,+ quick rang + scales + metric + chart + zoom */}
      <div className="flex flex-col md:flex-row justify-center items-center md:gap-2 mb-4 shadow-md shadow-amber-200 rounded-lg">
        <h1 className="text-sm font-bold mb-2">
          📊 {selectedScale?.name || `ID: ${scale_id}`}
        </h1>

        {/* Quick range & window controls */}
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
          {/* 👇 Label remains identical in UI, but now always accurate */}
          <span className="text-xs text-gray-500 ml-2">
            (showing {timeframe} days)
          </span>
        </div>

        {/* Date pickers  */}
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

      {/* Scales */}
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
      <div className="w-full overflow-x-auto touch-pan-x mb-3">
        <div className="flex gap-1 w-max whitespace-nowrap px-2">
          {metrics.map((metric) => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric)}
              className={`px-2 py-1 text-xs sm:text-sm rounded cursor-pointer ${
                activeMetric === metric
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-gray-500">Loading data...</div>
      )}

      {/* Chart */}
      {!loading && hasDataForKey(activeMetric) && (
        <div className="w-full h-[350px] md:h-[550px]">
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === barMetric ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis dataKey="time" tickFormatter={formatDate} />
                <YAxis domain={yDomain} tickFormatter={formatY} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value, name) => [
                    formatY(value),
                    getMetricLabel(name),
                  ]}
                />
                <Legend formatter={(value) => getMetricLabel(value)} />
                <Bar dataKey={barMetric} fill={metricColors[barMetric]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis dataKey="time" tickFormatter={formatDate} />
                <YAxis domain={yDomain} tickFormatter={formatY} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value, name) => [
                    formatY(value),
                    getMetricLabel(name),
                  ]}
                />
                <Legend formatter={(value) => getMetricLabel(value)} />
                <Line
                  dataKey={activeMetric}
                  stroke={metricColors[activeMetric] || "#e57373"}
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Y-axis zoom & resolution buttons */}
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
          onClick={() => setSelectedResolution("hourly")}
          className={`px-2 text-sm py-1 rounded cursor-pointer ${
            selectedResolution === "hourly"
              ? "bg-blue-700 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Hourly
        </button>
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
      </div>

      {/* No data */}
      {!loading && !hasDataForKey(activeMetric) && (
        <div className="text-center text-red-500 mt-6">
          ❌ No data available for {activeMetric}.
        </div>
      )}
    </div>
  );
}
