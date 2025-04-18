"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
const schema_1 = require("../shared/schema");
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
// Database Storage Implementation
class DatabaseStorage {
    // User methods
    async getUser(id) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        return user || undefined;
    }
    async getUserByUsername(username) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, username));
        return user || undefined;
    }
    async getUserByEmail(email) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        return user || undefined;
    }
    async createUser(insertUser) {
        const [user] = await db_1.db
            .insert(schema_1.users)
            .values(insertUser)
            .returning();
        return user;
    }
    // Wallet methods
    async getWallet(id) {
        const [wallet] = await db_1.db.select().from(schema_1.wallets).where((0, drizzle_orm_1.eq)(schema_1.wallets.id, id));
        return wallet || undefined;
    }
    async getWalletsByUserId(userId) {
        return await db_1.db.select().from(schema_1.wallets).where((0, drizzle_orm_1.eq)(schema_1.wallets.userId, userId));
    }
    async getWalletByUserIdAndCurrency(userId, currency) {
        const [wallet] = await db_1.db.select().from(schema_1.wallets).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, currency)));
        return wallet || undefined;
    }
    async createWallet(wallet) {
        const [newWallet] = await db_1.db
            .insert(schema_1.wallets)
            .values(wallet)
            .returning();
        return newWallet;
    }
    async updateWalletBalance(id, newBalance) {
        const [updatedWallet] = await db_1.db
            .update(schema_1.wallets)
            .set({ balance: newBalance, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.wallets.id, id))
            .returning();
        return updatedWallet;
    }
    // Order methods
    async getOrder(id) {
        const [order] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
        return order || undefined;
    }
    async getOrdersByUserId(userId) {
        return await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.userId, userId));
    }
    async createOrder(order) {
        const [newOrder] = await db_1.db
            .insert(schema_1.orders)
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
        const [updatedOrder] = await db_1.db
            .update(schema_1.orders)
            .set(updates)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id))
            .returning();
        return updatedOrder;
    }
    // Transaction methods
    async getTransaction(id) {
        const [transaction] = await db_1.db.select().from(schema_1.transactions).where((0, drizzle_orm_1.eq)(schema_1.transactions.id, id));
        return transaction || undefined;
    }
    async getTransactionsByUserId(userId) {
        return await db_1.db.select().from(schema_1.transactions).where((0, drizzle_orm_1.eq)(schema_1.transactions.userId, userId));
    }
    async getTransactionsByWalletId(walletId) {
        return await db_1.db.select().from(schema_1.transactions).where((0, drizzle_orm_1.eq)(schema_1.transactions.walletId, walletId));
    }
    async createTransaction(transaction) {
        const [newTransaction] = await db_1.db
            .insert(schema_1.transactions)
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
        const [updatedTransaction] = await db_1.db
            .update(schema_1.transactions)
            .set(updates)
            .where((0, drizzle_orm_1.eq)(schema_1.transactions.id, id))
            .returning();
        return updatedTransaction;
    }
}
exports.DatabaseStorage = DatabaseStorage;
// Export a singleton instance
exports.storage = new DatabaseStorage();
