"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getUsers = exports.createUser = void 0;
const storage_1 = require("../storage");
const schema_1 = require("../../shared/schema");
const zod_1 = require("zod");
// Create a new user
const createUser = async (req, res) => {
    try {
        // Validate request body
        const userData = schema_1.insertUserSchema.parse(req.body);
        // Check if user with same username or email already exists
        const existingUserByUsername = await storage_1.storage.getUserByUsername(userData.username);
        if (existingUserByUsername) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const existingUserByEmail = await storage_1.storage.getUserByEmail(userData.email);
        if (existingUserByEmail) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        // Create user
        const user = await storage_1.storage.createUser(userData);
        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.createUser = createUser;
// Get all users
const getUsers = async (req, res) => {
    try {
        // In a real application, we would implement pagination and filtering
        // but for simplicity, we'll just return all users for now
        // This is a simplified implementation. In a real application,
        // we would add a method in the storage interface to get all users
        // and implement it in the DatabaseStorage class.
        // For now, we'll just return a message
        res.status(200).json({ message: 'Get all users endpoint' });
    }
    catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getUsers = getUsers;
// Get user by ID
const getUserById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const user = await storage_1.storage.getUser(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getUserById = getUserById;
