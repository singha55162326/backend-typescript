// src/services/bookingService.ts
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import moment from 'moment-timezone';
import mongoose from 'mongoose';
import { IPayment, IBooking, IAssignedStaff } from '../types/booking.types';

export class BookingService {
  /**
   * Check if a time slot is available
   */
  static async checkAvailability(fieldId: string, bookingDate: Date, startTime: string, endTime: string, excludeBookingId?: string): Promise<boolean> {
    const query: any = {
      fieldId,
      bookingDate,
      $or: [
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
          ]
        }
      ],
      status: { $in: ['pending', 'confirmed'] }
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const existingBooking = await Booking.findOne(query);
    return !existingBooking;
  }

  /**
   * Get stadium and field details
   */
  static async getStadiumAndField(stadiumId: string, fieldId: string): Promise<{ stadium: any; field: any } | null> {
    const stadium = await Stadium.findById(stadiumId);
    if (!stadium || !stadium.fields || !Array.isArray(stadium.fields)) {
      return null;
    }

    const field = stadium.fields.find((f: any) => f._id?.toString() === fieldId);
    if (!field) {
      return null;
    }

    return { stadium, field };
  }

  /**
   * Calculate booking pricing
   */
  static calculatePricing(field: any, startTime: string, endTime: string, refereeCharges: any[] = []): {
    durationHours: number;
    baseAmount: number;
    totalRefereeCharges: number;
    totalAmount: number;
  } {
    const startMoment = moment(startTime, 'HH:mm');
    const endMoment = moment(endTime, 'HH:mm');
    const durationHours = endMoment.diff(startMoment, 'hours', true);
    const baseRate = field.pricing?.baseHourlyRate || 0;
    const baseAmount = baseRate * durationHours;
    const totalRefereeCharges = refereeCharges.reduce((sum: number, charge: any) => sum + charge.total, 0);
    const totalAmount = baseAmount + totalRefereeCharges;

    return {
      durationHours,
      baseAmount,
      totalRefereeCharges,
      totalAmount
    };
  }

  /**
   * Auto-assign referee if needed and available
   */
  static findAvailableReferee(stadium: any, bookingDate: string, startTime: string, endTime: string): {
    assignedStaff: any[];
    refereeCharges: any[];
  } {
    const assignedStaff = [];
    const refereeCharges = [];

    if (stadium.staff && Array.isArray(stadium.staff)) {
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
        const durationHours = moment(endTime, 'HH:mm').diff(moment(startTime, 'HH:mm'), 'hours', true);

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

    return { assignedStaff, refereeCharges };
  }

  /**
   * Create booking with all necessary data
   */
  static async createBooking(bookingData: any): Promise<any> {
    const booking = new Booking(bookingData);
    await booking.save();
    return booking;
  }

  /**
   * Calculate cancellation refund
   */
  static calculateRefund(booking: any): number {
    const bookingDateTime = moment.tz(
      `${booking.bookingDate.toISOString().split('T')[0]} ${booking.startTime}`,
      'YYYY-MM-DD HH:mm',
      'Asia/Vientiane'
    );
    const now = moment.tz('Asia/Vientiane');
    const hoursUntilBooking = bookingDateTime.diff(now, 'hours');

    let refundAmount = 0;
    if (booking.paymentStatus === 'paid') {
      if (hoursUntilBooking >= 48) {
        refundAmount = booking.pricing.totalAmount; // Full refund
      } else if (hoursUntilBooking >= 24) {
        refundAmount = booking.pricing.totalAmount * 0.5; // 50% refund
      }
    }

    return refundAmount;
  }

  /**
   * Check if cancellation is allowed
   */
  static isCancellationAllowed(booking: any, userRole?: string): { allowed: boolean; reason?: string } {
    const bookingDateTime = moment.tz(
      `${booking.bookingDate.toISOString().split('T')[0]} ${booking.startTime}`,
      'YYYY-MM-DD HH:mm',
      'Asia/Vientiane'
    );
    const now = moment.tz('Asia/Vientiane');
    const hoursUntilBooking = bookingDateTime.diff(now, 'hours');

    if (hoursUntilBooking < 24 && userRole !== 'stadium_owner' && userRole !== 'superadmin') {
      return {
        allowed: false,
        reason: 'Bookings can only be cancelled 24 hours in advance'
      };
    }

    if (booking.status === 'cancelled') {
      return {
        allowed: false,
        reason: 'Booking is already cancelled'
      };
    }

    if (booking.status === 'completed') {
      return {
        allowed: false,
        reason: 'Completed bookings cannot be cancelled'
      };
    }

    return { allowed: true };
  }

  /**
   * Update booking payment status based on payments
   */
  static updatePaymentStatus(booking: any): void {
    if (!Array.isArray(booking.payments)) {
      booking.paymentStatus = 'pending';
      return;
    }

    const totalPaid = booking.payments
      .filter((p: IPayment) => p.status === 'completed')
      .reduce((sum: number, p: IPayment) => sum + p.amount, 0);

    if (totalPaid >= booking.pricing.totalAmount) {
      booking.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      booking.paymentStatus = 'pending';
    } else {
      booking.paymentStatus = 'pending';
    }
  }

  /**
   * Add history entry to booking
   */
  static addHistoryEntry(booking: any, action: string, changedBy: string, oldValues?: any, newValues?: any, notes?: string): void {
    if (!Array.isArray(booking.history)) {
      booking.history = [];
    }

    booking.history.push({
      action,
      changedBy: new mongoose.Types.ObjectId(changedBy),
      oldValues,
      newValues,
      notes,
      timestamp: new Date()
    });
  }

  /**
   * Get bookings with filters and pagination
   */
  static async getBookings(filters: any, pagination: { page: number; limit: number; skip: number }): Promise<{ bookings: any[]; total: number }> {
    const { page, limit, skip } = pagination;
    
    const bookings = await Booking.find(filters)
      .populate('userId', 'name email phone')
      .populate('stadiumId', 'name address')
      .populate('fieldId', 'fieldName type')
      .sort({ createdAt: -1, bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(filters);

    return { bookings, total };
  }

  /**
   * Get user's bookings with filters and pagination
   */
  static async getUserBookings(userId: string, filters: any, pagination: { page: number; limit: number; skip: number }): Promise<{ bookings: any[]; total: number }> {
    const { page, limit, skip } = pagination;
    const query = { userId, ...filters };
    
    const bookings = await Booking.find(query)
      .populate('stadiumId', 'name address')
      .sort({ bookingDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    return { bookings, total };
  }

  /**
   * Find booking by ID with full population
   */
  static async getBookingById(bookingId: string): Promise<any | null> {
    if (!mongoose.isValidObjectId(bookingId)) {
      return null;
    }

    return await Booking.findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('stadiumId', 'name address phone manager')
      .populate('fieldId', 'fieldName type size')
      .populate('cancellation.cancelledBy', 'name role')
      .populate('history.changedBy', 'name role')
      .populate('assignedStaff.staffId', 'name phone role');
  }

  /**
   * Check user authorization for booking
   */
  static isUserAuthorized(booking: any, userId: string, userRole?: string): boolean {
    return booking.userId.toString() === userId || 
           userRole === 'stadium_owner' || 
           userRole === 'superadmin';
  }

  /**
   * Check admin authorization
   */
  static isAdminAuthorized(userRole?: string): boolean {
    return userRole === 'stadium_owner' || userRole === 'superadmin' || userRole === 'admin';
  }

  /**
   * Apply discount to booking
   */
  static applyDiscount(booking: any, discountType: 'percentage' | 'fixed', amount: number, description?: string): number {
    const originalTotal = booking.pricing.totalAmount;
    let discountAmount = discountType === 'percentage' ? (originalTotal * amount) / 100 : amount;
    
    if (originalTotal - discountAmount < 0) {
      discountAmount = originalTotal;
    }

    if (!booking.pricing.discounts) {
      booking.pricing.discounts = [];
    }

    booking.pricing.discounts.push({
      type: discountType,
      amount: discountAmount,
      description: description || `${discountType} discount`
    });

    booking.pricing.totalAmount = originalTotal - discountAmount;
    return discountAmount;
  }

  /**
   * Generate booking number
   */
  static generateBookingNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const time = now.getTime().toString().slice(-6);
    return `BK${year}${month}${day}${time}`;
  }
}