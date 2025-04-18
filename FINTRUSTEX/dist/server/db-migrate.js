"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
async function main() {
    console.log('Running database migrations...');
    try {
        // Create enums
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      DO $$ BEGIN
        CREATE TYPE order_type AS ENUM ('buy', 'sell');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        // Create users table
        await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        created_at TIMESTAMP DEFAULT now()
      );
    `);
        // Create wallets table
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        currency TEXT NOT NULL,
        balance NUMERIC NOT NULL DEFAULT '0',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
        // Create orders table
        await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        completed_at TIMESTAMP
      );
    `);
        // Create transactions table
        await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        completed_at TIMESTAMP
      );
    `);
        console.log('Database migrations completed successfully!');
    }
    catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    }
}
main()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
