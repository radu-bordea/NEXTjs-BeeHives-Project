// Import MongoClient from the native MongoDB driver
import { MongoClient } from "mongodb";

// Get the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;
const options = {};

// Ensure the URI is provided
if (!uri) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

let client;
let clientPromise;

// In development, reuse the same connection to avoid creating too many clients
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new connection
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export the connection promise
export default clientPromise;
