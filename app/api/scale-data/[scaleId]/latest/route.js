// app/api/scale-data/[scaleId]/latest/route.js
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { scaleId } = params;
  const url = new URL(req.url);
  const resolution = url.searchParams.get("resolution") || "hourly";
  const limit = parseInt(url.searchParams.get("limit")) || 20;

  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(
      resolution === "daily" ? "scale_data_daily" : "scale_data_hourly"
    );

    const latestData = await collection
      .find({ scale_id: scaleId })
      .sort({ time: -1 }) // newest first
      .limit(limit)
      .toArray();

    return NextResponse.json(latestData.reverse()); // reverse to keep oldest-to-newest order
  } catch (err) {
    console.error("❌ Error fetching latest scale data:", err);
    return NextResponse.json(
      { error: "Failed to load latest data" },
      { status: 500 }
    );
  }
}
