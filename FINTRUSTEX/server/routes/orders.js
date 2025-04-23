"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrderById = exports.getOrders = exports.createOrder = void 0;

const createOrder = (req, res) => {
    res.status(200).json({ message: 'Order created successfully' });
};
exports.createOrder = createOrder;

const getOrders = (req, res) => {
    res.status(200).json([]);
};
exports.getOrders = getOrders;

const getOrderById = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id });
};
exports.getOrderById = getOrderById;

const updateOrderStatus = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id, updated: true });
};
exports.updateOrderStatus = updateOrderStatus;