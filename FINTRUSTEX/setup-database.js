/**
 * Database Setup Script for FinTrustEX
 * This script creates all the required database tables based on the schema defined in shared/schema.ts
 */

require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Schema import
const schema = require('./shared/schema');

// Check database connection URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// Using Postgres.js for migrations
async function setupDatabase() {
  console.log('🔄 Setting up FinTrustEX database...');
  
  try {
    // Create pgSQL client
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client, { schema });
    
    // Create tables based on the schema
    console.log('📊 Creating database tables...');
    
    // Create enums first
    console.log('Creating enum types...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
          CREATE TYPE order_type AS ENUM ('buy', 'sell');
        END IF;
      END$$;
    `;
    
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'failed');
        END IF;
      END$$;
    `;
    
    // Create users table
    console.log('Creating users table...');
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        company_name TEXT,
        role TEXT DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Create wallets table
    console.log('Creating wallets table...');
    await client`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        currency TEXT NOT NULL,
        balance NUMERIC NOT NULL DEFAULT '0',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Create orders table
    console.log('Creating orders table...');
    await client`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type order_type NOT NULL,
        status order_status NOT NULL DEFAULT 'pending',
        base_currency TEXT NOT NULL,
        quote_currency TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        price NUMERIC NOT NULL,
        total_value NUMERIC NOT NULL,
        fee NUMERIC,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `;
    
    // Create transactions table
    console.log('Creating transactions table...');
    await client`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        wallet_id INTEGER NOT NULL REFERENCES wallets(id),
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        tx_hash TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `;
    
    console.log('✅ Database setup completed successfully!');
    
    // Create admin user for testing if no users exist
    const countResult = await client`SELECT COUNT(*) FROM users`;
    const userCount = parseInt(countResult[0].count);
    
    if (userCount === 0) {
      console.log('👤 Creating admin user for testing...');
      await client`
        INSERT INTO users (username, email, password_hash, role, is_verified)
        VALUES ('admin', 'admin@fintrustex.com', '$2a$10$eCJQYHm8ZG1nJT8dJN5QP.owxvHoHxDsm9G4vYfBnItCzFGM5DKe.', 'admin', true)
      `;
      console.log('👤 Admin user created. Username: admin, Password: adminpass (hashed in DB)');
      
      // Get the user ID
      const userResult = await client`SELECT id FROM users WHERE username = 'admin'`;
      const adminId = userResult[0].id;
      
      // Create default wallets for admin
      console.log('💰 Creating default wallets for admin...');
      await client`
        INSERT INTO wallets (user_id, currency, balance)
        VALUES 
          (${adminId}, 'BTC', '0.5'),
          (${adminId}, 'ETH', '5.0'),
          (${adminId}, 'USDT', '10000')
      `;
      console.log('💰 Default wallets created for admin user');
      
      // Create some sample orders
      console.log('📊 Creating sample orders...');
      await client`
        INSERT INTO orders (user_id, type, status, base_currency, quote_currency, amount, price, total_value, fee)
        VALUES 
          (${adminId}, 'buy', 'completed', 'BTC', 'USDT', '0.1', '40000', '4000', '10'),
          (${adminId}, 'sell', 'pending', 'ETH', 'USDT', '1.0', '2800', '2800', '7')
      `;
      console.log('📊 Sample orders created');
      
      // Create some sample transactions
      const walletResult = await client`SELECT id FROM wallets WHERE user_id = ${adminId} AND currency = 'BTC'`;
      const btcWalletId = walletResult[0].id;
      
      console.log('💸 Creating sample transactions...');
      await client`
        INSERT INTO transactions (user_id, wallet_id, type, status, amount, currency, description)
        VALUES 
          (${adminId}, ${btcWalletId}, 'deposit', 'completed', '0.5', 'BTC', 'Initial deposit'),
          (${adminId}, ${btcWalletId}, 'withdrawal', 'pending', '0.05', 'BTC', 'Test withdrawal')
      `;
      console.log('💸 Sample transactions created');
    }
    
    // Close the connection
    await client.end();
    
    console.log('🎉 Database is ready to use!');
    console.log('🔄 Now run the migration script to export this database.');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the database setup
setupDatabase();