import { MongoClient, Db } from 'mongodb';
import { ENV } from './env';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(ENV.MONGODB_URI, {
    maxPoolSize: 50,
    connectTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db(ENV.DB_NAME);

  // Ensure critical indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ googleId: 1 });
  
  console.log('Connected to MongoDB');
  return db;
}

export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}
