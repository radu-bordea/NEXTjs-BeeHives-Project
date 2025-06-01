"use client"; // Tells Next.js this is a client-side component (required for hooks like useState/useEffect)

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import the Map component with server-side rendering (SSR) turned off
// This is important because the Google Maps API uses `window`, which doesn't exist on the server
const Map = dynamic(() => import("../components/Map"), { ssr: false });

const MapsPage = () => {
  // State to hold the list of scales from the backend
  const [scales, setScales] = useState([]);

  // State to show loading indicator while fetching
  const [loading, setLoading] = useState(true);

  // Function to fetch scale data from backend API
  const fetchScales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scales"); // Make request to API route
      const data = await res.json(); // Parse response JSON
      setScales(data.scales || []); // Save scales to state
    } catch (err) {
      console.error("❌ Error loading scales:", err); // Log error if fetch fails
    } finally {
      setLoading(false); // Done loading regardless of success or failure
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchScales();
  }, []);

  // Fullscreen layout with no scroll or margin
  return (
    <div className="h-screen w-screen overflow-hidden m-0 p-0">
      {loading ? <p>Loading map...</p> : <Map scales={scales} />}{" "}
      {/* Show map or loading */}
    </div>
  );
};

export default MapsPage;
