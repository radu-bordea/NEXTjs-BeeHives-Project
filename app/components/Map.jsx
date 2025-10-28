"use client"; // Enables client-side-only features like Google Maps

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "../components/LanguageProvider";

const Map = ({ scales }) => {
  const mapRef = useRef(null); // DOM node for <div> where map renders
  const [mapLoaded, setMapLoaded] = useState(false); // Has Google Maps API loaded?
  const router = useRouter();

  // translation hook
  const { t, lang } = useLang();

  // 🔄 Fetch latest data (last 7 daily records) for a given scale
  const fetchLatestData = async (scaleId) => {
    try {
      const resolution = "daily";
      const limit = 7;

      const res = await fetch(
        `/api/scale-data/${scaleId}/latest?resolution=${resolution}&limit=${limit}`
      );
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) return null;

      // 🕒 Pick the most recent data point by comparing timestamps
      const latest = data.reduce(
        (latest, entry) =>
          new Date(entry.time) > new Date(latest.time) ? entry : latest,
        data[0]
      );

      // ⬅️ Return all the key metrics we want to display in the InfoWindow
      return {
        time: latest?.time ?? null,
        weight: latest?.weight ?? null,
        yield: latest?.yield ?? null,
        temperature: latest?.temperature ?? null,
        brood: latest?.brood ?? null,
        humidity: latest?.humidity ?? null,
      };
    } catch (err) {
      console.error(`Error fetching data for scale ${scaleId}:`, err);
      return null;
    }
  };

  // 🗺️ Load Google Maps JavaScript API dynamically on mount
  useEffect(() => {
    const scriptId = "google-maps-script";

    const loadGoogleMapsScript = () => {
      return new Promise((resolve) => {
        // ✅ Already loaded
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        // 🧩 Append script if it doesn't exist
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&language=en`;
          script.async = true;
          script.onload = resolve;
          document.body.appendChild(script);
        } else {
          // ⏳ Poll until Google Maps becomes available
          const interval = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(interval);
              resolve();
            }
          }, 300);
        }
      });
    };

    // 🔁 Load the map script once and set flag
    loadGoogleMapsScript().then(() => setMapLoaded(true));
  }, []);

  // 🗺️ Create and render the map + markers once everything is ready
  useEffect(() => {
    // ✅ Guard clause: wait for script + map ref + data
    if (!mapLoaded || !mapRef.current || scales.length === 0) return;

    // 🌍 Initialize the Google Map instance
    const map = new window.google.maps.Map(mapRef.current, {
      center: {
        lat: parseFloat(scales[0].latitude),
        lng: parseFloat(scales[0].longitude),
      },
      zoom: 10,
      scaleControl: true,
      gestureHandling: "auto",
      scrollwheel: true,
    });

    // 📍 Add a marker for each scale with an info window
    scales.forEach(async (scale) => {
      const position = {
        lat: parseFloat(scale.latitude),
        lng: parseFloat(scale.longitude),
      };

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: scale.name,
      });

      // 📦 Fetch the latest 7-day data and pick the most recent
      const latestData = await fetchLatestData(scale.scale_id);

      // helper to safely show a value or fallback
      const fmt = (val, unit = "") => {
        if (val === null || val === undefined) {
          return t("maps.na");
        }
        return unit ? `${val} ${unit}` : `${val}`;
      };

      // localized date string
      const dateStr = latestData?.time
        ? new Date(latestData.time).toLocaleDateString(
            lang === "sv" ? "sv-SE" : "en-US"
          )
        : t("maps.na");

      // ℹ️ Build the HTML content for the marker's info window
      // We FORCE a light card so it's readable even in dark mode map/app.
      const infowindow = new window.google.maps.InfoWindow({
        content: `
          <div
            style="
              background:#ffffff;
              color:#111827;
              border:1px solid #e5e7eb;
              border-radius:8px;
              padding:12px;
              font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
              font-size:13px;
              line-height:1.4;
              min-width:180px;
              max-width:240px;
            "
          >
            <div style="font-weight:600; font-size:14px; margin-bottom:4px;">
              ${scale.name}
            </div>

            <div style="margin-bottom:8px;">
              ${t("maps.scaleId")}: ${scale.scale_id}<br/>
              ${
                latestData
                  ? `
                    ${t("maps.date")}: ${dateStr}<br/>
                    ${t("maps.weight")}: <strong>${fmt(
                      latestData.weight,
                      "kg"
                    )}</strong><br/>
                    ${t("maps.yield")}: ${fmt(latestData.yield)}<br/>
                    ${t("maps.temp")}: ${fmt(
                      latestData.temperature,
                      "°C"
                    )}<br/>
                    ${t("maps.brood")}: ${fmt(latestData.brood)}<br/>
                    ${t("maps.humidity")}: ${fmt(
                      latestData.humidity,
                      "%"
                    )}<br/>
                  `
                  : `${t("maps.noRecent")}<br/>`
              }
            </div>

            <div style="font-size:13px;">
              👉 <a
                href="/scales"
                class="go-to-scales"
                style="color:#1d4ed8; text-decoration:underline; font-weight:500;"
              >
                ${t("maps.gotoScales")}
              </a><br/>
              👉 <a
                href="/scales/${scale.scale_id}"
                class="go-to-charts"
                style="color:#1d4ed8; text-decoration:underline; font-weight:500;"
              >
                ${scale.name} ${t("maps.chartsLink")}
              </a>
            </div>
          </div>
        `,
      });

      // 🖱️ Open the info window when the marker is clicked
      marker.addListener("click", () => {
        infowindow.open(map, marker);

        // 📦 Attach navigation handler to internal links (SPA style)
        setTimeout(() => {
          const btnGoScales = document.querySelector(".go-to-scales");
          if (btnGoScales) {
            btnGoScales.addEventListener("click", (e) => {
              e.preventDefault();
              router.push("/scales");
            });
          }

          const btnGoCharts = document.querySelector(".go-to-charts");
          if (btnGoCharts) {
            btnGoCharts.addEventListener("click", (e) => {
              e.preventDefault();
              router.push(`/scales/${scale.scale_id}`);
            });
          }
        }, 0);
      });
    });
  }, [mapLoaded, scales, t, lang, router]);

  // 🧱 Render the map container div
  return <div ref={mapRef} className="w-full h-full" />;
};

export default Map;
