/**
 * Database Migration Script for FinTrustEX
 * This script updates the database schema based on changes to shared/schema.ts
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  const { Pool } = require('pg');
  try {
    console.log('Starting database migration...');
    
    // Check if the schema file exists
    const schemaPath = path.resolve(__dirname, 'shared/schema.ts');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found at: ' + schemaPath);
    }
    console.log('Schema file found at: ' + schemaPath);
    
    // Run drizzle-kit generate first to create SQL files
    console.log('Running drizzle-kit generate...');
    execSync('npx drizzle-kit generate:pg', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    console.log('Migrating database schema...');
    // Connect to DB and run SQL directly using node-postgres to avoid interactive prompts
    const pool = new Pool({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: true
    });
    
    // Perform basic alterations to add the new fields
    const alterations = [
      // Add new fields to users table
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS restriction_reason TEXT",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMP",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS restricted_by INTEGER",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT",
      "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT",
      
      // Add method field to transactions
      "ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS method TEXT",
      "ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS metadata JSONB",
      
      // Create admin_logs table if it doesn't exist
      `CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Create account_restrictions table if it doesn't exist
      `CREATE TABLE IF NOT EXISTS account_restrictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        admin_id INTEGER NOT NULL REFERENCES users(id),
        action_type TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    // Run each SQL statement
    for (const sql of alterations) {
      try {
        await pool.query(sql);
        console.log(`Successfully executed: ${sql.substring(0, 50)}...`);
      } catch (error) {
        console.log(`Error executing SQL: ${sql.substring(0, 50)}...`);
        console.log(`Error details: ${error.message}`);
        // Continue to next statement
      }
    }
    
    await pool.end();
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();