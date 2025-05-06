// File: /app/api/cron/hourly-sync/route.js

// export const config = {
//   runtime: "edge",
//   schedule: "15 0,8,16 * * *", // ⏰ At 12:15 AM, 8:15 AM, 4:15 PM UTC daily
// };

export async function GET() {
  try {
    // Debug log to check BASE_URL
    console.log("Base URL:", process.env.BASE_URL);

    // Fetch scales
    const res = await fetch(`${process.env.BASE_URL}/api/scales`);
    if (!res.ok) {
      console.error("❌ Error fetching scales:", await res.text());
      return Response.json(
        { status: "❌ Error fetching scales", error: "Failed to fetch scales" },
        { status: 500 }
      );
    }

    const { scales } = await res.json();
    console.log("Scales fetched:", scales); // Log the fetched scales

    for (const scale of scales) {
      console.log(`Syncing scale ${scale.scale_id}...`);

      const scaleDataRes = await fetch(
        `${process.env.BASE_URL}/api/scale-data/${scale.scale_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution: "hourly" }),
        }
      );

      if (!scaleDataRes.ok) {
        const error = await scaleDataRes.text();
        console.error(`❌ Error syncing scale ${scale.scale_id}:`, error);
      } else {
        console.log(`✅ Successfully synced scale ${scale.scale_id}`);
      }
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
