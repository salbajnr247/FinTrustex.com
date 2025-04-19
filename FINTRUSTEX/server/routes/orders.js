const { storage } = require('../storage');
const { insertOrderSchema } = require('../../shared/schema');
const { z } = require('zod');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    // Validate request body
    const orderData = insertOrderSchema.parse(req.body);
    
    // Check if user exists
    const user = await storage.getUser(orderData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create order
    const order = await storage.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get orders (all or filtered by userId)
exports.getOrders = async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    
    if (userId) {
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get orders for user
      const orders = await storage.getOrdersByUserId(userId);
      return res.status(200).json(orders);
    }
    
    // In a real app, we would implement a getAll method in the storage
    // For now, just return a message
    res.status(200).json({ message: 'Get all orders endpoint' });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // Validate request body
    const schema = z.object({
      status: z.enum(['pending', 'completed', 'cancelled', 'failed'])
    });
    
    const { status } = schema.parse(req.body);
    
    // Check if order exists
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order status
    const updatedOrder = await storage.updateOrderStatus(id, status);
    res.status(200).json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};