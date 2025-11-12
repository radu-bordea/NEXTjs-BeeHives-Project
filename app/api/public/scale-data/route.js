// app/api/public/scale-data/route.js
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

export async function GET(req) {
  const url = new URL(req.url);

  // Query params
  const resolution = (url.searchParams.get("resolution") || "hourly").toLowerCase(); // "hourly" | "daily"
  const latest = /^(1|true)$/i.test(url.searchParams.get("latest") || "");         // true -> latest per scale
  const scaleParam = url.searchParams.get("scale");                                 // comma-separated scale_ids
  const start = url.searchParams.get("start");                                      // ISO
  const end = url.searchParams.get("end");                                          // ISO
  const limit = parseInt(url.searchParams.get("limit") || "0", 10);                 // optional window cap
  const fieldsParam = url.searchParams.get("fields");                               // optional projection: "time,weight,temperature"

  // Validate
  if (!["hourly", "daily"].includes(resolution)) {
    return NextResponse.json({ error: "Invalid resolution (hourly|daily)" }, { status: 400, headers: CORS });
  }

  // DB
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(resolution === "daily" ? "scale_data_daily" : "scale_data_hourly");

    // Scale filter
    let scaleFilter = {};
    if (scaleParam && scaleParam.trim()) {
      const ids = scaleParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length) scaleFilter = { scale_id: { $in: ids } };
    }

    // Optional projection (only include requested fields)
    // Always keep _id out; include scale_id & time unless explicitly excluded.
    let projection = { _id: 0 };
    if (fieldsParam) {
      projection = { _id: 0 };
      const requested = new Set(fieldsParam.split(",").map((f) => f.trim()).filter(Boolean));
      for (const f of requested) projection[f] = 1;
      // If user didn’t ask for scale_id/time, you can omit these lines.
      if (!requested.size || requested.has("scale_id")) projection.scale_id = 1;
      if (!requested.size || requested.has("time")) projection.time = 1;
    }

    // LATEST per scale
    if (latest) {
      const pipeline = [
        ...(Object.keys(scaleFilter).length ? [{ $match: scaleFilter }] : []),
        { $sort: { scale_id: 1, time: -1 } }, // newest first per scale
        { $group: { _id: "$scale_id", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $project: projection },
        { $sort: { scale_id: 1 } },
      ];
      const docs = await collection.aggregate(pipeline).toArray();
      return NextResponse.json(docs, { headers: CORS });
    }

    // WINDOW mode
    const filter = { ...scaleFilter };
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s) || isNaN(e) || s >= e) {
        return NextResponse.json({ error: "Invalid 'start'/'end' window" }, { status: 400, headers: CORS });
      }
      filter.time = { $gte: s.toISOString(), $lte: e.toISOString() };
    }

    let cursor = collection.find(filter, { projection }).sort({ time: 1 });
    if (Number.isFinite(limit) && limit > 0) cursor = cursor.limit(limit);

    const docs = await cursor.toArray();
    return NextResponse.json(docs, { headers: CORS });
  } catch (err) {
    console.error("❌ public/scale-data error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: CORS });
  }
}
