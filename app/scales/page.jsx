"use client";

import { useEffect, useState } from "react";

export default function ScalesPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedScaleData, setSelectedScaleData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch scales from the database (you already stored them earlier)
  const fetchScales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scales");
      const data = await res.json();
      setScales(data.scales || []);
    } catch (err) {
      console.error("❌ Error loading scales:", err);
      setError("Failed to load scales.");
    } finally {
      setLoading(false);
    }
  };

  // Sync scales with the API (fetch and store data in the database)
  const syncScales = async () => {
    setSyncing(true);
    try {
      // Trigger the data fetch and storage in the database
      for (const scale of scales) {
        const res = await fetch(`/api/scale-data/${scale.scale_id}`, {
          method: "POST",
        });
        const data = await res.json();
        if (res.ok) {
          alert(`✅ Synced data for scale ID: ${scale.scale_id}`);
        } else {
          console.error(
            `❌ Failed to sync scale ${scale.scale_id}: ${data.error}`
          );
        }
      }
      fetchScales(); // Refresh the scales data after sync
    } catch (err) {
      console.error("❌ Sync error:", err);
      setError("Sync failed due to an internal error.");
    } finally {
      setSyncing(false);
    }
  };

  // Fetch stored scale data from the database
  const fetchScaleData = async (scaleId) => {
    setSelectedScaleData(null); // Reset data before fetching new
    setError(null); // Reset error before fetching new data
    try {
      const res = await fetch(`/api/scale-data/${scaleId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch scale data");
      }
      const data = await res.json();
      setSelectedScaleData(data); // Set the scale data into the state
      console.log(selectedScaleData);
      
    } catch (err) {
      console.error("❌ Error fetching scale data:", err);
      setError("Failed to fetch scale data.");
    }
  };

  // Handle when the user clicks a scale to view its data
  const handleScaleClick = (scaleId) => {
    fetchScaleData(scaleId); // Trigger the data fetch
  };

  // Run the fetch scales on initial load
  useEffect(() => {
    fetchScales();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🐝 Beehive Scales</h1>

      <button
        onClick={syncScales}
        disabled={syncing}
        className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "🔄 Sync Scales from API"}
      </button>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scales.map((scale) => (
            <div
              key={scale.scale_id}
              className="bg-white border rounded-2xl shadow p-4 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-indigo-600">
                Serial Number: {scale.serial_number}
              </h2>
              <p className="text-sm text-gray-700">
                Scale ID: {scale.scale_id}
              </p>
              <p className="text-sm text-gray-700">
                Hardware Key: {scale.hardware_key}
              </p>
              <button
                onClick={() => handleScaleClick(scale.scale_id)} // Fetch and display data for this scale
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              >
                📊 View Data
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Render the selected scale data if available */}
      {selectedScaleData && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Measurement Data</h3>
          {/* Render data in a table */}
          <table className="table-auto w-full border">
            <thead>
              <tr>
                <th className="border px-4 py-2">Time</th>
                <th className="border px-4 py-2">Weight</th>
                <th className="border px-4 py-2">Temperature</th>
                <th className="border px-4 py-2">Humidity</th>
              </tr>
            </thead>
            <tbody>
              {selectedScaleData.map((item, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">
                    <td className="border px-4 py-2">
                      {item.time ? new Date(item.time).toLocaleString() : "N/A"}
                    </td>
                  </td>
                  <td className="border px-4 py-2">{item.weight}</td>
                  <td className="border px-4 py-2">{item.temperature}</td>
                  <td className="border px-4 py-2">{item.humidity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Render error message */}
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
