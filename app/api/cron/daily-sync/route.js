// File: /api/cron/daily-sync/route.js
import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

export const config = {
  runtime: "edge",
  schedule: "0 2 * * *", // ⏰ Daily at 2 AM UTC
};

export async function GET() {
  try {
    // Step 1: Connect to MongoDB and fetch all scales
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("scales");

    const scales = await collection.find().toArray(); // Get all scales from MongoDB
    console.log("Fetched scales:", scales); // Log for verification

    // Step 2: Loop through each scale and send data to the scale-data endpoint
    for (const scale of scales) {
      await fetch(`${process.env.BASE_URL}/api/scale-data/${scale.scale_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: "daily" }),
      });
    }

    return new Response(JSON.stringify({ status: "✅ Daily sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Daily sync error:", err);
    return new Response(
      JSON.stringify({ status: "❌ Daily sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
