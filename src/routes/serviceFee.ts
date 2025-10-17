import { Router } from 'express';
import { ServiceFeeController } from '../controllers/serviceFee.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Service Fee
 *   description: Service fee reporting for stadium owners
 */

/**
 * @swagger
 * /api/service-fee/report:
 *   get:
 *     summary: Get service fee report for all stadium owners
 *     tags: [Service Fee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Service fee report
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
 *                     report:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ownerId:
 *                             type: string
 *                           ownerName:
 *                             type: string
 *                           ownerEmail:
 *                             type: string
 *                           stadiums:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                           totalBookings:
 *                             type: number
 *                           totalRevenue:
 *                             type: number
 *                           serviceFee:
 *                             type: number
 *                           period:
 *                             type: object
 *                             properties:
 *                               startDate:
 *                                 type: string
 *                                 format: date-time
 *                               endDate:
 *                                 type: string
 *                                 format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalOwners:
 *                           type: number
 *                         totalServiceFee:
 *                           type: number
 *                         period:
 *                           type: object
 *                           properties:
 *                             startDate:
 *                               type: string
 *                               format: date-time
 *                             endDate:
 *                               type: string
 *                               format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/report', authenticateToken, ServiceFeeController.getServiceFeeReport);

/**
 * @swagger
 * /api/service-fee/report/{ownerId}:
 *   get:
 *     summary: Get detailed service fee report for a specific owner
 *     tags: [Service Fee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Detailed service fee report
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
 *                     owner:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     stadiums:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                     bookings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingId:
 *                             type: string
 *                           bookingNumber:
 *                             type: string
 *                           bookingDate:
 *                             type: string
 *                             format: date
 *                           stadiumName:
 *                             type: string
 *                           customerName:
 *                             type: string
 *                           customerEmail:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           serviceFee:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                         serviceFee:
 *                           type: number
 *       400:
 *         description: Invalid owner ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Owner not found
 *       500:
 *         description: Server error
 */
router.get('/report/:ownerId', authenticateToken, ServiceFeeController.getOwnerServiceFeeDetails);

export default router;