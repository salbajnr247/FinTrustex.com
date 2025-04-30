/**
 * Database Migration Script for FinTrustEX
 * This script updates the database schema based on changes to shared/schema.ts
 */
require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const path = require('path');
const fs = require('fs');
const { exit } = require('process');

// Define the SQL statements to create new enums and tables
const migrationSQL = `
-- Create enums if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
        CREATE TYPE kyc_status AS ENUM ('not_submitted', 'pending', 'approved', 'rejected');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investment_status') THEN
        CREATE TYPE investment_status AS ENUM ('active', 'completed', 'cancelled');
    END IF;
END $$;

-- Alter users table to add new columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS kyc_status kyc_status DEFAULT 'not_submitted',
ADD COLUMN IF NOT EXISTS kyc_documents JSONB,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create investment_packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS investment_packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    minimum_investment NUMERIC NOT NULL,
    maximum_investment NUMERIC,
    duration_days INTEGER NOT NULL,
    roi_percentage NUMERIC NOT NULL,
    risk_level TEXT NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_investments table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    package_id INTEGER NOT NULL REFERENCES investment_packages(id),
    amount NUMERIC NOT NULL,
    status investment_status DEFAULT 'active',
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    expected_return NUMERIC NOT NULL,
    actual_return NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function main() {
  console.log('Starting database migration...');
  
  try {
    // Create database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Connect and execute the migration SQL
    const client = await pool.connect();
    try {
      console.log('Connected to database, executing migration queries...');
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('Migration completed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error executing migration:', error);
      exit(1);
    } finally {
      client.release();
    }
    
    // Close pool
    await pool.end();
    
    console.log('Database migration completed.');
  } catch (error) {
    console.error('Database connection error:', error);
    exit(1);
  }
}

main();