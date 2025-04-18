"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransactionStatus = exports.getTransactionById = exports.getTransactions = exports.createTransaction = void 0;
const storage_1 = require("../storage");
const schema_1 = require("../../shared/schema");
const zod_1 = require("zod");
// Create a new transaction
const createTransaction = async (req, res) => {
    try {
        // Validate request body
        const transactionData = schema_1.insertTransactionSchema.parse(req.body);
        // Check if user exists
        const user = await storage_1.storage.getUser(transactionData.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if wallet exists
        const wallet = await storage_1.storage.getWallet(transactionData.walletId);
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        // Ensure wallet belongs to user
        if (wallet.userId !== transactionData.userId) {
            return res.status(403).json({ error: 'Wallet does not belong to user' });
        }
        // Create transaction
        const transaction = await storage_1.storage.createTransaction(transactionData);
        res.status(201).json(transaction);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createTransaction = createTransaction;
// Get transactions (all, filtered by userId, or filtered by walletId)
const getTransactions = async (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : undefined;
        const walletId = req.query.walletId ? Number(req.query.walletId) : undefined;
        if (userId) {
            // Check if user exists
            const user = await storage_1.storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Get transactions for user
            const transactions = await storage_1.storage.getTransactionsByUserId(userId);
            return res.status(200).json(transactions);
        }
        if (walletId) {
            // Check if wallet exists
            const wallet = await storage_1.storage.getWallet(walletId);
            if (!wallet) {
                return res.status(404).json({ error: 'Wallet not found' });
            }
            // Get transactions for wallet
            const transactions = await storage_1.storage.getTransactionsByWalletId(walletId);
            return res.status(200).json(transactions);
        }
        // In a real app, we would implement a getAll method in the storage
        // For now, just return a message
        res.status(200).json({ message: 'Get all transactions endpoint' });
    }
    catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getTransactions = getTransactions;
// Get transaction by ID
const getTransactionById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid transaction ID' });
        }
        const transaction = await storage_1.storage.getTransaction(id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.status(200).json(transaction);
    }
    catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getTransactionById = getTransactionById;
// Update transaction status
const updateTransactionStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid transaction ID' });
        }
        // Validate request body
        const schema = zod_1.z.object({
            status: zod_1.z.string().min(1)
        });
        const { status } = schema.parse(req.body);
        // Check if transaction exists
        const transaction = await storage_1.storage.getTransaction(id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        // Update transaction status
        const updatedTransaction = await storage_1.storage.updateTransactionStatus(id, status);
        res.status(200).json(updatedTransaction);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error updating transaction status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateTransactionStatus = updateTransactionStatus;
