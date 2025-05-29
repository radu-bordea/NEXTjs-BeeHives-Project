"use client";

import { useState, useEffect } from "react";

const AdminPage = () => {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScale, setSelectedScale] = useState(null);
  const [newName, setNewName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch scales from backend
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

  useEffect(() => {
    fetchScales();
  }, []);

  // Open modal and prefill existing data
  const openModal = (scale) => {
    setSelectedScale(scale);
    setNewName(scale.name || "");
    setLatitude(scale.latitude || "");
    setLongitude(scale.longitude || "");
    setErrorMessage("");
    setModalOpen(true);
  };

  // Coordinate validation
  const isValidCoordinate = (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  };

  // Save updates to backend
  const handleSave = async () => {
    if (!selectedScale) return;

    if (
      !isValidCoordinate(latitude, -90, 90) ||
      !isValidCoordinate(longitude, -180, 180)
    ) {
      setErrorMessage(
        "❌ Please enter a valid latitude (-90 to 90) and longitude (-180 to 180)."
      );
      return;
    }

    try {
      const res = await fetch(`/api/scales/${selectedScale.scale_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          latitude,
          longitude,
        }),
      });

      if (res.ok) {
        setScales((prev) =>
          prev.map((s) =>
            s.scale_id === selectedScale.scale_id
              ? { ...s, name: newName, latitude, longitude }
              : s
          )
        );
        setModalOpen(false);
      } else {
        console.error("❌ Failed to update scale");
      }
    } catch (err) {
      console.error("❌ Error saving scale:", err);
    }
  };

  return (
    <div className="p-6 text-gray-500">
      <h1 className="text-2xl font-bold mb-6">🔧 Admin Page – Manage Scales</h1>

      {loading ? (
        <p>Loading scales...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-md">
            <thead className="dark:bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-2 border">Serial Number</th>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Latitude</th>
                <th className="px-4 py-2 border">Longitude</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scales.map((scale) => (
                <tr key={scale.scale_id} className="border-t">
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.serial_number}
                  </td>
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.name || (
                      <span className="text-red-300 italic">No name</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.latitude || (
                      <span className="text-red-300 italic">No lat</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.longitude || (
                      <span className="text-red-300 italic">No long</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => openModal(scale)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center whitespace-nowrap min-w-[80px]"
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">
              Edit Scale – ID:{" "}
              <span className="text-blue-600">{selectedScale.scale_id}</span>
            </h2>

            {errorMessage && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {errorMessage}
              </div>
            )}

            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder="Enter name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder="Enter latitude..."
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />

            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder="Enter longitude..."
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
