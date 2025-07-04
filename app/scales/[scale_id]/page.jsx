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
    📅 <span>{value || "Select date"}</span>
  </button>
));

export default function ScaleDetailPage({ params }) {
  // State to hold all scales
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define default dates (last 7 days)
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const { scale_id } = use(params); // Get scale_id from route params

  // UI state
  const [selectedResolution, setSelectedResolution] = useState("daily"); // hourly/daily
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [previewFetched, setPreviewFetched] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);

  // Fetch list of available scales (for naming/display)
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

  // Fetch chart data (preview first, then full)
  useEffect(() => {
    let didCancel = false;

    // Preview: fetch latest 20 records
    const fetchPreview = async () => {
      try {
        const res = await fetch(
          `/api/scale-data/${scale_id}/latest?resolution=${selectedResolution}&limit=20`
        );
        const json = await res.json();
        if (!didCancel) {
          const formatted = json.map((entry) => ({
            ...entry,
            time: new Date(entry.time).toLocaleString(),
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

    // Full: fetch all data within date range
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
            time: new Date(entry.time).toLocaleString(),
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

    fetchPreview(); // quick preview first
    const delay = setTimeout(fetchFull, 1500); // full data delayed

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
            dateFormat={selectedResolution === "hourly" ? "Pp" : "P"}
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
            dateFormat={selectedResolution === "hourly" ? "Pp" : "P"}
            customInput={<CustomInputButton />}
          />
        </div>
      </div>

      {/* Loading / Status Messages */}
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
      {/* Weight Line Chart */}
      <ResponsiveContainer width="98%" height={200} className="mt-4">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis
            domain={[minWeight - 1, maxWeight + 1]}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip />
          <Legend />
          <Line
            dataKey="weight"
            stroke="#fb8c00"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Yield Line Chart */}
      <ResponsiveContainer width="98%" height={200} className="mt-4">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            dataKey="yield"
            stroke="#43a047"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Temperature Line Chart */}
      <ResponsiveContainer width="98%" height={200} className="mt-4">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            dataKey="temperature"
            stroke="#e53935"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Brood Line Chart with zoom domain */}
      <ResponsiveContainer width="98%" height={200} className="mt-4">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis domain={[minBrood - 1, maxBrood + 1]} />
          <Tooltip />
          <Legend />
          <Line
            dataKey="brood"
            stroke="#e57373"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Humidity Bar Chart */}
      <ResponsiveContainer width="98%" height={200} className="mt-8">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="humidity" fill="#1e88e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
