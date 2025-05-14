import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

export async function PUT(req, { params }) {
  const { scaleId } = params; // ✅ dynamic param from filename
  const { name } = await req.json();
  const client = await clientPromise;
  const db = client.db();

  console.log("PUT /api/scales/", scaleId, "→ New name:", name);

  const result = await db.collection("scales").updateOne(
    { scale_id: scaleId }, // ✅ match DB field
    { $set: { name } },
    { upsert: false }
  );

  console.log("Update result:", result);

  if (result.matchedCount === 0) {
    return new Response(JSON.stringify({ error: "Scale not found" }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
