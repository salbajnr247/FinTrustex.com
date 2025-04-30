/**
 * Security Routes
 * Handles all security-related endpoints including 2FA and password management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// Get security settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    // In a real application, retrieve settings from database
    // For now, return mock data based on the authenticated user
    const userId = req.user.id;
    
    // TODO: Get user security settings from database
    const securitySettings = {
      has2FA: req.user.has2FA || false,
      lastPasswordChange: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      sessions: [
        {
          id: 1,
          device: 'Chrome on Windows',
          ipAddress: req.ip,
          lastActive: new Date().toISOString(),
          current: true
        }
      ]
    };
    
    res.json(securitySettings);
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve security settings' });
  }
});

// 2FA Setup - Generate secret and QR code
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate a new secret
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `FinTrustEX:${req.user.email}`
    });
    
    // TODO: Store the temporary secret in the database or session
    // For now, we'll just return it to the client
    
    // Generate QR code URL
    const otpauth_url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `FinTrustEX:${req.user.email}`,
      issuer: 'FinTrustEX'
    });
    
    // Generate QR code as data URL
    const qrCodeUrl = await new Promise((resolve, reject) => {
      QRCode.toDataURL(otpauth_url, (err, data_url) => {
        if (err) {
          reject(err);
        } else {
          resolve(data_url);
        }
      });
    });
    
    res.json({
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup two-factor authentication' });
  }
});

// 2FA Verification - Verify token and enable 2FA
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { code, secret } = req.body;
    
    if (!code || !secret) {
      return res.status(400).json({ error: 'Verification code and secret are required' });
    }
    
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 30 seconds of clock skew
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // TODO: Save the secret to the user's record in the database
    // For now we'll just return success
    
    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes();
    
    // TODO: Store recovery codes in the database
    
    res.json({
      success: true,
      recoveryCodes
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Failed to verify two-factor authentication' });
  }
});

// 2FA Login Verification
router.post('/2fa/login', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and verification code are required' });
    }
    
    // TODO: Get user's 2FA secret from database
    // For testing, use a mock secret
    const mockSecret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD'; // This would come from the database
    
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: mockSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 30 seconds of clock skew
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ error: 'Failed to verify two-factor authentication' });
  }
});

// 2FA Disable
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    
    // TODO: Get user's 2FA secret from database
    // For testing, use a mock secret
    const mockSecret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD'; // This would come from the database
    
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: mockSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 30 seconds of clock skew
    });
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // TODO: Remove 2FA from user's record in the database
    
    res.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable two-factor authentication' });
  }
});

// 2FA Recovery
router.post('/2fa/recovery', async (req, res) => {
  try {
    const { userId, recoveryCode } = req.body;
    
    if (!userId || !recoveryCode) {
      return res.status(400).json({ error: 'User ID and recovery code are required' });
    }
    
    // TODO: Verify recovery code from database
    // For testing, use mock recovery codes
    const mockRecoveryCodes = [
      'ABCD-EFGH-IJKL-MNOP',
      '1234-5678-90AB-CDEF'
    ]; // This would come from the database
    
    const isValidCode = mockRecoveryCodes.includes(recoveryCode);
    
    if (!isValidCode) {
      return res.status(400).json({ error: 'Invalid recovery code' });
    }
    
    // TODO: Mark recovery code as used in database
    
    res.json({ success: true });
  } catch (error) {
    console.error('2FA recovery error:', error);
    res.status(500).json({ error: 'Failed to process recovery code' });
  }
});

// Update password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // TODO: Get user from database
    // For now, we'll use a mock user
    const mockUser = {
      id: req.user.id,
      passwordHash: '$2a$10$X7LbLlLKlHYbAAHt3aJH9ut8S3CsNIALKHDsJHNgBxgF4OUO.SdYu' // adminpass
    };
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, mockUser.passwordHash);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    // TODO: Update password in database
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Get activity log
router.get('/activity-log', authenticate, async (req, res) => {
  try {
    // TODO: Get activity log from database for the authenticated user
    // For now, return mock data
    const activities = [
      {
        id: 1,
        type: 'login',
        description: 'Successful login',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        ipAddress: req.ip
      },
      {
        id: 2,
        type: 'password_change',
        description: 'Password changed',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        ipAddress: '192.168.1.1'
      },
      {
        id: 3,
        type: 'login',
        description: 'Login from new device',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        ipAddress: '10.0.0.1'
      }
    ];
    
    res.json(activities);
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity log' });
  }
});

// Logout all other sessions
router.post('/logout-sessions', authenticate, async (req, res) => {
  try {
    // TODO: Invalidate all other sessions for the authenticated user
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout sessions error:', error);
    res.status(500).json({ error: 'Failed to logout sessions' });
  }
});

// Generate recovery codes
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

module.exports = router;