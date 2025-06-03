"use client"; // Enables client-side-only features like Google Maps

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const Map = ({ scales }) => {
  const mapRef = useRef(null); // Reference to attach the Google Map DOM element
  const [mapLoaded, setMapLoaded] = useState(false); // Tracks if the Google Maps API has finished loading
  const router = useRouter();

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
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
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

      // ℹ️ Build the HTML content for the marker's info window
      const infowindow = new window.google.maps.InfoWindow({
        content: `
          <div>
            <strong>${scale.name}</strong><br/>
            Scale ID: ${scale.scale_id}<br/>
            ${
              latestData
                ? `
                  Date: ${new Date(latestData.time).toLocaleDateString()}<br/>
                  Weight: <strong>${latestData.weight ?? "N/A"} kg</strong><br/>
                  Yield: ${latestData.yield ?? "N/A"}<br/>
                  Temp: ${latestData.temperature ?? "N/A"} °C<br/>
                  Brood: ${latestData.brood ?? "N/A"}<br/>
                  Humidity: ${latestData.humidity ?? "N/A"}<br/>
                `
                : "No recent data available.<br/>"
            }
            👉 <a href="/scales" class="go-to-scales" style="color:blue; text-decoration:underline;">Go To Scales</a>
          </div>
        `,
      });

      // 🖱️ Open the info window when the marker is clicked
      marker.addListener("click", () => {
        infowindow.open(map, marker);

        // 📦 Attach navigation handler to internal link
        setTimeout(() => {
          const btn = document.querySelector(".go-to-scales");
          if (btn) {
            btn.addEventListener("click", () => {
              router.push("/scales");
            });
          }
        }, 0);
      });
    });
  }, [mapLoaded, scales]);

  // 🧱 Render the map container div
  return <div ref={mapRef} className="w-full h-full" />;
};

export default Map;
