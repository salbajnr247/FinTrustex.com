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

// Account status enum
export const accountStatusEnum = pgEnum('account_status', ['active', 'restricted', 'suspended']);

// Ticket status enum
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'pending', 'closed']);

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
  isAdmin: boolean('is_admin').default(false),
  accountStatus: accountStatusEnum('account_status').default('active'),
  restrictionReason: text('restriction_reason'),
  restrictedAt: timestamp('restricted_at'),
  restrictedBy: integer('restricted_by'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorMethod: text('two_factor_method').default('email'), // email, sms, app
  phoneNumber: text('phone_number'),
  kycStatus: kycStatusEnum('kyc_status').default('not_submitted'),
  kycDocuments: jsonb('kyc_documents'),
  preferredLanguage: text('preferred_language').default('en'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  // Binance API credentials (encrypted in production)
  binanceApiKey: text('binance_api_key'),
  binanceApiSecret: text('binance_api_secret'),
  binanceEnabled: boolean('binance_enabled').default(false),
  binanceTestnet: boolean('binance_testnet').default(true),
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
  price: numeric('price'),  // Can be null for market orders
  totalValue: numeric('total_value'),
  fee: numeric('fee'),
  // Binance API specific fields
  symbol: text('symbol'),  // Combined currency pair (e.g., 'BTCUSDT')
  side: text('side'),  // 'buy' or 'sell'
  externalOrderId: text('external_order_id'),  // Order ID returned by Binance
  externalData: jsonb('external_data'),  // Full order data from Binance
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
  method: text('method'), // bank, crypto, card, etc.
  txHash: text('tx_hash'), // blockchain transaction hash
  description: text('description'),
  metadata: jsonb('metadata'), // Additional data (bank details, crypto addresses, fees, etc.)
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

// Admin Logs table for audit trail
export const adminLogs = pgTable('admin_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').notNull().references(() => users.id),
  action: text('action').notNull(), // withdrawal_approve, withdrawal_reject, user_restrict, etc.
  targetId: text('target_id').notNull(), // ID of the affected resource (transaction ID, user ID, etc.)
  details: jsonb('details'), // Additional information about the action
  timestamp: timestamp('timestamp').defaultNow(),
});

// Admin Logs relationships
export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminLogs.adminId],
    references: [users.id],
  }),
}));

// Admin Logs schema for inserting
export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  timestamp: true,
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;

// Account Restrictions History table
export const accountRestrictions = pgTable('account_restrictions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  adminId: integer('admin_id').notNull().references(() => users.id),
  actionType: text('action_type').notNull(), // restrict, unrestrict
  status: text('status').notNull(), // active, restricted, suspended
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Account Restrictions relationships
export const accountRestrictionsRelations = relations(accountRestrictions, ({ one }) => ({
  user: one(users, {
    fields: [accountRestrictions.userId],
    references: [users.id],
  }),
  admin: one(users, {
    fields: [accountRestrictions.adminId],
    references: [users.id],
    relationName: 'admin_user'
  }),
}));

// Account Restrictions schema for inserting
export const insertAccountRestrictionSchema = createInsertSchema(accountRestrictions).omit({
  id: true,
  createdAt: true,
});

export type AccountRestriction = typeof accountRestrictions.$inferSelect;
export type InsertAccountRestriction = z.infer<typeof insertAccountRestrictionSchema>;

// Support Tickets table
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // account, deposit, withdrawal, trading, security, etc.
  priority: text('priority').notNull().default('medium'), // low, medium, high
  status: ticketStatusEnum('status').default('open'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  closedAt: timestamp('closed_at'),
});

// Support Ticket relationships
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  replies: many(ticketReplies),
}));

// Support Ticket schema for inserting
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

// Ticket Replies table
export const ticketReplies = pgTable('ticket_replies', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => supportTickets.id),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Ticket Reply relationships
export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketReplies.ticketId],
    references: [supportTickets.id],
  }),
  user: one(users, {
    fields: [ticketReplies.userId],
    references: [users.id],
  }),
}));

// Ticket Reply schema for inserting
export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({
  id: true,
  createdAt: true,
});

// FAQ Categories table
export const faqCategories = pgTable('faq_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// FAQ Category schema for inserting
export const insertFaqCategorySchema = createInsertSchema(faqCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// FAQs table
export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => faqCategories.id),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  isPublished: boolean('is_published').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// FAQ relationships
export const faqsRelations = relations(faqs, ({ one }) => ({
  category: one(faqCategories, {
    fields: [faqs.categoryId],
    references: [faqCategories.id],
  }),
}));

// FAQ schema for inserting
export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions for support system
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type TicketReply = typeof ticketReplies.$inferSelect;
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;

export type FaqCategory = typeof faqCategories.$inferSelect;
export type InsertFaqCategory = z.infer<typeof insertFaqCategorySchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;