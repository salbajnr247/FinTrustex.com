"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTransactionSchema = exports.transactionsRelations = exports.transactions = exports.insertOrderSchema = exports.ordersRelations = exports.orders = exports.insertWalletSchema = exports.walletsRelations = exports.wallets = exports.insertUserSchema = exports.users = exports.orderStatusEnum = exports.orderTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
// Enum for order types
exports.orderTypeEnum = (0, pg_core_1.pgEnum)('order_type', ['buy', 'sell']);
// Enum for order status
exports.orderStatusEnum = (0, pg_core_1.pgEnum)('order_status', ['pending', 'completed', 'cancelled', 'failed']);
// Users table
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    username: (0, pg_core_1.text)('username').notNull().unique(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    firstName: (0, pg_core_1.text)('first_name'),
    lastName: (0, pg_core_1.text)('last_name'),
    companyName: (0, pg_core_1.text)('company_name'),
    role: (0, pg_core_1.text)('role').default('user'),
    isVerified: (0, pg_core_1.boolean)('is_verified').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
// User schema for inserting
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
});
// Wallets table for storing crypto balances
exports.wallets = (0, pg_core_1.pgTable)('wallets', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    currency: (0, pg_core_1.text)('currency').notNull(),
    balance: (0, pg_core_1.numeric)('balance').notNull().default('0'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
// Wallet relationships
exports.walletsRelations = (0, drizzle_orm_1.relations)(exports.wallets, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.wallets.userId],
        references: [exports.users.id],
    }),
}));
// Wallet schema for inserting
exports.insertWalletSchema = (0, drizzle_zod_1.createInsertSchema)(exports.wallets).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Trades/Orders table
exports.orders = (0, pg_core_1.pgTable)('orders', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    type: (0, exports.orderTypeEnum)('type').notNull(),
    status: (0, exports.orderStatusEnum)('status').notNull().default('pending'),
    baseCurrency: (0, pg_core_1.text)('base_currency').notNull(),
    quoteCurrency: (0, pg_core_1.text)('quote_currency').notNull(),
    amount: (0, pg_core_1.numeric)('amount').notNull(),
    price: (0, pg_core_1.numeric)('price').notNull(),
    totalValue: (0, pg_core_1.numeric)('total_value').notNull(),
    fee: (0, pg_core_1.numeric)('fee'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
});
// Order relationships
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.orders.userId],
        references: [exports.users.id],
    }),
}));
// Order schema for inserting
exports.insertOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
});
// Transactions table (deposits, withdrawals)
exports.transactions = (0, pg_core_1.pgTable)('transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    walletId: (0, pg_core_1.integer)('wallet_id').notNull().references(() => exports.wallets.id),
    type: (0, pg_core_1.text)('type').notNull(), // deposit, withdrawal
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    amount: (0, pg_core_1.numeric)('amount').notNull(),
    currency: (0, pg_core_1.text)('currency').notNull(),
    txHash: (0, pg_core_1.text)('tx_hash'), // blockchain transaction hash
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
});
// Transaction relationships
exports.transactionsRelations = (0, drizzle_orm_1.relations)(exports.transactions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.transactions.userId],
        references: [exports.users.id],
    }),
    wallet: one(exports.wallets, {
        fields: [exports.transactions.walletId],
        references: [exports.wallets.id],
    }),
}));
// Transaction schema for inserting
exports.insertTransactionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.transactions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
});
