"use client";

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

import { useEffect, useState, use } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { forwardRef } from "react";

// ✅ Custom Button for the DatePicker (styled)
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
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default dates → last 7 days
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const { scale_id } = use(params);

  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [previewFetched, setPreviewFetched] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);

  // Fetch list of available scales
  const fetchScales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scales");
      const data = await res.json();
      setScales(data.scales || []);
    } catch (err) {
      console.error("❌ Error loading scales:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScales();
  }, []);

  // Fetch chart data
  useEffect(() => {
    let didCancel = false;

    const fetchPreview = async () => {
      try {
        const res = await fetch(
          `/api/scale-data/${scale_id}/latest?resolution=${selectedResolution}&limit=20`
        );
        const json = await res.json();
        if (!didCancel) {
          const formatted = json.map((entry) => ({
            ...entry,
            // ✅ Keep raw ISO string
            time: entry.time,
            weight: entry.weight ?? 0,
            yield: entry.yield ?? 0,
            temperature: entry.temperature ?? 0,
            brood: entry.brood ?? 0,
            humidity: entry.humidity ?? 0,
          }));
          setChartData(formatted);
          setPreviewFetched(true);
        }
      } catch (err) {
        console.error("❌ Error fetching preview data:", err);
      }
    };

    const fetchFull = async () => {
      if (!startDate || !endDate || startDate > endDate) return;
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      setLoadingFull(true);

      try {
        const res = await fetch(
          `/api/scale-data/${scale_id}?resolution=${selectedResolution}&start=${encodeURIComponent(
            startISO
          )}&end=${encodeURIComponent(endISO)}`
        );
        const json = await res.json();
        if (!didCancel && Array.isArray(json) && json.length > 0) {
          const formatted = json.map((entry) => ({
            ...entry,
            time: entry.time, // ✅ Keep ISO string
            weight: entry.weight ?? 0,
            yield: entry.yield ?? 0,
            temperature: entry.temperature ?? 0,
            brood: entry.brood ?? 0,
            humidity: entry.humidity ?? 0,
          }));
          setChartData(formatted);
        }
      } catch (err) {
        console.error("❌ Error fetching full scale data:", err);
      } finally {
        setLoadingFull(false);
      }
    };

    fetchPreview();
    const delay = setTimeout(fetchFull, 1500);

    return () => {
      didCancel = true;
      clearTimeout(delay);
    };
  }, [scale_id, selectedResolution, startDate, endDate]);

  // Compute min/max for Y axis zoom domains
  const weightData = chartData.map((entry) => entry.weight);
  const minWeight = Math.min(...weightData);
  const maxWeight = Math.max(...weightData);

  const broodData = chartData.map((entry) => entry.brood);
  const minBrood = Math.min(...broodData);
  const maxBrood = Math.max(...broodData);

  const selectedScale = scales.find(
    (scale) => String(scale.scale_id) === String(scale_id)
  );

  // ✅ Format Finnish dates for charts
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

  return (
    <div className="p-1 md:p-4 text-gray-500">
      {/* Header */}
      <h1 className="text-xl font-bold mb-2 ml-8">
        📊 {selectedScale?.name || `ID: ${scale_id}`}
      </h1>

      {/* Resolution Toggle Buttons */}
      <div className="flex md:flex-row mb-5 ml-4 gap-4 mt-8">
        <button
          onClick={() => setSelectedResolution("hourly")}
          className={`px-2 py-2 md:py-1 rounded w-full text-gray-700 mr-2 ${
            selectedResolution === "hourly"
              ? "bg-blue-700 text-white"
              : "bg-gray-200"
          }`}
        >
          Hourly
        </button>
        <button
          onClick={() => setSelectedResolution("daily")}
          className={`px-2 py-2 md:py-1 md:mt-0 rounded w-full text-gray-700 ${
            selectedResolution === "daily"
              ? "bg-green-700 text-white"
              : "bg-gray-200"
          }`}
        >
          Daily
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-col md:flex-row gap-2 mb-4 mx-4 md:mx-8">
        <div>
          <label className="inline-block font-medium px-2 mb-1">Start: </label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={
              selectedResolution === "hourly"
                ? "dd.MM.yyyy HH:mm"
                : "dd.MM.yyyy"
            }
            customInput={<CustomInputButton />}
          />
        </div>
        <div>
          <label className="inline-block font-medium px-2 mb-1 mr-2 md:mr-0">
            End:
          </label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
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

      {/* Status Messages */}
      {!previewFetched && (
        <div className="text-center text-gray-500 my-4">
          Loading preview data...
        </div>
      )}
      {loadingFull && (
        <div className="text-center text-blue-500 my-2">
          Loading full data...
        </div>
      )}
      {previewFetched && chartData.length > 0 && !loadingFull && (
        <div className="text-center text-yellow-600 text-sm mb-4">
          Showing preview data (latest 20 records). Full data will appear if
          available.
        </div>
      )}

      {/* Charts */}
      {["weight", "yield", "temperature", "brood", "humidity"].map((key) => (
        <ResponsiveContainer
          width="98%"
          height={200}
          className="mt-4"
          key={key}
        >
          {key === "humidity" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis dataKey="time" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip labelFormatter={formatDate} />
              <Legend />
              <Bar dataKey={key} fill="#1e88e5" />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis dataKey="time" tickFormatter={formatDate} />
              <YAxis
                domain={
                  key === "weight"
                    ? [minWeight - 1, maxWeight + 1]
                    : key === "brood"
                    ? [minBrood - 1, maxBrood + 1]
                    : undefined
                }
              />
              <Tooltip labelFormatter={formatDate} />
              <Legend />
              <Line
                dataKey={key}
                stroke={
                  key === "weight"
                    ? "#fb8c00"
                    : key === "yield"
                    ? "#43a047"
                    : key === "temperature"
                    ? "#e53935"
                    : "#e57373"
                }
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      ))}
    </div>
  );
}
