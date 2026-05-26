import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

const globalCache = globalThis as typeof globalThis & { __mongoCache?: MongoCache };

const cache = globalCache.__mongoCache ?? { client: undefined, promise: undefined };

globalCache.__mongoCache = cache;

if (!cache.client) {
  cache.client = new MongoClient(uri);
}

if (!cache.promise) {
  cache.promise = cache.client.connect();
}

export const getMongoClient = async () => cache.promise as Promise<MongoClient>;

export const getDatabaseName = () => process.env.MONGODB_DB || "beo";

export const getCollectionName = () => process.env.MONGODB_COLLECTION || "jobs";
