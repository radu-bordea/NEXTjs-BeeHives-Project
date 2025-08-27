"use client";

import { motion } from "framer-motion";
import SpinnerSmall from "./SpinnerSmall";

export default function ScaleCard({
  scale,
  index,
  onViewData,
  perScaleSyncing,
  onViewCharts,
}) {
  return (
    <motion.div
      key={scale.scale_id}
      className="min-w-[280px] snap-start border rounded-2xl shadow p-4 hover:shadow-xl shadow-gray-400 transition"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
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

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => onViewData(scale.scale_id)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          📊 View Data
        </button>
        {perScaleSyncing[scale.scale_id] && <SpinnerSmall />}
      </div>

      <button
        onClick={() => onViewCharts(scale.scale_id)}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition"
      >
        📈 View Charts
      </button>
    </motion.div>
  );
}
