"use client";

import React from "react";
import { useEffect, useState } from "react";
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
import { forwardRef } from "react";

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

export default function ScaleDetailPage({ params }) {
  const { scale_id } = React.use(params);

  const [scales, setScales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7))
  );
  const [endDate, setEndDate] = useState(new Date());
  const [activeMetric, setActiveMetric] = useState("weight");

  const lineMetrics = ["weight", "yield", "temperature", "brood"];
  const barMetric = "humidity";
  const metrics = [...lineMetrics, barMetric];

  const [yDomain, setYDomain] = useState([0, 10]);

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

        // Set Y-domain with padding for default zoom
        const values = formatted
          .map((e) => e[activeMetric])
          .filter((v) => v !== null);
        if (values.length) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const padding = (max - min) * 0.1 || 1; // 10% padding or 1 if flat line
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

  const hasDataForKey = (key) =>
    chartData.some((entry) => entry[key] !== null && entry[key] !== undefined);

  const selectedScale = scales.find(
    (s) => String(s.scale_id) === String(scale_id)
  );

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

  return (
    <div className="p-2 dark:text-gray-400">
      <h1 className="text-sm font-bold mb-6">
        📊 {selectedScale?.name || `ID: ${scale_id}`}
      </h1>

      {/* Top row: resolution + date pickers */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedResolution("hourly")}
            className={`px-2 text-sm py-1 rounded ${
              selectedResolution === "hourly"
                ? "bg-blue-700 text-white"
                : "bg-gray-200"
            }`}
          >
            Hourly
          </button>
          <button
            onClick={() => setSelectedResolution("daily")}
            className={`px-2 text-sm py-1 rounded ${
              selectedResolution === "daily"
                ? "bg-green-700 text-white"
                : "bg-gray-200"
            }`}
          >
            Daily
          </button>
        </div>

        <div className="flex text-sm gap-2">
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={
              selectedResolution === "hourly"
                ? "dd.MM.yyyy HH:mm"
                : "dd.MM.yyyy"
            }
            customInput={<CustomInputButton />}
          />
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={
              selectedResolution === "hourly"
                ? "dd.MM.yyyy HH:mm"
                : "dd.MM.yyyy"
            }
            customInput={<CustomInputButton />}
          />
        </div>
      </div>

      {/* Metric tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {metrics.map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            className={`px-2 text-sm py-1 rounded ${
              activeMetric === metric
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </div>

      {/* Y-axis zoom buttons */}
      <div className="flex gap-2 justify-center mb-2">
        <button
          className="px-2 text-sm py-1 text-gray-700 bg-gray-200 rounded hover:bg-gray-400"
          onClick={zoomInY}
        >
          Zoom In Y
        </button>
        <button
          className="px-2 text-sm py-1 text-gray-700 bg-gray-200 rounded hover:bg-gray-400"
          onClick={zoomOutY}
        >
          Zoom Out Y
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-gray-500">Loading data...</div>
      )}

      {/* Chart */}
      {!loading && hasDataForKey(activeMetric) && (
        <ResponsiveContainer width="100%" height={400}>
          {activeMetric === barMetric ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis dataKey="time" tickFormatter={formatDate} />
              <YAxis domain={yDomain} tickFormatter={formatY} />
              <Tooltip labelFormatter={formatDate} formatter={formatY} />
              <Legend />
              <Bar dataKey={barMetric} fill="#1e88e5" />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis dataKey="time" tickFormatter={formatDate} />
              <YAxis domain={yDomain} tickFormatter={formatY} />
              <Tooltip labelFormatter={formatDate} formatter={formatY} />
              <Legend />
              <Line
                dataKey={activeMetric}
                stroke={
                  activeMetric === "weight"
                    ? "#fb8c00"
                    : activeMetric === "yield"
                    ? "#43a047"
                    : activeMetric === "temperature"
                    ? "#e53935"
                    : "#e57373"
                }
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}

      {/* No data */}
      {!loading && !hasDataForKey(activeMetric) && (
        <div className="text-center text-red-500 mt-6">
          ❌ No data available for {activeMetric}.
        </div>
      )}
    </div>
  );
}
