// File: /api/cron/hourly-sync.js

export const config = {
  runtime: "edge",
  schedule: "15 0, 8, 16 * * *", // ⏰ At 6AM, 12PM, and 6PM UTC daily
};

export default async function handler(req) {
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

    return new Response(JSON.stringify({ status: "✅ Hourly sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Hourly sync error:", err);
    return new Response(
      JSON.stringify({ status: "❌ Hourly sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
