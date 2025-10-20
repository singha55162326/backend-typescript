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
     
 *     MembershipDetails:
 *       type: object
 *       properties:
 *         membershipStartDate:
 *           type: string
 *           format: date-time
 *         membershipEndDate:
 *           type: string
 *           format: date-time
 *         recurrencePattern:
 *           type: string
 *           enum: [weekly, biweekly, monthly]
 *         recurrenceDayOfWeek:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         nextBookingDate:
 *           type: string
 *           format: date-time
 *         totalOccurrences:
 *           type: integer
 *         completedOccurrences:
 *           type: integer
 *         isActive:
 *           type: boolean
     
 *     InvoiceItem:
 *       type: object
 *       properties:
 *         description:
 *           type: string
 *         quantity:
 *           type: number
 *         unitPrice:
 *           type: number
 *         total:
 *           type: number
 *     
 *     Invoice:
 *       type: object
 *       properties:
 *         invoiceNumber:
 *           type: string
 *         invoiceDate:
 *           type: string
 *           format: date-time
 *         dueDate:
 *           type: string
 *           format: date-time
 *         booking:
 *           type: object
 *           properties:
 *             bookingNumber:
 *               type: string
 *             bookingDate:
 *               type: string
 *               format: date
 *             startTime:
 *               type: string
 *             endTime:
 *               type: string
 *             durationHours:
 *               type: number
 *         customer:
 *           type: object
 *           properties:
 *             customerId:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             phone:
 *               type: string
 *         stadium:
 *           type: object
 *           properties:
 *             stadiumId:
 *               type: string
 *             name:
 *               type: string
 *             address:
 *               type: string
 *             phone:
 *               type: string
 *             ownerId:
 *               type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceItem'
 *         subtotal:
 *           type: number
 *         taxes:
 *           type: number
 *         totalAmount:
 *           type: number
 *         currency:
 *           type: string
 *         paymentStatus:
 *           type: string
 *         notes:
 *           type: string
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
 *           enum: [regular, tournament, training, event, membership]
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
 *         # ✅ Added membershipDetails property
 *         membershipDetails:
 *           $ref: '#/components/schemas/MembershipDetails'
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
 *     description: |
 *       Create a new booking. For regular bookings, provide bookingDate, startTime, and endTime.
 *       For membership bookings, provide startDate, dayOfWeek, startTime, endTime, and recurrencePattern.
 *       Membership bookings will create a series of recurring bookings based on the specified pattern.
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
 *             oneOf:
 *               - required:
 *                   - stadiumId
 *                   - fieldId
 *                   - bookingDate
 *                   - startTime
 *                   - endTime
 *               - required:
 *                   - stadiumId
 *                   - fieldId
 *                   - startDate
 *                   - dayOfWeek
 *                   - startTime
 *                   - endTime
 *                   - recurrencePattern
 *             properties:
 *               stadiumId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the stadium
 *               fieldId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the field
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 description: Date for regular booking (YYYY-MM-DD)
 *               startTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: Start time in 24-hour format (HH:mm)
 *               endTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: End time in 24-hour format (HH:mm)
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for membership booking (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Optional end date for membership booking (YYYY-MM-DD)
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Day of week for membership booking (0=Sunday, 1=Monday, ..., 6=Saturday)
 *               recurrencePattern:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly]
 *                 description: Recurrence pattern for membership booking
 *               totalOccurrences:
 *                 type: integer
 *                 minimum: 1
 *                 description: Optional total number of occurrences for membership booking
 *               teamInfo:
 *                 $ref: '#/components/schemas/TeamInfo'
 *               specialRequests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Special requests for the booking
 *               needsReferee:
 *                 type: boolean
 *                 description: Whether a referee is needed for the booking
 *               bookingType:
 *                 type: string
 *                 enum: [regular, tournament, training, event, membership]
 *                 description: Type of booking
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
      // Skip validation if this is a membership booking
      if (!value) return true;
      const formats = ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D'];
      const moment = require('moment');
      const date = moment(value, formats, true);
      if (!date.isValid()) {
        throw new Error('Invalid booking date format');
      }
      return true;
    }),
  body('startDate')
    .custom((value, { req }) => {
      // Only validate start date for membership bookings
      if (req.body.bookingType !== 'membership') return true;
      if (!value) {
        throw new Error('Start date is required for membership bookings');
      }
      const formats = ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D'];
      const moment = require('moment');
      const date = moment(value, formats, true);
      if (!date.isValid()) {
        throw new Error('Invalid start date format');
      }
      return true;
    }),
  body('dayOfWeek')
    .custom((value, { req }) => {
      // Only validate day of week for membership bookings
      if (req.body.bookingType !== 'membership') return true;
      if (value === undefined || value === null) {
        throw new Error('Day of week is required for membership bookings');
      }
      const day = parseInt(value);
      if (isNaN(day) || day < 0 || day > 6) {
        throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
      }
      return true;
    }),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('recurrencePattern')
    .custom((value, { req }) => {
      // Only validate recurrence pattern for membership bookings
      if (req.body.bookingType !== 'membership') return true;
      if (!value) {
        throw new Error('Recurrence pattern is required for membership bookings');
      }
      const validPatterns = ['weekly', 'biweekly', 'monthly'];
      if (!validPatterns.includes(value)) {
        throw new Error('Invalid recurrence pattern');
      }
      return true;
    }),
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
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Booking cannot be cancelled (time restriction)
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
 * /api/bookings/{bookingId}:
 *   delete:
 *     summary: Delete a booking permanently
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
 *         description: Booking deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete past bookings
 *       403:
 *         description: Not authorized to delete this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to delete booking
 */
