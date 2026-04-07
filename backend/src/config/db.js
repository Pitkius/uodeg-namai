import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memoryMongo = null;

export async function connectDb(mongoUri, { allowMemoryDbFallback = false } = {}) {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(mongoUri);
  } catch (error) {
    if (!allowMemoryDbFallback) throw error;

    // eslint-disable-next-line no-console
    console.warn("Primary MongoDB unavailable, starting in-memory MongoDB...");
    memoryMongo = await MongoMemoryServer.create();
    const memoryUri = memoryMongo.getUri();
    await mongoose.connect(memoryUri);
    // eslint-disable-next-line no-console
    console.log("Connected to in-memory MongoDB");
  }
}

