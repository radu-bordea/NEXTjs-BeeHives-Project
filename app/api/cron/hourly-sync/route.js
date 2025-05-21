import clientPromise from "@/lib/mongodb";
import cleanAndFilter from "@/utils/cleanAndFilter";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const scales = await db.collection("scales").find().toArray();
    const hourlyCollection = db.collection("scale_data_hourly");

    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    const readableNowFinland = now.toLocaleString("fi-FI", {
      timeZone: "Europe/Helsinki",
    });

    console.log("🕒 Current time (Finland):", readableNowFinland);

    const resolution = "hourly";

    for (const { scale_id: scaleId } of scales) {
      // 1. Get latest existing time for this scale
      const latest = await hourlyCollection
        .find({ scale_id: scaleId })
        .sort({ time: -1 })
        .limit(1)
        .toArray();

      let timeStartUnix: number;

      if (latest.length > 0) {
        const latestTime = new Date(latest[0].time);
        timeStartUnix = Math.floor(latestTime.getTime() / 1000) + 3600; // next hour
      } else {
        // If no data exists, fetch data from 3 days ago
        timeStartUnix = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
      }

      const timeEndUnix = nowTimestamp;

      if (timeStartUnix >= timeEndUnix) {
        console.log(`⏭ No new data needed for ${scaleId}`);
        continue;
      }

      const payload = {
        scale: scaleId,
        time_start: timeStartUnix,
        time_end: timeEndUnix,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching data for ${scaleId}:`, {
        start: new Date(timeStartUnix * 1000).toISOString(),
        end: new Date(timeEndUnix * 1000).toISOString(),
      });

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

      // 2. Check for existing timestamps
      const times = cleanedData.map((item) => item.time);
      const existingTimes = await hourlyCollection
        .find({ scale_id: scaleId, time: { $in: times } })
        .project({ time: 1 })
        .toArray();

      const existingSet = new Set(existingTimes.map((doc) => doc.time));
      const newItems = cleanedData.filter(
        (item) => !existingSet.has(item.time)
      );

      if (newItems.length === 0) {
        console.log(`ℹ️ All data already exists for ${scaleId}`);
        continue;
      }

      const insertResult = await hourlyCollection.insertMany(newItems);
      console.log(
        `📝 Inserted ${insertResult.insertedCount} new records for ${scaleId}`
      );
    }

    return new Response(JSON.stringify({ status: "✅ Full sync complete" }), {
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
