"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ScalesPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedScaleData, setSelectedScaleData] = useState(null);
  const [error, setError] = useState(null);

  const router = useRouter();

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

  const syncScales = async () => {
    setSyncing(true);
    try {
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
      fetchScales();
    } catch (err) {
      console.error("❌ Sync error:", err);
      setError("Sync failed due to an internal error.");
    } finally {
      setSyncing(false);
    }
  };

  const fetchScaleData = async (scaleId) => {
    setSelectedScaleData(null);
    setError(null);
    try {
      const res = await fetch(`/api/scale-data/${scaleId}`);
      if (!res.ok) throw new Error("Failed to fetch scale data");
      const data = await res.json();
      setSelectedScaleData(data);
    } catch (err) {
      console.error("❌ Error fetching scale data:", err);
      setError("Failed to fetch scale data.");
    }
  };

  const handleScaleClick = (scaleId) => {
    fetchScaleData(scaleId);
  };

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
                onClick={() => handleScaleClick(scale.scale_id)}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              >
                📊 View Data
              </button>

              <button
                onClick={() => router.push(`/scales/${scale.scale_id}`)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded ml-2 hover:bg-blue-700 transition"
              >
                📈 View Charts
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedScaleData && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Measurement Data</h3>
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
                    {item.time ? new Date(item.time).toLocaleString() : "N/A"}
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

      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
