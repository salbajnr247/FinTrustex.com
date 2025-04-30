require('dotenv').config();

/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './shared/schema.ts',
  out: './drizzle',
  driver: 'pg', 
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
};