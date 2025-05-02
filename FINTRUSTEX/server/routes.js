/**
 * API Routes for the FinTrustEX Platform
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const WebSocket = require('ws');
const Stripe = require('stripe');
const { storage } = require('./storage');

/**
 * Verify a two-factor authentication code for a user
 * @param {Object} user - User object
 * @param {string} code - 2FA code to verify
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
async function verifyTwoFactorCode(user, code) {
  // This is a placeholder implementation
  // In a real application, we would use the speakeasy library to verify the code
  // against the user's 2FA secret
  
  if (!user || !code) return false;
  
  // For demo purposes, any 6-digit code is considered valid
  return /^\d{6}$/.test(code);
  
  // In production, it would be something like:
  // return speakeasy.totp.verify({
  //   secret: user.twoFactorSecret,
  //   encoding: 'base32',
  //   token: code,
  //   window: 1 // Allow 1 period before/after for clock drift
  // });
}

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../uploads');
      
      // Create upload directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Create user-specific directory
      const userId = req.user ? req.user.id : 'anonymous';
      const userDir = path.join(uploadDir, userId.toString());
      
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      
      cb(null, userDir);
    },
    filename: function (req, file, cb) {
      // Generate a unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only specific file types
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error('Only .jpg, .jpeg, .png, and .pdf files are allowed'));
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Check if user account is active
function requireActiveAccount(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.user.accountStatus !== 'active') {
    return res.status(403).json({ 
      error: 'Account restricted',
      status: req.user.accountStatus,
      reason: req.user.restrictionReason,
      restrictedAt: req.user.restrictedAt
    });
  }
  
  next();
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      password,
      isAdmin: false,
      createdAt: new Date().toISOString()
    });
    
    // Create default wallets for the user
    const currencies = ['USD', 'BTC', 'ETH', 'USDT'];
    
    for (const currency of currencies) {
      await storage.createWallet({
        userId: user.id,
        currency,
        balance: '0',
        createdAt: new Date().toISOString()
      });
    }
    
    // Return user (without password)
    delete user.password;
    res.status(201).json(user);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Get user by username
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password
    const isValidPassword = await storage.verifyPassword(user, password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Return user (without password)
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// User routes
router.get('/users/me', requireAuth, (req, res) => {
  const user = req.user;
  delete user.password;
  res.json(user);
});

router.put('/users/me', requireAuth, async (req, res) => {
  try {
    const { email, displayName, preferences } = req.body;
    
    // Update user
    const updatedUser = await storage.updateUser(req.user.id, {
      email,
      displayName,
      preferences
    });
    
    delete updatedUser.password;
    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Wallet routes
router.get('/wallets', requireAuth, async (req, res) => {
  try {
    const wallets = await storage.getWalletsByUserId(req.user.id);
    res.json({ wallets });
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Failed to get wallets' });
  }
});

router.get('/wallets/:id', requireAuth, async (req, res) => {
  try {
    const wallet = await storage.getWallet(req.params.id);
    
    if (!wallet || wallet.userId !== req.user.id) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json(wallet);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

// Payment routes
router.post('/wallets/deposit', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { amount, currency, transactionId, method } = req.body;
    
    // Get the user's wallet for this currency
    const wallet = await storage.getWalletByUserIdAndCurrency(req.user.id, currency);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this currency' });
    }
    
    // Create a transaction record
    const transaction = await storage.createTransaction({
      userId: req.user.id,
      walletId: wallet.id,
      type: 'deposit',
      amount,
      currency,
      status: 'completed',
      externalId: transactionId,
      method,
      createdAt: new Date().toISOString()
    });
    
    // Update wallet balance
    const newBalance = (parseFloat(wallet.balance) + parseFloat(amount)).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Get updated wallet
    const updatedWallet = await storage.getWallet(wallet.id);
    
    res.json({
      transaction,
      wallet: updatedWallet
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

router.post('/wallets/notify-bank-transfer', requireAuth, async (req, res) => {
  try {
    const { amount, currency, date, reference, name, notes } = req.body;
    
    // Create a pending transaction record
    const transaction = await storage.createTransaction({
      userId: req.user.id,
      walletId: null, // Will be linked when approved
      type: 'deposit',
      amount,
      currency,
      status: 'pending',
      method: 'bank',
      metadata: {
        date,
        reference,
        accountName: name,
        notes
      },
      createdAt: new Date().toISOString()
    });
    
    // Notify admin via email (would implement in production)
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Bank transfer notification error:', error);
    res.status(500).json({ error: 'Failed to submit bank transfer notification' });
  }
});

// Get all withdrawals for the authenticated user
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    // Check if user account is restricted
    if (req.user.account_status === 'restricted') {
      return res.status(403).json({
        success: false,
        message: 'Your account is restricted. Please contact support for assistance.'
      });
    }
    
    // Get all transactions of type 'withdrawal' for the user
    const transactions = await storage.getTransactionsByUserId(req.user.id);
    const withdrawals = transactions.filter(tx => tx.type === 'withdrawal');
    
    // Add additional metadata for display
    const enhancedWithdrawals = withdrawals.map(w => {
      const metadata = w.metadata || {};
      return {
        ...w,
        destinationType: metadata.method === 'bank' ? 'bank' : 'crypto',
        destination: metadata.method === 'bank' 
          ? (metadata.bankName + ' - ' + metadata.accountNumber) 
          : metadata.address,
        processingTime: metadata.method === 'bank' ? '1-3 business days' : '1-2 hours'
      };
    });
    
    res.json({
      success: true,
      data: enhancedWithdrawals
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve withdrawals'
    });
  }
});

// Crypto withdrawal request endpoint
router.post('/withdrawals/crypto', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { currency, address, amount, fee, netAmount, twoFaCode } = req.body;
    
    // Validate request parameters
    if (!currency || !address || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal request parameters'
      });
    }
    
    // Check minimum withdrawal amount
    const minWithdrawalAmounts = {
      btc: 0.001,
      eth: 0.01,
      usdt: 20
    };
    
    if (amount < minWithdrawalAmounts[currency]) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount for ${currency.toUpperCase()} is ${minWithdrawalAmounts[currency]}`
      });
    }
    
    // Check if user has 2FA enabled and verify code if needed
    if (req.user.twoFactorEnabled) {
      if (!twoFaCode) {
        return res.status(400).json({
          success: false,
          message: '2FA code is required'
        });
      }
      
      // Verify 2FA code (implement actual verification in production)
      const isValid = await verifyTwoFactorCode(req.user, twoFaCode);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }
    }
    
    // Get user's wallet for the requested currency
    const wallet = await storage.getWalletByUserIdAndCurrency(req.user.id, currency);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: `Wallet not found for currency ${currency.toUpperCase()}`
      });
    }
    
    // Check if user has sufficient balance
    if (parseFloat(wallet.balance) < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Create withdrawal transaction (pending admin approval)
    const transaction = await storage.createTransaction({
      userId: req.user.id,
      walletId: wallet.id,
      type: 'withdrawal',
      amount: amount.toString(),
      currency,
      status: 'pending',
      method: 'crypto',
      metadata: {
        address,
        fee: fee.toString(),
        netAmount: netAmount.toString(),
        method: 'crypto'
      },
      createdAt: new Date().toISOString()
    });
    
    // Temporarily reduce wallet balance to prevent double withdrawal
    // This will be handled properly in a real production system with proper locking mechanisms
    const newBalance = (parseFloat(wallet.balance) - parseFloat(amount)).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Create admin log entry
    await storage.createAdminLog({
      adminId: null, // System generated
      action: 'withdrawal_request',
      targetId: transaction.id.toString(),
      details: {
        userId: req.user.id,
        currency,
        amount: amount.toString(),
        address,
        method: 'crypto'
      },
      timestamp: new Date().toISOString()
    });
    
    // Notify admin (would implement in production)
    
    res.json({
      success: true,
      data: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Crypto withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process withdrawal request'
    });
  }
});

// Bank transfer withdrawal request endpoint
router.post('/withdrawals/bank', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { 
      currency, bankName, accountHolder, accountNumber, 
      swiftCode, amount, fee, netAmount, twoFaCode 
    } = req.body;
    
    // Validate request parameters
    if (!currency || !bankName || !accountHolder || !accountNumber || !swiftCode || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bank withdrawal request parameters'
      });
    }
    
    // Check minimum withdrawal amount
    const minWithdrawalAmounts = {
      usd: 100,
      eur: 100,
      gbp: 100
    };
    
    if (amount < minWithdrawalAmounts[currency]) {
      return res.status(400).json({
        success: false,
        message: `Minimum bank withdrawal amount for ${currency.toUpperCase()} is ${minWithdrawalAmounts[currency]}`
      });
    }
    
    // Check if user has 2FA enabled and verify code if needed
    if (req.user.twoFactorEnabled) {
      if (!twoFaCode) {
        return res.status(400).json({
          success: false,
          message: '2FA code is required'
        });
      }
      
      // Verify 2FA code (implement actual verification in production)
      const isValid = await verifyTwoFactorCode(req.user, twoFaCode);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code'
        });
      }
    }
    
    // For bank transfers, we need to convert to/from USDT
    // In a real app, this would use a proper currency conversion service
    
    // Get user's USDT wallet
    const usdtWallet = await storage.getWalletByUserIdAndCurrency(req.user.id, 'usdt');
    
    if (!usdtWallet) {
      return res.status(404).json({
        success: false,
        message: 'USDT wallet not found'
      });
    }
    
    // Convert requested amount to USDT
    let usdtAmount = amount;
    if (currency === 'eur') {
      usdtAmount = amount / 0.93; // EUR to USDT
    } else if (currency === 'gbp') {
      usdtAmount = amount / 0.79; // GBP to USDT
    }
    
    // Check if user has sufficient balance
    if (parseFloat(usdtWallet.balance) < usdtAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Create withdrawal transaction (pending admin approval)
    const transaction = await storage.createTransaction({
      userId: req.user.id,
      walletId: usdtWallet.id,
      type: 'withdrawal',
      amount: usdtAmount.toString(),
      currency: 'usdt', // Store original currency in metadata
      status: 'pending',
      method: 'bank',
      metadata: {
        bankName,
        accountHolder,
        accountNumber,
        swiftCode,
        requestedCurrency: currency,
        requestedAmount: amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString(),
        method: 'bank'
      },
      createdAt: new Date().toISOString()
    });
    
    // Temporarily reduce wallet balance
    const newBalance = (parseFloat(usdtWallet.balance) - usdtAmount).toString();
    await storage.updateWalletBalance(usdtWallet.id, newBalance);
    
    // Create admin log entry
    await storage.createAdminLog({
      adminId: null, // System generated
      action: 'withdrawal_request',
      targetId: transaction.id.toString(),
      details: {
        userId: req.user.id,
        currency,
        amount: amount.toString(),
        usdtAmount: usdtAmount.toString(),
        bankName,
        accountNumber,
        method: 'bank'
      },
      timestamp: new Date().toISOString()
    });
    
    // Notify admin (would implement in production)
    
    res.json({
      success: true,
      data: {
        id: transaction.id,
        status: transaction.status,
        amount: amount.toString(),
        currency: currency,
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Bank withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process bank withdrawal request'
    });
  }
});

// Admin routes for managing withdrawals
router.post('/admin/withdrawals/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    
    // Get the withdrawal transaction
    const transaction = await storage.getTransaction(withdrawalId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }
    
    // Check if withdrawal can be approved (must be pending)
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a withdrawal with status: ${transaction.status}`
      });
    }
    
    // Update transaction status
    await storage.updateTransactionStatus(transaction.id, 'approved');
    
    // Log the approval
    await storage.createAdminLog({
      adminId: req.user.id,
      action: 'withdrawal_approved',
      targetId: transaction.id.toString(),
      details: {
        userId: transaction.userId,
        currency: transaction.currency,
        amount: transaction.amount,
        approvedBy: req.user.id
      },
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal approved successfully'
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to approve withdrawal'
    });
  }
});

router.post('/admin/withdrawals/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    // Get the withdrawal transaction
    const transaction = await storage.getTransaction(withdrawalId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }
    
    // Check if withdrawal can be rejected (must be pending)
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a withdrawal with status: ${transaction.status}`
      });
    }
    
    // Get the wallet
    const wallet = await storage.getWallet(transaction.walletId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Return funds to wallet
    const newBalance = (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Update transaction status and add rejection reason
    await storage.updateTransactionStatus(transaction.id, 'rejected');
    await storage.updateTransactionMetadata(transaction.id, {
      ...transaction.metadata,
      rejectionReason: reason,
      rejectedBy: req.user.id,
      rejectedAt: new Date().toISOString()
    });
    
    // Log the rejection
    await storage.createAdminLog({
      adminId: req.user.id,
      action: 'withdrawal_rejected',
      targetId: transaction.id.toString(),
      details: {
        userId: transaction.userId,
        currency: transaction.currency,
        amount: transaction.amount,
        reason,
        rejectedBy: req.user.id
      },
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal rejected successfully'
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reject withdrawal'
    });
  }
});

// Get all pending withdrawals (admin only)
router.get('/admin/withdrawals/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get all transactions
    const transactions = await storage.getAllTransactions();
    
    // Filter for pending withdrawals
    const pendingWithdrawals = transactions.filter(tx => 
      tx.type === 'withdrawal' && tx.status === 'pending'
    );
    
    // Add user information to each withdrawal
    const enhancedWithdrawals = await Promise.all(pendingWithdrawals.map(async (w) => {
      const user = await storage.getUser(w.userId);
      const metadata = w.metadata || {};
      
      return {
        ...w,
        username: user ? user.username : 'Unknown',
        email: user ? user.email : 'Unknown',
        destinationType: metadata.method === 'bank' ? 'bank' : 'crypto',
        destination: metadata.method === 'bank' 
          ? (metadata.bankName + ' - ' + metadata.accountNumber) 
          : metadata.address
      };
    }));
    
    res.json({
      success: true,
      data: enhancedWithdrawals
    });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve pending withdrawals'
    });
  }
});

// Cancel a pending withdrawal
router.post('/withdrawals/:id/cancel', requireAuth, async (req, res) => {
  try {
    const withdrawalId = req.params.id;
    
    // Get the withdrawal transaction
    const transaction = await storage.getTransaction(withdrawalId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }
    
    // Check if user owns this withdrawal
    if (transaction.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this withdrawal'
      });
    }
    
    // Check if withdrawal can be cancelled (must be pending)
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a withdrawal with status: ${transaction.status}`
      });
    }
    
    // Get the wallet
    const wallet = await storage.getWallet(transaction.walletId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Return funds to wallet
    const newBalance = (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Update transaction status
    await storage.updateTransactionStatus(transaction.id, 'cancelled');
    
    // Log the cancellation
    await storage.createAdminLog({
      adminId: null, // System generated
      action: 'withdrawal_cancelled',
      targetId: transaction.id.toString(),
      details: {
        userId: req.user.id,
        currency: transaction.currency,
        amount: transaction.amount,
        cancelledBy: 'user'
      },
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to cancel withdrawal'
    });
  }
});

router.get('/wallets/deposits', requireAuth, async (req, res) => {
  try {
    // Get user's transactions filtered by deposit type
    const transactions = await storage.getTransactionsByUserId(req.user.id);
    const deposits = transactions.filter(tx => tx.type === 'deposit');
    
    res.json({
      deposits
    });
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: 'Failed to get deposits' });
  }
});

// Withdrawal routes
router.get('/wallets/withdrawals', requireAuth, async (req, res) => {
  try {
    // Get user's transactions filtered by withdrawal type
    const transactions = await storage.getTransactionsByUserId(req.user.id);
    const withdrawals = transactions.filter(tx => tx.type === 'withdrawal');
    
    res.json({
      withdrawals
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
});

router.post('/wallets/withdraw/bank', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { currency, amount, fee, bankDetails } = req.body;
    
    // Validate input
    if (!currency || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }
    
    if (!bankDetails || !bankDetails.bankName || !bankDetails.accountNumber) {
      return res.status(400).json({ error: 'Bank details are required' });
    }
    
    // Get the user's wallet for this currency
    const wallet = await storage.getWalletByUserIdAndCurrency(req.user.id, currency);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this currency' });
    }
    
    // Check if user has sufficient balance
    const balance = parseFloat(wallet.balance);
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create a transaction record for the withdrawal
    const transaction = await storage.createTransaction({
      userId: req.user.id,
      walletId: wallet.id,
      type: 'withdrawal',
      amount: amount.toString(),
      currency,
      status: 'pending', // Withdrawals need to be approved
      method: 'bank',
      metadata: {
        bankDetails,
        fee: fee.toString()
      },
      createdAt: new Date().toISOString()
    });
    
    // Update wallet balance
    const newBalance = (balance - amount).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Generate a transaction ID
    const transactionId = 'WDR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      transactionId,
      transaction
    });
  } catch (error) {
    console.error('Bank withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process bank withdrawal' });
  }
});

router.post('/wallets/withdraw/crypto', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { currency, amount, fee, network, address, memo } = req.body;
    
    // Validate input
    if (!currency || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }
    
    if (!network) {
      return res.status(400).json({ error: 'Network is required' });
    }
    
    if (!address) {
      return res.status(400).json({ error: 'Destination address is required' });
    }
    
    // Get the user's wallet for this currency
    const wallet = await storage.getWalletByUserIdAndCurrency(req.user.id, currency);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this currency' });
    }
    
    // Check if user has sufficient balance
    const balance = parseFloat(wallet.balance);
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create a transaction record for the withdrawal
    const transaction = await storage.createTransaction({
      userId: req.user.id,
      walletId: wallet.id,
      type: 'withdrawal',
      amount: amount.toString(),
      currency,
      status: 'pending', // Crypto withdrawals start as pending
      method: 'crypto',
      metadata: {
        network,
        address,
        memo,
        fee: fee.toString()
      },
      createdAt: new Date().toISOString()
    });
    
    // Update wallet balance
    const newBalance = (balance - amount).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Generate a transaction ID
    const transactionId = 'WDR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      transactionId,
      transaction
    });
  } catch (error) {
    console.error('Crypto withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process crypto withdrawal' });
  }
});

// KYC routes
router.post('/security/kyc/submit', requireAuth, upload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      firstName, lastName, dob, nationality, phone,
      idType, documentType,
      addressLine1, addressLine2, city, state, postalCode, country
    } = req.body;
    
    // Check if user already submitted KYC
    const existingKyc = await storage.getKycByUserId(req.user.id);
    
    if (existingKyc && existingKyc.status !== 'rejected') {
      return res.status(400).json({ error: 'KYC verification already submitted' });
    }
    
    // Prepare document paths
    const documents = {};
    
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key].length > 0) {
          documents[key] = req.files[key][0].path;
        }
      });
    }
    
    // Generate verification ID
    const verificationId = 'VER-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Create KYC record
    const kyc = await storage.createKyc({
      userId: req.user.id,
      verificationId,
      status: 'pending',
      firstName,
      lastName,
      dob,
      nationality,
      phone,
      idType,
      documents,
      address: {
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country
      },
      documentType,
      submittedAt: new Date().toISOString()
    });
    
    // Update user's KYC status
    await storage.updateUserKycStatus(req.user.id, 'pending');
    
    res.json({
      success: true,
      verificationId
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({ error: 'Failed to submit KYC verification' });
  }
});

router.get('/security/kyc/status', requireAuth, async (req, res) => {
  try {
    // Get user's KYC status
    const kyc = await storage.getKycByUserId(req.user.id);
    
    if (!kyc) {
      return res.json({
        status: 'not_submitted',
        level: 1
      });
    }
    
    // Determine verification level
    let level = 1; // Default level
    
    if (kyc.status === 'approved') {
      level = 3; // Highest level if KYC is approved
    } else if (kyc.status === 'pending') {
      level = 2; // Middle level if KYC is pending
    }
    
    res.json({
      status: kyc.status,
      submittedAt: kyc.submittedAt,
      updatedAt: kyc.updatedAt,
      verificationId: kyc.verificationId,
      level
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

// Order routes
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await storage.getOrdersByUserId(req.user.id);
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

router.post('/orders', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { type, side, symbol, amount, price, total } = req.body;
    
    // Create order
    const order = await storage.createOrder({
      userId: req.user.id,
      type,
      side,
      symbol,
      amount,
      price,
      total,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Stripe payment routes
router.post('/create-payment-intent', requireAuth, requireActiveAccount, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }
  
  try {
    const { amount, currency = 'usd' } = req.body;
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: req.user.id,
        email: req.user.email
      }
    });
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error.message 
    });
  }
});

// Market data
router.get('/market/ticker', (req, res) => {
  // Example market data for demonstration
  const tickers = [
    { symbol: 'BTC/USD', price: 75234.56, change: 2.35, high: 75987.43, low: 73456.78, volume: 1234.56 },
    { symbol: 'ETH/USD', price: 3543.21, change: -1.25, high: 3678.90, low: 3489.12, volume: 5678.90 },
    { symbol: 'LTC/USD', price: 87.65, change: 0.75, high: 89.10, low: 86.32, volume: 4321.09 },
    { symbol: 'XRP/USD', price: 0.5678, change: 3.45, high: 0.5912, low: 0.5432, volume: 9876.54 },
    { symbol: 'BNB/USD', price: 432.10, change: 1.20, high: 445.67, low: 425.89, volume: 2345.67 },
    { symbol: 'ADA/USD', price: 0.4521, change: 0.95, high: 0.4678, low: 0.4432, volume: 6789.01 },
    { symbol: 'DOT/USD', price: 15.43, change: -2.10, high: 16.21, low: 15.12, volume: 3456.78 },
    { symbol: 'SOL/USD', price: 167.82, change: 5.23, high: 175.43, low: 158.76, volume: 7890.12 },
    { symbol: 'DOGE/USD', price: 0.0821, change: -0.65, high: 0.0856, low: 0.0812, volume: 5432.10 },
    { symbol: 'LINK/USD', price: 18.76, change: 1.87, high: 19.21, low: 18.32, volume: 2109.87 }
  ];
  
  res.json({ tickers });
});

router.get('/market/orderbook/:symbol', (req, res) => {
  const { symbol } = req.params;
  
  // Example orderbook data for demonstration
  const generateOrderBook = (symbol) => {
    const seed = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
    const basePrice = (seed % 100) * 100 + 10000;
    
    const bids = [];
    const asks = [];
    
    for (let i = 0; i < 20; i++) {
      const bidPrice = basePrice - (i * 5) - (Math.random() * 3);
      const askPrice = basePrice + (i * 5) + (Math.random() * 3);
      
      bids.push({
        price: bidPrice.toFixed(2),
        amount: (Math.random() * 10 + 1).toFixed(4),
        total: (bidPrice * (Math.random() * 10 + 1)).toFixed(2)
      });
      
      asks.push({
        price: askPrice.toFixed(2),
        amount: (Math.random() * 10 + 1).toFixed(4),
        total: (askPrice * (Math.random() * 10 + 1)).toFixed(2)
      });
    }
    
    return { bids, asks };
  };
  
  res.json(generateOrderBook(symbol));
});

// Admin routes
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    // Remove sensitive information
    const safeUsers = users.map(user => {
      delete user.password;
      return user;
    });
    
    res.json({ users: safeUsers });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.get('/admin/transactions', requireAdmin, async (req, res) => {
  try {
    const transactions = await storage.getAllTransactions();
    res.json({ transactions });
  } catch (error) {
    console.error('Admin get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Admin routes for managing withdrawals
router.get('/admin/withdrawals', requireAdmin, async (req, res) => {
  try {
    // Get all pending withdrawals
    const transactions = await storage.getAllTransactions();
    const withdrawals = transactions.filter(tx => tx.type === 'withdrawal' && tx.status === 'pending');
    
    res.json({ withdrawals });
  } catch (error) {
    console.error('Admin get withdrawals error:', error);
    res.status(500).json({ error: 'Failed to get pending withdrawals' });
  }
});

router.post('/admin/withdrawals/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body; // For crypto withdrawals
    
    // Get the withdrawal transaction
    const transaction = await storage.getTransaction(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ error: 'Transaction is not a withdrawal' });
    }
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal is not in pending status' });
    }
    
    // Update transaction status to completed
    const updatedTransaction = await storage.updateTransactionStatus(id, 'completed');
    
    // Add transaction hash for crypto withdrawals
    if (transaction.method === 'crypto' && txHash) {
      await storage.updateTransactionMetadata(id, {
        ...transaction.metadata,
        txHash
      });
    }
    
    // Record admin action
    await storage.createAdminLog({
      adminId: req.user.id,
      action: 'withdrawal_approve',
      targetId: id,
      details: {
        transactionId: id,
        amount: transaction.amount,
        currency: transaction.currency,
        method: transaction.method
      },
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

router.post('/admin/withdrawals/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    // Get the withdrawal transaction
    const transaction = await storage.getTransaction(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ error: 'Transaction is not a withdrawal' });
    }
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal is not in pending status' });
    }
    
    // Get user's wallet
    const wallet = await storage.getWallet(transaction.walletId);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Refund the amount back to the wallet
    const newBalance = (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);
    
    // Update transaction status to rejected
    const updatedTransaction = await storage.updateTransactionStatus(id, 'rejected');
    
    // Add rejection reason to metadata
    await storage.updateTransactionMetadata(id, {
      ...transaction.metadata,
      rejectionReason: reason
    });
    
    // Record admin action
    await storage.createAdminLog({
      adminId: req.user.id,
      action: 'withdrawal_reject',
      targetId: id,
      details: {
        transactionId: id,
        amount: transaction.amount,
        currency: transaction.currency,
        method: transaction.method,
        reason
      },
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Withdrawal rejected and funds returned to wallet',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

router.get('/admin/kyc', requireAdmin, async (req, res) => {
  try {
    const kycVerifications = await storage.getAllKyc();
    res.json({ kycVerifications });
  } catch (error) {
    console.error('Admin get KYC error:', error);
    res.status(500).json({ error: 'Failed to get KYC verifications' });
  }
});

router.put('/admin/kyc/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    
    // Update KYC status
    const kyc = await storage.updateKycStatus(id, status, feedback);
    
    if (!kyc) {
      return res.status(404).json({ error: 'KYC verification not found' });
    }
    
    // Update user's KYC status
    await storage.updateUserKycStatus(kyc.userId, status);
    
    res.json(kyc);
  } catch (error) {
    console.error('Admin update KYC error:', error);
    res.status(500).json({ error: 'Failed to update KYC verification' });
  }
});

// Admin routes for account restrictions
router.post('/admin/users/:userId/restrict', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    
    // Validate input
    if (!status || !['restricted', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "restricted" or "suspended"' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Cannot restrict admins
    if (user.isAdmin) {
      return res.status(403).json({ error: 'Cannot restrict admin users' });
    }
    
    // Restrict user account
    const updatedUser = await storage.restrictUserAccount(userId, req.user.id, status, reason);
    
    // Return user without sensitive information
    delete updatedUser.password;
    
    res.json({
      success: true,
      message: `User account ${status}`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin restrict user error:', error);
    res.status(500).json({ error: 'Failed to restrict user account' });
  }
});

router.post('/admin/users/:userId/unrestrict', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Check if user exists
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is actually restricted
    if (user.accountStatus === 'active') {
      return res.status(400).json({ error: 'User account is not restricted' });
    }
    
    // Unrestrict user account
    const updatedUser = await storage.unrestrictUserAccount(userId, req.user.id, reason);
    
    // Return user without sensitive information
    delete updatedUser.password;
    
    res.json({
      success: true,
      message: 'User account unrestricted',
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin unrestrict user error:', error);
    res.status(500).json({ error: 'Failed to unrestrict user account' });
  }
});

router.get('/admin/users/:userId/restrictions', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get restriction history
    const restrictions = await storage.getUserRestrictionHistory(userId);
    
    res.json({ restrictions });
  } catch (error) {
    console.error('Admin get user restrictions error:', error);
    res.status(500).json({ error: 'Failed to get user restriction history' });
  }
});

// Setup WebSocket server for real-time updates
// WebSocket Server implementation has been moved to a dedicated file
// This function now delegates to the specialized implementation
function setupWebSocketServer(httpServer) {
  const { setupWebSocketServer: setupWS } = require('./websocket-server');
  const marketDataService = require('./services/market-data-service');
  
  // Create WebSocket server instance
  const wss = setupWS(httpServer);
  
  // Initialize market data service with WebSocket server
  marketDataService.initialize(wss);
  
  console.log('WebSocket server and market data service initialized');
  
  return wss;
}

// WebSocket handlers have been moved to websocket-server.js

// Import Binance routes
const binanceRoutes = require('./routes/binance-routes');

// Mount Binance routes
router.use('/binance', binanceRoutes);

// =============================
// Support Ticket System Routes
// =============================

// Get all support tickets (admin only)
router.get('/support/tickets', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tickets = await storage.getAllSupportTickets();
    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Error getting all support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get support tickets'
    });
  }
});

// Get user's support tickets
router.get('/support/tickets/user', requireAuth, async (req, res) => {
  try {
    const tickets = await storage.getSupportTicketsByUserId(req.user.id);
    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error(`Error getting support tickets for user ${req.user.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get your support tickets'
    });
  }
});

// Get support ticket by ID
router.get('/support/tickets/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await storage.getSupportTicket(id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }
    
    // Check permission: only admins or ticket owner can view
    if (!req.user.isAdmin && ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this ticket'
      });
    }
    
    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error(`Error getting support ticket ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get support ticket'
    });
  }
});

// Create a new support ticket
router.post('/support/tickets', requireAuth, requireActiveAccount, async (req, res) => {
  try {
    const { subject, description, category, priority = 'medium' } = req.body;
    
    // Validation
    if (!subject || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Subject, description, and category are required'
      });
    }
    
    const ticket = await storage.createSupportTicket({
      userId: req.user.id,
      subject,
      description,
      category,
      priority,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Create a notification for the user
    await storage.createNotification({
      userId: req.user.id,
      type: 'ticket_created',
      title: 'Support Ticket Created',
      message: `Your support ticket #${ticket.id} has been created and is pending review.`,
      data: {
        ticketId: ticket.id,
        subject: ticket.subject
      }
    });
    
    // Send notification to admins (in a real implementation, we would fetch all admins)
    // This is a placeholder for demonstration purposes
    const ticketCreatedEvent = {
      type: 'new_ticket',
      data: {
        ticketId: ticket.id,
        subject: ticket.subject,
        userId: req.user.id,
        username: req.user.username,
        priority: ticket.priority,
        timestamp: ticket.createdAt
      }
    };
    
    // Broadcast to all admin clients
    broadcastToAdmins(JSON.stringify(ticketCreatedEvent));
    
    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
});

// Update support ticket status (admin only or user can close their own ticket)
router.put('/support/tickets/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['open', 'pending', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }
    
    // Get the ticket
    const ticket = await storage.getSupportTicket(id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }
    
    // Check permission: only admins can set to pending, users can only close their own tickets
    if (!req.user.isAdmin && (status !== 'closed' || ticket.userId !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this ticket'
      });
    }
    
    // Update the ticket status
    const updatedTicket = await storage.updateSupportTicketStatus(id, status);
    
    // Create notification for ticket owner
    await storage.createNotification({
      userId: ticket.userId,
      type: 'ticket_updated',
      title: 'Support Ticket Updated',
      message: `Your support ticket #${id} status has been updated to ${status}.`,
      data: {
        ticketId: id,
        subject: ticket.subject,
        status
      }
    });
    
    // Broadcast status change to websocket clients
    const statusUpdateEvent = {
      type: 'ticket_status_updated',
      data: {
        ticketId: id,
        status,
        updatedBy: req.user.isAdmin ? 'admin' : 'user',
        timestamp: new Date().toISOString()
      }
    };
    
    broadcastToUser(ticket.userId, JSON.stringify(statusUpdateEvent));
    if (req.user.isAdmin) {
      broadcastToAdmins(JSON.stringify(statusUpdateEvent));
    }
    
    res.json({
      success: true,
      message: `Support ticket status updated to ${status}`,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error(`Error updating support ticket ${req.params.id} status:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support ticket status'
    });
  }
});

// Add reply to support ticket
router.post('/support/tickets/:id/replies', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }
    
    // Get the ticket
    const ticket = await storage.getSupportTicket(id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }
    
    // Check permission: only admins or ticket owner can reply
    if (!req.user.isAdmin && ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reply to this ticket'
      });
    }
    
    // Don't allow replies to closed tickets
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a closed ticket'
      });
    }
    
    // Create the reply
    const reply = await storage.addTicketReply({
      ticketId: id,
      userId: req.user.id,
      content,
      isAdmin: req.user.isAdmin,
      createdAt: new Date().toISOString()
    });
    
    // If ticket is open and admin replies, update status to pending
    if (ticket.status === 'open' && req.user.isAdmin) {
      await storage.updateSupportTicketStatus(id, 'pending');
    }
    
    // If ticket is pending and user replies, update status to open
    if (ticket.status === 'pending' && !req.user.isAdmin) {
      await storage.updateSupportTicketStatus(id, 'open');
    }
    
    // Create notification for the other party
    const notificationUserId = req.user.isAdmin ? ticket.userId : ticket.userId;
    const notificationType = req.user.isAdmin ? 'admin_reply' : 'user_reply';
    const notificationTitle = req.user.isAdmin ? 'Support Reply Received' : 'New Reply to Your Support Ticket';
    
    await storage.createNotification({
      userId: notificationUserId,
      type: notificationType,
      title: notificationTitle,
      message: `New reply to support ticket #${id}: ${ticket.subject}`,
      data: {
        ticketId: id,
        subject: ticket.subject,
        replyId: reply.id
      }
    });
    
    // Broadcast reply to websocket clients
    const replyEvent = {
      type: 'ticket_reply',
      data: {
        ticketId: id,
        replyId: reply.id,
        content: reply.content,
        userId: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        timestamp: reply.createdAt
      }
    };
    
    if (req.user.isAdmin) {
      broadcastToUser(ticket.userId, JSON.stringify(replyEvent));
    } else {
      broadcastToAdmins(JSON.stringify(replyEvent));
    }
    
    res.json({
      success: true,
      message: 'Reply added successfully',
      reply
    });
  } catch (error) {
    console.error(`Error adding reply to ticket ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reply'
    });
  }
});

// Get FAQ categories
router.get('/support/faq/categories', async (req, res) => {
  try {
    const categories = await storage.getAllFaqCategories();
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error getting FAQ categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQ categories'
    });
  }
});

// Get FAQs by category
router.get('/support/faq/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await storage.getFaqCategory(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'FAQ category not found'
      });
    }
    
    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error(`Error getting FAQs for category ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQs'
    });
  }
});

// Get all FAQs
router.get('/support/faq', async (req, res) => {
  try {
    const faqs = await storage.getAllFaqs();
    res.json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error('Error getting all FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQs'
    });
  }
});

// Create FAQ category (admin only)
router.post('/support/faq/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, icon, displayOrder } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }
    
    const category = await storage.createFaqCategory({
      name,
      slug,
      description,
      icon,
      displayOrder: displayOrder || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'FAQ category created successfully',
      category
    });
  } catch (error) {
    console.error('Error creating FAQ category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ category'
    });
  }
});

// Create FAQ (admin only)
router.post('/support/faq', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { categoryId, question, answer, isPublished, displayOrder } = req.body;
    
    if (!categoryId || !question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, question, and answer are required'
      });
    }
    
    const faq = await storage.createFaq({
      categoryId,
      question,
      answer,
      isPublished: isPublished !== undefined ? isPublished : true,
      displayOrder: displayOrder || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'FAQ created successfully',
      faq
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ'
    });
  }
});

// Helper function to broadcast to admin users
function broadcastToAdmins(message) {
  if (!global.websocketClients) return;
  
  for (const client of global.websocketClients) {
    if (client.readyState === WebSocket.OPEN && client.userId && client.isAdmin) {
      client.send(message);
    }
  }
}

// Helper function to broadcast to a specific user
function broadcastToUser(userId, message) {
  if (!global.websocketClients) return;
  
  for (const client of global.websocketClients) {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(message);
    }
  }
}

module.exports = {
  router,
  setupWebSocketServer,
  binanceRoutes
};