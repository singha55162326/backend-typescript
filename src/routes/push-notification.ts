import { Router, Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { PushNotificationService } from '../services/push-notification.service';

const router = Router();

// Add push subscription
router.post('/subscribe', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscription } = req.body;
    const userId = (req as any).user.userId;
    
    if (!subscription) {
      res.status(400).json({ 
        success: false, 
        error: 'Subscription data is required' 
      });
      return; // ← Explicit return
    }
    
    // Validate subscription structure
    if (!subscription.endpoint || !subscription.keys) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid subscription data' 
      });
      return; // ← Explicit return
    }
    
    await PushNotificationService.addSubscription(userId, subscription);
    
    res.status(201).json({ 
      success: true, 
      message: 'Subscription added successfully' 
    });
  } catch (error: any) {
    console.error('Error adding push subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to add subscription' 
    });
  }
});

// Remove push subscription
router.post('/unsubscribe', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    await PushNotificationService.removeSubscription(userId);
    
    res.json({ 
      success: true, 
      message: 'Subscription removed successfully' 
    });
  } catch (error: any) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to remove subscription' 
    });
  }
});

// Send test notification (admin only)
router.post('/test', authenticateToken, authorizeRoles(['superadmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, payload } = req.body;
    
    if (!userId || !payload) {
      res.status(400).json({ 
        success: false, 
        error: 'User ID and payload are required' 
      });
      return; // ← Explicit return
    }
    
    if (!payload.title || !payload.body) {
      res.status(400).json({ 
        success: false, 
        error: 'Payload must include title and body' 
      });
      return; // ← Explicit return
    }
    
    await PushNotificationService.sendNotificationToUser(userId, payload);
    
    res.json({ 
      success: true, 
      message: 'Test notification sent successfully' 
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send test notification' 
    });
  }
});

// Get user's subscriptions
router.get('/subscriptions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const subscriptions = await PushNotificationService.getUserSubscriptions(userId);
    
    res.json({ 
      success: true, 
      data: subscriptions 
    });
  } catch (error: any) {
    console.error('Error getting user subscriptions:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get subscriptions' 
    });
  }
});

export default router;