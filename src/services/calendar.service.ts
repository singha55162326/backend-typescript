import Booking, { IBooking } from '../models/Booking';
import Stadium, { IStadium } from '../models/Stadium';
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
  className?: string;
  extendedProps?: {
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
          backgroundColor: '#ffc107',
          borderColor: '#ffc107',
          textColor: '#212529',
          className: 'event-pending'
        };
      case 'confirmed':
        return {
          backgroundColor: '#28a745',
          borderColor: '#28a745',
          textColor: '#ffffff',
          className: 'event-confirmed'
        };
      case 'cancelled':
        return {
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
          textColor: '#ffffff',
          className: 'event-cancelled'
        };
      case 'completed':
        return {
          backgroundColor: '#6c757d',
          borderColor: '#6c757d',
          textColor: '#ffffff',
          className: 'event-completed'
        };
      case 'no_show':
        return {
          backgroundColor: '#17a2b8',
          borderColor: '#17a2b8',
          textColor: '#ffffff',
          className: 'event-no-show'
        };
      default:
        return {
          backgroundColor: '#007bff',
          borderColor: '#007bff',
          textColor: '#ffffff',
          className: 'event-default'
        };
    }
  }

  /**
   * Get field name from stadium fields array
   */
  private static getFieldName(stadium: any, fieldId: string): string {
    if (!stadium?.fields || !Array.isArray(stadium.fields)) {
      return 'Unknown Field';
    }

    try {
      // Validate fieldId before creating ObjectId
      if (!mongoose.Types.ObjectId.isValid(fieldId)) {
        return 'Unknown Field';
      }
      
      const fieldObjectId = new mongoose.Types.ObjectId(fieldId);
      const field = stadium.fields.find((f: any) => 
        f._id && fieldObjectId && f._id.equals(fieldObjectId));

      return field?.name || 'Unknown Field';
    } catch (error) {
      return 'Unknown Field';
    }
  }

  /**
   * Get calendar events for a user within a date range
   */
  static async getUserCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      // Validate userId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      // Find bookings for the user within the date range
      const bookings = await Booking.find({
        userId: new mongoose.Types.ObjectId(userId),
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .populate('stadiumId', 'name fields')
      .populate('userId', 'name');

      // Get all stadium IDs to fetch full stadium data with fields
      const stadiumIds = [...new Set(bookings.map(booking => 
        (booking as any).stadiumId?.toString()
      ).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
      
      let stadiums: IStadium[] = [];
      if (stadiumIds.length > 0) {
        stadiums = await Stadium.find({ 
          _id: { $in: stadiumIds.map(id => new mongoose.Types.ObjectId(id)) }
        }).select('name fields');
      }

      // Create stadium map for quick lookup
      const stadiumMap = new Map<string, IStadium>();
      stadiums.forEach(stadium => {
        stadiumMap.set((stadium as any)._id.toString(), stadium);
      });

      // Convert bookings to calendar events
      const events: CalendarEvent[] = [];
      
      for (const booking of bookings) {
        const stadium = stadiumMap.get((booking as any).stadiumId?.toString());
        // Validate fieldId before processing
        let fieldName = 'Unknown Field';
        if ((booking as any).fieldId && mongoose.Types.ObjectId.isValid((booking as any).fieldId.toString())) {
          fieldName = this.getFieldName(stadium, (booking as any).fieldId.toString());
        }
        
        // Create date objects using moment with timezone to avoid timezone issues
        const startDateStr = `${(booking as any).bookingDate.toISOString().split('T')[0]}T${(booking as any).startTime}`;
        const endDateStr = `${(booking as any).bookingDate.toISOString().split('T')[0]}T${(booking as any).endTime}`;
        const startDateTime = new Date(startDateStr);
        const endDateTime = new Date(endDateStr);
        
        const colors = this.getStatusColors((booking as any).status);
        
        events.push({
          id: (booking as any)._id.toString(),
          title: `${stadium?.name || 'Unknown Stadium'} - ${fieldName}`,
          start: startDateTime,
          end: endDateTime,
          status: (booking as any).status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: (booking as any).stadiumId?.toString() || '',
          fieldId: (booking as any).fieldId?.toString() || '',
          userId: (booking as any).userId?.toString() || '',
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: (booking as any).bookingType,
            totalPrice: (booking as any).pricing?.totalAmount,
            currency: (booking as any).pricing?.currency,
            customerName: ((booking as any).userId as any)?.name || 'Unknown User',
            fieldName: fieldName,
            stadiumName: stadium?.name || 'Unknown Stadium'
          }
        });
      }
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get user calendar events: ${error}`);
    }
  }

  /**
   * Get calendar events for a stadium owner within a date range
   */
  static async getStadiumOwnerCalendarEvents(
    ownerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      // Validate ownerId
      if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        throw new Error('Invalid owner ID format');
      }
      
      // Find stadiums owned by this user with full fields data
      const stadiums = await Stadium.find({ 
        ownerId: new mongoose.Types.ObjectId(ownerId) 
      }).select('name fields');
      
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
      })
      .populate('userId', 'name email');

      // Create stadium map for quick lookup
      const stadiumMap = new Map<string, IStadium>();
      stadiums.forEach(stadium => {
        stadiumMap.set((stadium as any)._id.toString(), stadium);
      });
      
      // Convert bookings to calendar events
      const events: CalendarEvent[] = [];
      
      for (const booking of bookings) {
        const stadium = stadiumMap.get(booking.stadiumId.toString());
        // Validate fieldId before processing
        let fieldName = 'Unknown Field';
        if (booking.fieldId && mongoose.Types.ObjectId.isValid(booking.fieldId.toString())) {
          fieldName = this.getFieldName(stadium, booking.fieldId.toString());
        }
        
        // Create date objects using moment with timezone to avoid timezone issues
        const startDateStr = `${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}`;
        const endDateStr = `${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}`;
        const startDateTime = new Date(startDateStr);
        const endDateTime = new Date(endDateStr);
        
        const colors = this.getStatusColors(booking.status);
        
        events.push({
          id: (booking as any)._id.toString(),
          title: `${stadium?.name || 'Unknown Stadium'} - ${fieldName}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId?.toString() || '',
          userId: booking.userId?.toString() || '',
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency,
            customerName: (booking.userId as any)?.name || 'Unknown User',
            fieldName: fieldName,
            stadiumName: stadium?.name || 'Unknown Stadium'
          }
        });
      }
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get stadium owner calendar events: ${error}`);
    }
  }

  /**
   * Get calendar events for admin within a date range
   */
  static async getAdminCalendarEvents(
  startDate: Date,
  endDate: Date,
  stadiumId?: string
): Promise<CalendarEvent[]> {
  try {
    console.log('Fetching admin calendar events:', { startDate, endDate, stadiumId });
    
    // Build query
    const query: any = {
      bookingDate: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Only add stadiumId to query if it's provided and valid
    if (stadiumId && stadiumId !== '' && stadiumId !== 'undefined' && mongoose.Types.ObjectId.isValid(stadiumId)) {
      query.stadiumId = new mongoose.Types.ObjectId(stadiumId);
    }
    
    console.log('Database query:', query);
    
    // Find all bookings within the date range with populated stadium and user data
    const bookings = await Booking.find(query)
      .populate('stadiumId', 'name fields')
      .populate('userId', 'name email')
      .lean() as IBooking[];

    console.log(`Found ${bookings.length} bookings`);

    // If no bookings found, return empty array
    if (bookings.length === 0) {
      return [];
    }

    // Convert bookings to calendar events
    const events: CalendarEvent[] = [];
    
    // Process each booking to get field information
    for (const booking of bookings) {
      try {
        // Skip if stadiumId is missing
        if (!booking.stadiumId) {
          console.warn('Booking missing stadiumId:', booking._id);
          continue;
        }

        // Get stadium name from populated data
        const stadiumName = (booking.stadiumId as any)?.name || 'Unknown Stadium';
        
        // Get field name from stadium's fields array
        let fieldName = 'Unknown Field';
        const stadiumData = booking.stadiumId as any;
        
        if (stadiumData?.fields && Array.isArray(stadiumData.fields) && booking.fieldId) {
          // Validate fieldId before creating ObjectId
          if (mongoose.Types.ObjectId.isValid(booking.fieldId.toString())) {
            const fieldObjectId = new mongoose.Types.ObjectId(booking.fieldId);
            const field = stadiumData.fields.find((f: any) => 
              f._id && fieldObjectId && f._id.equals(fieldObjectId)
            );
            if (field) {
              fieldName = field.name;
            }
          }
        }
        
        // Create date objects for start and end times
        const startDateTime = new Date(booking.bookingDate);
        const [startHours, startMinutes] = booking.startTime.split(':').map(Number);
        startDateTime.setHours(startHours, startMinutes, 0, 0);

        const endDateTime = new Date(booking.bookingDate);
        const [endHours, endMinutes] = booking.endTime.split(':').map(Number);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        // Get colors based on status
        const colors = this.getStatusColors(booking.status);
        
        events.push({
          id: (booking as any)._id.toString(),
          title: `${stadiumName} - ${fieldName}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId?.toString() || '',
          userId: booking.userId?.toString() || '',
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency || 'USD',
            customerName: `${(booking.userId as any)?.name || 'Unknown User'}`,
            fieldName: fieldName,
            stadiumName: stadiumName
          }
        });
      } catch (bookingError) {
        console.error('Error processing booking:', booking._id, bookingError);
        // Continue with next booking instead of failing entire request
        continue;
      }
    }
    
    console.log(`Successfully processed ${events.length} events`);
    return events;
  } catch (error) {
    console.error('Failed to get admin calendar events:', error);
    throw new Error(`Failed to get admin calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

  /**
   * Get calendar events for a specific stadium
   */
  static async getStadiumCalendarEvents(
    stadiumId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      // Validate stadiumId
      if (!mongoose.Types.ObjectId.isValid(stadiumId)) {
        throw new Error('Invalid stadium ID format');
      }
      
      // Find stadium with full fields data
      const stadium = await Stadium.findById(stadiumId).select('name fields').lean();
      if (!stadium) {
        throw new Error('Stadium not found');
      }

      // Find bookings for the stadium within the date range
      const bookings = await Booking.find({
        stadiumId: new mongoose.Types.ObjectId(stadiumId),
        bookingDate: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .populate('userId', 'name email')
      .lean();

      // Convert bookings to calendar events
      const events: CalendarEvent[] = [];
      
      for (const booking of bookings) {
        // Validate fieldId before processing
        let fieldName = 'Unknown Field';
        if (booking.fieldId && mongoose.Types.ObjectId.isValid(booking.fieldId.toString())) {
          fieldName = this.getFieldName(stadium, booking.fieldId.toString());
        }
        
        // Create date objects using moment with timezone to avoid timezone issues
        const startDateStr = `${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}`;
        const endDateStr = `${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}`;
        const startDateTime = new Date(startDateStr);
        const endDateTime = new Date(endDateStr);
        
        const colors = this.getStatusColors(booking.status);
        
        events.push({
          id: (booking as any)._id.toString(),
          title: `${stadium.name} - ${fieldName}`,
          start: startDateTime,
          end: endDateTime,
          status: booking.status,
          bookingId: (booking as any)._id.toString(),
          stadiumId: booking.stadiumId.toString(),
          fieldId: booking.fieldId?.toString() || '',
          userId: booking.userId?.toString() || '',
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          textColor: colors.textColor,
          className: colors.className,
          extendedProps: {
            bookingType: booking.bookingType,
            totalPrice: booking.pricing?.totalAmount,
            currency: booking.pricing?.currency,
            customerName: booking.userId ? `${(booking.userId as any)?.name || 'Unknown User'}` : 'Unknown User',
            fieldName: fieldName,
            stadiumName: stadium.name
          }
        });
      }
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get stadium calendar events: ${error}`);
    }
  }

  /**
   * Generate visual calendar data with summary statistics
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
   */
  static async rescheduleBooking(
    bookingId: string,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    userId: string
  ): Promise<IBooking> {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check authorization - allow booking owner, superadmin, or stadium owner to reschedule
      const isBookingOwner = booking.userId.toString() === userId;
      const isSuperAdmin = userId === 'superadmin';
      
      // Check if user is stadium owner for this booking
      let isStadiumOwner = false;
      if (!isBookingOwner && !isSuperAdmin) {
        // Get the stadium to check if the user is the owner
        const stadium = await Stadium.findById(booking.stadiumId);
        if (stadium && stadium.ownerId.toString() === userId) {
          isStadiumOwner = true;
        }
      }
      
      if (!isBookingOwner && !isSuperAdmin && !isStadiumOwner) {
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
        _id: { $ne: bookingId }
      });

      if (existingBooking) {
        throw new Error('Time slot is already booked');
      }

      // Update the booking
      booking.bookingDate = newDate;
      booking.startTime = newStartTime;
      booking.endTime = newEndTime;
      
      // Set status to completed when rescheduled
      booking.status = 'completed';
      
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
          endTime: booking.endTime,
          status: booking.status
        },
        newValues: {
          bookingDate: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          status: 'completed'
        },
        notes: 'Booking rescheduled and marked as completed'
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