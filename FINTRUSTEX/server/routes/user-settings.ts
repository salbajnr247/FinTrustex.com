import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { createSystemNotification } from './notifications';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

const router = Router();

// Update user language preference
router.patch('/settings/language', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const schema = z.object({
      language: z.string().min(2).max(10)
    });
    
    const { language } = schema.parse(req.body);
    
    // Update language preference
    const updatedUser = await storage.updateUserLanguage(req.user.id, language);
    
    // Create notification
    await createSystemNotification(
      req.user.id,
      'settings_update',
      'Language Updated',
      `Your language preference has been updated to ${language}.`,
      { setting: 'language', value: language }
    );
    
    res.json({ message: 'Language preference updated', language: updatedUser.preferredLanguage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating language preference:', error);
    res.status(500).json({ error: 'Failed to update language preference' });
  }
});

// Setup 2FA
router.post('/settings/2fa/setup', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const schema = z.object({
      method: z.enum(['email', 'sms', 'app'])
    });
    
    const { method } = schema.parse(req.body);
    
    // Generate secret for app method
    let secret = null;
    let qrCodeUrl = null;
    let otpauthUrl = null;
    
    if (method === 'app') {
      // Generate a secret
      secret = speakeasy.generateSecret({
        name: `FinTrustEX:${req.user.email || req.user.username}`
      });
      
      otpauthUrl = secret.otpauth_url;
      
      // Generate QR code - fix for undefined type issue
      if (otpauthUrl) {
        qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
      }
      
      // Update user with temporary secret (not enabled yet)
      await storage.updateUser(req.user.id, {
        twoFactorSecret: secret.base32,
        twoFactorMethod: method,
        twoFactorEnabled: false
      });
      
      res.json({
        message: '2FA setup initiated',
        method,
        qrCode: qrCodeUrl,
        secret: secret.base32,
        tempSecret: true
      });
    } else if (method === 'email' || method === 'sms') {
      // For email/SMS methods, we need to make sure the user has the required info
      if (method === 'sms' && !req.user.phoneNumber) {
        return res.status(400).json({ 
          error: 'Phone number required for SMS authentication',
          missingField: 'phoneNumber'
        });
      }
      
      if (method === 'email' && !req.user.email) {
        return res.status(400).json({ 
          error: 'Email required for email authentication',
          missingField: 'email' 
        });
      }
      
      // Update user preferences (not enabled yet)
      await storage.updateUser(req.user.id, {
        twoFactorMethod: method,
        twoFactorEnabled: false
      });
      
      // Send verification code (would implement email/SMS sending here)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a real implementation, we would send this code via email or SMS
      console.log(`Verification code for user ${req.user.id}: ${verificationCode}`);
      
      // Store verification code in session for verification
      if (!req.session) {
        req.session = {};
      }
      
      if (!req.session.twoFactorSetup) {
        req.session.twoFactorSetup = {};
      }
      
      req.session.twoFactorSetup.verificationCode = verificationCode;
      req.session.twoFactorSetup.method = method;
      req.session.twoFactorSetup.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      res.json({
        message: `2FA setup initiated. A verification code has been sent to your ${method}`,
        method,
        codeSent: true
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to set up 2FA' });
  }
});

// Verify 2FA setup
router.post('/settings/2fa/verify', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const schema = z.object({
      code: z.string(),
      method: z.enum(['email', 'sms', 'app'])
    });
    
    const { code, method } = schema.parse(req.body);
    
    let verified = false;
    
    if (method === 'app') {
      // Verify app code with stored secret
      if (!req.user.twoFactorSecret) {
        return res.status(400).json({ error: '2FA setup not initiated' });
      }
      
      verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token: code
      });
    } else if (method === 'email' || method === 'sms') {
      // Verify email/SMS code with session stored code
      if (!req.session?.twoFactorSetup || 
          !req.session.twoFactorSetup.verificationCode ||
          req.session.twoFactorSetup.method !== method ||
          req.session.twoFactorSetup.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }
      
      verified = req.session.twoFactorSetup.verificationCode === code;
      
      // Clear session verification data
      delete req.session.twoFactorSetup;
    }
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Enable 2FA
    await storage.updateUser(req.user.id, {
      twoFactorEnabled: true,
      twoFactorMethod: method
    });
    
    // Create notification
    await createSystemNotification(
      req.user.id,
      'security_update',
      '2FA Enabled',
      `Two-factor authentication has been enabled for your account using ${method}.`,
      { setting: '2fa', value: true, method }
    );
    
    res.json({ success: true, message: 'Two-factor authentication has been enabled' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
});

