"use client";

const Spinner = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="animate-spin rounded-full h-24 w-24 border-4 border-t-transparent border-indigo-600"></div>
      <p className="mt-4 text-indigo-600 font-semibold text-lg">
        Syncing data...
      </p>
    </div>
  );
};

export default Spinner;
