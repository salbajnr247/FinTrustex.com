import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertNotificationSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Get all notifications for the authenticated user
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const notifications = await storage.getNotificationsByUserId(userId);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications for the authenticated user
router.get('/notifications/unread', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const notifications = await storage.getUnreadNotificationsByUserId(userId);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

// Mark a notification as read
router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const id = parseInt(req.params.id);
    
    // Check if notification exists and belongs to the user
    const notification = await storage.getNotification(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to access this notification' });
    }
    
    // Mark as read
    const updatedNotification = await storage.markNotificationAsRead(id);
    
    res.json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    
    // Mark all as read
    await storage.markAllNotificationsAsRead(userId);
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Create a notification (admin only, or system)
router.post('/notifications', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create notifications' });
    }
    
    // Validate input
    const validatedData = insertNotificationSchema.parse(req.body);
    
    // Create notification
    const newNotification = await storage.createNotification(validatedData);
    
    res.status(201).json(newNotification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Helper function to create system notifications (not exposed via API)
export async function createSystemNotification(
  userId: number, 
  type: string, 
  title: string, 
  message: string, 
  data?: any
) {
  try {
    const notification = await storage.createNotification({
      userId,
      type,
      title,
      message,
      data
    });
    return notification;
  } catch (error) {
    console.error('Error creating system notification:', error);
    return null;
  }
}

export default router;