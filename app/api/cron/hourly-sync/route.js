export async function GET() {
  try {
    console.log("🔁 Hourly cron started...");
    const baseUrl = process.env.API_BASE_URL;
    console.log("🌍 API_BASE_URL:", baseUrl);

    const res = await fetch(`${baseUrl}/api/scales`);
    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ Error fetching scales:", errText);
      return Response.json(
        { error: "Failed to fetch scales" },
        { status: 500 }
      );
    }

    const { scales } = await res.json();
    console.log("📦 Scales fetched:", scales);

    for (const scale of scales) {
      const syncRes = await fetch(
        `${baseUrl}/api/scale-data/${scale.scale_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution: "hourly" }),
        }
      );

      if (!syncRes.ok) {
        const errText = await syncRes.text();
        console.error(`❌ Sync failed for ${scale.scale_id}:`, errText);
      } else {
        const resJson = await syncRes.json();
        console.log(`✅ Synced ${scale.scale_id}:`, resJson);
      }
    }

    return Response.json({ status: "✅ Hourly sync complete" });
  } catch (err) {
    console.error("❌ Hourly sync error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
