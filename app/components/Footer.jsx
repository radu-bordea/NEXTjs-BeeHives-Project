import React from "react";
import { GiBee } from "react-icons/gi"; // Importing the bee icon from react-icons

const Footer = () => {
  // Get the current year dynamically
  const currentYear = new Date().getFullYear();

  return (
    // Footer section with background and padding
    <footer className="bg-gray-800 text-gray-300 py-4 mt-12">
      <div className="container mx-auto flex items-center justify-center space-x-4">
        {/* Bee icon with yellow color and size of 4xl */}
        <GiBee className="text-yellow-400 text-4xl" />

        {/* Copyright text */}
        <p className="text-sm text-center">
          {/* Display the current year dynamically */}© {currentYear}{" "}
          <span className="font-semibold">BeeHives</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
