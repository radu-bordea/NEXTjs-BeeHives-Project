"use client"; // Directive to mark this as a client-side component in Next.js

import { ClipLoader } from "react-spinners"; // Importing the ClipLoader spinner component from react-spinners

// CSS override for custom spinner styling
const override = {
  display: "block", // Display the loader as a block element
  margin: "100px auto", // Center the spinner horizontally and add a margin on top and bottom
};

const LoadingPage = () => {
  return (
    // Render the ClipLoader spinner with custom properties
    <ClipLoader
      color="#3b82f6" // Set the spinner color to a shade of blue
      cssOverride={override} // Apply the custom styles to the spinner
      size={200} // Set the size of the spinner
      aria-label="Loading Spinner" // Accessibility label for the spinner
    />
  );
};

export default LoadingPage;
