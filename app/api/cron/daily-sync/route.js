// File: app/api/cron/daily-sync/route.js

// export const config = {
//   runtime: "edge",
//   schedule: "0 2 * * *", // ⏰ Daily at 2 AM UTC
// };

export async function GET() {
  try {
    const res = await fetch(`${process.env.BASE_URL}/api/scales`);
    const { scales } = await res.json();

    for (const scale of scales) {
      await fetch(`${process.env.API_BASE_URL}/api/scale-data/${scale.scale_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: "daily" }),
      });
    }

    return Response.json({ status: "✅ Daily sync complete" });
  } catch (err) {
    console.error("❌ Daily sync error:", err);
    return Response.json(
      { status: "❌ Daily sync failed", error: err.message },
      { status: 500 }
    );
  }
}
