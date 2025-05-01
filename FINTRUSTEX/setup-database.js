/**
 * Database Setup Script for FinTrustEX
 * This script creates all the required database tables based on the schema defined in shared/schema.js
 */

require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const schema = require('./shared/schema');

async function setupDatabase() {
  console.log('Setting up the FinTrustEX database...');
  
  // Connect to database
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });
  
  try {
    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Generate and run migrations
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: migrationsDir });
    
    console.log('Creating default admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'admin')
    });
    
    if (!existingAdmin) {
      // Create admin user
      const adminPassword = 'adminpass'; // Default admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await db.insert(schema.users).values({
        username: 'admin',
        email: 'admin@fintrustex.com',
        password: hashedPassword,
        displayName: 'Administrator',
        isAdmin: true,
        kycStatus: 'approved',
        createdAt: new Date().toISOString()
      });
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    // Create default user wallets
    const users = await db.query.users.findMany();
    
    for (const user of users) {
      console.log(`Setting up wallets for user: ${user.username}`);
      
      // Default currencies
      const currencies = ['USD', 'BTC', 'ETH', 'USDT'];
      
      for (const currency of currencies) {
        // Check if wallet already exists
        const existingWallet = await db.query.wallets.findFirst({
          where: (wallets, { eq, and }) => and(
            eq(wallets.userId, user.id),
            eq(wallets.currency, currency)
          )
        });
        
        if (!existingWallet) {
          // Create wallet
          await db.insert(schema.wallets).values({
            userId: user.id,
            currency,
            balance: '0',
            createdAt: new Date().toISOString()
          });
          
          console.log(`Created ${currency} wallet for ${user.username}`);
        } else {
          console.log(`${currency} wallet already exists for ${user.username}`);
        }
      }
    }
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the setup function
setupDatabase();