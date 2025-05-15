"use client";

import { useState, useEffect } from "react";

const AdminPage = () => {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScale, setSelectedScale] = useState(null);
  const [newName, setNewName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch all scales from DB
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

  // Open modal to edit scale name
  const openModal = (scale) => {
    setSelectedScale(scale);
    setNewName(scale.name || "");
    setModalOpen(true);
  };

  // Save name for selected scale
  const handleSave = async () => {
    if (!selectedScale) return;
    try {
      const res = await fetch(`/api/scales/${selectedScale.scale_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        setScales((prev) =>
          prev.map((s) =>
            s.scale_id === selectedScale.scale_id ? { ...s, name: newName } : s
          )
        );
        setModalOpen(false);
      } else {
        console.error("❌ Failed to update scale");
      }
    } catch (err) {
      console.error("❌ Error saving scale name:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🔧 Admin Page – Manage Scales</h1>

      {loading ? (
        <p>Loading scales...</p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-md overflow-hidden">
          <thead className="bg-gray-300 text-gray-700 text-left">
            <tr>
              <th className="px-4 py-2 border">Scale ID</th>
              <th className="px-4 py-2 border">Serial Number</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {scales.map((scale) => (
              <tr key={scale.scale_id} className="border-t">
                <td className="px-4 py-2 border">{scale.scale_id}</td>
                <td className="px-4 py-2 border">{scale.serial_number}</td>
                <td className="px-4 py-2 border text-gray-800">
                  {scale.name || (
                    <span className="text-gray-400 italic">No name</span>
                  )}
                </td>
                <td className="px-4 py-2 border">
                  <button
                    onClick={() => openModal(scale)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    ✏️ {scale.name ? "Edit" : "Add"} Name
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for name editing */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">
              {selectedScale.name ? "Edit" : "Add"} Name for Scale ID:{" "}
              <span className="text-blue-600">{selectedScale.scale_id}</span>
            </h2>
            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder="Enter name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
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
