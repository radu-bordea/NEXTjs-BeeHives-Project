"use client";

export function ManualButton({ label = "Manual" }) {
  const onClick = () => {
    window.dispatchEvent(new Event("toggle-help-manual"));
  };

  return (
    <button
      onClick={onClick}
      className="text-gray-400 hover:text-blue-400 flex items-center gap-2"
      aria-label="Open manual"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M3 5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25V18a.75.75 0 0 1-1.2.6L16.5 16.5l-3.3 2.1a.75.75 0 0 1-.8 0L9 16.5 4.2 18.6A.75.75 0 0 1 3 18V5.25Z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
