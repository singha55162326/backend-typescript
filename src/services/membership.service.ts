import { IBooking } from '../models/Booking';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import mongoose from 'mongoose';
import moment from 'moment';
import AvailabilityService from '../utils/availability';

export interface MembershipBookingParams {
  stadiumId: string;
  fieldId: string;
  startDate: Date;
  endDate?: Date;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  userId: string;
  recurrencePattern: 'weekly' | 'biweekly' | 'monthly';
  totalOccurrences?: number;
  teamInfo?: any;
  specialRequests?: string[];
}

export class MembershipService {
  /**
   * Create a series of recurring membership bookings
   */
  static async createMembershipBookings(params: MembershipBookingParams): Promise<IBooking[]> {
    const {
      stadiumId,
      fieldId,
      startDate,
      endDate,
      dayOfWeek,
      startTime,
      endTime,
      userId,
      recurrencePattern,
      totalOccurrences
    } = params;

    const bookings: IBooking[] = [];
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;
    const maxOccurrences = totalOccurrences || 52; // Default to 52 weeks if not specified

    // Adjust the start date to the specified day of the week
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Continue creating bookings until we reach the end date or max occurrences
    while (
      (endDate ? currentDate <= new Date(endDate) : true) && 
      occurrenceCount < maxOccurrences
    ) {
      // Check field availability for this date
      const isAvailable = await this.checkFieldAvailability(
        fieldId,
        currentDate,
        startTime,
        endTime
      );

      if (isAvailable) {
        // Create the booking
        const booking = new Booking({
          userId: new mongoose.Types.ObjectId(userId),
          stadiumId: new mongoose.Types.ObjectId(stadiumId),
          fieldId: new mongoose.Types.ObjectId(fieldId),
          bookingDate: new Date(currentDate),
          startTime,
          endTime,
          durationHours: this.calculateDuration(startTime, endTime),
          pricing: await this.calculatePricing(stadiumId, fieldId, startTime, endTime),
          status: 'confirmed',
          paymentStatus: 'pending',
          bookingType: 'membership',
          teamInfo: params.teamInfo,
          specialRequests: params.specialRequests || [],
          membershipDetails: {
            membershipStartDate: startDate,
            membershipEndDate: endDate,
            recurrencePattern,
            recurrenceDayOfWeek: dayOfWeek,
            nextBookingDate: this.getNextDate(currentDate, recurrencePattern),
            totalOccurrences: totalOccurrences,
            completedOccurrences: occurrenceCount + 1,
            isActive: true
          },
          history: [{
            action: 'created',
            changedBy: new mongoose.Types.ObjectId(userId),
            notes: 'Membership booking created'
          }]
        });

        await booking.save();
        bookings.push(booking);
        occurrenceCount++;
      }

      // Move to the next date based on recurrence pattern
      currentDate = this.getNextDate(currentDate, recurrencePattern);
    }

    return bookings;
  }

  /**
   * Check if a field is available for booking on a specific date and time
   */
  private static async checkFieldAvailability(
    fieldId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    // Use the existing availability service for consistency
    return await AvailabilityService.checkFieldAvailability(
      fieldId,
      date.toISOString().split('T')[0],
      startTime,
      endTime
    );
  }

  /**
   * Calculate the duration in hours between start and end times
   */
  private static calculateDuration(startTime: string, endTime: string): number {
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    return end.diff(start, 'hours', true);
  }

  /**
   * Calculate pricing for a booking
   */
  private static async calculatePricing(
    stadiumId: string,
    fieldId: string,
    startTime: string,
    endTime: string
  ): Promise<any> {
    // Fetch the stadium and field to get actual pricing information
    const stadium = await Stadium.findById(stadiumId);
    if (!stadium || !stadium.fields) {
      throw new Error('Stadium not found');
    }

    // Find the field in the stadium's fields array
    // Note: When fields are populated from MongoDB, they will have _id properties
    // but TypeScript doesn't know this, so we need to cast appropriately
    const field = stadium.fields.find((f: any) => f._id && f._id.toString() === fieldId);
    if (!field) {
      throw new Error('Field not found');
    }

    const duration = this.calculateDuration(startTime, endTime);
    const baseRate = field.pricing.baseHourlyRate || 0;
    const totalAmount = baseRate * duration;

    return {
      baseRate,
      totalAmount,
      currency: field.pricing.currency || 'LAK'
    };
  }

  /**
   * Get the next date based on recurrence pattern
   */
  private static getNextDate(date: Date, pattern: 'weekly' | 'biweekly' | 'monthly'): Date {
    const nextDate = new Date(date);
    
    switch (pattern) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    
    return nextDate;
  }

  /**
   * Get all membership bookings for a user
   */
  static async getUserMembershipBookings(userId: string): Promise<IBooking[]> {
    return await Booking.find({
      userId: new mongoose.Types.ObjectId(userId),
      bookingType: 'membership'
    }).sort({ bookingDate: 1, startTime: 1 });
  }

  /**
   * Cancel a membership booking series
   */
  static async cancelMembershipBookings(bookingId: string, userId: string): Promise<void> {
    // Find the booking to get membership details
    const booking = await Booking.findById(bookingId);
    
    if (!booking || booking.bookingType !== 'membership') {
      throw new Error('Membership booking not found');
    }

    // Check authorization
    if (booking.userId.toString() !== userId) {
      throw new Error('Not authorized to cancel this membership');
    }

    // Cancel all future bookings in the series
    await Booking.updateMany(
      {
        'membershipDetails.membershipStartDate': booking.membershipDetails?.membershipStartDate,
        bookingDate: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] }
      },
      {
        $set: {
          status: 'cancelled',
          'membershipDetails.isActive': false
        },
        $push: {
          history: {
            action: 'cancelled',
            changedBy: new mongoose.Types.ObjectId(userId),
            notes: 'Membership series cancelled'
          }
        }
      }
    );
  }
}