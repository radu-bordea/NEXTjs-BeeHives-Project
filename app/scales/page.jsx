"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Spinner from "../components/Spinner";
import Loading from "../components/Loading";
import ScaleCard from "../components/ScaleCard";
import Table from "../components/Table";
import getPageRange from "@/utils/paginationRange"; // or your relative path
import { useSession } from "next-auth/react";

export default function ScalesPage() {
  // --- State setup ---
  const [scales, setScales] = useState([]); // list of all scales
  const [loading, setLoading] = useState(true); // page loading
  const [loadTableData, setLoadTableData] = useState(false); // show table loading
  const [syncing, setSyncing] = useState(false); // sync all scales
  const [perScaleSyncing, setPerScaleSyncing] = useState({}); // syncing individual scale
  const [selectedScale, setSelectedScale] = useState(null); // scale selected for table
  const [selectedResolution, setSelectedResolution] = useState("hourly"); // current resolution
  const [scaleDataHourly, setScaleDataHourly] = useState(null); // hourly data
  const [scaleDataDaily, setScaleDataDaily] = useState(null); // daily data
  const [error, setError] = useState(null); // error message
  const [currentPage, setCurrentPage] = useState(1); // current page number
  const rowsPerPage = 15; // max rows per page
  const router = useRouter();
  const { data: session, status } = useSession(); // current user session

  // Choose the correct data depending on resolution
  const fullData =
    selectedResolution === "hourly" ? scaleDataHourly : scaleDataDaily;

  // ✅ NEW: sort the entire dataset (latest first) WITHOUT mutating original
  const sortedFullData = Array.isArray(fullData)
    ? [...fullData].sort((a, b) => {
        const at = new Date(a?.time).getTime();
        const bt = new Date(b?.time).getTime();
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
        if (Number.isNaN(at)) return 1; // invalid/missing dates go last
        if (Number.isNaN(bt)) return -1;
        return bt - at; // latest first
      })
    : null;

  // ✅ Paginate AFTER sorting
  const paginatedData = sortedFullData?.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ✅ Total pages from sorted data length
  const totalPages = sortedFullData
    ? Math.ceil(sortedFullData.length / rowsPerPage)
    : 0;

  // --- Arrow key pagination (← and →) ---
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        setCurrentPage((p) => Math.max(p - 1, 1));
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        setCurrentPage((p) => Math.min(p + 1, totalPages));
      }
    },
    [currentPage, totalPages]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // --- Fetch all scales from the API ---
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

  // When a scale card is clicked
  const handleData = (id) => {
    const scale = scales.find((s) => s.scale_id === id);
    if (scale) {
      setSelectedScale(scale);
      fetchScaleData(id);
      setLoadTableData(true);
    }
  };

  // Sync all scales from external API
  const syncScales = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/scales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        const refreshedRes = await fetch("/api/scales");
        const { scales: freshScales } = await refreshedRes.json();
        setScales(freshScales);
        setLoading(false);

        // Trigger data load for each scale
        freshScales.forEach(async (scale) => {
          setPerScaleSyncing((prev) => ({
            ...prev,
            [scale.scale_id]: true,
          }));

          try {
            await fetch(`/api/scale-data/${scale.scale_id}`, {
              method: "POST",
            });
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

  // Load scale data for hourly/daily
  const fetchScaleData = async (scaleId, resolution = "daily") => {
    setSelectedResolution(resolution);
    setScaleDataHourly(null);
    setScaleDataDaily(null);
    setError(null);
    setCurrentPage(1); // reset pagination

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
      console.warn("⚠️ Full data missing, trying preview...");
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
        console.error("❌ Fallback failed:", fallbackErr);
        setError("Failed to load any data for this scale.");
      }
    }
  };

  useEffect(() => {
    fetchScales();
  }, []);

  // --- Pagination controls renderer ---
  const renderPagination = () =>
    totalPages > 1 && (
      <div className="flex justify-center mt-4 space-x-1 flex-wrap">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>

        {getPageRange(currentPage, totalPages, 2).map((item, index) => (
          <button
            key={index}
            disabled={item === "..."}
            onClick={() => typeof item === "number" && setCurrentPage(item)}
            className={`px-3 py-1 border rounded ${
              item === currentPage
                ? "bg-indigo-600 text-white"
                : "hover:bg-gray-100"
            } ${item === "..." ? "cursor-default opacity-50" : ""}`}
          >
            {item}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );

  return (
    <div className="relative p-6">
      {syncing && <Spinner />}
      <h1 className="text-2xl font-bold mb-4">🐝 Beehive Scales</h1>

      {/* Sync button (only for authenticated users) */}
      {status === "authenticated" && (
        <button
          onClick={syncScales}
          disabled={syncing}
          className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "🔄 Sync Scales from API"}
        </button>
      )}

      {/* Show scale cards or loading spinner */}
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

      {/* Table with paginated data */}
      {paginatedData && (
        <>
          <Table
            data={paginatedData}
            selectedResolution={selectedResolution}
            onResolutionChange={(res) =>
              fetchScaleData(selectedScale?.scale_id, res)
            }
            scaleName={selectedScale?.name || selectedScale?.scale_id}
          />
          {renderPagination()}
        </>
      )}

      {/* Table loader */}
      {loadTableData && <Loading title="Loading Table Data..." />}

      {/* Error message */}
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
