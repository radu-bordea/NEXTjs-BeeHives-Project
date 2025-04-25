// app/api/scales/route.js
import clientPromise from "@/lib/mongodb";

export async function POST() {
  try {
    const response = await fetch(`${process.env.API_BASE_URL}/user/scale`, {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ External API error:", errText);
      return new Response(
        JSON.stringify({ error: "External API request failed" }),
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data?.scales || !Array.isArray(data.scales)) {
      console.error("❌ Invalid scales format:", data);
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db("beehives"); // Auto-select from URI
    const collection = db.collection("scales");

    await collection.deleteMany({});
    await collection.insertMany(data.scales);

    return new Response(
      JSON.stringify({ message: "Scales synced", count: data.scales.length }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ POST error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("beehives");
    const collection = db.collection("scales");

    const scales = await collection.find().toArray();

    return new Response(JSON.stringify({ scales }), { status: 200 });
  } catch (err) {
    console.error("❌ GET error:", err);
    return new Response(JSON.stringify({ error: "Failed to load scales" }), {
      status: 500,
    });
  }
}
