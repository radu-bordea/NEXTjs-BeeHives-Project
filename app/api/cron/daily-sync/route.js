import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

// Helper: Clean and filter each item (only keep if at least one key field is non-zero)
function cleanAndFilter(item, scaleId) {
  const cleaned = {
    time: item.time,
    scale_id: scaleId,
  };

  let hasData = false;

  const fieldsToCheck = [
    "weight",
    "yield",
    "temperature",
    "brood",
    "humidity",
    "rain",
    "wind_speed",
    "wind_direction",
  ];

  for (const key of fieldsToCheck) {
    const val = Number(item[key]);
    if (!isNaN(val) && val !== 0) {
      cleaned[key] = val;
      hasData = true;
    }
  }

  return hasData ? cleaned : null;
}

export async function GET() {
  try {
    // Step 1: Connect to MongoDB and fetch all scales
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("scales");

    const scales = await collection.find().toArray(); // Get all scales from MongoDB
    console.log("Fetched scales:", scales); // Log for verification

    // Step 2: Loop through each scale and fetch data from the API
    for (const scale of scales) {
      const scaleId = scale.scale_id;
      const timeStart = Math.floor(
        new Date("2025-03-07T00:00:00Z").getTime() / 1000
      );
      const timeEnd = Math.floor(Date.now() / 1000);

      // Use the 'daily' resolution since we are running a daily sync job
      const resolution = "daily";

      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(
        `📤 Fetching ${resolution.toUpperCase()} data for scale ${scaleId}...`
      );

      const res = await fetch(`${process.env.API_BASE_URL}/user/scale/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error(
          `❌ ${resolution} fetch error for scale ${scaleId}:`,
          error
        );
        continue;
      }

      const { data } = await res.json();
      console.log(
        `📥 ${resolution} data received for scale ${scaleId}:`,
        data?.length || 0
      );

      if (Array.isArray(data) && data.length > 0) {
        const cleanedData = data
          .map((item) => cleanAndFilter(item, scaleId))
          .filter(Boolean); // Remove nulls (meaningless items)

        console.log(
          `${resolution.toUpperCase()}: kept ${cleanedData.length} of ${
            data.length
          }`
        );

        const collectionName =
          resolution === "daily" ? "scale_data_daily" : "scale_data_hourly";
        const collection = db.collection(collectionName);

        // Optionally delete existing records to avoid duplication
        await collection.deleteMany({ scale_id: scaleId });

        if (cleanedData.length > 0) {
          const inserted = await collection.insertMany(cleanedData);
          console.log(
            `✅ ${resolution.toUpperCase()} data saved for scale ${scaleId}: ${
              inserted.insertedCount
            } documents`
          );
        } else {
          console.warn(
            `⚠️ No meaningful ${resolution} records for scale ${scaleId} to save`
          );
        }
      } else {
        console.warn(
          `⚠️ No ${resolution.toUpperCase()} data received for scale ${scaleId}`
        );
      }
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
