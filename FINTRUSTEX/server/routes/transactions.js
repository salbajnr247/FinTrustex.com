"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransactionStatus = exports.getTransactionById = exports.getTransactions = exports.createTransaction = void 0;

const createTransaction = (req, res) => {
    res.status(200).json({ message: 'Transaction created successfully' });
};
exports.createTransaction = createTransaction;

const getTransactions = (req, res) => {
    res.status(200).json([]);
};
exports.getTransactions = getTransactions;

const getTransactionById = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id });
};
exports.getTransactionById = getTransactionById;

const updateTransactionStatus = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id, updated: true });
};
exports.updateTransactionStatus = updateTransactionStatus;