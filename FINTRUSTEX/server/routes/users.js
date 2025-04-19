const { storage } = require('../storage');
const { insertUserSchema } = require('../../shared/schema');
const { z } = require('zod');

// Create a new user
exports.createUser = async (req, res) => {
  try {
    // Validate request body
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user with same username or email already exists
    const existingUserByUsername = await storage.getUserByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create user
    const user = await storage.createUser(userData);
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    // In a real application, we would implement pagination and filtering
    // but for simplicity, we'll just return all users for now
    
    // This is a simplified implementation. In a real application,
    // we would add a method in the storage interface to get all users
    // and implement it in the DatabaseStorage class.
    
    // For now, we'll just return a message
    res.status(200).json({ message: 'Get all users endpoint' });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};