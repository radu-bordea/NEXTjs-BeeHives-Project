"use client";

// Importing necessary components from recharts and other libraries
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

// Main component to show data charts for a specific scale
export default function ScaleDetailPage({ params }) {
  // Calculate today's date and the date one week ago for default date range
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  // Destructure scale ID from URL params
  const { scale_id } = use(params);

  // States for chart resolution (daily/hourly), data, and selected date range
  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [chartData, setChartData] = useState([]);
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  // Fetch chart data whenever relevant filters change
  useEffect(() => {
    async function fetchData() {
      // Prevent fetch if dates are invalid
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

        // Format the response for chart rendering
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

  // Dynamically calculate min/max values for weight chart scaling
  const weightData = chartData.map((entry) => entry.weight);
  const minWeight = Math.min(...weightData);
  const maxWeight = Math.max(...weightData);

  return (
    <div className="p-6">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 ml-8">
        📊 Graphs for Scale ID: {scale_id}
      </h1>

      {/* Resolution Selector Buttons */}
      <div className="flex mb-4 ml-8">
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

      {/* Date Pickers for Start and End Date */}
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

      {/* First Chart: Temperature over Time */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line dataKey="temperature" stroke="#e53935" type="monotone" />
        </LineChart>
      </ResponsiveContainer>

      {/* Second Chart: Humidity as Bar Chart */}
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

      {/* Third Chart: Weight with Dynamic Y-Axis */}
      <ResponsiveContainer width="100%" height={250} className="mt-8">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[minWeight - 1, maxWeight + 1]} 
          tickFormatter={(value)=> value.toFixed(2)}/>
          <Tooltip />
          <Legend />
          <Line dataKey="weight" stroke="#fb8c00" type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
