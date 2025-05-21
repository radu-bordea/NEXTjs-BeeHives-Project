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

    // 2. Determine the 8-hour block to sync
    const now = new Date();
    const hour = now.getUTCHours();

    let blockStartHour = 0;
    if (hour >= 0 && hour < 8) {
      blockStartHour = 0;
    } else if (hour >= 8 && hour < 16) {
      blockStartHour = 8;
    } else {
      blockStartHour = 16;
    }

    const blockStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        blockStartHour,
        0,
        0
      )
    );

    const blockEnd = new Date(blockStart.getTime() + 8 * 60 * 60 * 1000);

    const readableFinlandStart = blockStart.toLocaleString("fi-FI", {
      timeZone: "Europe/Helsinki",
    });
    const readableFinlandEnd = blockEnd.toLocaleString("fi-FI", {
      timeZone: "Europe/Helsinki",
    });

    console.log("🇫🇮 Finland block time:", {
      readableFinlandStart,
      readableFinlandEnd,
    });

    const timeStart = Math.floor(blockStart.getTime() / 1000);
    const timeEnd = Math.floor(blockEnd.getTime() / 1000);

    console.log("⏱ Syncing block:", {
      timeStart,
      timeEnd,
      readableStart: blockStart.toISOString(),
      readableEnd: blockEnd.toISOString(),
    });

    const resolution = "hourly";

    // 3. Loop through each scale
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

      const hourlyCollection = db.collection("scale_data_hourly");

      // 4. Check for and avoid duplicate hourly inserts
      const times = cleanedData.map((item) => item.time);

      const existingTimes = await hourlyCollection
        .find({
          scale_id: scaleId,
          time: { $in: times },
        })
        .project({ time: 1 })
        .toArray();

      const existingSet = new Set(existingTimes.map((doc) => doc.time));

      const newItems = cleanedData.filter(
        (item) => !existingSet.has(item.time)
      );

      if (newItems.length === 0) {
        console.log(
          `ℹ️ All hourly data already exists for ${scaleId}, skipping insert`
        );
        continue;
      }

      const insertResult = await hourlyCollection.insertMany(newItems);
      console.log(
        `📝 Inserted ${insertResult.insertedCount} new hourly records for ${scaleId}`
      );
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
