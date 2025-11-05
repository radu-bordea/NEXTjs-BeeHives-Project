"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Spinner from "../components/Spinner";
import Loading from "../components/Loading";
import ScaleCard from "../components/ScaleCard";
import Table from "../components/Table";
import getPageRange from "@/utils/paginationRange";
import { useSession } from "next-auth/react";
import { useLang } from "../components/LanguageProvider";
import Image from "next/image";
import bidata from "@/public/assets/images/bidata.png";

export default function ScalesPage() {
  const { t } = useLang();

  // --- State setup ---
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadTableData, setLoadTableData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [perScaleSyncing, setPerScaleSyncing] = useState({});
  const [selectedScale, setSelectedScale] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState("daily");
  const [scaleDataHourly, setScaleDataHourly] = useState(null);
  const [scaleDataDaily, setScaleDataDaily] = useState(null);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const router = useRouter();
  const { data: session, status } = useSession();

  const controllerRef = useRef(null);

  const fullData =
    selectedResolution === "hourly" ? scaleDataHourly : scaleDataDaily;

  const sortedFullData = Array.isArray(fullData)
    ? [...fullData].sort((a, b) => {
        const at = new Date(a?.time).getTime();
        const bt = new Date(b?.time).getTime();
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
        if (Number.isNaN(at)) return 1;
        if (Number.isNaN(bt)) return -1;
        return bt - at;
      })
    : null;

  const paginatedData = sortedFullData?.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

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
      setError(t("scalesPage.loadErrorScales"));
    } finally {
      setLoading(false);
    }
  };

  // --- Load scale data (hourly/daily) ---
  const fetchScaleData = async (scaleId, resolution = "daily") => {
    setLoadTableData(true);

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setSelectedResolution(resolution);
    setScaleDataHourly(null);
    setScaleDataDaily(null);
    setError(null);
    setCurrentPage(1);

    try {
      const res = await fetch(
        `/api/scale-data/${scaleId}?resolution=${resolution}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("Full data not yet available");

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No full data yet");
      }

      if (resolution === "hourly") {
        setScaleDataHourly(data);
      } else {
        setScaleDataDaily(data);
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      console.warn("⚠️ Full data missing, trying preview...");
      try {
        const fallbackRes = await fetch(
          `/api/scale-data/${scaleId}/latest?resolution=${resolution}&limit=20`,
          { signal: controller.signal }
        );
        const fallback = await fallbackRes.json();
        if (resolution === "hourly") {
          setScaleDataHourly(fallback);
        } else {
          setScaleDataDaily(fallback);
        }
      } catch (fallbackErr) {
        if (fallbackErr?.name === "AbortError") return;
        console.error("❌ Fallback failed:", fallbackErr);
        setError(t("scalesPage.loadErrorData"));
      }
    } finally {
      if (controllerRef.current === controller) {
        setLoadTableData(false);
      }
    }
  };

  // When clicking "View Data" on a card
  const handleData = (id) => {
    const scale = scales.find((s) => s.scale_id === id);
    if (scale) {
      setSelectedScale(scale);
      fetchScaleData(id, selectedResolution);
    }
  };

  // Sync all scales (admin only)
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

        // Fire sync for each individual scale
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
        setError(`${t("scalesPage.syncFailed")}: ${data.error}`);
      }
    } catch (err) {
      console.error("❌ Sync error:", err);
      setError(t("scalesPage.syncInternalError"));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchScales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination controls
  const renderPagination = () =>
    totalPages > 1 && (
      <div className="flex justify-center mt-4 space-x-1 flex-wrap">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          {t("pagination.prev")}
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
          {t("pagination.next")}
        </button>
      </div>
    );

  const resLabel =
    selectedResolution === "hourly" ? t("scale.hourly") : t("scale.daily");

  return (
    <div className="relative p-6">
      {syncing && <Spinner />}

      <h1 className="text-2xl font-bold mb-4">
        {" "}
        <div className="py-4">
          <Image
            src={bidata}
            alt="BiData logo"
            width={100}
            height={100}
            className="object-contain"
          />
        </div>{" "}
        {t("scalesPage.title")}
      </h1>

      {/* Sync button (admin only) */}
      {status === "authenticated" && session?.user?.isAdmin && (
        <button
          onClick={syncScales}
          disabled={syncing}
          className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {syncing ? t("scalesPage.syncing") : t("scalesPage.syncButton")}
        </button>
      )}

      {/* Cards or spinner */}
      {loading ? (
        <Spinner />
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

      {/* Data table */}
      {paginatedData && !loadTableData && (
        <>
          {selectedScale &&
            status === "authenticated" &&
            session?.user?.isAdmin && (
              <div className="flex flex-wrap gap-2 my-3">
                <a
                  className="bg-indigo-700 text-white px-3 py-2 rounded hover:bg-indigo-600"
                  href={`/api/scale-data/${encodeURIComponent(
                    selectedScale.scale_id
                  )}?resolution=${encodeURIComponent(
                    selectedResolution
                  )}&format=csv`}
                >
                  ⬇️ {t("scalesPage.downloadCsv")} ({resLabel})
                </a>
              </div>
            )}

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
      {loadTableData && <Loading title={t("scalesPage.loadingTable")} />}

      {/* Error message */}
      {error && (
        <div className="mt-4 text-red-500">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
