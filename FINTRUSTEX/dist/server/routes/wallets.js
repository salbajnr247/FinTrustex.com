"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWalletBalance = exports.getWalletById = exports.getWallets = exports.createWallet = void 0;
const storage_1 = require("../storage");
const schema_1 = require("../../shared/schema");
const zod_1 = require("zod");
// Create a new wallet
const createWallet = async (req, res) => {
    try {
        // Validate request body
        const walletData = schema_1.insertWalletSchema.parse(req.body);
        // Check if user exists
        const user = await storage_1.storage.getUser(walletData.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if wallet with same currency already exists for this user
        const existingWallet = await storage_1.storage.getWalletByUserIdAndCurrency(walletData.userId, walletData.currency);
        if (existingWallet) {
            return res.status(400).json({
                error: `Wallet for ${walletData.currency} already exists for this user`
            });
        }
        // Create wallet
        const wallet = await storage_1.storage.createWallet(walletData);
        res.status(201).json(wallet);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating wallet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createWallet = createWallet;
// Get wallets (all or filtered by userId)
const getWallets = async (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : undefined;
        if (userId) {
            // Check if user exists
            const user = await storage_1.storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Get wallets for user
            const wallets = await storage_1.storage.getWalletsByUserId(userId);
            return res.status(200).json(wallets);
        }
        // In a real app, we would implement a getAll method in the storage
        // For now, just return a message
        res.status(200).json({ message: 'Get all wallets endpoint' });
    }
    catch (error) {
        console.error('Error getting wallets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getWallets = getWallets;
// Get wallet by ID
const getWalletById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid wallet ID' });
        }
        const wallet = await storage_1.storage.getWallet(id);
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        res.status(200).json(wallet);
    }
    catch (error) {
        console.error('Error getting wallet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getWalletById = getWalletById;
// Update wallet balance
const updateWalletBalance = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid wallet ID' });
        }
        // Validate request body
        const schema = zod_1.z.object({
            balance: zod_1.z.string().refine(val => !isNaN(Number(val)), {
                message: 'Balance must be a valid numeric string'
            })
        });
        const { balance } = schema.parse(req.body);
        // Check if wallet exists
        const wallet = await storage_1.storage.getWallet(id);
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        // Update wallet balance
        const updatedWallet = await storage_1.storage.updateWalletBalance(id, balance);
        res.status(200).json(updatedWallet);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error updating wallet balance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateWalletBalance = updateWalletBalance;
