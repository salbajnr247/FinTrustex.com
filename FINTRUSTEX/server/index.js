const express = require('express');
require('dotenv').config();
const { db } = require('./db');
const { storage } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Root route for health check
app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

// User routes
app.post('/api/users', async (req, res) => {
  try {
    // Simple validation
    const { username, email, passwordHash } = req.body;
    if (!username || !email || !passwordHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user with same username or email already exists
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create user
    const user = await storage.createUser(req.body);
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Wallet routes
app.post('/api/wallets', async (req, res) => {
  try {
    const { userId, currency } = req.body;
    
    if (!userId || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if wallet with same currency already exists for this user
    const existingWallet = await storage.getWalletByUserIdAndCurrency(userId, currency);
    
    if (existingWallet) {
      return res.status(400).json({ 
        error: `Wallet for ${currency} already exists for this user` 
      });
    }
    
    // Create wallet
    const wallet = await storage.createWallet(req.body);
    res.status(201).json(wallet);
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/wallets', async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    
    if (userId) {
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get wallets for user
      const wallets = await storage.getWalletsByUserId(userId);
      return res.status(200).json(wallets);
    }
    
    // In a real app, we would implement a getAll method in the storage
    // For now, just return a message
    res.status(200).json({ message: 'Get all wallets endpoint' });
  } catch (error) {
    console.error('Error getting wallets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Order routes
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, type, baseCurrency, quoteCurrency, amount, price } = req.body;
    
    if (!userId || !type || !baseCurrency || !quoteCurrency || !amount || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create order
    const order = await storage.createOrder({
      ...req.body,
      totalValue: (Number(amount) * Number(price)).toString()
    });
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    
    if (userId) {
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get orders for user
      const orders = await storage.getOrdersByUserId(userId);
      return res.status(200).json(orders);
    }
    
    // In a real app, we would implement a getAll method in the storage
    // For now, just return a message
    res.status(200).json({ message: 'Get all orders endpoint' });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Transaction routes
app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, walletId, type, amount, currency } = req.body;
    
    if (!userId || !walletId || !type || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if wallet exists
    const wallet = await storage.getWallet(walletId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Ensure wallet belongs to user
    if (wallet.userId !== userId) {
      return res.status(403).json({ error: 'Wallet does not belong to user' });
    }
    
    // Create transaction
    const transaction = await storage.createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const walletId = req.query.walletId ? Number(req.query.walletId) : undefined;
    
    if (userId) {
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get transactions for user
      const transactions = await storage.getTransactionsByUserId(userId);
      return res.status(200).json(transactions);
    }
    
    if (walletId) {
      // Check if wallet exists
      const wallet = await storage.getWallet(walletId);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      // Get transactions for wallet
      const transactions = await storage.getTransactionsByWalletId(walletId);
      return res.status(200).json(transactions);
    }
    
    // In a real app, we would implement a getAll method in the storage
    // For now, just return a message
    res.status(200).json({ message: 'Get all transactions endpoint' });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve static files from the FINTRUSTEX directory
app.use(express.static('FINTRUSTEX'));

// Create database tables if they don't exist
async function initDatabase() {
  try {
    // Create enums
    await db.execute('DO $$ BEGIN CREATE TYPE order_type AS ENUM (\'buy\', \'sell\'); EXCEPTION WHEN duplicate_object THEN null; END $$;');
    await db.execute('DO $$ BEGIN CREATE TYPE order_status AS ENUM (\'pending\', \'completed\', \'cancelled\', \'failed\'); EXCEPTION WHEN duplicate_object THEN null; END $$;');

    // Create users table
    await db.execute(`
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
    await db.execute(`
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
    await db.execute(`
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
    await db.execute(`
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

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Start the server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();