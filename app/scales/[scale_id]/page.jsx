"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState, use } from "react";

export default function ScaleDetailPage({ params }) {
  const { scale_id } = use(params); // ✅ unwrap Promise-like params with use()
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/scale-data/${scale_id}`);
      const json = await res.json();

      const formatted = json.map((m) => ({
        ...m,
        time: new Date(m.time).toLocaleString(),
        weight: m.weight || 0,
        temperature: m.temperature || 0,
        humidity: m.humidity || 0,
      }));

      setData(formatted);
    }

    fetchData();
  }, [scale_id]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        📊 Graphs for Scale ID: {scale_id}
      </h1>

      {/* Example: render one of the temperature chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>

      {/* Example: render one of the humidity chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="humidity" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>

      {/* Example: render one of the weight chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="weight" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
