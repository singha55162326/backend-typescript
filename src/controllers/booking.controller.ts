// src/controllers/bookingController.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import moment from 'moment-timezone';
import mongoose from 'mongoose';
import { IPayment } from '../types/booking.types';

export class BookingController {
  /**
   * Create a new booking
   */
  static async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
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
          const referee = availableReferees[0];
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
  }

  /**
   * Get current user's bookings
   */
  static async getUserBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  }

  /**
   * Get all bookings (Admin only)
   */
  static async getAllBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  }

  /**
   * Get booking details by ID
   */
  static async getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  }

  /**
   * Confirm a booking (Admin only)
   */
  static async confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  }

  /**
   * Add payment to booking
   */
  static async addPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      if (booking.userId.toString() !== req.user?.userId && req.user?.role !== 'superadmin') {
        res.status(403).json({ success: false, message: 'Not authorized' });
        return;
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all payments for a booking
   */
  static async getBookingPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;

      if (!mongoose.isValidObjectId(bookingId)) {
        res.status(400).json({ success: false, message: 'Invalid booking ID' });
        return;
      }

      const booking = await Booking.findById(bookingId).populate('userId', 'name email');

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      // Authorization: only user or admin
      if (booking.userId.toString() !== req.user?.userId && req.user?.role !== 'superadmin') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      const payments = booking.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      res.json({
        success: true,
        data: payments,
        totalPaid
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign staff to booking
   */
  static async assignStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
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
          changedBy: new mongoose.Types.ObjectId(req.user!.userId),
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply discount to booking
   */
  static async applyDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    } catch (error) {
      next(error);
    }
  }
}