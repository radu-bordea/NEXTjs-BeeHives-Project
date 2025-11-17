// app/api/public/scales-info/route.js
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

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Use your public-facing collection
    const collection = db.collection("users");

    // You can sort however you like; here by name, then scale_id
    const docs = await collection
      .find({}, { projection: { _id: 0 } }) // hide internal _id
      .sort({ name: 1, scale_id: 1 })
      .toArray();

    return NextResponse.json(docs, { headers: CORS });
  } catch (err) {
    console.error("❌ public/scales-info error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: CORS }
    );
  }
}
