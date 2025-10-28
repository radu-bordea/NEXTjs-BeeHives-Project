"use client";

import { useState, useEffect } from "react";
import { useLang } from "../components/LanguageProvider";

export default function AdminPage() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScale, setSelectedScale] = useState(null);
  const [newName, setNewName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { t } = useLang();

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
      setErrorMessage(t("admin.error.invalidCoordinates"));
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
      <h1 className="text-2xl font-bold mb-6">🔧 {t("admin.title")}</h1>

      {loading ? (
        <p>{t("admin.loading")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-md">
            <thead className="dark:bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-2 border">{t("admin.serialNumber")}</th>
                <th className="px-4 py-2 border">{t("admin.name")}</th>
                <th className="px-4 py-2 border">{t("admin.latitude")}</th>
                <th className="px-4 py-2 border">{t("admin.longitude")}</th>
                <th className="px-4 py-2 border">{t("admin.actions")}</th>
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
                      <span className="text-red-300 italic">
                        {t("admin.noName")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.latitude || (
                      <span className="text-red-300 italic">
                        {t("admin.noLat")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 border dark:text-gray-400">
                    {scale.longitude || (
                      <span className="text-red-300 italic">
                        {t("admin.noLong")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => openModal(scale)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center whitespace-nowrap min-w-[80px]"
                    >
                      ✏️ {t("admin.edit")}
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
              {t("admin.editScale")} – ID:{" "}
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
              placeholder={t("admin.placeholder.name")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder={t("admin.placeholder.latitude")}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />

            <input
              type="text"
              className="w-full border px-4 py-2 rounded mb-4"
              placeholder={t("admin.placeholder.longitude")}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                {t("admin.cancel")}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t("admin.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
