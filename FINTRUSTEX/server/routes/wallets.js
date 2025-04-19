const { storage } = require('../storage');
const { insertWalletSchema } = require('../../shared/schema');
const { z } = require('zod');

// Create a new wallet
exports.createWallet = async (req, res) => {
  try {
    // Validate request body
    const walletData = insertWalletSchema.parse(req.body);
    
    // Check if user exists
    const user = await storage.getUser(walletData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if wallet with same currency already exists for this user
    const existingWallet = await storage.getWalletByUserIdAndCurrency(
      walletData.userId, 
      walletData.currency
    );
    
    if (existingWallet) {
      return res.status(400).json({ 
        error: `Wallet for ${walletData.currency} already exists for this user` 
      });
    }
    
    // Create wallet
    const wallet = await storage.createWallet(walletData);
    res.status(201).json(wallet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get wallets (all or filtered by userId)
exports.getWallets = async (req, res) => {
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
};

// Get wallet by ID
exports.getWalletById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid wallet ID' });
    }
    
    const wallet = await storage.getWallet(id);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.status(200).json(wallet);
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update wallet balance
exports.updateWalletBalance = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid wallet ID' });
    }
    
    // Validate request body
    const schema = z.object({
      balance: z.string().refine(val => !isNaN(Number(val)), {
        message: 'Balance must be a valid numeric string'
      })
    });
    
    const { balance } = schema.parse(req.body);
    
    // Check if wallet exists
    const wallet = await storage.getWallet(id);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Update wallet balance
    const updatedWallet = await storage.updateWalletBalance(id, balance);
    res.status(200).json(updatedWallet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating wallet balance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};