/**
 * Database Schema for FinTrustEX
 */

const { pgTable, serial, text, timestamp, numeric, boolean, json, unique } = require('drizzle-orm/pg-core');

// Users table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  displayName: text('display_name'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  kycStatus: text('kyc_status').default('not_submitted').notNull(), // not_submitted, pending, approved, rejected
  accountStatus: text('account_status').default('active').notNull(), // active, restricted, suspended
  restrictionReason: text('restriction_reason'),
  restrictedAt: timestamp('restricted_at'),
  restrictedBy: serial('restricted_by').references(() => users.id),
  preferences: json('preferences'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  twoFactorSecret: text('two_factor_secret'),
  createdAt: timestamp('created_at').notNull()
});

// Wallets table
const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  currency: text('currency').notNull(), // USD, BTC, ETH, etc.
  balance: text('balance').notNull().default('0'),
  address: text('address'), // For crypto wallets
  createdAt: timestamp('created_at').notNull()
}, (table) => {
  return {
    // Ensure a user can only have one wallet per currency
    userCurrencyUnique: unique().on(table.userId, table.currency)
  };
});

// Orders table
const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // market, limit
  side: text('side').notNull(), // buy, sell
  symbol: text('symbol').notNull(), // BTC/USD, ETH/USD, etc.
  amount: numeric('amount').notNull(),
  price: numeric('price'),
  total: numeric('total'),
  status: text('status').notNull(), // pending, completed, cancelled
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at')
});

// Transactions table
const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  walletId: serial('wallet_id').references(() => wallets.id),
  type: text('type').notNull(), // deposit, withdrawal, transfer
  amount: numeric('amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(), // pending, completed, failed, cancelled
  method: text('method'), // card, crypto, bank, etc.
  externalId: text('external_id'), // Transaction ID from payment provider
  metadata: json('metadata'), // Additional data
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at')
});

// KYC table
const kyc = pgTable('kyc', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  verificationId: text('verification_id').notNull().unique(),
  status: text('status').notNull(), // pending, approved, rejected
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dob: text('dob').notNull(), // Date of birth (YYYY-MM-DD)
  nationality: text('nationality').notNull(),
  phone: text('phone').notNull(),
  idType: text('id_type').notNull(), // passport, id-card, drivers-license
  documents: json('documents').notNull(), // Paths to documents
  address: json('address').notNull(), // Address information
  documentType: text('document_type'), // utility, bank, tax
  feedback: text('feedback'), // Admin feedback if rejected
  submittedAt: timestamp('submitted_at').notNull(),
  updatedAt: timestamp('updated_at')
});

// Session tokens table
const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull()
});

// API keys table
const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  secret: text('secret').notNull(),
  permissions: json('permissions'), // Read, trade, withdraw, etc.
  createdAt: timestamp('created_at').notNull(),
  lastUsedAt: timestamp('last_used_at')
});

// Account restrictions history
const accountRestrictions = pgTable('account_restrictions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id).notNull(),
  actionType: text('action_type').notNull(), // restrict, unrestrict
  status: text('status').notNull(), // active, restricted, suspended
  reason: text('reason'),
  adminId: serial('admin_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').notNull()
});

module.exports = {
  users,
  wallets,
  orders,
  transactions,
  kyc,
  sessions,
  apiKeys,
  accountRestrictions
};