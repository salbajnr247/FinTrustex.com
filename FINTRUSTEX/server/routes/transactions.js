/**
 * Transaction Routes - Handles all transaction-related API endpoints
 */

const express = require('express');
const { storage } = require('../storage');
const { authenticate } = require('../middleware/auth');
const { z } = require('zod');

// Export transaction route handler functions directly for use in index.js
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    
    // If user is authenticated, get their transactions
    // Otherwise, return empty array or error based on your app's logic
    const transactions = userId 
      ? await storage.getTransactionsByUserId(userId)
      : [];
    
    // Sort by created date, newest first
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Ensure user owns this transaction if authenticated
    if (req.user && transaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    // This would include validation and authorization checks
    const transaction = await storage.createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

exports.updateTransactionStatus = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const transaction = await storage.updateTransactionStatus(transactionId, status);
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
};

/**
 * Get transaction receipt
 * GET /api/transactions/:id/receipt
 */
exports.getTransactionReceipt = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Ensure user owns this transaction
    if (transaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get user info for receipt
    const user = await storage.getUser(transaction.userId);
    
    // Create receipt data
    const receipt = {
      receiptId: `REC-${transaction.id}-${Date.now()}`,
      transactionId: transaction.id,
      userId: transaction.userId,
      userEmail: user.email,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      txHash: transaction.txHash,
      description: transaction.description,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      formattedDate: new Date(transaction.createdAt).toLocaleDateString(),
      formattedTime: new Date(transaction.createdAt).toLocaleTimeString(),
    };
    
    res.json(receipt);
  } catch (error) {
    console.error('Error generating transaction receipt:', error);
    res.status(500).json({ error: 'Failed to generate transaction receipt' });
  }
};

/**
 * Get filtered transactions
 * POST /api/transactions/filter
 */
exports.filterTransactions = async (req, res) => {
  try {
    // Filter schema
    const filterSchema = z.object({
      type: z.string().optional(),
      currency: z.string().optional(),
      status: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      walletId: z.number().optional()
    });
    
    // Validate request
    const validationResult = filterSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid filter parameters', details: validationResult.error });
    }
    
    const { type, currency, status, startDate, endDate, walletId } = req.body;
    const userId = req.user.id;
    
    // Get all user transactions first
    let transactions = await storage.getTransactionsByUserId(userId);
    
    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    if (currency) {
      transactions = transactions.filter(t => t.currency.toLowerCase() === currency.toLowerCase());
    }
    
    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }
    
    if (walletId) {
      transactions = transactions.filter(t => t.walletId === walletId);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      transactions = transactions.filter(t => new Date(t.createdAt) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set to end of day
      transactions = transactions.filter(t => new Date(t.createdAt) <= end);
    }
    
    // Sort by created date, newest first
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(transactions);
  } catch (error) {
    console.error('Error filtering transactions:', error);
    res.status(500).json({ error: 'Failed to filter transactions' });
  }
};