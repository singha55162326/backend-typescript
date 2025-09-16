import { Router } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users/notification-preferences:
 *   get:
 *     summary: Get current user's notification preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 */
router.get('/notification-preferences', 
  authenticateToken, 
  UserController.getNotificationPreferences
);

/**
 * @swagger
 * /api/users/notification-preferences:
 *   put:
 *     summary: Update current user's notification preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationPreferences:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   bookingReminders:
 *                     type: boolean
 *                   promotions:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 */
router.put('/notification-preferences',
  authenticateToken,
  [
    body('notificationPreferences').optional().isObject(),
    body('notificationPreferences.email').optional().isBoolean(),
    body('notificationPreferences.sms').optional().isBoolean(),
    body('notificationPreferences.push').optional().isBoolean(),
    body('notificationPreferences.bookingReminders').optional().isBoolean(),
    body('notificationPreferences.promotions').optional().isBoolean(),
  ],
  UserController.updateNotificationPreferences
);

/**
 * @swagger
 * /api/users/language:
 *   get:
 *     summary: Get current user's preferred language
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferred language retrieved successfully
 */
router.get('/language', 
  authenticateToken, 
  UserController.getPreferredLanguage
);

/**
 * @swagger
 * /api/users/language:
 *   put:
 *     summary: Update current user's preferred language
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferredLanguage:
 *                 type: string
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Preferred language updated successfully
 */
router.put('/language',
  authenticateToken,
  [
    body('preferredLanguage').exists().isString().isLength({ min: 2, max: 5 }),
  ],
  UserController.updatePreferredLanguage
);

export default router;