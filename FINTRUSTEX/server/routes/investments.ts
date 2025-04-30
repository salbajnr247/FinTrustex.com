import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertInvestmentPackageSchema, insertUserInvestmentSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Get all investment packages
router.get('/investment-packages', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const investmentPackages = await storage.getAllInvestmentPackages(activeOnly);
    res.json(investmentPackages);
  } catch (error) {
    console.error('Error fetching investment packages:', error);
    res.status(500).json({ error: 'Failed to fetch investment packages' });
  }
});

// Get a specific investment package
router.get('/investment-packages/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const investmentPackage = await storage.getInvestmentPackage(id);
    
    if (!investmentPackage) {
      return res.status(404).json({ error: 'Investment package not found' });
    }
    
    res.json(investmentPackage);
  } catch (error) {
    console.error('Error fetching investment package:', error);
    res.status(500).json({ error: 'Failed to fetch investment package' });
  }
});

// Create a new investment package (admin only)
router.post('/investment-packages', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create investment packages' });
    }
    
    // Validate input
    const validatedData = insertInvestmentPackageSchema.parse(req.body);
    
    // Create investment package
    const newPackage = await storage.createInvestmentPackage(validatedData);
    
    res.status(201).json(newPackage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating investment package:', error);
    res.status(500).json({ error: 'Failed to create investment package' });
  }
});

// Update an investment package (admin only)
router.put('/investment-packages/:id', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update investment packages' });
    }
    
    const id = parseInt(req.params.id);
    
    // Check if package exists
    const existingPackage = await storage.getInvestmentPackage(id);
    if (!existingPackage) {
      return res.status(404).json({ error: 'Investment package not found' });
    }
    
    // Update package
    const updatedPackage = await storage.updateInvestmentPackage(id, req.body);
    
    res.json(updatedPackage);
  } catch (error) {
    console.error('Error updating investment package:', error);
    res.status(500).json({ error: 'Failed to update investment package' });
  }
});

// Toggle investment package status (admin only)
router.patch('/investment-packages/:id/toggle', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can toggle investment package status' });
    }
    
    const id = parseInt(req.params.id);
    
    // Check if package exists
    const existingPackage = await storage.getInvestmentPackage(id);
    if (!existingPackage) {
      return res.status(404).json({ error: 'Investment package not found' });
    }
    
    // Toggle status
    const isActive = req.body.isActive;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean value' });
    }
    
    const updatedPackage = await storage.toggleInvestmentPackageStatus(id, isActive);
    
    res.json(updatedPackage);
  } catch (error) {
    console.error('Error toggling investment package status:', error);
    res.status(500).json({ error: 'Failed to toggle investment package status' });
  }
});

// Get user investments
router.get('/user-investments', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const investments = await storage.getUserInvestmentsByUserId(userId);
    
    res.json(investments);
  } catch (error) {
    console.error('Error fetching user investments:', error);
    res.status(500).json({ error: 'Failed to fetch user investments' });
  }
});

// Get a specific user investment
router.get('/user-investments/:id', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const id = parseInt(req.params.id);
    const investment = await storage.getUserInvestment(id);
    
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    // Ensure users can only see their own investments
    if (investment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to view this investment' });
    }
    
    res.json(investment);
  } catch (error) {
    console.error('Error fetching user investment:', error);
    res.status(500).json({ error: 'Failed to fetch user investment' });
  }
});

// Create a new user investment
router.post('/user-investments', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate input
    const validatedData = insertUserInvestmentSchema.parse({
      ...req.body,
      userId: req.user.id
    });
    
    // Check if investment package exists and is active
    const packageId = validatedData.packageId;
    const investmentPackage = await storage.getInvestmentPackage(packageId);
    
    if (!investmentPackage) {
      return res.status(404).json({ error: 'Investment package not found' });
    }
    
    if (!investmentPackage.isActive) {
      return res.status(400).json({ error: 'This investment package is not currently available' });
    }
    
    // Check minimum and maximum investment amounts
    const amount = parseFloat(validatedData.amount.toString());
    const minAmount = parseFloat(investmentPackage.minimumInvestment.toString());
    
    if (amount < minAmount) {
      return res.status(400).json({ 
        error: `Minimum investment amount is ${minAmount}`
      });
    }
    
    if (investmentPackage.maximumInvestment) {
      const maxAmount = parseFloat(investmentPackage.maximumInvestment.toString());
      if (amount > maxAmount) {
        return res.status(400).json({ 
          error: `Maximum investment amount is ${maxAmount}`
        });
      }
    }
    
    // Calculate expected return
    const roi = parseFloat(investmentPackage.roiPercentage.toString());
    const expectedReturn = (amount * (1 + roi / 100)).toFixed(2);
    
    // Create the investment
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + investmentPackage.durationDays);
    
    const newInvestment = await storage.createUserInvestment({
      ...validatedData,
      expectedReturn,
    });
    
    res.status(201).json(newInvestment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating user investment:', error);
    res.status(500).json({ error: 'Failed to create user investment' });
  }
});

// Cancel a user investment
router.patch('/user-investments/:id/cancel', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const id = parseInt(req.params.id);
    const investment = await storage.getUserInvestment(id);
    
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    // Ensure users can only cancel their own investments
    if (investment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to cancel this investment' });
    }
    
    // Check if investment is already completed or cancelled
    if (investment.status !== 'active') {
      return res.status(400).json({ error: `Cannot cancel investment with status: ${investment.status}` });
    }
    
    // Cancel investment
    const updatedInvestment = await storage.updateUserInvestmentStatus(id, 'cancelled');
    
    res.json(updatedInvestment);
  } catch (error) {
    console.error('Error cancelling user investment:', error);
    res.status(500).json({ error: 'Failed to cancel user investment' });
  }
});

// Complete a user investment (admin only)
router.patch('/user-investments/:id/complete', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can complete investments' });
    }
    
    const id = parseInt(req.params.id);
    const actualReturn = req.body.actualReturn;
    
    if (!actualReturn || typeof actualReturn !== 'string') {
      return res.status(400).json({ error: 'actualReturn is required' });
    }
    
    // Check if investment exists
    const investment = await storage.getUserInvestment(id);
    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    // Check if investment is active
    if (investment.status !== 'active') {
      return res.status(400).json({ error: `Cannot complete investment with status: ${investment.status}` });
    }
    
    // Complete investment
    const completedInvestment = await storage.completeUserInvestment(id, actualReturn);
    
    res.json(completedInvestment);
  } catch (error) {
    console.error('Error completing user investment:', error);
    res.status(500).json({ error: 'Failed to complete user investment' });
  }
});

export default router;