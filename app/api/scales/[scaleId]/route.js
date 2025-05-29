import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

// Handle PUT request to update (or insert) scale data by scaleId
export async function PUT(req, { params }) {
  // Extract dynamic route parameter (e.g., /api/scales/:scaleId)
  const { scaleId } = params;

  // Parse the incoming JSON body to get name, latitude, and longitude
  const { name, latitude, longitude } = await req.json();

  // Connect to MongoDB
  const client = await clientPromise;
  const db = client.db();

  // Debug log to confirm what's being updated
  console.log("PUT /api/scales-info/", scaleId, "→", {
    name,
    latitude,
    longitude,
  });

  // Update the scale entry with matching scale_id
  // If it doesn't exist, insert a new document (upsert: true)
  const result = await db.collection("scales_info").updateOne(
    { scale_id: scaleId }, // Query: match by scale_id
    { $set: { name, latitude, longitude } }, // Update or insert these fields
    { upsert: true } // Insert if not found
  );

  // Respond with success
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
