"use client"; // Enables client-side rendering in Next.js app

import { useState, useEffect } from "react";

const AdminPage = () => {
  // Local state for scale data, loading indicator, selected scale, input field, and modal state
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScale, setSelectedScale] = useState(null);
  const [newName, setNewName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // 📦 Fetch scale data from API
  const fetchScales = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scales");
      const data = await res.json();
      // Fallback to empty array if data.scales is undefined
      setScales(data.scales || []);
    } catch (err) {
      console.error("❌ Error loading scales:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Run fetchScales once after component mounts
  useEffect(() => {
    fetchScales();
  }, []);

  // 📝 Open modal and prepare scale data for editing
  const openModal = (scale) => {
    setSelectedScale(scale);
    setNewName(scale.name || ""); // Pre-fill input if name exists
    setModalOpen(true);
  };

  // 💾 Save new or edited name for selected scale
  const handleSave = async () => {
    if (!selectedScale) return;
    try {
      const res = await fetch(`/api/scales/${selectedScale.scale_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (res.ok) {
        // Update the local state with new name
        setScales((prev) =>
          prev.map((s) =>
            s.scale_id === selectedScale.scale_id ? { ...s, name: newName } : s
          )
        );
        setModalOpen(false); // Close modal on success
      } else {
        console.error("❌ Failed to update scale");
      }
    } catch (err) {
      console.error("❌ Error saving scale name:", err);
    }
  };

  return (
    <div className="p-6 text-gray-500">
      {/* 🔧 Page Header */}
      <h1 className="text-2xl font-bold mb-6">🔧 Admin Page – Manage Scales</h1>

      {/* 📥 Loading indicator OR table display */}
      {loading ? (
        <p>Loading scales...</p>
      ) : (
        // ✅ Responsive wrapper to allow horizontal scroll on mobile
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-md">
            <thead className="dark:bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-2 border">Scale ID -- Name</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scales.map((scale) => (
                <tr key={scale.scale_id} className="border-t">
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.scale_id} - {" "}
                    <span className="dark:text-gray-400">
                      {scale.name || (
                        <span className="text-red-300 italic">No name</span>
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => openModal(scale)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      ✏️ {scale.name ? "Edit" : "Add"} Name
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🧩 Modal for name input */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">
              {selectedScale.name ? "Edit" : "Add"} Name for Scale ID:{" "}
              <span className="text-blue-600">{selectedScale.scale_id}</span>
            </h2>

            {/* Text input for scale name */}
            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder="Enter name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            {/* Modal action buttons */}
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
