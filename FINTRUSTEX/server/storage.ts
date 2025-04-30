import { 
  users, wallets, orders, transactions, investmentPackages, userInvestments, notifications, kycStatusEnum,
  type User, type InsertUser,
  type Wallet, type InsertWallet,
  type Order, type InsertOrder,
  type Transaction, type InsertTransaction,
  type InvestmentPackage, type InsertInvestmentPackage,
  type UserInvestment, type InsertUserInvestment,
  type Notification, type InsertNotification
} from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserLanguage(id: number, language: string): Promise<User>;
  updateUserKycStatus(id: number, status: typeof kycStatusEnum.enumValues[number]): Promise<User>;
  
  // Wallet methods
  getWallet(id: number): Promise<Wallet | undefined>;
  getWalletsByUserId(userId: number): Promise<Wallet[]>;
  getWalletByUserIdAndCurrency(userId: number, currency: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(id: number, newBalance: string): Promise<Wallet>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: 'pending' | 'completed' | 'cancelled' | 'failed'): Promise<Order>;
  
  // Transaction methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getTransactionsByWalletId(walletId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction>;
  
  // Investment Package methods
  getInvestmentPackage(id: number): Promise<InvestmentPackage | undefined>;
  getAllInvestmentPackages(activeOnly?: boolean): Promise<InvestmentPackage[]>;
  createInvestmentPackage(pkg: InsertInvestmentPackage): Promise<InvestmentPackage>;
  updateInvestmentPackage(id: number, updates: Partial<InvestmentPackage>): Promise<InvestmentPackage>;
  toggleInvestmentPackageStatus(id: number, isActive: boolean): Promise<InvestmentPackage>;
  
  // User Investment methods
  getUserInvestment(id: number): Promise<UserInvestment | undefined>;
  getUserInvestmentsByUserId(userId: number): Promise<UserInvestment[]>;
  createUserInvestment(investment: InsertUserInvestment): Promise<UserInvestment>;
  updateUserInvestmentStatus(id: number, status: 'active' | 'completed' | 'cancelled'): Promise<UserInvestment>;
  completeUserInvestment(id: number, actualReturn: string): Promise<UserInvestment>;
  
  // Notification methods
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  getUnreadNotificationsByUserId(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async updateUserLanguage(id: number, language: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ preferredLanguage: language })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async updateUserKycStatus(id: number, status: typeof kycStatusEnum.enumValues[number]): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ kycStatus: status })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Wallet methods
  async getWallet(id: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet || undefined;
  }

  async getWalletsByUserId(userId: number): Promise<Wallet[]> {
    return await db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async getWalletByUserIdAndCurrency(userId: number, currency: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(
      and(
        eq(wallets.userId, userId),
        eq(wallets.currency, currency)
      )
    );
    return wallet || undefined;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db
      .insert(wallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async updateWalletBalance(id: number, newBalance: string): Promise<Wallet> {
    const [updatedWallet] = await db
      .update(wallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, id))
      .returning();
    return updatedWallet;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: 'pending' | 'completed' | 'cancelled' | 'failed'): Promise<Order> {
    const now = new Date();
    const updates: any = { 
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
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId));
  }

  async getTransactionsByWalletId(walletId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.walletId, walletId));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction> {
    const now = new Date();
    const updates: any = { 
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
  
  // Investment Package methods
  async getInvestmentPackage(id: number): Promise<InvestmentPackage | undefined> {
    const [investmentPackage] = await db.select().from(investmentPackages).where(eq(investmentPackages.id, id));
    return investmentPackage || undefined;
  }
  
  async getAllInvestmentPackages(activeOnly: boolean = false): Promise<InvestmentPackage[]> {
    if (activeOnly) {
      return await db.select().from(investmentPackages).where(eq(investmentPackages.isActive, true));
    }
    return await db.select().from(investmentPackages);
  }
  
  async createInvestmentPackage(pkg: InsertInvestmentPackage): Promise<InvestmentPackage> {
    const [newPackage] = await db
      .insert(investmentPackages)
      .values(pkg)
      .returning();
    return newPackage;
  }
  
  async updateInvestmentPackage(id: number, updates: Partial<InvestmentPackage>): Promise<InvestmentPackage> {
    const [updatedPackage] = await db
      .update(investmentPackages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(investmentPackages.id, id))
      .returning();
    return updatedPackage;
  }
  
  async toggleInvestmentPackageStatus(id: number, isActive: boolean): Promise<InvestmentPackage> {
    const [updatedPackage] = await db
      .update(investmentPackages)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(investmentPackages.id, id))
      .returning();
    return updatedPackage;
  }
  
  // User Investment methods
  async getUserInvestment(id: number): Promise<UserInvestment | undefined> {
    const [userInvestment] = await db.select().from(userInvestments).where(eq(userInvestments.id, id));
    return userInvestment || undefined;
  }
  
  async getUserInvestmentsByUserId(userId: number): Promise<UserInvestment[]> {
    return await db.select().from(userInvestments).where(eq(userInvestments.userId, userId));
  }
  
  async createUserInvestment(investment: InsertUserInvestment): Promise<UserInvestment> {
    const [newInvestment] = await db
      .insert(userInvestments)
      .values(investment)
      .returning();
    return newInvestment;
  }
  
  async updateUserInvestmentStatus(id: number, status: 'active' | 'completed' | 'cancelled'): Promise<UserInvestment> {
    const [updatedInvestment] = await db
      .update(userInvestments)
      .set({ status, updatedAt: new Date() })
      .where(eq(userInvestments.id, id))
      .returning();
    return updatedInvestment;
  }
  
  async completeUserInvestment(id: number, actualReturn: string): Promise<UserInvestment> {
    const now = new Date();
    const [completedInvestment] = await db
      .update(userInvestments)
      .set({ 
        status: 'completed', 
        actualReturn, 
        endDate: now,
        updatedAt: now 
      })
      .where(eq(userInvestments.id, id))
      .returning();
    return completedInvestment;
  }
  
  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }
  
  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
  }
  
  async getUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();