import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/* eslint-disable no-var */
declare global {
  var mongooseGlobal: MongooseCache | undefined;
}
/* eslint-enable no-var */

let cached = global.mongooseGlobal;

if (!cached) {
  cached = global.mongooseGlobal = { conn: null, promise: null };
}

export async function dbConnect(): Promise<typeof mongoose> {
  const activeCache = cached!;
  if (activeCache.conn) {
    return activeCache.conn;
  }

  if (!activeCache.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    activeCache.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    activeCache.conn = await activeCache.promise;
  } catch (e) {
    activeCache.promise = null;
    throw e;
  }

  return activeCache.conn;
}
