const Spinner = () => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="animate-spin rounded-full h-48 w-48 border-t-3 border-b-3 border-indigo-600"></div>
      <p className="mt-4 text-indigo-600 font-semibold">Syncing scales and scales data...</p>
    </div>
  );
};

export default Spinner;
