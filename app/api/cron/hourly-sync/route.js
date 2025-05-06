// File: /app/api/cron/hourly-sync/route.js

import clientPromise from "@/lib/mongodb";

// Optional Vercel cron config if using Vercel Cron Jobs
// export const config = {
//   runtime: "edge",
//   schedule: "15 0,8,16 * * *", // 12:15AM, 8:15AM, 4:15PM UTC
// };

export async function GET() {
  try {
    console.log("🔁 Hourly sync started...");

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("scales");

    const scales = await collection.find().toArray();
    console.log(`📦 Found ${scales.length} scales in DB`);

    if (!scales.length) {
      console.warn("⚠️ No scales found in DB");
      return Response.json({ status: "⚠️ No scales to sync" }, { status: 200 });
    }

    for (const scale of scales) {
      const url = `${process.env.API_BASE_URL}/api/scale-data/${scale.scale_id}`;
      console.log(`🔄 Syncing scale ${scale.scale_id} → ${url}`);

      const syncRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: "hourly" }),
      });

      if (!syncRes.ok) {
        const errorText = await syncRes.text();
        console.error(`❌ Sync failed for ${scale.scale_id}:`, errorText);
      } else {
        const result = await syncRes.json();
        console.log(`✅ Synced ${scale.scale_id}:`, result);
      }
    }

    return Response.json({ status: "✅ Hourly sync complete" });
  } catch (err) {
    console.error("❌ Cron job error:", err);
    return Response.json(
      { status: "❌ Sync failed", error: err.message },
      { status: 500 }
    );
  }
}
