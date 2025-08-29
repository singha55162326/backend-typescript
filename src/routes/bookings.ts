import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import moment from 'moment-timezone';
import { authenticateToken } from '../middleware/auth';
import mongoose from 'mongoose';

// Define IPayment interface if not imported from models
interface IPayment {
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet' | 'cash';
  amount: number;
  currency: string;
  status: 'pending' | 'cancelled' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  gatewayResponse?: any;
  processedAt: Date;
  createdAt: Date;
}

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management endpoints
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
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               teamInfo:
 *                 type: object
 *                 properties:
 *                   teamName:
 *                     type: string
 *                   contactPerson:
 *                     type: string
 *                   contactPhone:
 *                     type: string
 *                   numberOfPlayers:
 *                     type: number
 *                   experience:
 *                     type: string
 *                     enum: [beginner, intermediate, advanced]
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
    const date = moment(value, formats, true);
    if (!date.isValid()) {
      throw new Error('Invalid booking date format');
    }
    return true;
  }),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('teamInfo.teamName').optional().trim()
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array()
      });
      return;
    }

    const { stadiumId, fieldId, bookingDate, startTime, endTime, teamInfo, specialRequests } = req.body;

    // Check if stadium and field exist
    const stadium = await Stadium.findById(stadiumId);
    if (!stadium) {
      res.status(404).json({
        success: false,
        message: 'Stadium not found'
      });
      return;
    }

    // Check if stadium has fields array and find the specific field
    if (!stadium.fields || !Array.isArray(stadium.fields)) {
      res.status(404).json({
        success: false,
        message: 'Stadium fields not found'
      });
      return;
    }

    const field = stadium.fields.find((f: any) => f._id?.toString() === fieldId);
    if (!field) {
      res.status(404).json({
        success: false,
        message: 'Field not found'
      });
      return;
    }

    // Check availability
    const existingBooking = await Booking.findOne({
      fieldId,
      bookingDate: new Date(bookingDate),
      $or: [
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
          ]
        }
      ],
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      res.status(400).json({
        success: false,
        message: 'Time slot is already booked'
      });
      return;
    }

    // Calculate pricing
    const startMoment = moment(startTime, 'HH:mm');
    const endMoment = moment(endTime, 'HH:mm');
    const durationHours = endMoment.diff(startMoment, 'hours', true);
    const baseRate = field.pricing?.baseHourlyRate || 0;
    const baseAmount = baseRate * durationHours;

    // Auto-assign referee if needed and available
    const assignedStaff = [];
    const refereeCharges = [];
    
    if (req.body.needsReferee !== false && stadium.staff && Array.isArray(stadium.staff)) {
      const bookingDay = moment(bookingDate).day();
      const availableReferees = stadium.staff.filter((staff: any) => 
        staff.role === 'referee' && 
        staff.status === 'active' &&
        staff.availability && Array.isArray(staff.availability) &&
        staff.availability.some((avail: any) => 
          avail.dayOfWeek === bookingDay &&
          avail.startTime <= startTime &&
          avail.endTime >= endTime &&
          avail.isAvailable
        )
      );

      if (availableReferees.length > 0) {
        const referee = availableReferees[0]; // Take first available
        assignedStaff.push({
          staffId: (referee as any)._id || new mongoose.Types.ObjectId(),
          staffName: referee.name,
          role: 'referee',
          status: 'assigned'
        });

        refereeCharges.push({
          staffId: (referee as any)._id || new mongoose.Types.ObjectId(),
          refereeName: referee.name,
          hours: durationHours,
          rate: referee.rates?.hourlyRate || 0,
          total: (referee.rates?.hourlyRate || 0) * durationHours
        });
      }
    }

    const totalRefereeCharges = refereeCharges.reduce((sum: number, charge: any) => sum + charge.total, 0);
    const totalAmount = baseAmount + totalRefereeCharges;

    // Create booking
    const booking = new Booking({
      userId: req.user?.userId,
      stadiumId,
      fieldId,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      durationHours,
      pricing: {
        baseRate: baseRate,
        totalAmount,
        currency: 'LAK',
        refereeCharges
      },
      teamInfo,
      specialRequests: specialRequests || [],
      assignedStaff,
      history: [{
        action: 'created',
        changedBy: req.user?.userId,
        newValues: { status: 'pending' },
        notes: 'Booking created'
      }]
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Time slot is already booked'
      });
      return;
    }
    next(error);
  }
});

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
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let query: any = { userId: req.user?.userId };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate('stadiumId', 'name address')
      .sort({ bookingDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});


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
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'stadium_owner' && req.user?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required to view all bookings'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build query based on filters
    let query: any = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.stadiumId) {
      query.stadiumId = req.query.stadiumId;
    }

    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    if (req.query.startDate || req.query.endDate) {
      query.bookingDate = {};
      if (req.query.startDate) {
        query.bookingDate.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.bookingDate.$lte = new Date(req.query.endDate as string);
      }
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone')
      .populate('stadiumId', 'name address')
      .populate('fieldId', 'fieldName type')
      .sort({ createdAt: -1, bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

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
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check ownership
    if (booking.userId.toString() !== req.user?.userId && req.user?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
      return;
    }

    // Check if cancellation is allowed
    const bookingDateTime = moment.tz(
      `${booking.bookingDate.toISOString().split('T')[0]} ${booking.startTime}`,
      'YYYY-MM-DD HH:mm',
      'Asia/Vientiane'
    );
    const now = moment.tz('Asia/Vientiane');
    const hoursUntilBooking = bookingDateTime.diff(now, 'hours');

    if (hoursUntilBooking < 24 && req.user?.role !== 'stadium_owner') {
      res.status(400).json({
        success: false,
        message: 'Bookings can only be cancelled 24 hours in advance'
      });
      return;
    }

    // Calculate refund
    let refundAmount = 0;
    if (booking.paymentStatus === 'paid') {
      if (hoursUntilBooking >= 48) {
        refundAmount = booking.pricing.totalAmount; // Full refund
      } else if (hoursUntilBooking >= 24) {
        refundAmount = booking.pricing.totalAmount * 0.5; // 50% refund
      }
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: new mongoose.Types.ObjectId(req.user?.userId),
      reason: req.body.reason || 'User cancellation',
      refundAmount,
      refundStatus: refundAmount > 0 ? 'pending' : 'not_applicable'
    };

    booking.history.push({
      action: 'cancelled',
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      oldValues: { status: booking.status },
      newValues: { status: 'cancelled' },
      notes: req.body.reason || 'User cancellation'
    } as any);

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
        refundAmount
      }
    });
  } catch (error) {
    next(error);
  }
});


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
router.put('/:bookingId/confirm', [
  authenticateToken
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'stadium_owner' && req.user?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required to confirm bookings'
      });
      return;
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check if booking can be confirmed
    if (booking.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Booking cannot be confirmed. Current status: ${booking.status}`
      });
      return;
    }

    // Update booking status to confirmed
    const oldStatus = booking.status;
    booking.status = 'confirmed';
    
    // Add to history
    booking.history.push({
      action: 'confirmed',
      changedBy: new mongoose.Types.ObjectId(req.user.userId),
      oldValues: { status: oldStatus },
      newValues: { status: 'confirmed' },
      notes: 'Booking confirmed by admin'
    } as any);

    await booking.save();

    // Populate the updated booking for response
    const updatedBooking = await Booking.findById(booking._id)
      .populate('userId', 'name email phone')
      .populate('stadiumId', 'name address phone manager')
      .populate('fieldId', 'fieldName type size')
      .populate('cancellation.cancelledBy', 'name role')
      .populate('history.changedBy', 'name role')
      .populate('assignedStaff.staffId', 'name phone role');

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
});




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
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.isValidObjectId(bookingId)) {
      res.status(400).json({ success: false, message: 'Invalid booking ID' });
      return;
    }

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('stadiumId', 'name address phone manager')
      .populate('fieldId', 'fieldName type size')
      .populate('cancellation.cancelledBy', 'name role')
      .populate('history.changedBy', 'name role')
      .populate('assignedStaff.staffId', 'name phone role');

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    
    // Authorization: Only owner or admin can view
   if (
  booking.userId.toString() !== req.user?.userId &&
  req.user?.role !== 'stadium_owner' &&
  req.user?.role !== 'superadmin'
) {
  res.status(403).json({ success: false, message: 'Access denied' });
  return;
}

    res.json({ success: true, data: booking });
    return;
  } catch (error) {
    next(error);
    return;
  }
});


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
 *               transactionId:
 *                 type: string
 *               gatewayResponse:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment added successfully
 */
router.post('/:bookingId/payment', [
  authenticateToken,
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cash']),
  body('amount').isFloat({ min: 0.01 }),
  body('transactionId').optional().trim()
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user?.userId && req.user?.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { paymentMethod, amount, transactionId, gatewayResponse } = req.body;

    const payment: IPayment = {
      paymentMethod,
      amount,
      currency: booking.pricing.currency || 'LAK',
      status: 'completed',
      transactionId,
      gatewayResponse,
      processedAt: new Date(),
      createdAt: new Date()
    };

    if (!Array.isArray(booking.payments)) {
      booking.payments = [];
    }
    booking.payments.push(payment);

    // Update payment status
    if (booking.payments.reduce((sum, p) => sum + p.amount, 0) >= booking.pricing.totalAmount) {
      booking.paymentStatus = 'paid';
    } else {
      booking.paymentStatus = 'pending';
    }

    booking.history.push({
      action: 'updated',
      changedBy: new mongoose.Types.ObjectId(req.user.userId),
      newValues: { paymentStatus: booking.paymentStatus },
      notes: `Payment of ${amount} ${booking.pricing.currency} received via ${paymentMethod}`
    } as any);

    await booking.save();

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: booking
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});





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
 *                 staffName:
 *                   type: string
 *                 role:
 *                   type: string
 *     responses:
 *       200:
 *         description: Staff assigned successfully
 */
router.post('/:bookingId/assign-staff', [
  authenticateToken,
  body().isArray(),
  body('*.staffId').isMongoId(),
  body('*.role').isIn(['referee', 'manager', 'assistant'])
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only admins can assign staff' });
      return;
    }

    const newAssignments = req.body;
    const now = new Date();

    // Ensure assignedStaff is initialized
    if (!Array.isArray(booking.assignedStaff)) {
      booking.assignedStaff = [];
    }

    for (const assignment of newAssignments) {
      booking.assignedStaff.push({
        staffId: new mongoose.Types.ObjectId(assignment.staffId),
        staffName: assignment.staffName,
        role: assignment.role,
        assignedAt: now,
        status: 'assigned'
      });

      // Log in history
      booking.history.push({
        action: 'updated',
        changedBy: new mongoose.Types.ObjectId(req.user!.userId), // using ! since guard above implies user exists
        newValues: { assignedStaff: assignment.staffName, role: assignment.role },
        notes: `Staff assigned: ${assignment.staffName} as ${assignment.role}`
      } as any);
    }

    await booking.save();

    res.json({
      success: true,
      message: 'Staff assigned successfully',
      data: booking
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Discount applied
 */
router.post('/:bookingId/apply-discount', [
  authenticateToken,
  body('type').isIn(['percentage', 'fixed']),
  body('amount').isFloat({ min: 0 })
], async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only admins can apply discounts' });
      return;
    }

    const { type, amount, description } = req.body;
    const originalTotal = booking.pricing.totalAmount;

    let discountAmount = type === 'percentage' ? (originalTotal * amount) / 100 : amount;
    const newTotal = originalTotal - discountAmount;

    if (newTotal < 0) discountAmount = originalTotal;

    if (!booking.pricing.discounts) {
      booking.pricing.discounts = [];
    }

    booking.pricing.discounts.push({
      type,
      amount: discountAmount,
      description: description || `${type} discount`
    });

    booking.pricing.totalAmount = originalTotal - discountAmount;

    booking.history.push({
      action: 'updated',
      changedBy: new mongoose.Types.ObjectId(req.user.userId),
      oldValues: { totalAmount: originalTotal },
      newValues: { totalAmount: booking.pricing.totalAmount, discount: discountAmount },
      notes: `Discount applied: ${description || type}`
    } as any);

    await booking.save();

    res.json({
      success: true,
      message: 'Discount applied',
      data: booking
    });
    return;
  } catch (error) {
    next(error);
    return;
  }
});

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
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.get(
  '/:bookingId/payments',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingId } = req.params;

      if (!mongoose.isValidObjectId(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID' });
      }

      const booking = await Booking.findById(bookingId).populate('userId', 'name email');

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      // Authorization: only user or admin
      if (booking.userId.toString() !== req.user?.userId && req.user?.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const payments = booking.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      return res.json({
        success: true,
        data: payments,
        totalPaid
      });
    } catch (error) {
      next(error);
      return;
    }
  }
);




export default router;