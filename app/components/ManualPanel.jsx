"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function ManualPanel({
  sections,
  side = "right",
  title = "Beehives Manual",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onToggle = () => setOpen((v) => !v);
    const onClose = () => setOpen(false);

    window.addEventListener("open-help-manual", onOpen);
    window.addEventListener("toggle-help-manual", onToggle);
    window.addEventListener("close-help-manual", onClose);
    return () => {
      window.removeEventListener("open-help-manual", onOpen);
      window.removeEventListener("toggle-help-manual", onToggle);
      window.removeEventListener("close-help-manual", onClose);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const prev = document.activeElement;
      panelRef.current?.focus();
      return () => prev?.focus?.();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections || [];
    return (sections || []).filter((s) =>
      (s.title || "").toLowerCase().includes(q)
    );
  }, [sections, query]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } z-[60]`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-title"
        className={`fixed top-0 ${side === "right" ? "right-0" : "left-0"}
        h-full w-full sm:w-[420px] max-w-[92vw]
        bg-[color:var(--card)] text-[color:var(--foreground)]
        shadow-2xl z-[70]
        transform transition-transform duration-300 ease-in-out
        ${
          open
            ? "translate-x-0"
            : side === "right"
            ? "translate-x-full"
            : "-translate-x-full"
        }`}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 id="manual-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-2 hover:opacity-80"
            aria-label="Close manual"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections…"
              className="w-full rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
              style={{ border: `1px solid var(--border)` }}
            />
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2"
              style={{ border: `1px solid var(--border)` }}
            >
              Hide
            </button>
          </div>

          {/* Table of contents */}
          <nav className="text-sm">
            <ul className="space-y-1">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    className="w-full text-left px-2 py-1 rounded"
                    onClick={() => {
                      const el = document.getElementById(`manual-${s.id}`);
                      el?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--muted)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="space-y-6">
            {filtered.map((s) => (
              <section key={s.id} id={`manual-${s.id}`}>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  {s.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
