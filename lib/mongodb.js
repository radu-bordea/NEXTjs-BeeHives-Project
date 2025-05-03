// Import MongoClient from MongoDB package to handle database connections
import { MongoClient } from "mongodb";

// Fetch MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;
// Define options for MongoDB client connection (empty in this case)
const options = {};

// Ensure that the MONGODB_URI environment variable is defined
if (!uri) {
  // If URI is not defined, throw an error
  throw new Error("Please define MONGODB_URI in .env.local");
}

let client; // MongoDB client object
let clientPromise; // Promise that resolves to the client after connecting

// Function to create indexes on the collections for efficient queries
async function createIndexes(client) {
  const db = client.db(); // Get the database object
  // Create indexes on scale_data_hourly and scale_data_daily collections
  await Promise.all([
    db.collection("scale_data_hourly").createIndex({ scale_id: 1, time: -1 }), // Index for hourly data by scale_id and time (descending)
    db.collection("scale_data_daily").createIndex({ scale_id: 1, time: -1 }), // Index for daily data by scale_id and time (descending)
  ]);
}

// Check if the environment is "development"
if (process.env.NODE_ENV === "development") {
  // If running in development, check if a MongoDB client already exists in the global object
  if (!global._mongoClientPromise) {
    // If not, create a new MongoClient instance
    client = new MongoClient(uri, options);
    // Store the client connection promise in global object to reuse it across different files
    global._mongoClientPromise = client.connect().then(async (client) => {
      // Once connected, create necessary indexes
      await createIndexes(client);
      return client; // Return the connected client
    });
  }
  // Assign the clientPromise to the global one
  clientPromise = global._mongoClientPromise;
} else {
  // For non-development environments (e.g., production)
  client = new MongoClient(uri, options);
  // Connect to MongoDB and create indexes after connection
  clientPromise = client.connect().then(async (client) => {
    await createIndexes(client); // Create indexes once connected
    return client; // Return the connected client
  });
}

// Export the clientPromise so other parts of the application can await the database connection
export default clientPromise;
