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
    console.log("Fetched scales:", data); // Debugging the response

    if (!data?.scales || !Array.isArray(data.scales)) {
      console.error("❌ Invalid scales format:", data);
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
      });
    }

    const client = await clientPromise;
    const db = client.db(); // Auto-select from URI
    const collection = db.collection("scales");

    // Log the scales data to verify
    console.log("Inserting scales into database:", data.scales);

    // Clear previous scales and insert new data
    await collection.deleteMany({});
    const insertResult = await collection.insertMany(data.scales);

    return new Response(
      JSON.stringify({
        message: "Scales synced",
        count: insertResult.insertedCount,
      }),
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
    const db = client.db();
    const collection = db.collection("scales");

    const scales = await collection.find().toArray();
    console.log("Fetched scales:", scales); // Debugging the scales data

    return new Response(JSON.stringify({ scales }), { status: 200 });
  } catch (err) {
    console.error("❌ GET error:", err);
    return new Response(JSON.stringify({ error: "Failed to load scales" }), {
      status: 500,
    });
  }
}
