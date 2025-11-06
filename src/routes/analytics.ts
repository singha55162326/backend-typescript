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
 * /api/analytics/detailed:
 *   get:
 *     summary: Get detailed booking analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/detailed', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getDetailedBookingAnalytics);

/**
 * @swagger
 * /api/analytics/predictive:
 *   get:
 *     summary: Get predictive analytics for booking trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 */
router.get('/predictive', authenticateToken, authorizeRoles(['superadmin']), AnalyticsController.getPredictiveAnalytics);

/**
 * @swagger
 * /api/analytics/segmentation:
 *   get:
 *     summary: Get customer segmentation data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 */
router.get('/segmentation', authenticateToken, authorizeRoles(['superadmin']), AnalyticsController.getCustomerSegmentation);

/**
 * @swagger
 * /api/analytics/projections:
 *   get:
 *     summary: Get revenue projections
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 */
router.get('/projections', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getRevenueProjections);

/**
 * @swagger
 * /api/analytics/staff-scheduling/{stadiumId}:
 *   get:
 *     summary: Get staff scheduling data for a stadium
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
 *         description: Start date for scheduling period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for scheduling period
 */
router.get('/staff-scheduling/:stadiumId', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getStaffScheduling);

/**
 * @swagger
 * /api/analytics/staff-performance/{stadiumId}:
 *   get:
 *     summary: Get staff performance metrics for a stadium
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
 *         description: Start date for performance period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for performance period
 */
router.get('/staff-performance/:stadiumId', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getStaffPerformanceMetrics);

/**
 * @swagger
 * /api/analytics/payroll/{stadiumId}:
 *   get:
 *     summary: Get staff payroll data for a stadium
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
 *         description: Start date for payroll period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for payroll period
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format
 */
router.get('/payroll/:stadiumId', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.getStaffPayroll);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [bookings, revenue]
 *         required: true
 *         description: Type of data to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, pdf]
 *         required: true
 *         description: Export format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export period
 */
router.get('/export', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), AnalyticsController.exportAnalyticsCSV);

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