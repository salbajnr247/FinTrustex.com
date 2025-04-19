const { pgTable, serial, text, integer, timestamp, numeric, boolean, pgEnum } = require("drizzle-orm/pg-core");
const { createInsertSchema } = require("drizzle-zod");
const { relations } = require("drizzle-orm");
const { z } = require("zod");

// Enum for order types
const orderTypeEnum = pgEnum('order_type', ['buy', 'sell']);

// Enum for order status
const orderStatusEnum = pgEnum('order_status', ['pending', 'completed', 'cancelled', 'failed']);

// Users table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  companyName: text('company_name'),
  role: text('role').default('user'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// User schema for inserting
const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Wallets table for storing crypto balances
const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  currency: text('currency').notNull(),
  balance: numeric('balance').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Wallet relationships
const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

// Wallet schema for inserting
const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Trades/Orders table
const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  type: orderTypeEnum('type').notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  baseCurrency: text('base_currency').notNull(),
  quoteCurrency: text('quote_currency').notNull(),
  amount: numeric('amount').notNull(),
  price: numeric('price').notNull(),
  totalValue: numeric('total_value').notNull(),
  fee: numeric('fee'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Order relationships
const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

// Order schema for inserting
const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// Transactions table (deposits, withdrawals)
const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  walletId: integer('wallet_id').notNull().references(() => wallets.id),
  type: text('type').notNull(), // deposit, withdrawal
  status: text('status').notNull().default('pending'),
  amount: numeric('amount').notNull(),
  currency: text('currency').notNull(),
  txHash: text('tx_hash'), // blockchain transaction hash
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Transaction relationships
const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));

// Transaction schema for inserting
const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

module.exports = {
  orderTypeEnum,
  orderStatusEnum,
  users,
  insertUserSchema,
  wallets,
  walletsRelations,
  insertWalletSchema,
  orders,
  ordersRelations,
  insertOrderSchema,
  transactions,
  transactionsRelations,
  insertTransactionSchema
};