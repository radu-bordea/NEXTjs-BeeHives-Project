// File: /app/api/cron/hourly-sync/route.js

// export const config = {
//   runtime: "edge",
//   schedule: "15 0,8,16 * * *", // ⏰ At 12:15 AM, 8:15 AM, 4:15 PM UTC daily
// };

import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

export async function GET() {
  try {
    // Debug log to check if the database is connected correctly
    console.log("Connecting to MongoDB...");

    // Step 1: Connect to MongoDB and fetch scales from the database
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("scales");

    // Fetch scales from MongoDB
    const scales = await collection.find().toArray();
    console.log("Scales fetched from database:", scales);

    if (!scales || scales.length === 0) {
      console.error("❌ No scales found in database");
      return Response.json({ status: "❌ No scales found" }, { status: 500 });
    }

    // Step 2: Loop through scales and trigger syncing each scale
    for (const scale of scales) {
      console.log(`Syncing scale ${scale.scale_id}...`);

      const scaleDataRes = await fetch(
        `${process.env.API_BASE_URL}/api/scale-data/${scale.scale_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution: "hourly" }),
        }
      );

      if (!scaleDataRes.ok) {
        const error = await scaleDataRes.text();
        console.error(`❌ Error syncing scale ${scale.scale_id}:`, error);
      } else {
        console.log(`✅ Successfully synced scale ${scale.scale_id}`);
      }
    }

    // Step 3: Return success response after syncing all scales
    return Response.json({ status: "✅ Hourly sync complete" });
  } catch (err) {
    console.error("❌ Hourly sync error:", err);
    return Response.json(
      { status: "❌ Hourly sync failed", error: err.message },
      { status: 500 }
    );
  }
}
