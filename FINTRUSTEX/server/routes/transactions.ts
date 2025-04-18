import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertTransactionSchema } from '../../shared/schema';
import { z } from 'zod';

// Create a new transaction
export const createTransaction = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const transactionData = insertTransactionSchema.parse(req.body);
    
    // Check if user exists
    const user = await storage.getUser(transactionData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if wallet exists
    const wallet = await storage.getWallet(transactionData.walletId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Ensure wallet belongs to user
    if (wallet.userId !== transactionData.userId) {
      return res.status(403).json({ error: 'Wallet does not belong to user' });
    }
    
    // Create transaction
    const transaction = await storage.createTransaction(transactionData);
    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get transactions (all, filtered by userId, or filtered by walletId)
export const getTransactions = async (req: Request, res: Response) => {
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
};

// Get transaction by ID
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }
    
    const transaction = await storage.getTransaction(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.status(200).json(transaction);
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update transaction status
export const updateTransactionStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }
    
    // Validate request body
    const schema = z.object({
      status: z.string().min(1)
    });
    
    const { status } = schema.parse(req.body);
    
    // Check if transaction exists
    const transaction = await storage.getTransaction(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Update transaction status
    const updatedTransaction = await storage.updateTransactionStatus(id, status);
    res.status(200).json(updatedTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};