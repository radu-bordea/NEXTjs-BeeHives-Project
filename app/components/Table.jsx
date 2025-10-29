"use client";

import { useMemo } from "react";
import { useLang } from "./LanguageProvider";

export default function Table({
  data,
  selectedResolution,
  onResolutionChange,
  scaleName,
}) {
  const { t, lang } = useLang();

  // Collect dynamic columns from the data (excluding scale_id)
  const { columns, displayLabels } = useMemo(() => {
    const keySet = new Set();

    (data || []).forEach((row) => {
      if (!row) return;
      Object.keys(row).forEach((k) => {
        if (k === "_id") return;
        if (k === "__v") return;
        if (k === "scale_id") return;
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
      "rain",
      "wind_direction",
      "wind_speed",
    ].filter((k) => keySet.has(k));

    // Everything else (alphabetical)
    const rest = [...keySet]
      .filter((k) => !preferred.includes(k))
      .sort((a, b) => a.localeCompare(b));

    const cols = [...preferred, ...rest];

    // Translation map for known headers
    const labelMap = {
      time: t("table.col.time"),
      weight: t("table.col.weight"),
      yield: t("table.col.yield"),
      temperature: t("table.col.temperature"),
      brood: t("table.col.brood"),
      humidity: t("table.col.humidity"),
      rain: t("table.col.rain"),
      wind_direction: t("table.col.windDirection"),
      wind_speed: t("table.col.windSpeed"),
    };

    const labels = cols.map((c) => labelMap[c] || titleCase(c));

    return { columns: cols, displayLabels: labels };
  }, [data, t]);

  const formatCell = (key, value) => {
    if (value === null || value === undefined) return "—";

    if (key === "time") {
      const d = new Date(value);
      return isNaN(d)
        ? String(value)
        : d.toLocaleString(lang === "sv" ? "sv-SE" : "en-US");
    }

    if (typeof value === "number") {
      return (Math.round(value * 100) / 100).toFixed(2);
    }

    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
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
        {t("table.title")} - {scaleName || t("table.unknownScale")}
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
          {t("table.dailyBtn")}
        </button>

        <button
          onClick={() => onResolutionChange("hourly")}
          className={`px-4 py-2 rounded text-gray-500 ${
            selectedResolution === "hourly"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          {t("table.hourlyBtn")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border min-w-[800px]">
          <thead>
            <tr>
              {columns.length === 0 ? (
                <th className="border px-4 py-2 text-left">
                  {t("table.noColumns")}
                </th>
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
                  {t("table.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// fallback for unknown column headers
function titleCase(s) {
  return String(s)
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}
