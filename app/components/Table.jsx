"use client";

export default function Table({
  data,
  selectedResolution,
  onResolutionChange,
  scaleName, // new prop
}) {
  const sortedData = data?.sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">
        Data - {scaleName || "Unknown Scale"}
      </h3>

      <div className="flex mb-4">
        <button
          onClick={() => onResolutionChange("hourly")}
          className={`px-4 py-2 rounded text-gray-500 mr-2 ${
            selectedResolution === "hourly"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Hourly Data
        </button>
        <button
          onClick={() => onResolutionChange("daily")}
          className={`px-4 py-2 rounded text-gray-500 ${
            selectedResolution === "daily"
              ? "bg-green-500 text-white"
              : "bg-gray-200"
          }`}
        >
          Daily Data
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border min-w-[600px]">
          <thead>
            <tr>
              <th className="border px-4 py-2">Time</th>
              <th className="border px-4 py-2">Weight</th>
              <th className="border px-4 py-2">Yield</th>
              <th className="border px-4 py-2">Temperature</th>
              <th className="border px-4 py-2">Brood</th>
              <th className="border px-4 py-2">Humidity</th>
            </tr>
          </thead>
          <tbody>
            {sortedData?.map((item, index) => (
              <tr key={index}>
                <td className="border px-4 py-2">
                  {item.time ? new Date(item.time).toLocaleString() : "N/A"}
                </td>
                <td className="border px-4 py-2">{item.weight}</td>
                <td className="border px-4 py-2">{item.yield}</td>
                <td className="border px-4 py-2">{item.temperature}</td>
                <td className="border px-4 py-2">{item.brood}</td>
                <td className="border px-4 py-2">{item.humidity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
