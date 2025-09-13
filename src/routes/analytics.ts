import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/analytics:
 *   get:
 *     summary: Get general analytics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, authorizeRoles(['superadmin']), AnalyticsController.getAnalytics);

/**
 * @swagger
 * /api/analytics/stadium-owner:
 *   get:
 *     summary: Get stadium owner analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stadium-owner', authenticateToken, authorizeRoles(['stadium_owner', 'superadmin']), AnalyticsController.getStadiumOwnerAnalytics);

/**
 * @swagger
 * /api/analytics/bookings:
 *   get:
 *     summary: Get booking analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/bookings', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getBookingAnalytics);

/**
 * @swagger
 * /api/analytics/stadiums/{stadiumId}:
 *   get:
 *     summary: Get stadium analytics (owner/admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: Stadium analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyAnalytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             format: date
 *                           totalBookings:
 *                             type: number
 *                           totalRevenue:
 *                             type: number
 *                           totalRefereeRevenue:
 *                             type: number
 *                           statusBreakdown:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 status:
 *                                   type: string
 *                                 count:
 *                                   type: number
 *                     staffPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           refereeName:
 *                             type: string
 *                           totalBookings:
 *                             type: number
 *                           totalHours:
 *                             type: number
 *                           totalEarnings:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                         totalRefereeRevenue:
 *                           type: number
 *                         currency:
 *                           type: string
 *       403:
 *         description: Not authorized to view this stadium analytics
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to get analytics
 */
router.get('/stadiums/:stadiumId', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getStadiumAnalytics);

export default router;