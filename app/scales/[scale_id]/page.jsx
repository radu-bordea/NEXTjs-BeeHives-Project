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
  const { scale_id } = use(params);
  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    async function fetchData() {
      if (!startDate || !endDate || startDate > endDate) return;

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      try {
        const res = await fetch(
          `/api/scale-data/${scale_id}?resolution=${selectedResolution}&start=${encodeURIComponent(
            startISO
          )}&end=${encodeURIComponent(endISO)}`
        );
        const json = await res.json();

        const formatted = json.map((entry) => ({
          ...entry,
          time: new Date(entry.time).toLocaleString(),
          weight: entry.weight ?? 0,
          temperature: entry.temperature ?? 0,
          humidity: entry.humidity ?? 0,
        }));

        setChartData(formatted);
      } catch (err) {
        console.error("❌ Error fetching scale data:", err);
      }
    }

    fetchData();
  }, [scale_id, selectedResolution, startDate, endDate]);

  // Calculate min and max for weight to dynamically adjust the zoom level
  const weightData = chartData.map((entry) => entry.weight);
  const minWeight = Math.min(...weightData);
  const maxWeight = Math.max(...weightData);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        📊 Graphs for Scale ID: {scale_id}
      </h1>

      <div className="flex mb-4">
        <button
          onClick={() => setSelectedResolution("hourly")}
          className={`px-4 py-2 rounded mr-2 ${
            selectedResolution === "hourly"
              ? "bg-blue-700 text-white"
              : "bg-gray-200"
          }`}
        >
          Hourly Data
        </button>
        <button
          onClick={() => setSelectedResolution("daily")}
          className={`px-4 py-2 rounded ${
            selectedResolution === "daily"
              ? "bg-green-700 text-white"
              : "bg-gray-200"
          }`}
        >
          Daily Data
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
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

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis
            domain={[minWeight - 5, maxWeight + 5]} // Add a little padding to make the chart easier to see
          />
          <Tooltip />
          <Legend />
          <Line dataKey="weight" stroke="#fb8c00" type="monotone" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={250} className="mt-8">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="humidity" fill="#1e88e5" />
        </BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={250} className="mt-8">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis
            domain={[minWeight - 1, maxWeight + 1]} // Add a little padding to make the chart easier to see
          />
          <Tooltip />
          <Legend />
          <Line dataKey="weight" stroke="#fb8c00" type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