router.delete('/:bookingId', [
  authenticateToken
], BookingController.deleteBooking);

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
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cash', 'qrcode']),
  body('amount').isFloat({ min: 0.01 }),
  body('currency').optional().trim(),
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

/**
 * @swagger
 * /api/bookings/field/{stadiumId}/{fieldId}/availability:
 *   get:
 *     summary: Get available and unavailable time slots for a field on a specific date
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Field ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Field availability information
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
 *                     date:
 *                       type: string
 *                       format: date
 *                     dayOfWeek:
 *                       type: number
 *                       description: Day of week (0=Sunday, 6=Saturday)
 *                     fieldInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                         surface:
 *                           type: string
 *                         status:
 *                           type: string
 *                         baseRate:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     stadiumInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     availableSlots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           status:
 *                             type: string
 *                             example: available
 *                     unavailableSlots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                           endTime:
 *                             type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           reason:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [schedule_unavailable, booked]
 *                           bookingStatus:
 *                             type: string
 *                             enum: [pending, confirmed]
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSlots:
 *                           type: number
 *                         availableCount:
 *                           type: number
 *                         unavailableCount:
 *                           type: number
 *                     availableReferees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           specializations:
 *                             type: array
 *                             items:
 *                               type: string
 *                           rate:
 *                             type: number
 *                           currency:
 *                             type: string
 *                     specialDateInfo:
 *                       type: object
 *                       properties:
 *                         isSpecialDate:
 *                           type: boolean
 *                         reason:
 *                           type: string
 *       400:
 *         description: Invalid date format or past date
 *       404:
 *         description: Stadium or field not found
 *       500:
 *         description: Failed to get availability
 */
router.get('/field/:stadiumId/:fieldId/availability', [
  query('date')
    .notEmpty()
    .withMessage('Date is required')
    .custom((value) => {
      const moment = require('moment');
      const date = moment(value, 'YYYY-MM-DD', true);
      if (!date.isValid()) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD');
      }
      if (date.isBefore(moment().startOf('day'))) {
        throw new Error('Cannot check availability for past dates');
      }
      return true;
    })
], BookingController.getFieldAvailability);

/**
 * @swagger
 * /api/bookings/field/{stadiumId}/{fieldId}/check-slot:
 *   get:
 *     summary: Check availability of a specific time slot
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stadium ID
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Field ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check (YYYY-MM-DD)
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         description: Start time (HH:mm)
 *       - in: query
 *         name: endTime
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         description: End time (HH:mm)
 *     responses:
 *       200:
 *         description: Slot availability check result
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
 *                     isAvailable:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         rate:
 *                           type: number
 *                         duration:
 *                           type: number
 *                         total:
 *                           type: number
 *                         currency:
 *                           type: string
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Stadium or field not found
 */
/**
 * @swagger
 * /api/bookings/{bookingId}/invoice:
 *   get:
 *     summary: Generate invoice for a booking
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
 *         description: Invoice data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Invalid booking ID
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Failed to generate invoice
 */
router.get('/:bookingId/invoice', authenticateToken, BookingController.generateInvoice);

router.get('/field/:stadiumId/:fieldId/check-slot', [
  query('date').notEmpty().isISO8601(),
  query('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], BookingController.checkSpecificSlot);

export default router;