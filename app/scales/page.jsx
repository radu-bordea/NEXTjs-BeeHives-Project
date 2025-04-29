"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "../components/Spinner";

export default function ScalesPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState("hourly");
  const [selectedScaleId, setSelectedScaleId] = useState(null);
  const [scaleDataHourly, setScaleDataHourly] = useState(null);
  const [scaleDataDaily, setScaleDataDaily] = useState(null);
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
      // Step 1: Sync and save scales data to the database
      const res = await fetch("/api/scales", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Synced scales data for all scales!`);

        // Step 2: Fetch the fresh scales directly
        const scalesRes = await fetch("/api/scales");
        const { scales: freshScales } = await scalesRes.json();

        // Step 3: Now that scales are saved and freshly fetched, loop through them
        for (const scale of freshScales) {
          console.log(
            `📤 Fetching and saving hourly and daily data for scale ID: ${scale.scale_id}`
          );

          const scaleDataRes = await fetch(
            `/api/scale-data/${scale.scale_id}`,
            {
              method: "POST",
            }
          );

          if (scaleDataRes.ok) {
            console.log(
              `✅ Hourly and daily data synced for scale ID: ${scale.scale_id}`
            );
          } else {
            const errorData = await scaleDataRes.json();
            console.error(
              `❌ Failed to sync hourly and daily data for scale ${scale.scale_id}: ${errorData.error}`
            );
          }
        }

        // Refresh scales list into state
        fetchScales();
      } else {
        console.error(`❌ Failed to sync scales data: ${data.error}`);
        setError(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      console.error("❌ Sync error:", err);
      setError("Sync failed due to an internal error.");
    } finally {
      setSyncing(false);
    }
  };

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
    if (!res.ok) throw new Error("Failed to fetch scale data");
    const data = await res.json();
    if (resolution === "hourly") {
      setScaleDataHourly(data);
    } else {
      setScaleDataDaily(data);
    }
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
    <div className="relative p-6">
      {/* Sync Loading Overlay */}
      {syncing && <Spinner />}

      {/* Main Page Content */}
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

      {(scaleDataHourly || scaleDataDaily) && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Measurement Data</h3>

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

      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
