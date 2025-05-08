// Helper: Clean and filter each item from the API data.
// Purpose: Only keep items that have meaningful (non-zero) values in at least one key field.
export default function cleanAndFilter(item, scaleId) {
  // Start by creating a new cleaned object with the required fields
  const cleaned = {
    time: item.time, // Copy the timestamp of the data point
    scale_id: scaleId, // Associate this data point with a specific scale
  };

  let hasData = false; // Flag to check if the item contains at least one meaningful value

  // These are the fields we consider as potentially meaningful
  const fieldsToCheck = [
    "weight",
    "yield",
    "temperature",
    "brood",
    "humidity",
    "rain",
    "wind_speed",
    "wind_direction",
  ];

  // Loop through each key and check if it contains a non-zero number
  for (const key of fieldsToCheck) {
    const val = Number(item[key]); // Convert to a number (in case it's a string)

    // Only include the value if it's a valid number and not zero
    if (!isNaN(val) && val !== 0) {
      cleaned[key] = val; // Add the field to the cleaned object
      hasData = true; // Mark this item as having meaningful data
    }
  }

  // Return the cleaned object only if it had at least one valid field
  // Otherwise, return null to indicate this item should be discarded
  return hasData ? cleaned : null;
}
