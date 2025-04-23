"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWalletBalance = exports.getWalletById = exports.getWallets = exports.createWallet = void 0;

const createWallet = (req, res) => {
    res.status(200).json({ message: 'Wallet created successfully' });
};
exports.createWallet = createWallet;

const getWallets = (req, res) => {
    res.status(200).json([]);
};
exports.getWallets = getWallets;

const getWalletById = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id });
};
exports.getWalletById = getWalletById;

const updateWalletBalance = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id, updated: true });
};
exports.updateWalletBalance = updateWalletBalance;