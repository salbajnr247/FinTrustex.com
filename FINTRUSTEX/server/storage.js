/**
 * Storage Interface for FinTrustEX
 * Handles all database interactions
 */

const bcrypt = require('bcryptjs');
const { db } = require('./db');

class DatabaseStorage {
  /**
   * User Methods
   */
  
  // Get all users (admin only)
  async getAllUsers() {
    try {
      return await db.users.findMany();
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
  
  // Get user by ID
  async getUser(id) {
    try {
      return await db.users.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      throw error;
    }
  }
  
  // Get user by username
  async getUserByUsername(username) {
    try {
      return await db.users.findUnique({
        where: { username }
      });
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      throw error;
    }
  }
  
  // Get user by email
  async getUserByEmail(email) {
    try {
      return await db.users.findUnique({
        where: { email }
      });
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }
  
  // Create user
  async createUser(userData) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const user = await db.users.create({
        data: {
          ...userData,
          password: hashedPassword,
          kycStatus: 'not_submitted'
        }
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Update user
  async updateUser(id, userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      // Update user
      const user = await db.users.update({
        where: { id },
        data: userData
      });
      
      return user;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }
  
  // Update user KYC status
  async updateUserKycStatus(userId, status) {
    try {
      return await db.users.update({
        where: { id: userId },
        data: { kycStatus: status }
      });
    } catch (error) {
      console.error(`Error updating user KYC status for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Update user's Stripe customer ID
  async updateStripeCustomerId(userId, customerId) {
    try {
      return await db.users.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId }
      });
    } catch (error) {
      console.error(`Error updating Stripe customer ID for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Update user's Stripe subscription ID
  async updateUserStripeInfo(userId, { customerId, subscriptionId }) {
    try {
      return await db.users.update({
        where: { id: userId },
        data: { 
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId
        }
      });
    } catch (error) {
      console.error(`Error updating Stripe info for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Restrict user account
  async restrictUserAccount(userId, adminId, status, reason) {
    try {
      // Update user account status
      const updatedUser = await db.users.update({
        where: { id: userId },
        data: {
          accountStatus: status, // 'restricted' or 'suspended'
          restrictionReason: reason,
          restrictedAt: new Date().toISOString(),
          restrictedBy: adminId
        }
      });
      
      // Create restriction history record
      await db.accountRestrictions.create({
        data: {
          userId,
          adminId,
          actionType: 'restrict',
          status,
          reason,
          createdAt: new Date().toISOString()
        }
      });
      
      return updatedUser;
    } catch (error) {
      console.error(`Error restricting user ${userId}:`, error);
      throw error;
    }
  }
  
  // Unrestrict user account
  async unrestrictUserAccount(userId, adminId, reason) {
    try {
      // Update user account status
      const updatedUser = await db.users.update({
        where: { id: userId },
        data: {
          accountStatus: 'active',
          restrictionReason: null,
          restrictedAt: null,
          restrictedBy: null
        }
      });
      
      // Create restriction history record
      await db.accountRestrictions.create({
        data: {
          userId,
          adminId,
          actionType: 'unrestrict',
          status: 'active',
          reason,
          createdAt: new Date().toISOString()
        }
      });
      
      return updatedUser;
    } catch (error) {
      console.error(`Error unrestricting user ${userId}:`, error);
      throw error;
    }
  }
  
  // Get user restriction history
  async getUserRestrictionHistory(userId) {
    try {
      return await db.accountRestrictions.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error(`Error getting restriction history for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Verify user password
  async verifyPassword(user, password) {
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }
  
  /**
   * Wallet Methods
   */
  
  // Get wallet by ID
  async getWallet(id) {
    try {
      return await db.wallets.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error(`Error getting wallet ${id}:`, error);
      throw error;
    }
  }
  
  // Get wallets by user ID
  async getWalletsByUserId(userId) {
    try {
      return await db.wallets.findMany({
        where: { userId }
      });
    } catch (error) {
      console.error(`Error getting wallets for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Get wallet by user ID and currency
  async getWalletByUserIdAndCurrency(userId, currency) {
    try {
      return await db.wallets.findFirst({
        where: {
          userId,
          currency
        }
      });
    } catch (error) {
      console.error(`Error getting wallet for user ${userId} and currency ${currency}:`, error);
      throw error;
    }
  }
  
  // Create wallet
  async createWallet(walletData) {
    try {
      return await db.wallets.create({
        data: walletData
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }
  
  // Update wallet balance
  async updateWalletBalance(id, newBalance) {
    try {
      return await db.wallets.update({
        where: { id },
        data: { balance: newBalance }
      });
    } catch (error) {
      console.error(`Error updating wallet ${id} balance:`, error);
      throw error;
    }
  }
  
  /**
   * Order Methods
   */
  
  // Get order by ID
  async getOrder(id) {
    try {
      return await db.orders.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error(`Error getting order ${id}:`, error);
      throw error;
    }
  }
  
  // Get orders by user ID
  async getOrdersByUserId(userId) {
    try {
      return await db.orders.findMany({
        where: { userId }
      });
    } catch (error) {
      console.error(`Error getting orders for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Create order
  async createOrder(orderData) {
    try {
      return await db.orders.create({
        data: orderData
      });
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
  
  // Update order status
  async updateOrderStatus(id, status) {
    try {
      return await db.orders.update({
        where: { id },
        data: { status }
      });
    } catch (error) {
      console.error(`Error updating order ${id} status:`, error);
      throw error;
    }
  }
  
  /**
   * Transaction Methods
   */
  
  // Get all transactions (admin only)
  async getAllTransactions() {
    try {
      return await db.transactions.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw error;
    }
  }
  
  // Get transaction by ID
  async getTransaction(id) {
    try {
      return await db.transactions.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error(`Error getting transaction ${id}:`, error);
      throw error;
    }
  }
  
  // Get transactions by user ID
  async getTransactionsByUserId(userId) {
    try {
      return await db.transactions.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error(`Error getting transactions for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Get transactions by wallet ID
  async getTransactionsByWalletId(walletId) {
    try {
      return await db.transactions.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error(`Error getting transactions for wallet ${walletId}:`, error);
      throw error;
    }
  }
  
  // Create transaction
  async createTransaction(transactionData) {
    try {
      return await db.transactions.create({
        data: transactionData
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
  
  // Update transaction status
  async updateTransactionStatus(id, status) {
    try {
      return await db.transactions.update({
        where: { id },
        data: { status }
      });
    } catch (error) {
      console.error(`Error updating transaction ${id} status:`, error);
      throw error;
    }
  }
  
  // Update transaction metadata
  async updateTransactionMetadata(id, metadata) {
    try {
      return await db.transactions.update({
        where: { id },
        data: { metadata }
      });
    } catch (error) {
      console.error(`Error updating transaction ${id} metadata:`, error);
      throw error;
    }
  }
  
  // Create admin log record
  async createAdminLog(logData) {
    try {
      return await db.adminLogs.create({
        data: {
          ...logData,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating admin log:', error);
      throw error;
    }
  }
  
  // Get admin logs with optional filters
  async getAdminLogs(filters = {}) {
    try {
      const whereClause = {};
      
      if (filters.adminId) {
        whereClause.adminId = filters.adminId;
      }
      
      if (filters.action) {
        whereClause.action = filters.action;
      }
      
      if (filters.targetId) {
        whereClause.targetId = filters.targetId;
      }
      
      return await db.adminLogs.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      console.error('Error getting admin logs:', error);
      throw error;
    }
  }
  
  /**
   * KYC Methods
   */
  
  // Get all KYC verifications (admin only)
  async getAllKyc() {
    try {
      return await db.kyc.findMany({
        orderBy: { submittedAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting all KYC verifications:', error);
      throw error;
    }
  }
  
  // Get KYC by ID
  async getKyc(id) {
    try {
      return await db.kyc.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error(`Error getting KYC ${id}:`, error);
      throw error;
    }
  }
  
  // Get KYC by verification ID
  async getKycByVerificationId(verificationId) {
    try {
      return await db.kyc.findUnique({
        where: { verificationId }
      });
    } catch (error) {
      console.error(`Error getting KYC by verification ID ${verificationId}:`, error);
      throw error;
    }
  }
  
  // Get KYC by user ID
  async getKycByUserId(userId) {
    try {
      return await db.kyc.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' }
      });
    } catch (error) {
      console.error(`Error getting KYC for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Create KYC
  async createKyc(kycData) {
    try {
      return await db.kyc.create({
        data: kycData
      });
    } catch (error) {
      console.error('Error creating KYC:', error);
      throw error;
    }
  }
  
  // Update KYC status
  async updateKycStatus(id, status, feedback = null) {
    try {
      return await db.kyc.update({
        where: { id },
        data: {
          status,
          feedback,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`Error updating KYC ${id} status:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const storage = new DatabaseStorage();

module.exports = { storage };