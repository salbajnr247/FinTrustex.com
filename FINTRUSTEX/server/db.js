/**
 * Database Connection for FinTrustEX
 */

require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('../shared/schema');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize Drizzle ORM with the schema
const db = drizzle(pool, { schema });

// Export both pool and db
module.exports = {
  pool,
  db
};