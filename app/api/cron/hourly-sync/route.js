// File: /app/api/cron/hourly-sync/route.js

export const config = {
  runtime: "edge",
  schedule: "15 0,12,16 * * *", // ⏰ At 12:15 AM, 8:15 AM, 4:15 PM UTC daily
};

export async function GET() {
  try {
    const res = await fetch(`${process.env.BASE_URL}/api/scales`);
    const { scales } = await res.json();

    for (const scale of scales) {
      await fetch(`${process.env.BASE_URL}/api/scale-data/${scale.scale_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: "hourly" }),
      });
    }

    return Response.json({ status: "✅ Hourly sync complete" });
  } catch (err) {
    console.error("❌ Hourly sync error:", err);
    return Response.json(
      { status: "❌ Hourly sync failed", error: err.message },
      { status: 500 }
    );
  }
}
