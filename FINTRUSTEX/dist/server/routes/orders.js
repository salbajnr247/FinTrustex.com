"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrderById = exports.getOrders = exports.createOrder = void 0;
const storage_1 = require("../storage");
const schema_1 = require("../../shared/schema");
const zod_1 = require("zod");
// Create a new order
const createOrder = async (req, res) => {
    try {
        // Validate request body
        const orderData = schema_1.insertOrderSchema.parse(req.body);
        // Check if user exists
        const user = await storage_1.storage.getUser(orderData.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Create order
        const order = await storage_1.storage.createOrder(orderData);
        res.status(201).json(order);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createOrder = createOrder;
// Get orders (all or filtered by userId)
const getOrders = async (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : undefined;
        if (userId) {
            // Check if user exists
            const user = await storage_1.storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Get orders for user
            const orders = await storage_1.storage.getOrdersByUserId(userId);
            return res.status(200).json(orders);
        }
        // In a real app, we would implement a getAll method in the storage
        // For now, just return a message
        res.status(200).json({ message: 'Get all orders endpoint' });
    }
    catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getOrders = getOrders;
// Get order by ID
const getOrderById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        const order = await storage_1.storage.getOrder(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(200).json(order);
    }
    catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getOrderById = getOrderById;
// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        // Validate request body
        const schema = zod_1.z.object({
            status: zod_1.z.enum(['pending', 'completed', 'cancelled', 'failed'])
        });
        const { status } = schema.parse(req.body);
        // Check if order exists
        const order = await storage_1.storage.getOrder(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Update order status
        const updatedOrder = await storage_1.storage.updateOrderStatus(id, status);
        res.status(200).json(updatedOrder);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
