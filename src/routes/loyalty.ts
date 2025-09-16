import express from 'express';
import { body } from 'express-validator';
import { LoyaltyController } from '../controllers';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Loyalty
 *   description: Loyalty program management endpoints
 */

/**
 * @swagger
 * /api/loyalty:
 *   get:
 *     summary: Get user's loyalty details
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved loyalty details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoyaltyDetails'
 *       401:
 *         description: Unauthorized
 */
router.get('/', LoyaltyController.getLoyaltyDetails);

/**
 * @swagger
 * /loyalty/tiers:
 *   get:
 *     summary: Get available loyalty tiers
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of loyalty tiers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LoyaltyTier'
 *       401:
 *         description: Unauthorized
 */
router.get('/tiers', LoyaltyController.getLoyaltyTiers);

/**
 * @swagger
 * /loyalty/redeem:
 *   post:
 *     summary: Redeem loyalty points for discount
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               points:
 *                 type: integer
 *                 minimum: 1
 *                 example: 100
 *             required:
 *               - points
 *     responses:
 *       200:
 *         description: Points successfully redeemed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 discount:
 *                   type: number
 *                   example: 5.00
 *                 remainingPoints:
 *                   type: integer
 *                   example: 900
 *       400:
 *         description: Invalid input (e.g., points not positive integer)
 *       401:
 *         description: Unauthorized
 */
router.post('/redeem', 
  [
    body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer')
  ],
  LoyaltyController.redeemPoints
);

/**
 * @swagger
 * /loyalty/referral:
 *   get:
 *     summary: Get user's referral code or link
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 referralCode:
 *                   type: string
 *                   example: "REF-ABCD1234"
 *                 referralLink:
 *                   type: string
 *                   example: "https://example.com/signup?ref=REF-ABCD1234"
 *       401:
 *         description: Unauthorized
 */
router.get('/referral', LoyaltyController.getReferralCode);

export default router;