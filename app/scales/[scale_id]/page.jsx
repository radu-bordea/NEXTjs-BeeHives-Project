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

export default function ScaleDetailPage({ params }) {
  const { scale_id } = use(params);
  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [scaleDataDaily, setScaleDataDaily] = useState([]);
  const [scaleDataHourly, setScaleDataHourly] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/scale-data/${scale_id}?resolution=${selectedResolution}`
        );
        const json = await res.json();

        const formatted = json.map((m) => ({
          ...m,
          time: new Date(m.time).toLocaleString(),
          weight: m.weight || 0,
          temperature: m.temperature || 0,
          humidity: m.humidity || 0,
        }));

        if (selectedResolution === "daily") {
          setScaleDataDaily(formatted);
        } else {
          setScaleDataHourly(formatted);
        }
      } catch (err) {
        console.error("❌ Error fetching scale data:", err);
      }
    }

    fetchData();
  }, [scale_id, selectedResolution]);

  const chartData =
    selectedResolution === "daily" ? scaleDataDaily : scaleDataHourly;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        📊 Graphs for Scale ID: {scale_id}
      </h1>

      <h3 className="text-xl font-semibold mb-4">Measurement Data</h3>

      <div className="flex mb-6">
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

      {/* Temperature Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#e53935" />
        </LineChart>
      </ResponsiveContainer>

      {/* Humidity Chart */}
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

      {/* Weight Chart */}
      <ResponsiveContainer width="100%" height={250} className="mt-8">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="weight" stroke="#fb8c00" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
