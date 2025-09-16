import { Router } from 'express';
import { body, query } from 'express-validator';
import { CalendarController } from '../controllers/calendar.controller';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Calendar
 *   description: Calendar management endpoints
 */

/**
 * @swagger
 * /api/calendar/my-events:
 *   get:
 *     summary: Get calendar events for current user
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Calendar events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to retrieve calendar events
 */
router.get('/my-events', [
  authenticateToken,
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601()
], CalendarController.getUserCalendarEvents);

/**
 * @swagger
 * /api/calendar/stadium-owner-events:
 *   get:
 *     summary: Get calendar events for stadium owner
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Calendar events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied - user is not a stadium owner
 *       500:
 *         description: Failed to retrieve calendar events
 */
router.get('/stadium-owner-events', [
  authenticateToken,
  authorizeRoles(['stadium_owner']),
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601()
], CalendarController.getStadiumOwnerCalendarEvents);

/**
 * @swagger
 * /api/calendar/admin-events:
 *   get:
 *     summary: Get calendar events for admin
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: stadiumId
 *         schema:
 *           type: string
 *         description: Optional stadium ID to filter events
 *     responses:
 *       200:
 *         description: Calendar events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied - user is not an admin
 *       500:
 *         description: Failed to retrieve calendar events
 */
router.get('/admin-events', [
  authenticateToken,
  authorizeRoles(['superadmin']),
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601(),
  query('stadiumId').optional().isMongoId()
], CalendarController.getAdminCalendarEvents);

/**
 * @swagger
 * /api/calendar/stadium/{stadiumId}/events:
 *   get:
 *     summary: Get calendar events for a specific stadium
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Calendar events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to retrieve calendar events
 */
router.get('/stadium/:stadiumId/events', [
  authenticateToken,
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601()
], CalendarController.getStadiumCalendarEvents);

/**
 * @swagger
 * /api/calendar/booking/{bookingId}/reschedule:
 *   put:
 *     summary: Reschedule a booking
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *       schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newDate
 *               - newStartTime
 *               - newEndTime
 *             properties:
 *               newDate:
 *                 type: string
 *                 format: date
 *                 description: New booking date (YYYY-MM-DD)
 *               newStartTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: New start time (HH:mm)
 *               newEndTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: New end time (HH:mm)
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error or time slot already booked
 *       403:
 *         description: Not authorized to reschedule this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to reschedule booking
 */
router.put('/booking/:bookingId/reschedule', [
  authenticateToken,
  body('newDate').notEmpty().isISO8601(),
  body('newStartTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('newEndTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], CalendarController.rescheduleBooking);

/**
 * @swagger
 * /api/calendar/my-visual-data:
 *   get:
 *     summary: Get visual calendar data for current user
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Visual calendar data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CalendarEvent'
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalEvents:
 *                           type: number
 *                         eventsByStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         eventsByType:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         revenue:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     monthlyBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           year:
 *                             type: number
 *                           events:
 *                             type: number
 *                           revenue:
 *                             type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to retrieve calendar data
 */
router.get('/my-visual-data', [
  authenticateToken,
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601()
], CalendarController.getUserVisualCalendarData);

/**
 * @swagger
 * /api/calendar/stadium-owner-visual-data:
 *   get:
 *     summary: Get visual calendar data for stadium owner
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Visual calendar data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CalendarEvent'
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalEvents:
 *                           type: number
 *                         eventsByStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         eventsByType:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         revenue:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     monthlyBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           year:
 *                             type: number
 *                           events:
 *                             type: number
 *                           revenue:
 *                             type: number
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied - user is not a stadium owner
 *       500:
 *         description: Failed to retrieve calendar data
 */
router.get('/stadium-owner-visual-data', [
  authenticateToken,
  authorizeRoles(['stadium_owner']),
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601()
], CalendarController.getStadiumOwnerVisualCalendarData);

/**
 * @swagger
 * /api/calendar/admin-visual-data:
 *   get:
 *     summary: Get visual calendar data for admin
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: stadiumId
 *         schema:
 *           type: string
 *         description: Optional stadium ID to filter events
 *     responses:
 *       200:
 *         description: Visual calendar data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CalendarEvent'
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalEvents:
 *                           type: number
 *                         eventsByStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         eventsByType:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         revenue:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     monthlyBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           year:
 *                             type: number
 *                           events:
 *                             type: number
 *                           revenue:
 *                             type: number
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied - user is not an admin
 *       500:
 *         description: Failed to retrieve calendar data
 */
router.get('/admin-visual-data', [
  authenticateToken,
  authorizeRoles(['superadmin']),
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601(),
  query('stadiumId').optional().isMongoId()
], CalendarController.getAdminVisualCalendarData);

export default router;