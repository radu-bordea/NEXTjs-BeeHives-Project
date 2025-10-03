"use client";

import { useMemo } from "react";

export default function Table({
  data,
  selectedResolution,
  onResolutionChange,
  scaleName,
}) {
  // Collect dynamic columns from the data (excluding scale_id)
  const { columns, displayLabels } = useMemo(() => {
    const keySet = new Set();

    (data || []).forEach((row) => {
      if (!row) return;
      Object.keys(row).forEach((k) => {
        if (k === "_id") return; // exclude Mongo internal id
        if (k === "__v") return; // exclude mongoose versioning (if any)
        if (k === "scale_id") return; // 🚫 exclude scale_id from the table
        keySet.add(k);
      });
    });

    // Preferred order (only if present in data)
    const preferred = [
      "time",
      "weight",
      "yield",
      "temperature",
      "brood",
      "humidity",
    ].filter((k) => keySet.has(k));

    // Everything else (alphabetical), excluding those already included
    const rest = [...keySet]
      .filter((k) => !preferred.includes(k))
      .sort((a, b) => a.localeCompare(b));

    const cols = [...preferred, ...rest];

    // Pretty labels for header
    const labelMap = {
      time: "Time",
      weight: "Weight",
      yield: "Yield",
      temperature: "Temperature",
      brood: "Brood",
      humidity: "Humidity",
    };

    const labels = cols.map((c) => labelMap[c] || titleCase(c));

    return { columns: cols, displayLabels: labels };
  }, [data]);

  const formatCell = (key, value) => {
    if (value === null || value === undefined) return "—";

    if (key === "time") {
      const d = new Date(value);
      return isNaN(d) ? String(value) : d.toLocaleString();
    }

    if (typeof value === "number") {
      // Show 2 decimals, adjust if you want full precision
      return (Math.round(value * 100) / 100).toFixed(2);
    }

    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      // Render objects/arrays compactly
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  return (
    <div className="mt-4">
      <h3 className="text-xl font-semibold mb-4">
        Data - {scaleName || "Unknown Scale"}
      </h3>

      <div className="flex mb-4">
        <button
          onClick={() => onResolutionChange("daily")}
          className={`px-4 py-2 rounded text-gray-500 mr-2 ${
            selectedResolution === "daily"
              ? "bg-green-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Daily Data
        </button>
        <button
          onClick={() => onResolutionChange("hourly")}
          className={`px-4 py-2 rounded text-gray-500 ${
            selectedResolution === "hourly"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Hourly Data
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border min-w-[800px]">
          <thead>
            <tr>
              {columns.length === 0 ? (
                <th className="border px-4 py-2 text-left">No columns</th>
              ) : (
                displayLabels.map((label, i) => (
                  <th key={columns[i]} className="border px-4 py-2 text-left">
                    {label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((row, rIdx) => (
                <tr key={row.id ?? row._id ?? row.time ?? rIdx}>
                  {columns.map((col) => (
                    <td key={col} className="border px-4 py-2 align-top">
                      {formatCell(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="border px-4 py-3 text-gray-500"
                  colSpan={columns.length || 1}
                >
                  No data to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Small helper to prettify unknown keys into Title Case
function titleCase(s) {
  return String(s)
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}
