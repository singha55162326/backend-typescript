// src/routes/bookingRoutes.ts
import { Router } from 'express';
import { body, query } from 'express-validator';
import { BookingController } from '../controllers/booking.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TeamInfo:
 *       type: object
 *       properties:
 *         teamName:
 *           type: string
 *         contactPerson:
 *           type: string
 *         contactPhone:
 *           type: string
 *         numberOfPlayers:
 *           type: number
 *         experience:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *     
 *     Payment:
 *       type: object
 *       properties:
 *         paymentMethod:
 *           type: string
 *           enum: [credit_card, debit_card, bank_transfer, digital_wallet, cash]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refunded]
 *         transactionId:
 *           type: string
 *         processedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     AssignedStaff:
 *       type: object
 *       properties:
 *         staffId:
 *           type: string
 *           format: ObjectId
 *         staffName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [referee, manager, assistant]
 *         assignedAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [assigned, confirmed, completed, cancelled]
 *     
 *     Discount:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [percentage, fixed]
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *     
 *     RefereeCharge:
 *       type: object
 *       properties:
 *         staffId:
 *           type: string
 *           format: ObjectId
 *         refereeName:
 *           type: string
 *         hours:
 *           type: number
 *         rate:
 *           type: number
 *         total:
 *           type: number
 *     
 *     Pricing:
 *       type: object
 *       properties:
 *         baseRate:
 *           type: number
 *         totalAmount:
 *           type: number
 *         currency:
 *           type: string
 *         taxes:
 *           type: number
 *         refereeCharges:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RefereeCharge'
 *         discounts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Discount'
 *     
 *     Cancellation:
 *       type: object
 *       properties:
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *         cancelledBy:
 *           type: string
 *           format: ObjectId
 *         reason:
 *           type: string
 *         refundAmount:
 *           type: number
 *         refundStatus:
 *           type: string
 *     
 *     HistoryItem:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           enum: [created, updated, confirmed, cancelled, completed, no_show]
 *         changedBy:
 *           type: string
 *           format: ObjectId
 *         oldValues:
 *           type: object
 *         newValues:
 *           type: object
 *         notes:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *     
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: ObjectId
 *         bookingNumber:
 *           type: string
 *         userId:
 *           type: string
 *           format: ObjectId
 *         stadiumId:
 *           type: string
 *           format: ObjectId
 *         fieldId:
 *           type: string
 *           format: ObjectId
 *         bookingDate:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         endTime:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         durationHours:
 *           type: number
 *         pricing:
 *           $ref: '#/components/schemas/Pricing'
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *         bookingType:
 *           type: string
 *           enum: [regular, tournament, training, event]
 *         teamInfo:
 *           $ref: '#/components/schemas/TeamInfo'
 *         notes:
 *           type: string
 *         specialRequests:
 *           type: array
 *           items:
 *             type: string
 *         assignedStaff:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AssignedStaff'
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Payment'
 *         cancellation:
 *           $ref: '#/components/schemas/Cancellation'
 *         history:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/HistoryItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stadiumId
 *               - fieldId
 *               - bookingDate
 *               - startTime
 *               - endTime
 *             properties:
 *               stadiumId:
 *                 type: string
 *                 format: ObjectId
 *               fieldId:
 *                 type: string
 *                 format: ObjectId
 *               bookingDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               endTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]
 *               teamInfo:
 *                 $ref: '#/components/schemas/TeamInfo'
 *               specialRequests:
 *                 type: array
 *                 items:
 *                   type: string
 *               needsReferee:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Booking created successfully
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
 *       404:
 *         description: Stadium or field not found
 *       500:
 *         description: Failed to create booking
 */
router.post('/', [
  authenticateToken,
  body('stadiumId').isMongoId(),
  body('fieldId').isMongoId(),
  body('bookingDate')
    .custom((value) => {
      const formats = ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D'];
      const moment = require('moment');
      const date = moment(value, formats, true);
      if (!date.isValid()) {
        throw new Error('Invalid booking date format');
      }
      return true;
    }),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('teamInfo.teamName').optional().trim()
], BookingController.createBooking);

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *         description: Filter by booking status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *       500:
 *         description: Failed to get bookings
 */
router.get('/my-bookings', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], BookingController.getUserBookings);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *         description: Filter by booking status
 *       - in: query
 *         name: stadiumId
 *         schema:
 *           type: string
 *         description: Filter by stadium ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date range start
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by booking date range end
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to get bookings
 */
router.get('/', [
  authenticateToken,
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
  query('stadiumId').optional().isMongoId(),
  query('userId').optional().isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], BookingController.getAllBookings);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Invalid booking ID
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingId', authenticateToken, BookingController.getBookingById);

/**
 * @swagger
 * /api/bookings/{bookingId}/cancel:
 *   put:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
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
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *                     refundAmount:
 *                       type: number
 *       400:
 *         description: Cancellation not allowed (too late)
 *       403:
 *         description: Not authorized to cancel this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to cancel booking
 */
router.put('/:bookingId/cancel', [
  authenticateToken,
  body('reason').optional().trim()
], BookingController.cancelBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}/confirm:
 *   put:
 *     summary: Confirm a booking (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking confirmed successfully
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
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Booking not found
 *       400:
 *         description: Booking cannot be confirmed (already confirmed or cancelled)
 *       500:
 *         description: Failed to confirm booking
 */
router.put('/:bookingId/confirm', authenticateToken, BookingController.confirmBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}/payment:
 *   post:
 *     summary: Add a payment to a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - amount
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, bank_transfer, digital_wallet, cash]
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               transactionId:
 *                 type: string
 *               gatewayResponse:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment added successfully
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
 *         description: Validation error
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.post('/:bookingId/payment', [
  authenticateToken,
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cash']),
  body('amount').isFloat({ min: 0.01 }),
  body('transactionId').optional().trim()
], BookingController.addPayment);

/**
 * @swagger
 * /api/bookings/{bookingId}/payments:
 *   get:
 *     summary: Get all payments for a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 totalPaid:
 *                   type: number
 *       400:
 *         description: Invalid booking ID
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingId/payments', authenticateToken, BookingController.getBookingPayments);

/**
 * @swagger
 * /api/bookings/{bookingId}/assign-staff:
 *   post:
 *     summary: Assign staff (e.g., referee) to booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - staffId
 *                 - role
 *               properties:
 *                 staffId:
 *                   type: string
 *                   format: ObjectId
 *                 staffName:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [referee, manager, assistant]
 *     responses:
 *       200:
 *         description: Staff assigned successfully
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
 *         description: Validation error
 *       403:
 *         description: Only admins can assign staff
 *       404:
 *         description: Booking not found
 */
router.post('/:bookingId/assign-staff', [
  authenticateToken,
  body().isArray(),
  body('*.staffId').isMongoId(),
  body('*.role').isIn(['referee', 'manager', 'assistant'])
], BookingController.assignStaff);

/**
 * @swagger
 * /api/bookings/{bookingId}/apply-discount:
 *   post:
 *     summary: Apply a discount to booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Discount applied
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
 *         description: Validation error
 *       403:
 *         description: Only admins can apply discounts
 *       404:
 *         description: Booking not found
 */
router.post('/:bookingId/apply-discount', [
  authenticateToken,
  body('type').isIn(['percentage', 'fixed']),
  body('amount').isFloat({ min: 0 })
], BookingController.applyDiscount);

export default router;