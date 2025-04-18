const { db } = require('./db');
const { eq, and } = require('drizzle-orm');

// Storage interface for database operations
class DatabaseStorage {
  // User methods
  async getUser(id) {
    try {
      const [user] = await db.execute(`
        SELECT * FROM users WHERE id = $1
      `, [id]);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const [user] = await db.execute(`
        SELECT * FROM users WHERE username = $1
      `, [username]);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const [user] = await db.execute(`
        SELECT * FROM users WHERE email = $1
      `, [email]);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const { username, email, passwordHash, firstName, lastName, companyName, role = 'user', isVerified = false } = userData;
      
      const [user] = await db.execute(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, company_name, role, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [username, email, passwordHash, firstName, lastName, companyName, role, isVerified]);
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Wallet methods
  async getWallet(id) {
    try {
      const [wallet] = await db.execute(`
        SELECT * FROM wallets WHERE id = $1
      `, [id]);
      return wallet || undefined;
    } catch (error) {
      console.error('Error getting wallet:', error);
      throw error;
    }
  }

  async getWalletsByUserId(userId) {
    try {
      const wallets = await db.execute(`
        SELECT * FROM wallets WHERE user_id = $1
      `, [userId]);
      return wallets;
    } catch (error) {
      console.error('Error getting wallets by user ID:', error);
      throw error;
    }
  }

  async getWalletByUserIdAndCurrency(userId, currency) {
    try {
      const [wallet] = await db.execute(`
        SELECT * FROM wallets WHERE user_id = $1 AND currency = $2
      `, [userId, currency]);
      return wallet || undefined;
    } catch (error) {
      console.error('Error getting wallet by user ID and currency:', error);
      throw error;
    }
  }

  async createWallet(walletData) {
    try {
      const { userId, currency, balance = '0' } = walletData;
      
      const [wallet] = await db.execute(`
        INSERT INTO wallets (user_id, currency, balance)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [userId, currency, balance]);
      
      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  async updateWalletBalance(id, newBalance) {
    try {
      const now = new Date();
      
      const [wallet] = await db.execute(`
        UPDATE wallets
        SET balance = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `, [newBalance, now, id]);
      
      return wallet;
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  // Order methods
  async getOrder(id) {
    try {
      const [order] = await db.execute(`
        SELECT * FROM orders WHERE id = $1
      `, [id]);
      return order || undefined;
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  async getOrdersByUserId(userId) {
    try {
      const orders = await db.execute(`
        SELECT * FROM orders WHERE user_id = $1
      `, [userId]);
      return orders;
    } catch (error) {
      console.error('Error getting orders by user ID:', error);
      throw error;
    }
  }

  async createOrder(orderData) {
    try {
      const { 
        userId, type, status = 'pending', baseCurrency, quoteCurrency, 
        amount, price, totalValue, fee = null 
      } = orderData;
      
      const [order] = await db.execute(`
        INSERT INTO orders (
          user_id, type, status, base_currency, quote_currency, 
          amount, price, total_value, fee
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        userId, type, status, baseCurrency, quoteCurrency, 
        amount, price, totalValue, fee
      ]);
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(id, status) {
    try {
      const now = new Date();
      let completedAt = null;
      
      if (status === 'completed') {
        completedAt = now;
      }
      
      const [order] = await db.execute(`
        UPDATE orders
        SET status = $1, updated_at = $2, completed_at = $3
        WHERE id = $4
        RETURNING *
      `, [status, now, completedAt, id]);
      
      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Transaction methods
  async getTransaction(id) {
    try {
      const [transaction] = await db.execute(`
        SELECT * FROM transactions WHERE id = $1
      `, [id]);
      return transaction || undefined;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  async getTransactionsByUserId(userId) {
    try {
      const transactions = await db.execute(`
        SELECT * FROM transactions WHERE user_id = $1
      `, [userId]);
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by user ID:', error);
      throw error;
    }
  }

  async getTransactionsByWalletId(walletId) {
    try {
      const transactions = await db.execute(`
        SELECT * FROM transactions WHERE wallet_id = $1
      `, [walletId]);
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by wallet ID:', error);
      throw error;
    }
  }

  async createTransaction(transactionData) {
    try {
      const { 
        userId, walletId, type, status = 'pending', 
        amount, currency, txHash = null, description = null 
      } = transactionData;
      
      const [transaction] = await db.execute(`
        INSERT INTO transactions (
          user_id, wallet_id, type, status, 
          amount, currency, tx_hash, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId, walletId, type, status, 
        amount, currency, txHash, description
      ]);
      
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransactionStatus(id, status) {
    try {
      const now = new Date();
      let completedAt = null;
      
      if (status === 'completed') {
        completedAt = now;
      }
      
      const [transaction] = await db.execute(`
        UPDATE transactions
        SET status = $1, updated_at = $2, completed_at = $3
        WHERE id = $4
        RETURNING *
      `, [status, now, completedAt, id]);
      
      return transaction;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const storage = new DatabaseStorage();
module.exports = { storage, DatabaseStorage };