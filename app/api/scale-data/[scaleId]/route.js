import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

// POST: Fetch from external API and Save into MongoDB
export async function POST(_req, context) {
  const { scaleId } = context.params; // Extract scaleId from URL params
  console.log("🚀 POST scaleId:", scaleId);

  try {
    const client = await clientPromise;
    const db = client.db(); // Get database connection

    // Define time range
    const timeStart = Math.floor(
      new Date("2025-03-07T00:00:00Z").getTime() / 1000
    ); // Start from 7 March 2025
    const timeEnd = Math.floor(Date.now() / 1000); // End at current time

    // --- 1. Fetch and Save HOURLY Data ---

    const hourlyPayload = {
      scale: scaleId,
      time_start: timeStart,
      time_end: timeEnd,
      time_resolution: "hourly",
      format: "json",
    };

    console.log("📤 Fetching HOURLY data...");

    // Send POST request to external API for HOURLY data
    const hourlyRes = await fetch(
      `${process.env.API_BASE_URL}/user/scale/export`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(hourlyPayload),
      }
    );

    if (!hourlyRes.ok) {
      // If fetch failed, return error
      const error = await hourlyRes.text();
      console.error("❌ Hourly fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch hourly data" },
        { status: 500 }
      );
    }

    const { data: hourlyData } = await hourlyRes.json();
    console.log("📥 Hourly data received:", hourlyData?.length || 0);

    if (Array.isArray(hourlyData) && hourlyData.length > 0) {
      // Format data by adding scale_id
      const formattedHourly = hourlyData.map((item) => ({
        ...item,
        scale_id: scaleId,
      }));

      // Get or create MongoDB collection for hourly data
      const hourlyCollection = db.collection("scale_data_hourly");

      // Optional: Clean old hourly data before inserting new
      await hourlyCollection.deleteMany({ scale_id: scaleId });

      // Insert new hourly data
      const insertHourly = await hourlyCollection.insertMany(formattedHourly);

      console.log(
        `✅ Hourly data saved: ${insertHourly.insertedCount} documents`
      );
    } else {
      console.warn("⚠️ No HOURLY data received");
    }

    // --- 2. Fetch and Save DAILY Data ---

    const dailyPayload = {
      scale: scaleId,
      time_start: timeStart,
      time_end: timeEnd,
      time_resolution: "daily",
      format: "json",
    };

    console.log("📤 Fetching DAILY data...");

    // Send POST request to external API for DAILY data
    const dailyRes = await fetch(
      `${process.env.API_BASE_URL}/user/scale/export`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(dailyPayload),
      }
    );

    if (!dailyRes.ok) {
      // If fetch failed, return error
      const error = await dailyRes.text();
      console.error("❌ Daily fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch daily data" },
        { status: 500 }
      );
    }

    const { data: dailyData } = await dailyRes.json();
    console.log("📥 Daily data received:", dailyData?.length || 0);

    if (Array.isArray(dailyData) && dailyData.length > 0) {
      // Format data by adding scale_id
      const formattedDaily = dailyData.map((item) => ({
        ...item,
        scale_id: scaleId,
      }));

      // Get or create MongoDB collection for daily data
      const dailyCollection = db.collection("scale_data_daily");

      // Optional: Clean old daily data before inserting new
      await dailyCollection.deleteMany({ scale_id: scaleId });

      // Insert new daily data
      const insertDaily = await dailyCollection.insertMany(formattedDaily);

      console.log(
        `✅ Daily data saved: ${insertDaily.insertedCount} documents`
      );
    } else {
      console.warn("⚠️ No DAILY data received");
    }

    // Successfully finished
    return NextResponse.json(
      { message: "✅ Hourly and Daily data saved!" },
      { status: 200 }
    );
  } catch (err) {
    // Catch unexpected errors
    console.error("❌ Error saving scale data:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
  console.log(`⏱️ Time range: ${start} → ${end}`);

  try {
    const client = await clientPromise;
    const db = client.db();

    const collectionName =
      resolution === "daily" ? "scale_data_daily" : "scale_data_hourly";
    const collection = db.collection(collectionName);

    const filter = {
      scale_id: scaleId,
    };

    // Only filter by time if both start and end are valid ISO strings
    if (start && end) {
      filter.time = {
        $gte: start, // Use start as an ISO string
        $lte: end, // Use end as an ISO string
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
