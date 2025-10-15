"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  // "light" | "dark" | "system"
  const [mode, setMode] = useState("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    setMode(saved);
  }, []);

  const apply = (next) => {
    setMode(next);
    localStorage.setItem("theme", next);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const shouldDark = next === "dark" || (next === "system" && mql.matches);
    document.documentElement.classList.toggle("dark", shouldDark);

    // Update theme-color bar
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = shouldDark ? "#0a0a0a" : "#ffffff";
  };

  return (
    <div className="inline-flex rounded-xl border border-[var(--border)] overflow-hidden">
      {["light", "system", "dark"].map((opt) => (
        <button
          key={opt}
          onClick={() => apply(opt)}
          className={`px-3 py-1 text-sm transition
            ${
              mode === opt
                ? "bg-[color:var(--muted)]"
                : "bg-[color:var(--background)]"
            }`}
          aria-pressed={mode === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
