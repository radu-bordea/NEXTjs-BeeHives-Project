"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "../components/Spinner"; // General full-page spinner
import SpinnerSmall from "../components/SpinnerSmall";

export default function ScalesPage() {
  // State for scale list
  const [scales, setScales] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [perScaleSyncing, setPerScaleSyncing] = useState({}); // Tracks individual scale syncing

  // State for currently selected scale and resolution
  const [selectedScaleId, setSelectedScaleId] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState("hourly");

  // Measurement data
  const [scaleDataHourly, setScaleDataHourly] = useState(null);
  const [scaleDataDaily, setScaleDataDaily] = useState(null);

  // Error handling
  const [error, setError] = useState(null);

  const router = useRouter();

  // Fetch scale metadata from backend
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

  // Sync metadata, show all scales, then sync each scale’s data in background
  const syncScales = async () => {
    setSyncing(true);
    try {
      // Sync metadata
      const res = await fetch("/api/scales", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        // alert("✅ Synced scale metadata!");

        // Load updated scale list
        const refreshedRes = await fetch("/api/scales");
        const { scales: freshScales } = await refreshedRes.json();
        setScales(freshScales);
        setLoading(false);

        // Sync data (hourly + daily) for each scale in background
        freshScales.forEach(async (scale) => {
          setPerScaleSyncing((prev) => ({
            ...prev,
            [scale.scale_id]: true,
          }));

          try {
            const scaleDataRes = await fetch(
              `/api/scale-data/${scale.scale_id}`,
              { method: "POST" }
            );

            if (!scaleDataRes.ok) {
              let errorMessage = "Unknown error";
              try {
                const errorData = await scaleDataRes.json(); // 🛡️ guarded
                errorMessage = errorData.error || errorMessage;
              } catch (e) {
                console.warn(
                  `⚠️ Could not parse error body for scale ${scale.scale_id}`,
                  e
                );
              }

              console.error(
                `❌ Failed to sync data for scale ${scale.scale_id}: ${errorMessage}`
              );
            }
          } catch (err) {
            console.error(`❌ Error syncing scale ${scale.scale_id}:`, err);
          } finally {
            setPerScaleSyncing((prev) => ({
              ...prev,
              [scale.scale_id]: false,
            }));
          }
        });
      } else {
        setError(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      console.error("❌ Sync error:", err);
      setError("Sync failed due to an internal error.");
    } finally {
      setSyncing(false);
    }
  };

  // Fetch measurement data for a specific scale and resolution
  const fetchScaleData = async (scaleId, resolution = "hourly") => {
    setSelectedScaleId(scaleId);
    setSelectedResolution(resolution);
    setScaleDataHourly(null);
    setScaleDataDaily(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/scale-data/${scaleId}?resolution=${resolution}`
      );

      if (!res.ok) throw new Error("Full data not yet available");

      const data = await res.json();
      if (data.length === 0) {
        throw new Error("No full data yet");
      }

      if (resolution === "hourly") {
        setScaleDataHourly(data);
      } else {
        setScaleDataDaily(data);
      }
    } catch (err) {
      console.warn(
        `⚠️ Full data missing for scale ${scaleId}, trying preview...`
      );

      try {
        const fallbackRes = await fetch(
          `/api/scale-data/${scaleId}/latest?resolution=${resolution}&limit=20`
        );
        const fallback = await fallbackRes.json();
        if (resolution === "hourly") {
          setScaleDataHourly(fallback);
        } else {
          setScaleDataDaily(fallback);
        }
      } catch (fallbackErr) {
        console.error("❌ Failed to load even fallback preview:", fallbackErr);
        setError("Failed to load any data for this scale.");
      }
    }
  };

  // Initial load of scale list
  useEffect(() => {
    fetchScales();
  }, []);

  return (
    <div className="relative p-6">
      {/* Full page overlay spinner when syncing all scales */}
      {syncing && <Spinner />}

      {/* Page header */}
      <h1 className="text-2xl font-bold mb-4">🐝 Beehive Scales</h1>

      {/* Button to trigger sync */}
      <button
        onClick={syncScales}
        disabled={syncing}
        className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "🔄 Sync Scales from API"}
      </button>

      {/* Show loading or scale cards */}
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

              {/* View Data button with inline spinner */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => fetchScaleData(scale.scale_id)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  📊 View Data
                </button>
                {perScaleSyncing[scale.scale_id] && <SpinnerSmall />}
              </div>

              {/* View charts button */}
              <button
                onClick={() => router.push(`/scales/${scale.scale_id}`)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded  hover:bg-blue-700 transition"
              >
                📈 View Charts
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Show selected scale’s data if available */}
      {(scaleDataHourly || scaleDataDaily) && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Measurement Data</h3>

          {/* Resolution toggle buttons */}
          <div className="flex mb-4">
            <button
              onClick={() => fetchScaleData(selectedScaleId, "hourly")}
              className={`px-4 py-2 rounded mr-2 ${
                selectedResolution === "hourly"
                  ? "bg-blue-700 text-white"
                  : "bg-gray-200"
              }`}
            >
              Hourly Data
            </button>
            <button
              onClick={() => fetchScaleData(selectedScaleId, "daily")}
              className={`px-4 py-2 rounded ${
                selectedResolution === "daily"
                  ? "bg-green-700 text-white"
                  : "bg-gray-200"
              }`}
            >
              Daily Data
            </button>
          </div>

          {/* Measurement table */}
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
              {(selectedResolution === "hourly"
                ? scaleDataHourly
                : scaleDataDaily
              )?.map((item, index) => (
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

      {/* Error message display */}
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
