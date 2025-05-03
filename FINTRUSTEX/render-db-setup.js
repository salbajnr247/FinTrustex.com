/**
 * Render Database Setup Script for FinTrustEX
 * This script initializes the database specifically for Render deployment
 */

require('dotenv').config();
const { db } = require('./server/db');
const { schema } = require('./shared/schema');
const { sql } = require('drizzle-orm');

async function setupRenderDatabase() {
  console.log('Starting Render database setup...');
  
  try {
    // Test database connection
    await db.query`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Create tables according to schema
    console.log('Creating tables from schema...');
    
    // Create users table
    console.log('Creating users table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        kyc_status VARCHAR(50) DEFAULT 'pending',
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        binance_api_key VARCHAR(255),
        binance_api_secret VARCHAR(255),
        binance_api_enabled BOOLEAN DEFAULT FALSE,
        binance_testnet BOOLEAN DEFAULT TRUE,
        language VARCHAR(50) DEFAULT 'en'
      )
    `);
    
    // Create wallets table
    console.log('Creating wallets table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        currency VARCHAR(50) NOT NULL,
        balance VARCHAR(255) DEFAULT '0',
        address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, currency)
      )
    `);
    
    // Create orders table
    console.log('Creating orders table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        price VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        external_order_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create transactions table
    console.log('Creating transactions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        wallet_id INTEGER REFERENCES wallets(id),
        type VARCHAR(50) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        currency VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        reference_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create investment_packages table
    console.log('Creating investment_packages table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS investment_packages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        min_amount VARCHAR(255) NOT NULL,
        max_amount VARCHAR(255),
        duration_days INTEGER NOT NULL,
        interest_rate VARCHAR(50) NOT NULL,
        currency VARCHAR(50) DEFAULT 'USD',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_investments table
    console.log('Creating user_investments table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_investments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        package_id INTEGER NOT NULL REFERENCES investment_packages(id),
        amount VARCHAR(255) NOT NULL,
        expected_return VARCHAR(255) NOT NULL,
        actual_return VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create notifications table
    console.log('Creating notifications table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ All tables created successfully!');
    
    // Insert default admin user if not exists
    const adminExists = await db.query`
      SELECT * FROM users WHERE username = 'admin'
    `;
    
    if (adminExists.rows.length === 0) {
      console.log('Creating default admin user...');
      await db.execute(sql`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ('admin', 'admin@fintrustex.com', '$2a$10$XpnAyqt0TtkTe5BKxMgzCeBeKuYLK4N9trdFmGIyrVzYZ9nkWDO8y', 'admin')
      `);
      console.log('✅ Default admin user created (username: admin, password: adminpass)');
    } else {
      console.log('Admin user already exists, skipping creation');
    }
    
    console.log('✅ Render database setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up Render database:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run the setup
setupRenderDatabase();