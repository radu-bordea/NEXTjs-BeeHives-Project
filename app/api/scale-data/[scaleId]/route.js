import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

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

export async function POST(_req, context) {
  const { scaleId } = context.params;
  console.log("🚀 POST scaleId:", scaleId);

  try {
    const client = await clientPromise;
    const db = client.db();

    const timeStart = Math.floor(
      new Date("2025-03-07T00:00:00Z").getTime() / 1000
    );
    const timeEnd = Math.floor(Date.now() / 1000);

    const resolutions = ["hourly", "daily"];

    for (const resolution of resolutions) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching ${resolution.toUpperCase()} data...`);

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
        console.error(`❌ ${resolution} fetch error:`, error);
        return NextResponse.json(
          { error: `Failed to fetch ${resolution} data` },
          { status: 500 }
        );
      }

      const { data } = await res.json();
      console.log(`📥 ${resolution} data received:`, data?.length || 0);

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

        await collection.deleteMany({ scale_id: scaleId });

        if (cleanedData.length > 0) {
          const inserted = await collection.insertMany(cleanedData);
          console.log(
            `✅ ${resolution.toUpperCase()} data saved: ${
              inserted.insertedCount
            } documents`
          );
        } else {
          console.warn(`⚠️ No meaningful ${resolution} records to save`);
        }
      } else {
        console.warn(`⚠️ No ${resolution.toUpperCase()} data received`);
      }
    }

    return NextResponse.json(
      { message: "✅ Hourly and Daily data saved!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error saving scale data:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Read scale data from MongoDB
export async function GET(req, context) {
  const { scaleId } = context.params;
  const url = new URL(req.url);
  const resolution = url.searchParams.get("resolution") || "hourly";
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  console.log(`🔍 GET scaleId: ${scaleId}, resolution: ${resolution}`);
  console.log(`⏱️ Time range: ${start || "any"} → ${end || "any"}`);

  try {
    const client = await clientPromise;
    const db = client.db();

    // Validate resolution
    const allowedResolutions = ["hourly", "daily"];
    if (!allowedResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: "Invalid resolution; must be 'hourly' or 'daily'" },
        { status: 400 }
      );
    }

    const collectionName =
      resolution === "daily" ? "scale_data_daily" : "scale_data_hourly";
    const collection = db.collection(collectionName);

    const filter = { scale_id: scaleId };

    // Time filtering
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate) || isNaN(endDate)) {
        return NextResponse.json(
          { error: "Invalid start or end date" },
          { status: 400 }
        );
      }

      if (startDate >= endDate) {
        return NextResponse.json(
          { error: "'start' date must be before 'end' date" },
          { status: 400 }
        );
      }

      filter.time = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      };
    }

    const scaleData = await collection.find(filter).sort({ time: 1 }).toArray();

    console.log(
      `📦 Fetched ${scaleData.length} records from ${collectionName}`
    );

    return NextResponse.json(scaleData);
  } catch (err) {
    console.error("❌ Error fetching scale data:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
