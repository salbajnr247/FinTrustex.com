/**
 * Admin Routes for FinTrustEX
 * Handles admin-specific endpoints and operations
 */

const express = require('express');
const { nanoid } = require('nanoid');
const router = express.Router();
const { storage } = require('../storage');

// Admin middleware - ensure user has admin role
const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  res.status(401).json({ error: 'Unauthorized' });
};

/**
 * Get all users (admin only)
 */
router.get('/users', ensureAdmin, async (req, res) => {
  try {
    // Get query parameters for pagination and filtering
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // In a real app, we would query the database with pagination
    // and filtering parameters
    
    // For now, we'll use the storage API and do manual filtering
    // Note: In a real app with many users, you'd add proper pagination
    // in the database query itself
    const allUsers = await storage.getAllUsers();
    
    // Apply filters
    let filteredUsers = [...allUsers];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    
    if (status) {
      filteredUsers = filteredUsers.filter(user => 
        user.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Apply pagination
    const paginatedUsers = filteredUsers.slice(offset, offset + parseInt(limit));
    
    // Format response
    const formattedUsers = paginatedUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status || 'Active',
      kycStatus: user.kycStatus || 'Not Submitted',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || null
    }));
    
    // Return users with pagination metadata
    res.json({
      users: formattedUsers,
      pagination: {
        total: filteredUsers.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredUsers.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get user details by ID (admin only)
 */
router.get('/users/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user by ID
    const user = await storage.getUser(parseInt(id));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's wallets
    const wallets = await storage.getWalletsByUserId(user.id);
    
    // Get user's orders
    const orders = await storage.getOrdersByUserId(user.id);
    
    // Get user's transactions
    const transactions = await storage.getTransactionsByUserId(user.id);
    
    // Format response
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'Active',
      kycStatus: user.kycStatus || 'Not Submitted',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || null,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        currency: wallet.currency,
        balance: wallet.balance,
        address: wallet.address
      })),
      recentOrders: orders.slice(0, 5).map(order => ({
        id: order.id,
        pair: order.pair,
        type: order.type,
        amount: order.amount,
        price: order.price,
        status: order.status,
        createdAt: order.createdAt
      })),
      recentTransactions: transactions.slice(0, 5).map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        createdAt: tx.createdAt
      }))
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * Update user status (admin only)
 */
router.put('/users/:id/status', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Active', 'Suspended', 'Locked'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required (Active, Suspended, Locked)' });
    }
    
    // Get user by ID
    const user = await storage.getUser(parseInt(id));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user status
    const updatedUser = await storage.updateUser(user.id, { status });
    
    // Return updated user
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      status: updatedUser.status
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * Get all transactions (admin only)
 */
