const { users, wallets, orders, transactions } = require('../shared/schema');
const { db } = require('./db');
const { eq, and } = require('drizzle-orm');

// Database Storage Implementation
class DatabaseStorage {
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser) {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Wallet methods
  async getWallet(id) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet || undefined;
  }

  async getWalletsByUserId(userId) {
    return await db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async getWalletByUserIdAndCurrency(userId, currency) {
    const [wallet] = await db.select().from(wallets).where(
      and(
        eq(wallets.userId, userId),
        eq(wallets.currency, currency)
      )
    );
    return wallet || undefined;
  }

  async createWallet(wallet) {
    const [newWallet] = await db
      .insert(wallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async updateWalletBalance(id, newBalance) {
    const [updatedWallet] = await db
      .update(wallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, id))
      .returning();
    return updatedWallet;
  }

  // Order methods
  async getOrder(id) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByUserId(userId) {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async createOrder(order) {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id, status) {
    const now = new Date();
    const updates = { 
      status, 
      updatedAt: now 
    };
    
    // If the order is being marked as completed, set the completedAt field
    if (status === 'completed') {
      updates.completedAt = now;
    }
    
    const [updatedOrder] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Transaction methods
  async getTransaction(id) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByUserId(userId) {
    return await db.select().from(transactions).where(eq(transactions.userId, userId));
  }

  async getTransactionsByWalletId(walletId) {
    return await db.select().from(transactions).where(eq(transactions.walletId, walletId));
  }

  async createTransaction(transaction) {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateTransactionStatus(id, status) {
    const now = new Date();
    const updates = { 
      status, 
      updatedAt: now 
    };
    
    // If the transaction is being marked as completed, set the completedAt field
    if (status === 'completed') {
      updates.completedAt = now;
    }
    
    const [updatedTransaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }
}

// Export a singleton instance
exports.storage = new DatabaseStorage();