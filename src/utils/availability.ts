import moment from 'moment-timezone';
import Booking from '../models/Booking';
import { IField } from '../models/Stadium';

interface ITimeSlot {
  startTime: string;
  endTime: string;
  rate: number;
  currency: string;
  status?: 'available' | 'unavailable';
}

interface IUnavailableSlot {
  startTime: string;
  endTime: string;
  rate: number;
  currency: string;
  reason: string;
  status: 'schedule_unavailable' | 'booked';
  bookingStatus?: string;
}

interface IAvailableReferee {
  _id: string;
  name: string;
  specializations: string[];
  certifications: any[];
  rate: number;
  currency: string;
}

// Define interface for the actual slot structure from field data
interface IFieldTimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  specialRate?: number; // Optional special rate
}

class AvailabilityService {
  static async checkFieldAvailability(
    fieldId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId: string | null = null
  ): Promise<boolean> {
    // Allow booking for future dates by removing the past date check
    const query: any = {
      fieldId,
      bookingDate: new Date(date),
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } }
          ]
        }
      ]
    };

    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    const conflictingBooking = await Booking.findOne(query);
    return !conflictingBooking;
  }

  static async getAvailableTimeSlots(
    fieldId: string,
    date: string,
    field: IField
  ): Promise<ITimeSlot[]> {
    const dayOfWeek = moment(date).day();
    const availableSlots: ITimeSlot[] = [];

    // Get regular schedule for the day
    const daySchedule = field.availabilitySchedule?.find((schedule: { dayOfWeek: number; }) => 
      schedule.dayOfWeek === dayOfWeek
    );

    if (!daySchedule) {
      return availableSlots;
    }

    // Check for special dates
    const specialDate = field.specialDates?.find((special: { date: moment.MomentInput; }) => 
      moment(special.date).isSame(moment(date), 'day')
    );

    const timeSlots = specialDate ? specialDate.timeSlots : daySchedule.timeSlots;

    // Get existing bookings for the date
    const existingBookings = await Booking.find({
      fieldId,
      bookingDate: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    }).select('startTime endTime');

    // Filter available slots
    for (const slot of timeSlots as IFieldTimeSlot[]) {
      if (!slot.isAvailable) continue;

      const isSlotAvailable = !existingBookings.some(booking => 
        (booking.startTime < slot.endTime && booking.endTime > slot.startTime)
      );

      if (isSlotAvailable) {
        availableSlots.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          rate: slot.specialRate || field.pricing.baseHourlyRate,
          currency: 'LAK'
        });
      }
    }

    return availableSlots;
  }

  static async getComprehensiveAvailability(
    fieldId: string,
    date: string,
    field: IField
  ): Promise<{
    availableSlots: ITimeSlot[];
    unavailableSlots: IUnavailableSlot[];
    summary: {
      totalSlots: number;
      availableCount: number;
      unavailableCount: number;
    };
  }> {
    const dayOfWeek = moment(date).day();
    const availableSlots: ITimeSlot[] = [];
    const unavailableSlots: IUnavailableSlot[] = [];

    // Get regular schedule for the day
    const daySchedule = field.availabilitySchedule?.find((schedule: { dayOfWeek: number; }) => 
      schedule.dayOfWeek === dayOfWeek
    );

    if (!daySchedule) {
      return {
        availableSlots: [],
        unavailableSlots: [],
        summary: {
          totalSlots: 0,
          availableCount: 0,
          unavailableCount: 0
        }
      };
    }

    // Check for special dates
    const specialDate = field.specialDates?.find((special: { date: moment.MomentInput; }) => 
      moment(special.date).isSame(moment(date), 'day')
    );

    const timeSlots = specialDate ? specialDate.timeSlots : daySchedule.timeSlots;

    // Get existing bookings for the date
    const existingBookings = await Booking.find({
      fieldId,
      bookingDate: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    }).select('startTime endTime status');

    // Process each time slot
    for (const slot of timeSlots as IFieldTimeSlot[]) {
      const slotData = {
        startTime: slot.startTime,
        endTime: slot.endTime,
        rate: slot.specialRate || field.pricing.baseHourlyRate,
        currency: 'LAK'
      };

      // Check if slot is marked as unavailable in schedule
      if (!slot.isAvailable) {
        unavailableSlots.push({
          ...slotData,
          reason: 'Not available in schedule',
          status: 'schedule_unavailable'
        });
        continue;
      }

      // Check for booking conflicts
      const conflictingBooking = existingBookings.find(booking => 
        (booking.startTime < slot.endTime && booking.endTime > slot.startTime)
      );

      if (conflictingBooking) {
        unavailableSlots.push({
          ...slotData,
          reason: `Already booked (${conflictingBooking.status})`,
          status: 'booked',
          bookingStatus: conflictingBooking.status
        });
      } else {
        availableSlots.push({
          ...slotData,
          status: 'available'
        });
      }
    }

    return {
      availableSlots,
      unavailableSlots,
      summary: {
        totalSlots: timeSlots.length,
        availableCount: availableSlots.length,
        unavailableCount: unavailableSlots.length
      }
    };
  }

  static async getAvailableReferees(
    stadiumStaff: any[],
    date: string,
    startTime: string,
    endTime: string
  ): Promise<IAvailableReferee[]> {
    const dayOfWeek = moment(date).day();
        
    return stadiumStaff.filter(staff => {
      if (staff.role !== 'referee' || staff.status !== 'active') {
        return false;
      }

      // Check availability schedule
      return staff.availability.some((avail: any) => 
        avail.dayOfWeek === dayOfWeek &&
        avail.startTime <= startTime &&
        avail.endTime >= endTime &&
        avail.isAvailable
      );
    }).map((referee: any) => ({
      _id: referee._id,
      name: referee.name,
      specializations: referee.specializations || [],
      certifications: referee.certifications || [],
      rate: referee.rates.hourlyRate,
      currency: referee.rates.currency || 'LAK'
    }));
  }
}

export default AvailabilityService;