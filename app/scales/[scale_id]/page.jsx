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

export default function ScaleDetailPage({ params }) {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const { scale_id } = use(params); // from props, as string

  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [previewFetched, setPreviewFetched] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);

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

    fetchPreview();
    const delay = setTimeout(fetchFull, 1500);

    return () => {
      didCancel = true;
      clearTimeout(delay);
    };
  }, [scale_id, selectedResolution, startDate, endDate]);

  const weightData = chartData.map((entry) => entry.weight);
  const minWeight = Math.min(...weightData);
  const maxWeight = Math.max(...weightData);

  const selectedScale = scales.find(
    (scale) => String(scale.scale_id) === String(scale_id)
  );
  

  return (
    <div className="p-6 text-gray-500">
      <h1 className="text-2xl font-bold mb-6 ml-8">
        📊 Graphs for Scale: {selectedScale?.name || `ID: ${scale_id}`}
      </h1>

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

      <ResponsiveContainer width="100%" height={250} className="mt-8 ">
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
