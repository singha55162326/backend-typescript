import moment from 'moment-timezone';
import Booking from '../models/Booking';
import { IField } from '../models/Stadium';

interface ITimeSlot {
  startTime: string;
  endTime: string;
  rate: number;
  currency: string;
}

interface IAvailableReferee {
  _id: string;
  name: string;
  specializations: string[];
  certifications: any[];
  rate: number;
  currency: string;
}

class AvailabilityService {
  static async checkFieldAvailability(
    fieldId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId: string | null = null
  ): Promise<boolean> {
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
    for (const slot of timeSlots) {
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