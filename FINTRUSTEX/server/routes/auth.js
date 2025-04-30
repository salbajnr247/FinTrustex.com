/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

// Register new user
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Verify token (protected route)
router.get('/verify', authenticate, authController.verifyToken);

// Logout
router.post('/logout', authenticate, authController.logout);

// Password reset request
router.post('/reset-password', authController.requestPasswordReset);

// Reset password with token
router.post('/reset-password/confirm', authController.resetPassword);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

// 2FA Setup (protected routes)
router.post('/2fa/setup', authenticate, authController.setupTwoFactor);
router.post('/2fa/verify', authenticate, authController.verifyTwoFactor);
router.post('/2fa/disable', authenticate, authController.disableTwoFactor);

module.exports = router;