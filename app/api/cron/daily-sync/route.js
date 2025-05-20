import clientPromise from "@/lib/mongodb";
import cleanAndFilter from "@/utils/cleanAndFilter";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const scales = await db.collection("scales").find().toArray();

    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    const now = new Date();

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

    const timeStart = Math.floor(yesterdayStart.getTime() / 1000);
    const timeEnd = Math.floor(todayStart.getTime() / 1000);

    console.log("⏱ Time window", {
      timeStart,
      timeEnd,
      readableStart: yesterdayStart.toISOString(),
      readableEnd: todayStart.toISOString(),
    });

    const resolution = "daily";

    for (const { scale_id: scaleId } of scales) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching DAILY data for ${scaleId}...`);

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
        console.error(`❌ Fetch error for ${scaleId}:`, error);
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

      console.log(`✅ Cleaned ${cleanedData.length} items`);

      const dailyCollection = db.collection("scale_data_daily");

      const existing = await dailyCollection
        .find({
          scale_id: scaleId,
          time: {
            $gte: yesterdayStart.toISOString(),
            $lt: todayStart.toISOString(),
          },
        })
        .toArray();

      if (existing.length > 0) {
        console.log(`ℹ️ Data already exists for ${scaleId}, skipping insert`);
        continue;
      }

      const insertResult = await dailyCollection.insertMany(cleanedData);
      console.log(`📝 Inserted ${insertResult.insertedCount} for ${scaleId}`);
    }

    return new Response(JSON.stringify({ status: "✅ Daily sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error during daily sync:", err);
    return new Response(
      JSON.stringify({ status: "❌ Sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
