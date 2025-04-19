const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/pg');
const schema = require('../shared/schema');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Check connection and log errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Log configuration for debugging
console.log(`Database configured with ${process.env.DATABASE_URL ? 'provided' : 'missing'} connection string`);

module.exports = { pool, db };