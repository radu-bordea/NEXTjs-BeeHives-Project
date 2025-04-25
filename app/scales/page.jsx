// app/scales/page.js
"use client";

import { useEffect, useState } from "react";

export default function ScalesPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

const syncScales = async () => {
  setSyncing(true);
  try {
    const res = await fetch("/api/scales", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ Synced ${data.count} scales`);
      fetchScales();
    } else {
      console.error(`❌ Failed to sync: ${data.error}`);
      setError(data.error || 'Failed to sync scales');
    }
  } catch (err) {
    console.error("❌ Sync error:", err);
    setError("Sync failed due to an internal error.");
  } finally {
    setSyncing(false);
  }
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
              <p className="text-sm text-gray-500 mt-2">
                Last Transmission:
                <br />
                <span className="font-mono">
                  {new Date(
                    scale.latest_transmission_timestamp
                  ).toLocaleString()}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
