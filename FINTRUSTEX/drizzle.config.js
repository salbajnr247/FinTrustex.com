require('dotenv').config();

module.exports = {
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};