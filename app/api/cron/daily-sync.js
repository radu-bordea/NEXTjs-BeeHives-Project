// File: /api/cron/daily-sync.js

export const config = {
  runtime: "edge",
  schedule: "0 2 * * *", // ⏰ Daily at 2 AM UTC
};

export default async function handler(req) {
  try {
    const res = await fetch(`${process.env.BASE_URL}/api/scales`);
    const { scales } = await res.json();

    for (const scale of scales) {
      await fetch(`${process.env.BASE_URL}/api/scale-data/${scale.scale_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: "daily" }),
      });
    }

    return new Response(JSON.stringify({ status: "✅ Daily sync complete" }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Daily sync error:", err);
    return new Response(
      JSON.stringify({ status: "❌ Daily sync failed", error: err.message }),
      { status: 500 }
    );
  }
}
