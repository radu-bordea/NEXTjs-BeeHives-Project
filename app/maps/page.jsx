"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLang } from "../components/LanguageProvider";

// map must be client-only (uses window.google)
const Map = dynamic(() => import("../components/Map"), { ssr: false });

const MapsPage = () => {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);

  const { t } = useLang(); // 👈 get translator

  useEffect(() => {
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

    fetchScales();
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden m-0 p-0">
      {loading ? <p>{t("maps.loading")}</p> : <Map scales={scales} />}
    </div>
  );
};

export default MapsPage;
