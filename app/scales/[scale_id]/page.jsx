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
const CustomInputButton = forwardRef(({ value, onClick }, ref) => (
  <button
    onClick={onClick}
    ref={ref}
    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-xl shadow transition"
  >
    📅 <span>{value || "Valitse päivä"}</span>
  </button>
));

export default function ScaleDetailPage({ params: rawParams }) {
  // Unwrap params promise safely
  const params = use(rawParams);
  const { scale_id } = params;

  const [scales, setScales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7))
  );
  const [endDate, setEndDate] = useState(new Date());

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

  const formatY = (value) => value?.toFixed(2);

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

  const hasDataForKey = (key) =>
    chartData.some((entry) => entry[key] !== null && entry[key] !== undefined);

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

  // Fetch chart data
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

        const values = formatted
          .map((e) => e[activeMetric])
          .filter((v) => v !== null);
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

  // 🔧 keep activeScale in sync with the selected route-derived scale
  useEffect(() => {
    if (selectedScale?.name) setActiveScale(selectedScale.name);
  }, [selectedScale?.name]);

  return (
    <div className="p-2 dark:text-gray-400">
      <h1 className="text-sm font-bold mb-2">
        📊 {selectedScale?.name || `ID: ${scale_id}`}
      </h1>

      {/* Scales */}
      <div className="w-full overflow-x-auto">
        <div className="flex justify-center space-x-1 whitespace-nowrap p-2">
          {scales.map((scale) => (
            <Link
              key={scale.scale_id}
              href={`/scales/${scale.scale_id}`}
              // ✅ use clicked scale 
              onClick={() => setActiveScale(scale.name)} 
              className={`px-2 py-1 text-xs rounded cursor-pointer ${
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
      <div className="w-full overflow-x-auto">
        <div className="flex justify-center space-x-1 whitespace-nowrap p-2">
          {metrics.map((metric) => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric)}
              className={`px-2 py-1 text-xs rounded cursor-pointer ${
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

      {/* Date pickers */}
      <div className="flex mb-4 mt-2 justify-center gap-2 text-xs sm:text-sm">
        <DatePicker
          selected={startDate}
          onChange={setStartDate}
          showTimeSelect={selectedResolution === "hourly"}
          dateFormat={
            selectedResolution === "hourly" ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy"
          }
          customInput={<CustomInputButton />}
        />
        <DatePicker
          selected={endDate}
          onChange={setEndDate}
          showTimeSelect={selectedResolution === "hourly"}
          dateFormat={
            selectedResolution === "hourly" ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy"
          }
          customInput={<CustomInputButton />}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-gray-500">Loading data...</div>
      )}

      {/* Chart */}
      {!loading && hasDataForKey(activeMetric) && (
        <ResponsiveContainer width="100%" height={500}>
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
      )}

      {/* Y-axis zoom & resolution buttons */}
      <div className="flex gap-2 justify-center mb-2">
        <button
          className="w-8 px-1 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-400 cursor-pointer"
          onClick={zoomInY}
        >
          +
        </button>
        <button
          className="w-8 px-1 py-1 text-sm  text-gray-700 bg-gray-200 rounded hover:bg-gray-400 cursor-pointer"
          onClick={zoomOutY}
        >
          -
        </button>
        <div className="flex gap-2">
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