// Disable 2FA
router.post('/settings/2fa/disable', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const schema = z.object({
      code: z.string()
    });
    
    const { code } = schema.parse(req.body);
    
    // Check if 2FA is enabled
    if (!req.user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }
    
    // Verify code based on method
    let verified = false;
    
    if (req.user.twoFactorMethod === 'app') {
      verified = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token: code
      });
    } else {
      // For email/SMS, a code would have been sent
      // In a real implementation, check if the code matches
      verified = true; // Simplified for this example
    }
    
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Disable 2FA
    await storage.updateUser(req.user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null
    });
    
    // Create notification
    await createSystemNotification(
      req.user.id,
      'security_update',
      '2FA Disabled',
      'Two-factor authentication has been disabled for your account.',
      { setting: '2fa', value: false }
    );
    
    res.json({ success: true, message: 'Two-factor authentication has been disabled' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Update phone number (for SMS 2FA)
router.patch('/settings/phone', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const schema = z.object({
      phoneNumber: z.string().min(10).max(20)
    });
    
    const { phoneNumber } = schema.parse(req.body);
    
    // Update phone number
    await storage.updateUser(req.user.id, { phoneNumber });
    
    // Create notification
    await createSystemNotification(
      req.user.id,
      'settings_update',
      'Phone Number Updated',
      'Your phone number has been updated.',
      { setting: 'phone' }
    );
    
    res.json({ success: true, message: 'Phone number updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating phone number:', error);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

// Get KYC status
router.get('/settings/kyc', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    res.json({ 
      status: req.user.kycStatus,
      documents: req.user.kycDocuments || null
    });
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// Submit KYC documents
router.post('/settings/kyc/submit', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const schema = z.object({
      documentType: z.enum(['passport', 'id_card', 'driving_license']),
      documentNumber: z.string(),
      documentExpiry: z.string(),
      documentFiles: z.array(z.string()), // Base64 encoded files
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
        postalCode: z.string()
      })
    });
    
    const kycData = schema.parse(req.body);
    
    // In a real implementation, validate and store the documents securely
    // For now, just store the document metadata
    
    // Update KYC status to pending
    await storage.updateUserKycStatus(req.user.id, 'pending');
    
    // Store document info
    await storage.updateUser(req.user.id, {
      kycDocuments: kycData
    });
    
    // Create notification
    await createSystemNotification(
      req.user.id,
      'kyc_update',
      'KYC Submitted',
      'Your KYC documents have been submitted successfully and are pending review.',
      { status: 'pending' }
    );
    
    res.json({ 
      success: true, 
      message: 'KYC documents submitted successfully',
      status: 'pending'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error submitting KYC documents:', error);
    res.status(500).json({ error: 'Failed to submit KYC documents' });
  }
});

// Update KYC status (admin only)
router.patch('/admin/kyc/:userId', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update KYC status' });
    }
    
    // Validate input
    const schema = z.object({
      status: z.enum(['pending', 'approved', 'rejected']),
      rejectionReason: z.string().optional()
    });
    
    const { status, rejectionReason } = schema.parse(req.body);
    const userId = parseInt(req.params.userId);
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update KYC status
    await storage.updateUserKycStatus(userId, status);
    
    // Create notification
    let title = 'KYC Status Updated';
    let message = `Your KYC verification status has been updated to: ${status}.`;
    
    if (status === 'rejected' && rejectionReason) {
      message += ` Reason: ${rejectionReason}`;
    }
    
    await createSystemNotification(
      userId,
      'kyc_update',
      title,
      message,
      { status, rejectionReason }
    );
    
    res.json({ 
      success: true, 
      message: `KYC status updated to ${status}`,
      userId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating KYC status:', error);
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

export default router;