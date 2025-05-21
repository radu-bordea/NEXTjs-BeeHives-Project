import clientPromise from "@/lib/mongodb";
import cleanAndFilter from "@/utils/cleanAndFilter";

export async function GET() {
  try {
    // 1. Connect to MongoDB and get collections
    const client = await clientPromise;
    const db = client.db();
    const scales = await db.collection("scales").find().toArray(); // Get all scales
    const hourlyCollection = db.collection("scale_data_hourly"); // Hourly data collection

    console.log(
      "📦 Fetched scales:",
      scales.map((s) => s.scale_id)
    );

    // 2. Get current time and format it for logging
    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000); // Current UNIX timestamp in seconds
    const readableNowFinland = now.toLocaleString("fi-FI", {
      timeZone: "Europe/Helsinki",
    });

    console.log("🕒 Current time (Finland):", readableNowFinland);

    const resolution = "hourly";
    const chunkSize = 8 * 60 * 60; // Sync in 8-hour chunks (in seconds)

    // 3. Loop over each scale
    for (const { scale_id: scaleId } of scales) {
      // Get the latest timestamp already stored for this scale
      const latest = await hourlyCollection
        .find({ scale_id: scaleId })
        .sort({ time: -1 }) // Sort descending to get latest
        .limit(1)
        .toArray();

      // Determine start time:
      // - If we have data: start from 1 hour after the latest
      // - If not: start from 3 days ago
      let startUnix =
        latest.length > 0
          ? Math.floor(new Date(latest[0].time).getTime() / 1000) + 3600
          : nowTimestamp - 3 * 24 * 60 * 60; // 3 days ago

      const endUnix = nowTimestamp;

      console.log(
        `🔄 Syncing ${scaleId} from ${new Date(
          startUnix * 1000
        ).toISOString()} to ${new Date(endUnix * 1000).toISOString()}`
      );

      // 4. Loop from start to now in 8-hour chunks
      while (startUnix < endUnix) {
        const chunkEnd = Math.min(startUnix + chunkSize, endUnix); // End of this chunk

        const payload = {
          scale: scaleId,
          time_start: startUnix,
          time_end: chunkEnd,
          time_resolution: resolution,
          format: "json",
        };

        console.log(
          `📤 Chunk fetch: ${new Date(
            startUnix * 1000
          ).toISOString()} → ${new Date(chunkEnd * 1000).toISOString()}`
        );

        // 5. Call external API to fetch hourly data
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
          console.error(`❌ Error fetching chunk for ${scaleId}:`, error);
          break; // Stop if API fails (avoid bad loops)
        }

        const { data } = await response.json();
        console.log(`📥 Chunk returned ${data?.length || 0} items`);

        if (!Array.isArray(data) || data.length === 0) {
          // Nothing in this chunk, move to next
          startUnix = chunkEnd;
          continue;
        }

        // 6. Clean the raw data
        const cleanedData = data
          .map((item) => cleanAndFilter(item, scaleId))
          .filter(Boolean); // Remove nulls/invalid

        // 7. Check which timestamps already exist in DB
        const times = cleanedData.map((item) => item.time);
        const existingTimes = await hourlyCollection
          .find({ scale_id: scaleId, time: { $in: times } })
          .project({ time: 1 })
          .toArray();

        const existingSet = new Set(existingTimes.map((doc) => doc.time));

        // Filter out existing entries to avoid duplicates
        const newItems = cleanedData.filter(
          (item) => !existingSet.has(item.time)
        );

        if (newItems.length > 0) {
          // 8. Insert new items only
          const insertResult = await hourlyCollection.insertMany(newItems);
          console.log(`📝 Inserted ${insertResult.insertedCount} new items`);
        } else {
          console.log("ℹ️ All items already exist for this chunk");
        }

        // Move to next chunk
        startUnix = chunkEnd;
      }
    }

    // 9. Return success
    return new Response(JSON.stringify({ status: "✅ Full sync complete" }), {
      status: 200,
    });
  } catch (err) {
    // Handle any unexpected errors
    console.error("❌ Error during sync:", err);
    return new Response(
      JSON.stringify({ status: "❌ Sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
