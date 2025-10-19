"use client";

import { useCallback, useEffect, useState } from "react";
import * as htmlToImage from "html-to-image";
import { createPortal } from "react-dom";

export default function SnapshotFb({
  selector = "main .recharts-wrapper, main canvas, main svg, canvas, svg",
  filenameBase = "beehives-snapshot",
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    console.log("%cSnapshotFb mounted", "color:#22c55e;font-weight:bold;");
  }, []);

  const findTarget = () => {
    return (
      document.querySelector(selector) ||
      document.querySelector("main") ||
      document.body
    );
  };

  const download = (dataUrl, name) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name;
    a.click();
  };

  const withCaption = async (baseUrl, caption) => {
    const img = new Image();
    img.src = baseUrl;
    await img.decode();

    const footerH = 52;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height + footerH;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0f19";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0);

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, img.height, canvas.width, footerH);

    ctx.fillStyle = "#facc15";
    ctx.font =
      "600 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(caption, 16, img.height + footerH / 2);

    return canvas.toDataURL("image/png");
  };

  const handleSnap = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const node = findTarget();
      const titleText =
        document.querySelector("[data-scale-name]")?.textContent?.trim() ||
        document.querySelector("h1,h2")?.textContent?.trim() ||
        "BeeHives";
      const caption = `${titleText} • ${new Date().toLocaleString()}`;
      const bg = getComputedStyle(document.body).backgroundColor || "#0b0f19";

      const raw = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      });

      const finalUrl = await withCaption(raw, caption);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      download(finalUrl, `${filenameBase}-${ts}.png`);
    } catch (err) {
      console.error("Snapshot failed:", err);
      alert("Could not capture the chart on this page.");
    } finally {
      setBusy(false);
    }
  }, [busy, selector, filenameBase]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSnap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSnap]);

  // Render above everything via portal
  return createPortal(
    <button
      onClick={handleSnap}
      disabled={busy}
      title="Save chart snapshot (Ctrl/⌘+Shift+S)"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 2147483647,
        padding: "10px 14px",
        borderRadius: 999,
        background: busy ? "#9CA3AF" : "#F59E0B",
        color: "#111827",
        fontWeight: 600,
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05)",
        cursor: busy ? "not-allowed" : "pointer",
        border: "none",
      }}
    >
      {busy ? "Saving…" : "📸 Snapshot"}
    </button>,
    document.body
  );
}
