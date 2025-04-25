import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(_req, context) {
  const { scaleId } = await context.params; // ❌ remove "await" — this is not a promise
  console.log("🚀 POST scaleId:", scaleId);

  try {
    const bodyPayload = {
      scale: scaleId,
      time_start: Math.floor(Date.now() / 1000) - 86400,
      time_end: Math.floor(Date.now() / 1000),
      time_resolution: "hourly",
      format: "json",
    };

    console.log("📤 Sending request to external API with body:", bodyPayload);

    const externalRes = await fetch(
      `${process.env.API_BASE_URL}/user/scale/export`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!externalRes.ok) {
      const error = await externalRes.text();
      console.error("❌ External API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch data from external API" },
        { status: 500 }
      );
    }

    const { data } = await externalRes.json();
    console.log("📥 Received data from external API:", data?.length, "items");

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ No data returned from external API.");
      return NextResponse.json(
        { message: "No data received", count: 0 },
        { status: 200 }
      );
    }

    const client = await clientPromise;
    const db = client.db(); // uses DB from Mongo URI
    const collection = db.collection("scale_data");

    const formattedData = data.map((item) => ({
      ...item,
      scale_id: scaleId,
    }));

    console.log("💾 Inserting", formattedData.length, "items into MongoDB...");

    await collection.deleteMany({ scale_id: scaleId }); // Optional: clean old data
    const insertResult = await collection.insertMany(formattedData);

    console.log(
      "✅ Data saved to MongoDB:",
      insertResult.insertedCount,
      "docs"
    );

    return NextResponse.json(
      {
        message: "✅ Scale data saved to DB",
        count: insertResult.insertedCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error saving data:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(_req, context) {
  const { scaleId } = await context.params;
  console.log("🔍 GET scaleId:", scaleId);

  try {
    const client = await clientPromise;
    const db = client.db();

    const scaleData = await db
      .collection("scale_data")
      .find({ scale_id: scaleId })
      .toArray();

    console.log("📦 Data fetched from DB:", scaleData.length, "records");

    return NextResponse.json(scaleData);
  } catch (err) {
    console.error("❌ Error fetching scale data:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
