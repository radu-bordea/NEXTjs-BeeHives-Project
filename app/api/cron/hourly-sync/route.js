// app/api/cron/hourly-sync/route.js
import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper
import cleanAndFilter from "@/utils/cleanAndFilter"; // Cleans and filters fetched data

export async function GET() {
  try {
    // 1. Connect to MongoDB and fetch all registered scales
    const client = await clientPromise;
    const db = client.db();
    const scalesCollection = db.collection("scales");
    const scales = await scalesCollection.find().toArray();
    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    // 2. Set time window for hourly sync (previous hour until cron time)
    const now = new Date(); // Assume this is 00:15 / 08:15 / 16:15 UTC
    now.setUTCMinutes(15, 0, 0); // Set to exact trigger time (e.g., 08:15:00)

    const end = new Date(now);
    const start = new Date(now);
    start.setUTCHours(now.getUTCHours() - 1); // One-hour range

    const timeStart = Math.floor(start.getTime() / 1000); // Start of the hour (UNIX)
    const timeEnd = Math.floor(end.getTime() / 1000); // End of the hour (UNIX)
    const resolution = "hourly";

    // 3. Loop through each scale to fetch and store data
    for (const { scale_id: scaleId } of scales) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching HOURLY data for scale ${scaleId}...`);

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

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Error fetching hourly data for ${scaleId}:`, error);
        continue;
      }

      const { data } = await response.json();
      console.log(`📥 Received ${data?.length || 0} items for ${scaleId}`);

      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`⚠️ No data for ${scaleId}, skipping`);
        continue;
      }

      const cleanedData = data
        .map((item) => cleanAndFilter(item, scaleId))
        .filter(Boolean);

      console.log(`✅ Cleaned data: ${cleanedData.length} items`);

      const hourlyCollection = db.collection("scale_data_hourly");

      // 4. Check for existing entries in the same hour
      const existing = await hourlyCollection
        .find({
          scale_id: scaleId,
          time: {
            $gte: start.toISOString(),
            $lt: end.toISOString(),
          },
        })
        .toArray();

      if (existing.length > 0) {
        console.log(
          `ℹ️ Hourly data already exists for ${scaleId}, skipping insert`
        );
        continue;
      }

      // 5. Insert cleaned data
      if (cleanedData.length > 0) {
        const insertResult = await hourlyCollection.insertMany(cleanedData);
        console.log(
          `📝 Inserted ${insertResult.insertedCount} records for ${scaleId}`
        );
      } else {
        console.warn(`⚠️ No valid data to insert for ${scaleId}`);
      }
    }

    return new Response(JSON.stringify({ status: "✅ Hourly sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error during hourly sync:", err);
    return new Response(
      JSON.stringify({ status: "❌ Hourly sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
