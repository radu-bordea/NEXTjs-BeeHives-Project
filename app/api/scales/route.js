// app/api/scales/route.js
import clientPromise from "@/lib/mongodb"; // MongoDB client connection helper

// POST handler: Fetches scale data from external API, saves it to MongoDB
export async function POST() {
  try {
    console.log("API_BASE_URL:", process.env.API_BASE_URL);
    // Step 1: Fetch scale data from external API
    const response = await fetch(`${process.env.API_BASE_URL}/user/scale`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`, // Use Bearer token for auth
      },
    });

    // Step 2: Handle failed external API response
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ External API error:", errText);
      return new Response(
        JSON.stringify({ error: "External API request failed" }),
        { status: 500 }
      );
    }

    // Step 3: Parse response and validate format
    const data = await response.json();
    console.log("Fetched scales:", data); // Log response for debugging

    // Ensure `data.scales` exists and is an array
    if (!data?.scales || !Array.isArray(data.scales)) {
      console.error("❌ Invalid scales format:", data);
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
      });
    }

    // Step 4: Connect to MongoDB and get `scales` collection
    const client = await clientPromise;
    const db = client.db(); // Uses default DB from URI
    const collection = db.collection("scales");

    console.log("Inserting scales into database:", data.scales);

    // Step 5: Clear old scale records and insert the new set
    await collection.deleteMany({});
    const insertResult = await collection.insertMany(data.scales);

    // Step 6: Respond with success message and inserted count
    return new Response(
      JSON.stringify({
        message: "Scales synced",
        count: insertResult.insertedCount,
      }),
      { status: 200 }
    );
  } catch (err) {
    // Catch-all error handler for unexpected server issues
    console.error("❌ POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET handler: Returns all scales stored in MongoDB
export async function GET() {
  try {
    // Step 1: Connect to MongoDB and fetch all scales
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("scales");

    const scales = await collection.find().toArray(); // Convert cursor to array
    console.log("Fetched scales:", scales); // Log for verification

    // Step 2: Return scales in JSON format
    return new Response(JSON.stringify({ scales }), { status: 200 });
  } catch (err) {
    // Handle MongoDB or server error
    console.error("❌ GET error:", err);
    return new Response(JSON.stringify({ error: "Failed to load scales" }), {
      status: 500,
    });
  }
}
