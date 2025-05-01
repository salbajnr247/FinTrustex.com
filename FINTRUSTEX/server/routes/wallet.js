/**
 * Wallet Routes - Handles all wallet-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { storage } = require('../storage');
const { insertWalletSchema, insertTransactionSchema } = require('../../shared/schema');
const { z } = require('zod');
const { nanoid } = require('nanoid');
const { authenticate } = require('../middleware/auth');

// Middleware to ensure user is authenticated
router.use(authenticate);

/**
 * Get user wallets
 * GET /api/wallets
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await storage.getWalletsByUserId(userId);
    
    // Enhance wallet data with additional info like address and price data
    const enhancedWallets = wallets.map(wallet => {
      // Generate deterministic wallet address based on user ID and currency
      // In a real implementation, this would be handled by a cryptocurrency node
      const address = generateWalletAddress(wallet.currency, wallet.id);
      
      // Mock price and fiat balance calculation
      // In a real implementation, this would come from a price feed
      const price = getMockPrice(wallet.currency);
      const fiatBalance = parseFloat(wallet.balance) * price;
      
      return {
        ...wallet,
        address,
        price,
        fiatBalance
      };
    });
    
    res.json(enhancedWallets);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

/**
 * Get specific wallet by ID
 * GET /api/wallets/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const walletId = parseInt(req.params.id);
    const wallet = await storage.getWallet(walletId);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Ensure user owns this wallet
    if (wallet.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Enhance wallet data
    const address = generateWalletAddress(wallet.currency, wallet.id);
    const price = getMockPrice(wallet.currency);
    const fiatBalance = parseFloat(wallet.balance) * price;
    
    res.json({
      ...wallet,
      address,
      price,
      fiatBalance
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * Create a new wallet
 * POST /api/wallets
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validationResult = insertWalletSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid wallet data', details: validationResult.error });
    }
    
    const userId = req.user.id;
    const { currency } = req.body;
    
    // Check if user already has a wallet for this currency
    const existingWallet = await storage.getWalletByUserIdAndCurrency(userId, currency);
    if (existingWallet) {
      return res.status(409).json({ error: `Wallet for ${currency} already exists` });
    }
    
    // Create wallet
    const wallet = await storage.createWallet({
      userId,
      currency,
      balance: '0'
    });
    
    // Generate address and other metadata
    const address = generateWalletAddress(currency, wallet.id);
    const price = getMockPrice(currency);
    
    res.status(201).json({
      ...wallet,
      address,
      price,
      fiatBalance: 0
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

/**
 * Get wallet transactions
 * GET /api/wallets/:id/transactions
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const walletId = parseInt(req.params.id);
    const wallet = await storage.getWallet(walletId);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Ensure user owns this wallet
    if (wallet.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const transactions = await storage.getTransactionsByWalletId(walletId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Create or get deposit address for wallet
 * POST /api/wallets/:id/deposit-address
 */
