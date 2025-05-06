import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

// Helper function to clean and filter data
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

// Function to sync data for each scaleId
async function syncScaleData(scaleId, resolution, timeStart, timeEnd) {
  const payload = {
    scale: scaleId,
    time_start: timeStart,
    time_end: timeEnd,
    time_resolution: resolution,
    format: "json",
  };

  console.log(
    `📤 Fetching ${resolution.toUpperCase()} data for scaleId: ${scaleId}`
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
      `❌ ${resolution} fetch error for scaleId ${scaleId}:`,
      error
    );
    return {
      error: `Failed to fetch ${resolution} data for scaleId ${scaleId}`,
    };
  }

  const { data } = await res.json();
  console.log(
    `📥 ${resolution} data received for scaleId ${scaleId}:`,
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
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(collectionName);

    // Insert the new data into the collection for the scaleId
    await collection.deleteMany({ scale_id: scaleId });

    if (cleanedData.length > 0) {
      const inserted = await collection.insertMany(cleanedData);
      console.log(
        `✅ ${resolution.toUpperCase()} data saved for scaleId ${scaleId}: ${
          inserted.insertedCount
        } documents`
      );
    } else {
      console.warn(
        `⚠️ No meaningful ${resolution} records to save for scaleId ${scaleId}`
      );
    }
  } else {
    console.warn(
      `⚠️ No ${resolution.toUpperCase()} data received for scaleId ${scaleId}`
    );
  }

  return {
    message: `Sync completed for scaleId ${scaleId} with ${resolution}`,
  };
}

export async function POST(req) {
  try {
    // Parse the request body to extract the resolution (daily or hourly)
    const { resolution } = await req.json(); // This will handle the body passed from EasyCron

    if (!resolution || !["hourly", "daily"].includes(resolution)) {
      return NextResponse.json(
        { error: "Invalid resolution, must be 'hourly' or 'daily'" },
        { status: 400 }
      );
    }

    // Get the current time for syncing only today's data onwards
    const timeStart = Math.floor(Date.now() / 1000); // Current timestamp
    const timeEnd = timeStart + 86400; // Set the time end for a full day after now (for the cron job)

    // List of scales to sync (you can either hardcode it or fetch from DB)
    const client = await clientPromise;
    const db = client.db();
    const scalesCollection = db.collection("scales");
    const scales = await scalesCollection.find().toArray(); // Fetch scales from MongoDB

    const results = [];

    // Sync data for each scaleId based on the resolution (hourly or daily)
    for (const scale of scales) {
      const scaleId = scale._id.toString(); // Ensure it's a string

      if (resolution === "hourly") {
        // Sync hourly data once (cron job runs 3 times a day)
        console.log("🚀 Triggering Hourly Sync for scaleId:", scaleId);
        results.push(
          await syncScaleData(scaleId, "hourly", timeStart, timeEnd)
        );
      } else if (resolution === "daily") {
        // Sync daily data once per day
        console.log("🚀 Triggering Daily Sync for scaleId:", scaleId);
        results.push(await syncScaleData(scaleId, "daily", timeStart, timeEnd));
      }
    }

    return NextResponse.json({ message: "✅ Cron Sync completed!", results });
  } catch (err) {
    console.error("❌ Error during cron sync:", err);
    return NextResponse.json(
      { error: "Internal server error during cron sync" },
      { status: 500 }
    );
  }
}
