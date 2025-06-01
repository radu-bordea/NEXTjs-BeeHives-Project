"use client"; // Marks this as a client-side component (needed for browser-only APIs like `window`)

import { useEffect, useRef, useState } from "react";

const Map = ({ scales }) => {
  const mapRef = useRef(null); // Ref to attach the Google Map to a DOM element
  const [mapLoaded, setMapLoaded] = useState(false); // State to track if the Google Maps script is loaded

  // Effect to dynamically load the Google Maps JavaScript API
  useEffect(() => {
    const scriptId = "google-maps-script";

    // Function that returns a promise to load the script
    const loadGoogleMapsScript = () => {
      return new Promise((resolve) => {
        // If already loaded, resolve immediately
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        // If script not yet added to the document, create and append it
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
          script.async = true;
          script.onload = resolve; // Resolve when script is loaded
          document.body.appendChild(script);
        } else {
          // Script exists but not ready yet — poll until available
          const interval = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(interval);
              resolve();
            }
          }, 300); // Check every 300ms
        }
      });
    };

    // Start loading the script
    loadGoogleMapsScript().then(() => setMapLoaded(true));
  }, []);

  // Effect to initialize the map once the script and data are ready
  useEffect(() => {
    // Guard: wait until the script is loaded, ref is mounted, and data is present
    if (!mapLoaded || !mapRef.current || scales.length === 0) return;

    // Create a new Google Map instance
    const map = new window.google.maps.Map(mapRef.current, {
      center: {
        lat: parseFloat(scales[0].latitude), // Start centered at first scale location
        lng: parseFloat(scales[0].longitude),
      },
      zoom: 10, // Default zoom level
    });

    // Add a marker for each scale point
    scales.forEach((scale) => {
      const marker = new window.google.maps.Marker({
        position: {
          lat: parseFloat(scale.latitude),
          lng: parseFloat(scale.longitude),
        },
        map,
        title: scale.name,
      });

      // Add an info window that shows scale name and ID when clicked
      const infowindow = new window.google.maps.InfoWindow({
        content: `<strong>${scale.name}</strong><br/>ID: ${scale.scale_id}`,
      });

      marker.addListener("click", () => {
        infowindow.open(map, marker);
      });
    });
  }, [mapLoaded, scales]); // Re-run when map loads or data changes

  // Render the map container
  return <div ref={mapRef} className="w-full h-3/4" />;
};

export default Map;
