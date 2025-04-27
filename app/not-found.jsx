import Link from "next/link"; // Importing Next.js Link for navigation
import React from "react";

const NotFound = () => {
  return (
    // Flex container to center the content both horizontally and vertically
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-6 relative">
      <div className="text-center">
        {/* Main 404 header with large text and bold font */}
        <h1 className="text-9xl font-extrabold text-gray-400 tracking-widest">
          404
        </h1>

        {/* Rotated "Page Not Found" badge */}
        <div className="absolute transform -rotate-12 bg-blue-500 px-2 text-sm text-white rounded">
          Page Not Found
        </div>

        {/* Message explaining the error */}
        <p className="text-gray-600 mt-5 mb-8 text-lg">
          Sorry, the page you're looking for doesn't exist.
        </p>

        {/* "Go Home" button with a link back to the homepage */}
        <Link
          href="/"
          className="inline-block px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
