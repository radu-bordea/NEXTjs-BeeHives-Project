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
    const client = await clientPromise;
    const db = client.db();
    const scalesCollection = db.collection("scales");

    // Use aggregation to join with scale_names collection
    const scales = await scalesCollection
      .aggregate([
        {
          $lookup: {
            from: "scales_info", // collection to join
            localField: "scale_id", // field from scales
            foreignField: "scale_id", // field from scale_names
            as: "name_info", // output array field
          },
        },
        {
          $addFields: {
            name: { $arrayElemAt: ["$name_info.name", 0] },
            latitude: { $arrayElemAt: ["$name_info.latitude", 0] },
            longitude: { $arrayElemAt: ["$name_info.longitude", 0] },
          },
        },
        {
          $project: {
            name_info: 0, // remove the temporary array field
          },
        },
      ])
      .toArray();

    console.log("Fetched scales with names:", scales);

    return new Response(JSON.stringify({ scales }), { status: 200 });
  } catch (err) {
    console.error("❌ GET error:", err);
    return new Response(JSON.stringify({ error: "Failed to load scales" }), {
      status: 500,
    });
  }
}
