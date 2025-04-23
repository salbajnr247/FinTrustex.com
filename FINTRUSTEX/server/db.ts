import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "../shared/schema";
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

// Log configuration for debugging
console.log(`Database configured with ${process.env.DATABASE_URL ? 'provided' : 'missing'} connection string`);
