"use client";
// This component runs on the client side (required in Next.js App Router).

import { motion } from "framer-motion"; // For entry animations
import SpinnerSmall from "./SpinnerSmall"; // Small loading spinner component

/**
 * ScaleCard
 * Displays information about a single scale, with options to view its data and charts.
 * Animates into view using Framer Motion.
 *
 * Props:
 * - scale: object containing scale details (name, serial_number, etc.)
 * - index: number, used to stagger animation timing
 * - onViewData: callback when the "View Data" button is clicked
 * - perScaleSyncing: object tracking which scale is currently syncing (by ID)
 * - onViewCharts: callback when the "View Charts" button is clicked
 */
export default function ScaleCard({
  scale,
  index,
  onViewData,
  perScaleSyncing,
  onViewCharts,
}) {
  return (
    // Motion wrapper for smooth fade-in and slide-up animation
    <motion.div
      key={scale.scale_id}
      className="min-w-[280px] snap-start border-b-1 border-l-1 rounded-2xl p-4 
                 hover:shadow-lg shadow-amber-200 transition"
      initial={{ opacity: 0, y: 20 }} // Start invisible and slightly below
      animate={{ opacity: 1, y: 0 }} // Animate to visible and original position
      transition={{ delay: index * 0.1, duration: 0.5 }} // Stagger animation by index
    >
      {/* Scale basic info */}
      <h2 className="text-xl font-semibold text-gray-500">
        <span className="text-gray-500 text-sm">Name: </span>
        {scale.name}
      </h2>
      <p className="text-sm text-gray-500">
        Serial Number: {scale.serial_number}
      </p>
      <p className="text-sm text-gray-500">Scale ID: {scale.scale_id}</p>
      <p className="text-sm text-gray-500">
        Hardware Key: {scale.hardware_key}
      </p>

      {/* "View Data" button + spinner if syncing */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => onViewData(scale.scale_id)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          📊 View Data
        </button>

        {/* Show spinner while this scale is syncing */}
        {perScaleSyncing[scale.scale_id] && (
          <SpinnerSmall
            mt="mt-0"
            mx="mx-auto"
            w="w-8"
            h="h-8"
            border="border-green-600"
          />
        )}
      </div>

      {/* "View Charts" button */}
      <button
        onClick={() => onViewCharts(scale.scale_id)}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition"
      >
        📈 View Charts
      </button>
    </motion.div>
  );
}