router.get('/transactions', ensureAdmin, async (req, res) => {
  try {
    // Get query parameters for pagination and filtering
    const { 
      page = 1, 
      limit = 20, 
      type = '', 
      status = '',
      userId = '' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // In a real app, we would query the database with pagination
    // and filtering parameters
    
    // For now, we'll use the storage API and do manual filtering
    // Note: In a real app with many transactions, you'd add proper 
    // pagination in the database query itself
    const allTransactions = await storage.getAllTransactions();
    
    // Apply filters
    let filteredTransactions = [...allTransactions];
    
    if (type) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.type.toLowerCase() === type.toLowerCase()
      );
    }
    
    if (status) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    if (userId) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.userId === parseInt(userId)
      );
    }
    
    // Sort by createdAt (newest first)
    filteredTransactions.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Apply pagination
    const paginatedTransactions = filteredTransactions.slice(offset, offset + parseInt(limit));
    
    // Get usernames for each transaction
    const transactionsWithUsers = await Promise.all(
      paginatedTransactions.map(async tx => {
        const user = await storage.getUser(tx.userId);
        return {
          id: tx.id,
          user: user ? user.username : `User ${tx.userId}`,
          userId: tx.userId,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          createdAt: tx.createdAt
        };
      })
    );
    
    // Return transactions with pagination metadata
    res.json({
      transactions: transactionsWithUsers,
      pagination: {
        total: filteredTransactions.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredTransactions.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * Update transaction status (admin only)
 */
router.put('/transactions/:id/status', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status required (pending, completed, failed, cancelled)' 
      });
    }
    
    // Get transaction by ID
    const transaction = await storage.getTransaction(parseInt(id));
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Update transaction status
    const updatedTransaction = await storage.updateTransactionStatus(transaction.id, status);
    
    // Get user for transaction
    const user = await storage.getUser(updatedTransaction.userId);
    
    // Return updated transaction
    res.json({
      id: updatedTransaction.id,
      user: user ? user.username : `User ${updatedTransaction.userId}`,
      userId: updatedTransaction.userId,
      type: updatedTransaction.type,
      amount: updatedTransaction.amount,
      currency: updatedTransaction.currency,
      status: updatedTransaction.status,
      createdAt: updatedTransaction.createdAt
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

/**
 * Get system analytics (admin only)
 */
router.get('/analytics', ensureAdmin, async (req, res) => {
  try {
    // Get all users
    const users = await storage.getAllUsers();
    
    // Get all transactions
    const transactions = await storage.getAllTransactions();
    
    // Calculate user registrations by month (last 6 months)
    const now = new Date();
    const monthLabels = [];
    const userRegistrations = [];
    const transactionCounts = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthLabels.push(monthLabel);
      
      // Count users registered in this month
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const usersInMonth = users.filter(user => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
      });
      
      userRegistrations.push(usersInMonth.length);
      
      // Count transactions in this month
      const transactionsInMonth = transactions.filter(tx => {
        const createdAt = new Date(tx.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
      });
      
      transactionCounts.push(transactionsInMonth.length);
    }
    
    // Count transactions in last 24 hours
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailyTransactions = transactions.filter(tx => 
      new Date(tx.createdAt) >= last24Hours
    ).length;
    
    // Count active users (logged in in last 30 days)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = users.filter(user => 
      user.lastLogin && new Date(user.lastLogin) >= last30Days
    ).length;
    
    // Calculate transaction volume by currency
    const volumeByDay = {};
    const volumeByCurrency = {};
    
    transactions.forEach(tx => {
      // Skip non-completed transactions
      if (tx.status !== 'completed') return;
      
      // Add to volume by day
      const date = new Date(tx.createdAt).toLocaleDateString('en-US');
      if (!volumeByDay[date]) {
        volumeByDay[date] = 0;
      }
      volumeByDay[date] += parseFloat(tx.amount);
      
      // Add to volume by currency
      if (!volumeByCurrency[tx.currency]) {
        volumeByCurrency[tx.currency] = 0;
      }
      volumeByCurrency[tx.currency] += parseFloat(tx.amount);
    });
    
    // Return analytics data
    res.json({
      totalUsers: users.length,
      activeUsers,
      dailyTransactions,
      chartData: {
        labels: monthLabels,
        users: userRegistrations,
        transactions: transactionCounts
      },
      volumeByDay,
      volumeByCurrency
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Get market data for admin dashboard (admin only)
 */
router.get('/market-data', ensureAdmin, async (req, res) => {
  try {
    // In a real app, this would fetch real market data
    // from a market data service or trading engine
    
    // For now, we'll return some static data
    res.json({
      volume: {
        total: 24568790,
        change: 5.67,
        byCurrency: {
          BTC: 12345678,
          ETH: 8765432,
          USDT: 3457680
        }
      },
      activePairs: 24,
      systemLoad: '62%',
      activeOrders: 156,
      openPositions: 78,
      tradingFees: {
        last24h: 12345.67,
        last7d: 87654.32,
        last30d: 345678.90
      }
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

/**
 * Get recent activity log (admin only)
 */
router.get('/activity-log', ensureAdmin, async (req, res) => {
  try {
    // In a real app, you would fetch this from a database
    // For now, we'll return some example activities
    
    // Get current users for reference
    const users = await storage.getAllUsers();
    
    // Create sample activities
    const now = new Date();
    const activities = [
      {
        id: nanoid(),
        type: 'user_login',
        userId: users[0]?.id || 1,
        username: users[0]?.username || 'admin',
        description: `User ${users[0]?.username || 'admin'} logged in`,
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        type: 'transaction_approved',
        adminId: 1,
        adminName: 'admin',
        transactionId: nanoid(8),
        description: 'Transaction TX12345 approved by admin',
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        type: 'user_suspended',
        userId: users[1]?.id || 2,
        username: users[1]?.username || 'user1',
        adminId: 1,
        adminName: 'admin',
        description: `User ${users[1]?.username || 'user1'} suspended for suspicious activity`,
        timestamp: new Date(now.getTime() - 120 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        type: 'system_maintenance',
        adminId: 1,
        adminName: 'admin',
        description: 'System maintenance scheduled for tomorrow',
        timestamp: new Date(now.getTime() - 240 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        type: 'deposit_rejected',
        adminId: 1,
        adminName: 'admin',
        userId: users[2]?.id || 3,
        username: users[2]?.username || 'user2',
        description: `Deposit from ${users[2]?.username || 'user2'} rejected - suspicious source`,
        timestamp: new Date(now.getTime() - 300 * 60 * 1000).toISOString()
      }
    ];
    
    res.json({
      activities,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

/**
 * Get system logs (admin only)
 */
router.get('/system-logs', ensureAdmin, async (req, res) => {
  try {
    // In a real app, you would fetch actual system logs
    // from a log file or logging service
    
    const now = Date.now();
    const logs = [
      {
        level: 'info',
        message: 'Server started successfully',
        timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        source: 'server'
      },
      {
        level: 'info',
        message: 'Database connection established',
        timestamp: new Date(now - 24 * 60 * 60 * 1000 + 1000).toISOString(),
        source: 'database'
      },
      {
        level: 'warning',
        message: 'High memory usage detected',
        timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
        source: 'monitoring'
      },
      {
        level: 'error',
        message: 'Failed to connect to external API',
        timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        source: 'api'
      },
      {
        level: 'info',
        message: 'User authentication succeeded',
        timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        source: 'auth'
      },
      {
        level: 'info',
        message: 'Transaction processed successfully',
        timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        source: 'transaction'
      },
      {
        level: 'error',
        message: 'Database query timeout',
        timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
        source: 'database'
      },
      {
        level: 'info',
        message: 'Background job completed',
        timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
        source: 'job'
      },
      {
        level: 'warning',
        message: 'Too many failed login attempts',
        timestamp: new Date(now - 10 * 60 * 1000).toISOString(),
        source: 'auth'
      },
      {
        level: 'info',
        message: 'System status: healthy',
        timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
        source: 'monitoring'
      }
    ];
    
    res.json({
      logs,
      timestamp: new Date(now).toISOString()
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

/**
 * Perform system backup (admin only)
 */
router.post('/backup', ensureAdmin, async (req, res) => {
  try {
    // In a real app, this would trigger a database backup
    // For now, we'll just simulate the backup
    
    // Simulate backup time (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    res.json({
      success: true,
      message: 'System backup created successfully',
      backupId: nanoid(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

module.exports = router;