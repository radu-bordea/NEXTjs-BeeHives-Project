// app/components/ThemeToggle.jsx
"use client";

import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

const THEME_KEY = "theme"; // "light" | "dark"

export default function ThemeToggle() {
  const [mode, setMode] = useState("light"); // default to light

  const applyTheme = (next) => {
    const dark = next === "dark";
    document.documentElement.classList.toggle("dark", dark);

    // keep mobile browser bars readable
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = dark ? "#0a0a0a" : "#ffffff";
  };

  useEffect(() => {
    // initialize from localStorage; fall back to light
    const saved = localStorage.getItem(THEME_KEY) || "light";
    setMode(saved);
    applyTheme(saved);
  }, []);

  const setAndApply = (next) => {
    setMode(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  };

  return (
    <div className="inline-flex rounded-xl border border-[color:var(--border)] overflow-hidden">
      {/* Sun -> LIGHT */}
      <button
        onClick={() => setAndApply("light")}
        aria-label="Use light theme"
        className={`px-3 py-1 text-xs sm:text-sm transition flex items-center justify-center cursor-pointer hover:text-amber-500
          ${
            mode === "light"
              ? "bg-[color:var(--muted)]"
              : "bg-[color:var(--background)]"
          }
          text-[color:var(--foreground)]
        `}
        aria-pressed={mode === "light"}
        title="Light"
      >
        <FiSun className="w-4 h-4" />
      </button>

      {/* Moon -> DARK */}
      <button
        onClick={() => setAndApply("dark")}
        aria-label="Use dark theme"
        className={`px-3 py-1 text-xs sm:text-sm transition flex items-center justify-center cursor-pointer hover:text-amber-500
          ${
            mode === "dark"
              ? "bg-[color:var(--muted)]"
              : "bg-[color:var(--background)]"
          }
          text-[color:var(--foreground)]
        `}
        aria-pressed={mode === "dark"}
        title="Dark"
      >
        <FiMoon className="w-4 h-4" />
      </button>
    </div>
  );
}
