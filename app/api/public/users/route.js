import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

/* =========================================================
   CORS CONFIGURATION
   ---------------------------------------------------------
   This allows the API to be accessed from:
   - browsers
   - Power BI
   - external services
   ---------------------------------------------------------
   ⚠️ This endpoint is still protected by token auth.
========================================================= */
const CORS = {
  "Access-Control-Allow-Origin": "*", // allow any domain
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Handle CORS preflight requests (OPTIONS)
 * Browsers and tools like Power BI send this automatically
 */
export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/* =========================================================
   AUTHORIZATION HELPER
   ---------------------------------------------------------
   Checks for:
   Authorization: Bearer <TOKEN>
   ---------------------------------------------------------
   Token is stored securely in Vercel env:
   PUBLIC_API_TOKEN
========================================================= */
function isAuthorized(req) {
  // Read Authorization header
  const auth = req.headers.get("authorization");

  // Missing header or wrong format → unauthorized
  if (!auth || !auth.startsWith("Bearer ")) {
    return false;
  }

  // Extract token value
  const token = auth.replace("Bearer ", "").trim();

  // Compare with server-side secret
  return token === process.env.PUBLIC_API_TOKEN;
}

/* =========================================================
   GET /api/public/users
   ---------------------------------------------------------
   🔐 PROTECTED ENDPOINT (Admin only)
   ---------------------------------------------------------
   - Requires Bearer token
   - Returns users collection as JSON
   - Used for:
       • Admin dashboards
       • Power BI
       • Secure external integrations
========================================================= */
export async function GET(req) {
  try {
    // 🔐 Step 1: Authorization check
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: CORS,
        }
      );
    }

    // ✅ Step 2: Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // ⚠️ Step 3: Access admin-only collection
    // This collection must NOT be publicly exposed
    const collection = db.collection("users");

    // Step 4: Fetch data
    // - Hide internal MongoDB _id
    // - Sort alphabetically by name
    const docs = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();

    // Step 5: Return JSON response
    return NextResponse.json(docs, { headers: CORS });
  } catch (err) {
    // ❌ Log server error (never expose details to client)
    console.error("❌ public/users error:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
        headers: CORS,
      }
    );
  }
}