router.post('/:id/deposit-address', async (req, res) => {
  try {
    const walletId = parseInt(req.params.id);
    const wallet = await storage.getWallet(walletId);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Ensure user owns this wallet
    if (wallet.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate deterministic address
    const address = generateWalletAddress(wallet.currency, wallet.id);
    
    res.json({ address });
  } catch (error) {
    console.error('Error generating deposit address:', error);
    res.status(500).json({ error: 'Failed to generate deposit address' });
  }
});

/**
 * Initiate a withdrawal
 * POST /api/withdrawals
 */
router.post('/withdraw', async (req, res) => {
  try {
    // Define withdrawal schema
    const withdrawalSchema = z.object({
      currency: z.string().min(1),
      address: z.string().min(1),
      amount: z.number().positive(),
      twoFactorCode: z.string().optional()
    });
    
    // Validate request
    const validationResult = withdrawalSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid withdrawal data', details: validationResult.error });
    }
    
    const { currency, address, amount, twoFactorCode } = req.body;
    const userId = req.user.id;
    
    // Get wallet for this currency
    const wallet = await storage.getWalletByUserIdAndCurrency(userId, currency);
    if (!wallet) {
      return res.status(404).json({ error: `No ${currency} wallet found` });
    }
    
    // Check if user has 2FA enabled, and if so, verify code
    if (req.user.has2FA && !twoFactorCode) {
      return res.status(400).json({ error: '2FA code required for withdrawal' });
    }
    
    if (req.user.has2FA) {
      // In a real implementation, verify the 2FA code here
      // For this example, we'll just check that it's not empty
      if (!twoFactorCode) {
        return res.status(400).json({ error: 'Invalid 2FA code' });
      }
    }
    
    // Calculate network fee
    const networkFee = getNetworkFee(currency);
    const totalAmount = amount + networkFee;
    
    // Check sufficient balance
    if (parseFloat(wallet.balance) < totalAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create a withdrawal transaction
    const transaction = await storage.createTransaction({
      userId,
      walletId: wallet.id,
      type: 'withdrawal',
      status: 'pending',
      amount: amount.toString(),
      currency,
      description: `Withdrawal to ${address}`,
      txHash: null
    });
    
    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) - totalAmount;
    await storage.updateWalletBalance(wallet.id, newBalance.toString());
    
    res.status(201).json({
      transaction,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

/**
 * Simulate a deposit for testing
 * POST /api/wallets/:id/simulate-deposit
 */
router.post('/:id/simulate-deposit', async (req, res) => {
  try {
    const walletId = parseInt(req.params.id);
    const wallet = await storage.getWallet(walletId);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Ensure user owns this wallet
    if (wallet.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate request
    const depositSchema = z.object({
      amount: z.number().positive()
    });
    
    const validationResult = depositSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid deposit data', details: validationResult.error });
    }
    
    const { amount } = req.body;
    
    // Create a deposit transaction
    const transaction = await storage.createTransaction({
      userId: wallet.userId,
      walletId: wallet.id,
      type: 'deposit',
      status: 'completed', // Auto-complete for simulation
      amount: amount.toString(),
      currency: wallet.currency,
      description: 'Simulated deposit',
      txHash: `sim-${nanoid(10)}`
    });
    
    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + amount;
    await storage.updateWalletBalance(wallet.id, newBalance.toString());
    
    res.status(201).json({
      transaction,
      message: 'Deposit simulation successful'
    });
  } catch (error) {
    console.error('Error simulating deposit:', error);
    res.status(500).json({ error: 'Failed to simulate deposit' });
  }
});

// Helper functions

/**
 * Generate a deterministic wallet address
 * In a real implementation, this would be handled by a cryptocurrency node
 * @param {string} currency - Cryptocurrency code
 * @param {number} walletId - Wallet ID
 * @returns {string} - Wallet address
 */
function generateWalletAddress(currency, walletId) {
  // This is a mock implementation
  // In reality, you would use a library like bitcoinjs-lib, ethereumjs, etc.
  const prefixes = {
    btc: '1',
    eth: '0x',
    usdt: '0x',
  };
  
  // Get prefix for currency, default to 0x
  const prefix = prefixes[currency.toLowerCase()] || '0x';
  
  // Generate a deterministic hash-like string
  const hash = nanoid(40).replace(/[^a-f0-9]/gi, 'a');
  
  // Return prefix + truncated hash
  return prefix + hash.substring(0, currency === 'btc' ? 26 : 40);
}

/**
 * Get mock price for a cryptocurrency
 * In a real implementation, this would come from a price feed API
 * @param {string} currency - Cryptocurrency code
 * @returns {number} - Price in USD
 */
function getMockPrice(currency) {
  const prices = {
    btc: 43500,
    eth: 3200,
    usdt: 1,
    ltc: 150,
    xrp: 0.5,
    bch: 320,
    bnb: 380,
    ada: 0.45,
    dot: 15,
    link: 8
  };
  
  return prices[currency.toLowerCase()] || 1;
}

/**
 * Get network fee for a cryptocurrency
 * In a real implementation, this would be dynamic based on network congestion
 * @param {string} currency - Cryptocurrency code
 * @returns {number} - Network fee
 */
function getNetworkFee(currency) {
  const fees = {
    btc: 0.0001,
    eth: 0.005,
    usdt: 10,
    ltc: 0.001,
    xrp: 0.01,
    bch: 0.001,
    bnb: 0.001,
    ada: 1,
    dot: 0.1,
    link: 0.1
  };
  
  return fees[currency.toLowerCase()] || 0.001;
}

module.exports = router;