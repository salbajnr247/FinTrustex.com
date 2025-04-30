/**
 * Authentication Controller
 * Handles authentication logic for the application
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { storage } = require('../storage');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Token expiry
const TOKEN_EXPIRY = '24h';

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Validate request
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if username or email already exists
    const existingUser = await storage.getUserByUsername(username) || 
                         await storage.getUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      passwordHash,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'user',
      status: 'active',
      has2FA: false,
      twoFactorSecret: null,
      kycStatus: 'pending'
    });
    
    // Create default wallet for user
    await storage.createWallet({
      userId: user.id,
      currency: 'BTC',
      address: 'pending',
      balance: '0.00000000',
      status: 'active'
    });
    
    await storage.createWallet({
      userId: user.id,
      currency: 'ETH',
      address: 'pending',
      balance: '0.00000000',
      status: 'active'
    });
    
    await storage.createWallet({
      userId: user.id,
      currency: 'USDT',
      address: 'pending',
      balance: '0.00000000',
      status: 'active'
    });
    
    // Create notification welcoming the user
    await storage.createNotification({
      userId: user.id,
      title: 'Welcome to FinTrustEX',
      message: 'Thank you for joining FinTrustEX. Start trading now!',
      type: 'info',
      isRead: false
    });
    
    // Return success response
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate request
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user by username or email
    const user = await storage.getUserByUsername(username) || 
                 await storage.getUserByEmail(username);
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (user.status === 'inactive') {
      return res.status(401).json({ error: 'Account is inactive' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = generateToken(user);
    
    // Create user object to return (without sensitive data)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      has2FA: user.has2FA,
      kycStatus: user.kycStatus
    };
    
    // If user has 2FA enabled, don't return token yet
    if (user.has2FA) {
      return res.json({ 
        user: userResponse,
        requires2FA: true
      });
    }
    
    // Record login activity
    await logActivity(user.id, 'login', req.ip);
    
    // Return token and user data
    res.json({ 
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Verify token
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Get user from database
      const user = await storage.getUser(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      if (user.status === 'inactive') {
        return res.status(401).json({ error: 'Account is inactive' });
      }
      
      // Generate new token
      const newToken = generateToken(user);
      
      res.json({ token: newToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyToken = (req, res) => {
  // Authentication middleware already verified the token
  // Just return success response with user data from middleware
  res.json({ 
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = async (req, res) => {
  try {
    // Record logout activity
    await logActivity(req.user.id, 'logout', req.ip);
    
    // In a stateless JWT system, the client simply discards the token
    // We could implement a token blacklist for more security
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    // Don't reveal if email exists or not for security
    if (!user) {
      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }
    
    // Generate reset token (for production, use a more secure method)
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    
    // Store reset token (would typically be stored in database with expiration)
    // For this demo, we'll log it to console
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    // In a real application, send email with reset link
    // sendResetEmail(email, resetToken);
    
    res.json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reset password with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Verify token (would typically check against database)
    // For this demo, we'll assume the token is valid
    
    // In a real application, get the user associated with the token
    // const user = await getUserByResetToken(token);
    
    // Update password
    // const salt = await bcrypt.genSalt(10);
    // const passwordHash = await bcrypt.hash(newPassword, salt);
    // await updateUserPassword(user.id, passwordHash);
    
    // Log password reset (for demo purposes)
    console.log(`Password reset completed with token: ${token}`);
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Verify token (would typically check against database)
    // For this demo, we'll assume the token is valid
    
    // In a real application, get the user associated with the token
    // const user = await getUserByEmailVerificationToken(token);
    // await updateUserEmailVerification(user.id, true);
    
    // Log email verification (for demo purposes)
    console.log(`Email verification completed with token: ${token}`);
    
    res.json({ message: 'Email has been verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Setup two-factor authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.setupTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `FinTrustEX:${req.user.email}`
    });
    
    // Store temporary secret for later verification
    // In a real application, this would be stored in a database or session
    req.session = req.session || {};
    req.session.tempSecret = secret.base32;
    
    // Create OTP auth URL for QR code
    const otpauth_url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `FinTrustEX:${req.user.email}`,
      issuer: 'FinTrustEX'
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauth_url);
    
    res.json({
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup two-factor authentication' });
  }
};

/**
 * Verify two-factor authentication during setup
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyTwoFactor = async (req, res) => {
  try {
    const { code, secret } = req.body;
    const userId = req.user.id;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    
    // Get the temporary secret from the session
    // In a real application, this would come from a database or session
    const tempSecret = secret || (req.session && req.session.tempSecret);
    
    if (!tempSecret) {
      return res.status(400).json({ error: 'No two-factor secret found' });
    }
    
    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 30 seconds of clock skew
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Save the secret to the user's profile
    // await storage.updateUser(userId, {
    //   has2FA: true,
    //   twoFactorSecret: tempSecret
    // });
    
    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes();
    
    // Save recovery codes (would be stored in database)
    // await storeRecoveryCodes(userId, recoveryCodes);
    
    // Clear the temporary secret from the session
    if (req.session) {
      req.session.tempSecret = null;
    }
    
    // Log activity
    await logActivity(userId, '2fa_setup', req.ip);
    
    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      recoveryCodes
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Failed to verify two-factor authentication' });
  }
};

/**
 * Disable two-factor authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.disableTwoFactor = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    
    // Get the user's 2FA secret
    // const user = await storage.getUser(userId);
    // const secret = user.twoFactorSecret;
    
    // For demo, use a mock secret
    const secret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';
    
    // Verify the code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Update user to disable 2FA
    // await storage.updateUser(userId, {
    //   has2FA: false,
    //   twoFactorSecret: null
    // });
    
    // Delete recovery codes
    // await deleteRecoveryCodes(userId);
    
    // Log activity
    await logActivity(userId, '2fa_disable', req.ip);
    
    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable two-factor authentication' });
  }
};

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Generate recovery codes
 * @param {number} count - Number of codes to generate
 * @returns {Array} - Array of recovery codes
 */
function generateRecoveryCodes(count = 8) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random code in the format XXXX-XXXX-XXXX-XXXX
    const segments = [];
    
    for (let j = 0; j < 4; j++) {
      // Each segment is 4 characters of alphanumeric
      const segment = Math.random().toString(36).substring(2, 6).toUpperCase();
      segments.push(segment);
    }
    
    codes.push(segments.join('-'));
  }
  
  return codes;
}

/**
 * Log user activity
 * @param {number} userId - User ID
 * @param {string} type - Activity type
 * @param {string} ipAddress - IP address
 */
async function logActivity(userId, type, ipAddress) {
  try {
    // In a real application, this would be stored in the database
    console.log(`Activity log: User ${userId} - ${type} - ${ipAddress}`);
  } catch (error) {
    console.error('Activity log error:', error);
  }
}