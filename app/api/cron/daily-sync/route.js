import clientPromise from "@/lib/mongodb";
import cleanAndFilter from "@/utils/cleanAndFilter";

export async function GET() {
  try {
    const client = await clientPromise; // Connect to MongoDB
    const db = client.db();
    const scales = await db.collection("scales").find().toArray(); // Fetch all scale IDs

    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    const now = new Date();

    // Define the time window: from yesterday 00:00 UTC to today 00:00 UTC
    const yesterdayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 1,
        0,
        0,
        0
      )
    );
    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );

    // Convert time window to UNIX timestamps (seconds)
    const timeStart = Math.floor(yesterdayStart.getTime() / 1000);
    const timeEnd = Math.floor(todayStart.getTime() / 1000);

    // Log the sync time range in both raw and human-readable format
    console.log("⏱ Time window", {
      timeStart,
      timeEnd,
      readableStart: yesterdayStart.toISOString(),
      readableEnd: todayStart.toISOString(),
    });

    const resolution = "daily"; // Request daily-resolution data

    // Loop through each scale and fetch daily data
    for (const { scale_id: scaleId } of scales) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching DAILY data for ${scaleId}...`);

      // Send request to external API
      const response = await fetch(
        `${process.env.API_BASE_URL}/user/scale/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      // Handle fetch failure
      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Fetch error for ${scaleId}:`, error);
        continue;
      }

      // Parse and log received data
      const { data } = await response.json();
      console.log(`📥 Received ${data?.length || 0} items for ${scaleId}`);

      // Skip if no data returned
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`⚠️ No data for ${scaleId}, skipping`);
        continue;
      }

      // Clean the raw data and remove any invalid/null entries
      const cleanedData = data
        .map((item) => cleanAndFilter(item, scaleId))
        .filter(Boolean);

      console.log(`✅ Cleaned ${cleanedData.length} items`);

      const dailyCollection = db.collection("scale_data_daily"); // Get daily collection

      // Check if data for this scale already exists for the day
      const existing = await dailyCollection
        .find({
          scale_id: scaleId,
          time: {
            $gte: yesterdayStart.toISOString(),
            $lt: todayStart.toISOString(),
          },
        })
        .toArray();

      // Skip insert if data already exists
      if (existing.length > 0) {
        console.log(`ℹ️ Data already exists for ${scaleId}, skipping insert`);
        continue;
      }

      // Insert cleaned daily data into MongoDB
      const insertResult = await dailyCollection.insertMany(cleanedData);
      console.log(`📝 Inserted ${insertResult.insertedCount} for ${scaleId}`);
    }

    // Return success response
    return new Response(JSON.stringify({ status: "✅ Daily sync complete" }), {
      status: 200,
    });
  } catch (err) {
    // Catch and report any runtime errors
    console.error("❌ Error during daily sync:", err);
    return new Response(
      JSON.stringify({ status: "❌ Sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
