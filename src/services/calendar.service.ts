import Booking, { IBooking } from '../models/Booking';
import Stadium from '../models/Stadium';
import mongoose from 'mongoose';
import moment from 'moment';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  bookingId?: string;
  stadiumId?: string;
  fieldId?: string;
  userId?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  className?: string; // For additional CSS classes
  extendedProps?: { // For additional custom properties
    bookingType?: string;
    totalPrice?: number;
    currency?: string;
    customerName?: string;
    fieldName?: string;
    stadiumName?: string;
  };
}

export interface VisualCalendarData {
  events: CalendarEvent[];
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    eventsByStatus: Record<string, number>;
    eventsByType: Record<string, number>;
    revenue: number;
    currency: string;
  };
  monthlyBreakdown: {
    month: string;
    year: number;
    events: number;
    revenue: number;
  }[];
}

export class CalendarService {
  /**
   * Get status color configuration
   * @param status Booking status
   * @returns Color configuration object
   */
  static getStatusColors(status: string): { 
    backgroundColor: string; 
    borderColor: string; 
    textColor: string;
    className: string;
  } {
    switch (status) {
      case 'pending':
        return {
          backgroundColor: '#ffc107', // Yellow
          borderColor: '#ffc107',
          textColor: '#212529', // Dark text
          className: 'event-pending'
        };
      case 'confirmed':
        return {
          backgroundColor: '#28a745', // Green
          borderColor: '#28a745',
          textColor: '#ffffff', // White text
          className: 'event-confirmed'
        };
      case 'cancelled':
        return {
          backgroundColor: '#dc3545', // Red
          borderColor: '#dc3545',
          textColor: '#ffffff', // White text
          className: 'event-cancelled'
        };
      case 'completed':
        return {
          backgroundColor: '#6c757d', // Gray
          borderColor: '#6c757d',
          textColor: '#ffffff', // White text
          className: 'event-completed'
        };
      case 'no_show':
        return {
          backgroundColor: '#17a2b8', // Teal
          borderColor: '#17a2b8',
          textColor: '#ffffff', // White text
          className: 'event-no-show'
        };
      default:
        return {
          backgroundColor: '#007bff', // Blue (default)
          borderColor: '#007bff',
          textColor: '#ffffff', // White text
          className: 'event-default'
        };
    }
  }

  /**
   * Get calendar events for a user within a date range
   * @param userId User ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of calendar events
   */
  static async getUserCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      // Find bookings for the user within the date range
      const bookings = await Booking.find({
        userId: new mongoose.Types.ObjectId(userId),
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate('stadiumId', 'name').populate('fieldId', 'name');

      // Convert bookings to calendar events
      const events: CalendarEvent[] = bookings.map(booking => {
        const startDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}`);
        const endDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}`);
        
        // Get colors based on status
        const colors = this.getStatusColors(booking.status);
        
        return {
          id: (booking as any)._id.toString(),
          title: `${(booking.stadiumId as any)?.name || 'Unknown Stadium'} - ${(booking.fieldId as any)?.name || 'Unknown Field'}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId.toString(),
          userId: booking.userId.toString(),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency,
            customerName: `${(booking.userId as any)?.name || 'Unknown User'}`,
            fieldName: (booking.fieldId as any)?.name || 'Unknown Field',
            stadiumName: (booking.stadiumId as any)?.name || 'Unknown Stadium'
          }
        };
      });
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get user calendar events: ${error}`);
    }
  }

