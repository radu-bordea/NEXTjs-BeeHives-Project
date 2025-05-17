"use client"; // Enables client-side interactivity for Next.js app

// Import chart components from Recharts
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

// Main page component to show scale data charts
export default function ScaleDetailPage({ params }) {
  // Set default time range: today and a week ago
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  // Get scale_id from route parameters
  const { scale_id } = use(params);

  // UI and state management hooks
  const [selectedResolution, setSelectedResolution] = useState("daily"); // hourly or daily
  const [chartData, setChartData] = useState([]); // holds formatted chart data
  const [startDate, setStartDate] = useState(weekAgo); // date picker: start
  const [endDate, setEndDate] = useState(today); // date picker: end
  const [previewFetched, setPreviewFetched] = useState(false); // to show preview message
  const [loadingFull, setLoadingFull] = useState(false); // loading state for full data

  useEffect(() => {
    let didCancel = false; // guard to prevent state updates on unmounted component

    // Fetch recent (preview) data, up to 20 records
    const fetchPreview = async () => {
      try {
        const res = await fetch(
          `/api/scale-data/${scale_id}/latest?resolution=${selectedResolution}&limit=20`
        );
        const json = await res.json();
        if (!didCancel) {
          const formatted = json.map((entry) => ({
            ...entry,
            time: new Date(entry.time).toLocaleString(), // format timestamp
            weight: entry.weight ?? 0,
            yield: entry.yield ?? 0,
            temperature: entry.temperature ?? 0,
            brood: entry.brood ?? 0,
            humidity: entry.humidity ?? 0,
          }));
          setChartData(formatted);
          setPreviewFetched(true); // flag preview as loaded
        }
      } catch (err) {
        console.error("❌ Error fetching preview data:", err);
      }
    };

    // Fetch full historical data based on user-selected date range
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
        } else {
          console.warn("No full data yet — keeping preview visible.");
        }
      } catch (err) {
        console.error("❌ Error fetching full scale data:", err);
      } finally {
        setLoadingFull(false);
      }
    };

    fetchPreview(); // show preview immediately
    const delay = setTimeout(fetchFull, 1500); // delay full fetch for UX

    return () => {
      didCancel = true; // cleanup for unmounted component
      clearTimeout(delay); // clear delayed full fetch
    };
  }, [scale_id, selectedResolution, startDate, endDate]);

  // Compute min/max for Y-axis of weight chart
  const weightData = chartData.map((entry) => entry.weight);
  const minWeight = Math.min(...weightData);
  const maxWeight = Math.max(...weightData);

  return (
    <div className="p-6 text-gray-500">
      {/* Page title */}
      <h1 className="text-2xl font-bold mb-6 ml-8">
        📊 Graphs for Scale ID: {scale_id}
      </h1>

      {/* Resolution toggle buttons */}
      <div className="flex mb-5 ml-8">
        <button
          onClick={() => setSelectedResolution("hourly")}
          className={`px-5 py-2 rounded text-gray-700 mr-2 ${
            selectedResolution === "hourly"
              ? "bg-blue-700 text-white"
              : "bg-gray-200"
          }`}
        >
          Hourly Data
        </button>
        <button
          onClick={() => setSelectedResolution("daily")}
          className={`px-4 py-2 rounded text-gray-700 ${
            selectedResolution === "daily"
              ? "bg-green-700 text-white"
              : "bg-gray-200"
          }`}
        >
          Daily Data
        </button>
      </div>

      {/* Date range pickers */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 ml-8">
        <div>
          <label className="block font-medium mb-1">Start Time:</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={selectedResolution === "hourly" ? "Pp" : "P"}
            className="border rounded px-4 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">End Time:</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            showTimeSelect={selectedResolution === "hourly"}
            dateFormat={selectedResolution === "hourly" ? "Pp" : "P"}
            className="border rounded px-4 py-2"
          />
        </div>
      </div>

      {/* Loading & status messages */}
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

      {/* Weight Line Chart */}
      <ResponsiveContainer width="100%" height={250} className="mt-8 ">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis
            domain={[minWeight - 1, maxWeight + 1]} // Add buffer to y-axis
            tickFormatter={(v) => v.toFixed(2)} // Format weight nicely
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
      <ResponsiveContainer width="100%" height={250} className="mt-8">
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
      <ResponsiveContainer width="100%" height={250}>
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

      {/* Brood Line Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis dataKey="time" />
          <YAxis />
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
      <ResponsiveContainer width="100%" height={250} className="mt-8">
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
