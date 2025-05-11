import clientPromise from "@/lib/mongodb";
import cleanAndFilter from "@/utils/cleanAndFilter";

export async function GET() {
  try {
    // 1. Connect to MongoDB and fetch all scale IDs
    const client = await clientPromise;
    const db = client.db();
    const scales = await db.collection("scales").find().toArray();
    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    // 2. Define the time range for today in UTC
    const now = new Date();

    // Get yesterday at 00:00 UTC
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

    // Get today at 00:00 UTC
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

    const timeStart = Math.floor(yesterdayStart.getTime() / 1000);
    const timeEnd = Math.floor(todayStart.getTime() / 1000);

    console.log("⏱ Corrected payload times", {
      timeStart,
      timeEnd,
      readableStart: yesterdayStart.toISOString(),
      readableEnd: todayStart.toISOString(),
    });

    const resolution = "daily";

    // 3. Loop through each scale
    for (const { scale_id: scaleId } of scales) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`⏱ Payload for ${scaleId}:`, payload);

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

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Error fetching data for ${scaleId}:`, error);
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

      const dailyCollection = db.collection("scale_data_daily");

      // 4. Avoid duplicate inserts
      const existing = await dailyCollection
        .find({
          scale_id: scaleId,
          time: {
            $gte: todayStart.toISOString(),
            $lt: now.toISOString(),
          },
        })
        .toArray();

      if (existing.length > 0) {
        console.log(`ℹ️ Data already exists for ${scaleId}, skipping insert`);
        continue;
      }

      // 5. Insert cleaned data
      const insertResult = await dailyCollection.insertMany(cleanedData);
      console.log(
        `📝 Inserted ${insertResult.insertedCount} records for ${scaleId}`
      );
    }

    return new Response(JSON.stringify({ status: "✅ Daily sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error during sync:", err);
    return new Response(
      JSON.stringify({ status: "❌ Sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
