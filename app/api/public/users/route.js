import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

/* ------------------ CORS ------------------ */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/* ------------------ AUTH HELPER ------------------ */
function isAuthorized(req) {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Bearer ")) {
    return false;
  }

  const token = auth.replace("Bearer ", "").trim();
  return token === process.env.ADMIN_SECRET;
}

/* ------------------ GET (ADMIN ONLY) ------------------ */
export async function GET(req) {
  try {
    // 🔐 Authorization check
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: CORS }
      );
    }

    // ✅ DB connection
    const client = await clientPromise;
    const db = client.db();

    // ⚠️ Admin-only collection
    const collection = db.collection("users");

    const docs = await collection
      .find({}, { projection: { _id: 0 } }) // hide Mongo _id
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(docs, { headers: CORS });
  } catch (err) {
    console.error("❌ public/users error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: CORS }
    );
  }
}
