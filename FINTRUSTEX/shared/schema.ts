import { pgTable, serial, text, integer, timestamp, numeric, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Enum for order types
export const orderTypeEnum = pgEnum('order_type', ['buy', 'sell']);

// Enum for order status
export const orderStatusEnum = pgEnum('order_status', ['pending', 'completed', 'cancelled', 'failed']);

// Enum for KYC status
export const kycStatusEnum = pgEnum('kyc_status', ['not_submitted', 'pending', 'approved', 'rejected']);

// Enum for investment package status
export const investmentStatusEnum = pgEnum('investment_status', ['active', 'completed', 'cancelled']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  companyName: text('company_name'),
  role: text('role').default('user'),
  isVerified: boolean('is_verified').default(false),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorMethod: text('two_factor_method').default('email'), // email, sms, app
  phoneNumber: text('phone_number'),
  kycStatus: kycStatusEnum('kyc_status').default('not_submitted'),
  kycDocuments: jsonb('kyc_documents'),
  preferredLanguage: text('preferred_language').default('en'),
  createdAt: timestamp('created_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

// User schema for inserting
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
  kycDocuments: true,
  twoFactorSecret: true,
});

// Wallets table for storing crypto balances
export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  currency: text('currency').notNull(),
  balance: numeric('balance').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Wallet relationships
export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

// Wallet schema for inserting
export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Investment Packages table
export const investmentPackages = pgTable('investment_packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  minimumInvestment: numeric('minimum_investment').notNull(),
  maximumInvestment: numeric('maximum_investment'),
  durationDays: integer('duration_days').notNull(),
  roiPercentage: numeric('roi_percentage').notNull(),
  riskLevel: text('risk_level').notNull(), // low, medium, high
  features: jsonb('features'), // array of features
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Investment Package schema for inserting
export const insertInvestmentPackageSchema = createInsertSchema(investmentPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Investments table
export const userInvestments = pgTable('user_investments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  packageId: integer('package_id').notNull().references(() => investmentPackages.id),
  amount: numeric('amount').notNull(),
  status: investmentStatusEnum('status').default('active'),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  expectedReturn: numeric('expected_return').notNull(),
  actualReturn: numeric('actual_return'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Investment relationships
export const userInvestmentsRelations = relations(userInvestments, ({ one }) => ({
  user: one(users, {
    fields: [userInvestments.userId],
    references: [users.id],
  }),
  package: one(investmentPackages, {
    fields: [userInvestments.packageId],
    references: [investmentPackages.id],
  }),
}));

// User Investment schema for inserting
export const insertUserInvestmentSchema = createInsertSchema(userInvestments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualReturn: true,
  endDate: true,
});

// Trades/Orders table
export const orders = pgTable('orders', {
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
export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

// Order schema for inserting
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// Transactions table (deposits, withdrawals)
export const transactions = pgTable('transactions', {
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
export const transactionsRelations = relations(transactions, ({ one }) => ({
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
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // price_alert, trade_confirmation, login_alert, etc
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  data: jsonb('data'), // additional data specific to notification type
  createdAt: timestamp('created_at').defaultNow(),
});

// Notification relationships
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Notification schema for inserting
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// Type definitions from schemas
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type InvestmentPackage = typeof investmentPackages.$inferSelect;
export type InsertInvestmentPackage = z.infer<typeof insertInvestmentPackageSchema>;

export type UserInvestment = typeof userInvestments.$inferSelect;
export type InsertUserInvestment = z.infer<typeof insertUserInvestmentSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;