"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Spinner from "../components/Spinner";
import SpinnerSmall from "../components/SpinnerSmall";
import Loading from "../components/Loading";
import ScaleCard from "../components/ScaleCard";
import Table from "../components/Table";
import { signIn, signOut, useSession } from "next-auth/react";

export default function ScalesPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadTableData, setLoadTableData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [perScaleSyncing, setPerScaleSyncing] = useState({});
  const [selectedScale, setSelectedScale] = useState(null); // Updated
  const [selectedResolution, setSelectedResolution] = useState("hourly");
  const [scaleDataHourly, setScaleDataHourly] = useState(null);
  const [scaleDataDaily, setScaleDataDaily] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  const { data: session, status } = useSession();

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

  const handleData = (id) => {
    const scale = scales.find((s) => s.scale_id === id);
    if (scale) {
      setSelectedScale(scale); // Store full scale
      fetchScaleData(id);
      setLoadTableData(true);
    }
  };

  const syncScales = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/scales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = await res.json();

      if (res.ok) {
        const refreshedRes = await fetch("/api/scales");
        const { scales: freshScales } = await refreshedRes.json();
        setScales(freshScales);
        setLoading(false);

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
                const errorData = await scaleDataRes.json();
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

  const fetchScaleData = async (scaleId, resolution = "hourly") => {
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
      if (data.length === 0) throw new Error("No full data yet");

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

  useEffect(() => {
    fetchScales();
  }, []);

  return (
    <div className="relative p-6">
      {syncing && <Spinner />}
      <h1 className="text-2xl font-bold mb-4">🐝 Beehive Scales</h1>
      {status === "authenticated" && (
        <button
          onClick={syncScales}
          disabled={syncing}
          className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "🔄 Sync Scales from API"}
        </button>
      )}
      {loading ? (
        <Loading title="Loading Page..." />
      ) : (
        <div className="overflow-x-auto md:overflow-x-visible">
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-max md:w-auto">
            {scales.map((scale, index) => (
              <ScaleCard
                key={scale.scale_id}
                scale={scale}
                index={index}
                onViewData={handleData}
                perScaleSyncing={perScaleSyncing}
                onViewCharts={(id) => router.push(`/scales/${id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {(scaleDataHourly || scaleDataDaily) && (
        <Table
          data={
            selectedResolution === "hourly" ? scaleDataHourly : scaleDataDaily
          }
          selectedResolution={selectedResolution}
          onResolutionChange={(res) =>
            fetchScaleData(selectedScale?.scale_id, res)
          }
          scaleName={selectedScale?.name || selectedScale?.scale_id}
        />
      )}

      {loadTableData && <Loading title="Loading Table Data..." />}
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
