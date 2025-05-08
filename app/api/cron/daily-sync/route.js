import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper
import cleanAndFilter from "@/utils/cleanAndFilter"; // Cleans and filters fetched data

export async function GET() {
  try {
    // 1. Connect to MongoDB and get the list of all registered scales
    const client = await clientPromise;
    const db = client.db();
    const scalesCollection = db.collection("scales");
    const scales = await scalesCollection.find().toArray();
    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    // 2. Define the time range for today in UNIX timestamps (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(10, 15, 0, 0); // Start of day: 10:15:00 UTC

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(todayStart.getUTCDate() + 1); // Start of next day: 00:00:00 UTC

    const timeStart = Math.floor(todayStart.getTime() / 1000); // UNIX start
    const timeEnd = Math.floor(tomorrowStart.getTime() / 1000); // UNIX end

    const resolution = "daily"; // Daily data fetch

    // 3. Loop over each scale and sync data
    for (const { scale_id: scaleId } of scales) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching DAILY data for scale ${scaleId}...`);

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

      // If request fails, log the error and skip this scale
      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Error fetching daily data for ${scaleId}:`, error);
        continue;
      }

      // 4. Process the returned data
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

      const dailyCollection = db.collection("scale_data_daily");

      // 5. Check if data for today already exists to avoid duplicates
      const existing = await dailyCollection
        .find({
          scale_id: scaleId,
          time: {
            $gte: todayStart.toISOString(),
            $lt: tomorrowStart.toISOString(),
          },
        })
        .toArray();

      if (existing.length > 0) {
        console.log(`ℹ️ Data already exists for ${scaleId}, skipping insert`);
        continue;
      }

      // 6. Insert cleaned data into the database
      if (cleanedData.length > 0) {
        const insertResult = await dailyCollection.insertMany(cleanedData);
        console.log(
          `📝 Inserted ${insertResult.insertedCount} records for ${scaleId}`
        );
      } else {
        console.warn(`⚠️ No valid data to insert for ${scaleId}`);
      }
    }

    return new Response(JSON.stringify({ status: "✅ Daily sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error during daily sync:", err);
    return new Response(
      JSON.stringify({ status: "❌ Daily sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
