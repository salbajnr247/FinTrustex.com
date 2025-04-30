/**
 * Authentication Middleware
 * Verify JWT tokens and attach user data to requests
 */

const jwt = require('jsonwebtoken');
const { storage } = require('../storage');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authenticate user with JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Attach user data to request object
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if user owns the resource
 * @param {Function} getResourceUserId - Function to get user ID from resource
 * @returns {Function} - Middleware function
 */
exports.isResourceOwner = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get resource owner user ID
      const resourceUserId = await getResourceUserId(req);
      
      // Check if current user is the resource owner or an admin
      if (req.user.id != resourceUserId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
    } catch (error) {
      console.error('Resource owner check middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Verify 2FA status
 * If user has 2FA enabled, check if it has been verified for this session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.verify2FA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get user from database to check 2FA status
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // If user has 2FA enabled, check if it's been verified for this session
    if (user.has2FA) {
      // Check session for 2FA verification flag
      const is2FAVerified = req.session && req.session.twoFactorVerified && 
                            req.session.userId === user.id;
      
      if (!is2FAVerified) {
        return res.status(403).json({ 
          error: 'Two-factor authentication required',
          requires2FA: true
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('2FA verification middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};