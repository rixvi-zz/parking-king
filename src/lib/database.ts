import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return mongoose.connection;
  
  const uri = process.env.MONGODB_URI!;
  if (!uri) throw new Error("MONGODB_URI not set");
  
  await mongoose.connect(uri, { dbName: "parking_king" });
  isConnected = true;
  return mongoose.connection;
}

// optional: direct Mongo client
import { MongoClient, Db } from "mongodb";

let client: MongoClient;

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI!;
  client = client || new MongoClient(uri);
  if (!client.topology?.isConnected()) await client.connect();
  return client.db("parking_king");
}