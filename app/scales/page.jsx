"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useScales from "../../hooks/useScales"; // Custom SWR hook for scale metadata
import { mutate } from "swr";
import Spinner from "../components/Spinner"; // Full-page spinner
import SpinnerSmall from "../components/SpinnerSmall"; // Inline spinner
import Loading from "../components/Loading"; // Title-based loading state

export default function ScalesPage() {
  // Directly call useScales hook here
  const { scales, isLoading, isError } = useScales(); // Fetch scale metadata
  const [loadTableData, setLoadTableData] = useState(false); // Show/hide data table loading spinner
  const [syncing, setSyncing] = useState(false); // Full sync state
  const [perScaleSyncing, setPerScaleSyncing] = useState({}); // Track sync per scale

  const [selectedScaleId, setSelectedScaleId] = useState(null); // Which scale's data to display
  const [selectedResolution, setSelectedResolution] = useState("hourly"); // hourly or daily view

  const [scaleDataHourly, setScaleDataHourly] = useState(null);
  const [scaleDataDaily, setScaleDataDaily] = useState(null);

  const [error, setError] = useState(null); // Any fetch error
  const router = useRouter();

  // Load measurement data for selected scale
  const handleData = (id) => {
    fetchScaleData(id);
    setLoadTableData(true); // Triggers table spinner
  };

  // SYNC scales metadata and then fire background sync of individual scale data
  const syncScales = async () => {
    setSyncing(true);
    try {
      // POST request to trigger scale metadata sync
      const res = await fetch("/api/scales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        // Revalidate scale list with SWR
        await mutate("/api/scales");

        // Background sync: loop through and sync data per scale
        for (const scale of data.scales || []) {
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
                const errorData = await scaleDataRes.json(); // Defensive parse
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
        }
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

  // Load measurement data for one scale (hourly or daily)
  const fetchScaleData = async (scaleId, resolution = "hourly") => {
    setSelectedScaleId(scaleId);
    setSelectedResolution(resolution);
    setScaleDataHourly(null);
    setScaleDataDaily(null);
    setError(null);

    try {
      // Try full dataset first
      const res = await fetch(
        `/api/scale-data/${scaleId}?resolution=${resolution}`
      );
      if (!res.ok) throw new Error("Full data not yet available");

      const data = await res.json();
      if (data.length === 0) throw new Error("No full data yet");

      if (resolution === "hourly") {
        setScaleDataHourly(data);
        setLoadTableData(!loadTableData);
      } else {
        setScaleDataDaily(data);
        setLoadTableData(!loadTableData);
      }
    } catch (err) {
      console.warn(`⚠️ Full data missing for ${scaleId}, loading fallback...`);
      // Try preview fallback if full data fails
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
        console.error("❌ Fallback failed too:", fallbackErr);
        setError("Failed to load any data for this scale.");
      }
    }
  };

  return (
    <div className="relative p-6">
      {/* Full-screen spinner while syncing all scales */}
      {syncing && <Spinner />}

      {/* Header and Sync Button */}
      <h1 className="text-2xl font-bold mb-4">🐝 Beehive Scales</h1>
      <button
        onClick={syncScales}
        disabled={syncing}
        className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "🔄 Sync Scales from API"}
      </button>

      {/* Loading states or scale list */}
      {isLoading ? (
        <Loading title="Loading Page..." />
      ) : isError ? (
        <div className="text-red-500">❌ Failed to load scales.</div>
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

              {/* Load data + show sync spinner */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => handleData(scale.scale_id)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  📊 View Data
                </button>
                {perScaleSyncing[scale.scale_id] && <SpinnerSmall />}
              </div>

              {/* Navigate to charts page */}
              <button
                onClick={() => router.push(`/scales/${scale.scale_id}`)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                📈 View Charts
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Display measurement data table */}
      {(scaleDataHourly || scaleDataDaily) && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Measurement Data</h3>

          {/* Toggle hourly/daily */}
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

          {/* Table of values */}
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
              )
                ?.sort((a, b) => new Date(b.time) - new Date(a.time)) // Sort by time, newest first
                .map((item, index) => (
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

      {/* Table data spinner */}
      {loadTableData && <Loading title="Loading Table Data..." />}

      {/* Display any top-level errors */}
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
