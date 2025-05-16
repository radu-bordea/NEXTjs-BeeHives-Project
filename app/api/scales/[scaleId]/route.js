import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

export async function PUT(req, { params }) {
  const { scaleId } = params; // ✅ dynamic param from filename
  const { name } = await req.json();
  const client = await clientPromise;
  const db = client.db();

  console.log("PUT /api/scale-names/", scaleId, "→ New name:", name);

  const result = await db.collection("scale_names").updateOne(
    { scale_id: scaleId },
    { $set: { name } },
    { upsert: true } // since it's a separate collection, allow insert
  );

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