  /**
   * Get calendar events for a stadium owner within a date range
   * @param ownerId Stadium owner ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of calendar events
   */
  static async getStadiumOwnerCalendarEvents(
    ownerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      // Find stadiums owned by this user
      const stadiums = await Stadium.find({ ownerId: new mongoose.Types.ObjectId(ownerId) });
      const stadiumIds = stadiums.map(stadium => stadium._id);
      
      if (stadiumIds.length === 0) {
        return [];
      }
      
      // Find bookings for these stadiums within the date range
      const bookings = await Booking.find({
        stadiumId: { $in: stadiumIds },
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate('stadiumId', 'name').populate('fieldId', 'name').populate('userId', 'name email');

      // Convert bookings to calendar events
      const events: CalendarEvent[] = bookings.map(booking => {
        const startDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}`);
        const endDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}`);
        
        // Get colors based on status
        const colors = this.getStatusColors(booking.status);
        
        return {
          id: (booking as any)._id.toString(),
          title: `${(booking.userId as any)?.name || 'Unknown User'} - ${(booking.fieldId as any)?.name || 'Unknown Field'}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId.toString(),
          userId: booking.userId.toString(),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency,
            customerName: `${(booking.userId as any)?.name || 'Unknown User'}`,
            fieldName: (booking.fieldId as any)?.name || 'Unknown Field',
            stadiumName: (booking.stadiumId as any)?.name || 'Unknown Stadium'
          }
        };
      });
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get stadium owner calendar events: ${error}`);
    }
  }

  /**
   * Get calendar events for an admin within a date range
   * @param startDate Start date
   * @param endDate End date
   * @param stadiumId Optional stadium filter
   * @returns Array of calendar events
   */
  static async getAdminCalendarEvents(
    startDate: Date,
    endDate: Date,
    stadiumId?: string
  ): Promise<CalendarEvent[]> {
    try {
      // Build query
      const query: any = {
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      if (stadiumId) {
        query.stadiumId = new mongoose.Types.ObjectId(stadiumId);
      }
      
      // Find all bookings within the date range
      const bookings = await Booking.find(query)
        .populate('stadiumId', 'name')
        .populate('fieldId', 'name')
        .populate('userId', 'name email') as IBooking[];

      // Convert bookings to calendar events
      const events: CalendarEvent[] = bookings.map(booking => {
        const startDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}`);
        const endDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}`);
        
        // Get colors based on status
        const colors = this.getStatusColors(booking.status);
        
        return {
          id: (booking as any)._id.toString(),
          title: `${(booking.userId as any)?.name || 'Unknown User'} - ${(booking.stadiumId as any)?.name || 'Unknown Stadium'} - ${(booking.fieldId as any)?.name || 'Unknown Field'}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId.toString(),
          userId: booking.userId.toString(),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency,
            customerName: `${(booking.userId as any)?.name || 'Unknown User'}`,
            fieldName: (booking.fieldId as any)?.name || 'Unknown Field',
            stadiumName: (booking.stadiumId as any)?.name || 'Unknown Stadium'
          }
        };
      });
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get admin calendar events: ${error}`);
    }
  }

  /**
   * Get calendar events for a specific stadium within a date range
   * @param stadiumId Stadium ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of calendar events
   */
  static async getStadiumCalendarEvents(
    stadiumId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      // Find bookings for the stadium within the date range
      const bookings = await Booking.find({
        stadiumId: new mongoose.Types.ObjectId(stadiumId),
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate('stadiumId', 'name').populate('fieldId', 'name').populate('userId', 'name email') as IBooking[];

      // Convert bookings to calendar events
      const events: CalendarEvent[] = bookings.map(booking => {
        const startDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}`);
        const endDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}`);
        
        // Get colors based on status
        const colors = this.getStatusColors(booking.status);
        
        return {
          id: (booking as any)._id.toString(),
          title: `${(booking.userId as any)?.name || 'Unknown User'} - ${(booking.fieldId as any)?.name || 'Unknown Field'}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId.toString(),
          userId: booking.userId.toString(),
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency,
            customerName: `${(booking.userId as any)?.name || 'Unknown User'}`,
            fieldName: (booking.fieldId as any)?.name || 'Unknown Field',
            stadiumName: (booking.stadiumId as any)?.name || 'Unknown Stadium'
          }
        };
      });
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get stadium calendar events: ${error}`);
    }
  }

  /**
   * Generate visual calendar data with summary statistics
   * @param events Calendar events
   * @param startDate Start date
   * @param endDate End date
   * @returns Visual calendar data with summary
   */
  static generateVisualCalendarData(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date
  ): VisualCalendarData {
    // Calculate summary statistics
    const eventsByStatus: Record<string, number> = {};
    const eventsByType: Record<string, number> = {};
    let totalRevenue = 0;
    let currency = 'LAK';

    events.forEach(event => {
      // Count by status
      eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;
      
      // Count by type
      const bookingType = event.extendedProps?.bookingType || 'regular';
      eventsByType[bookingType] = (eventsByType[bookingType] || 0) + 1;
      
      // Calculate revenue
      if (event.extendedProps?.totalPrice) {
        totalRevenue += event.extendedProps.totalPrice;
        currency = event.extendedProps.currency || currency;
      }
    });

    // Generate monthly breakdown
    const monthlyBreakdown: VisualCalendarData['monthlyBreakdown'] = [];
    const months = new Set<string>();
    
    events.forEach(event => {
      const monthKey = `${event.start.getFullYear()}-${event.start.getMonth()}`;
      months.add(monthKey);
    });
    
    months.forEach(monthKey => {
      const [year, monthIndex] = monthKey.split('-').map(Number);
      const monthEvents = events.filter(event => 
        event.start.getFullYear() === year && event.start.getMonth() === monthIndex
      );
      
      let monthRevenue = 0;
      monthEvents.forEach(event => {
        if (event.extendedProps?.totalPrice) {
          monthRevenue += event.extendedProps.totalPrice;
        }
      });
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      monthlyBreakdown.push({
        month: monthNames[monthIndex],
        year,
        events: monthEvents.length,
        revenue: monthRevenue
      });
    });

    return {
      events,
      dateRange: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalEvents: events.length,
        eventsByStatus,
        eventsByType,
        revenue: totalRevenue,
        currency
      },
      monthlyBreakdown
    };
  }

  /**
   * Reschedule a booking to a new date and time
   * @param bookingId Booking ID
   * @param newDate New booking date
   * @param newStartTime New start time
   * @param newEndTime New end time
   * @param userId User ID (for authorization)
   * @returns Updated booking
   */
  static async rescheduleBooking(
    bookingId: string,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    userId: string
  ): Promise<IBooking> {
    try {
      // Find the booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check authorization - only booking owner or admin can reschedule
      if (booking.userId.toString() !== userId && userId !== 'superadmin') {
        throw new Error('Not authorized to reschedule this booking');
      }

      // Check if the new time slot is available
      const existingBooking = await Booking.findOne({
        fieldId: booking.fieldId,
        bookingDate: newDate,
        $or: [
          {
            $and: [
              { startTime: { $lt: newEndTime } },
              { endTime: { $gt: newStartTime } }
            ]
          }
        ],
        status: { $in: ['pending', 'confirmed'] },
        _id: { $ne: bookingId } // Exclude the current booking
      });

      if (existingBooking) {
        throw new Error('Time slot is already booked');
      }

      // Update the booking
      booking.bookingDate = newDate;
      booking.startTime = newStartTime;
      booking.endTime = newEndTime;
      
      // Recalculate duration
      const startMoment = moment(newStartTime, 'HH:mm');
      const endMoment = moment(newEndTime, 'HH:mm');
      booking.durationHours = endMoment.diff(startMoment, 'hours', true);
      
      // Add to history
      booking.history.push({
        action: 'updated',
        changedBy: new mongoose.Types.ObjectId(userId),
        oldValues: {
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime
        },
        newValues: {
          bookingDate: newDate,
          startTime: newStartTime,
          endTime: newEndTime
        },
        notes: 'Booking rescheduled'
      } as any);

      await booking.save();
      
      // Populate related fields
      await booking.populate('stadiumId', 'name');
      await booking.populate('fieldId', 'name');
      await booking.populate('userId', 'name email');
      
      return booking;
    } catch (error) {
      throw new Error(`Failed to reschedule booking: ${error}`);
    }
  }

  /**
   * Get visual calendar data for a user within a date range
   * @param userId User ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Visual calendar data with events and summary
   */
  static async getUserVisualCalendarData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VisualCalendarData> {
    try {
      const events = await this.getUserCalendarEvents(userId, startDate, endDate);
      return this.generateVisualCalendarData(events, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get user visual calendar data: ${error}`);
    }
  }

  /**
   * Get visual calendar data for a stadium owner within a date range
   * @param ownerId Stadium owner ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Visual calendar data with events and summary
   */
  static async getStadiumOwnerVisualCalendarData(
    ownerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VisualCalendarData> {
    try {
      const events = await this.getStadiumOwnerCalendarEvents(ownerId, startDate, endDate);
      return this.generateVisualCalendarData(events, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get stadium owner visual calendar data: ${error}`);
    }
  }

  /**
   * Get visual calendar data for an admin within a date range
   * @param startDate Start date
   * @param endDate End date
   * @param stadiumId Optional stadium filter
   * @returns Visual calendar data with events and summary
   */
  static async getAdminVisualCalendarData(
    startDate: Date,
    endDate: Date,
    stadiumId?: string
  ): Promise<VisualCalendarData> {
    try {
      const events = await this.getAdminCalendarEvents(startDate, endDate, stadiumId);
      return this.generateVisualCalendarData(events, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get admin visual calendar data: ${error}`);
    }
  }
}