// 🔁 Utility to generate a compact pagination range
// Example output: [1, 2, "...", 9, 10, 11, "...", 19, 20]
// This ensures you don’t show every page number when there are many pages,
// but always shows the first, last, current, and neighbors around current.

const getPageRange = (current, total, delta = 2) => {
  const range = []; // Final range of actual page numbers
  const rangeWithDots = []; // Final range with "..." inserted where needed

  // Determine boundaries around the current page
  // Show `delta` pages before and after the current page
  let left = Math.max(2, current - delta); // Left boundary (after page 1)
  let right = Math.min(total - 1, current + delta); // Right boundary (before last page)

  // Step 1: Build the base range
  // Always include:
  // - Page 1
  // - Last page
  // - Pages within [left, right] (the "window" around current page)
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) {
      range.push(i);
    }
  }

  // Step 2: Fill in the dots
  // Add "..." where a gap of more than 2 pages exists
  let l;
  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        // Gap of exactly 1 page (e.g. 4 and 6), so add the missing one
        rangeWithDots.push(l + 1);
      } else if (i - l > 2) {
        // Gap of 2 or more pages, add "..."
        rangeWithDots.push("...");
      }
    }
    // Always add the current page
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
};

export default getPageRange;
