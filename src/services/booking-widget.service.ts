import mongoose from 'mongoose';
import Stadium from '../models/Stadium';
import Booking from '../models/Booking';

interface WidgetConfig {
  enabled: boolean;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  features: {
    showPricing: boolean;
    showReviews: boolean;
    requirePhone: boolean;
  };
  customMessage?: string;
}

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
}

export class BookingWidgetService {
  // Get widget configuration for a stadium
  static async getWidgetConfig(stadiumId: string): Promise<WidgetConfig> {
    try {
      const stadium = await Stadium.findById(stadiumId);
      
      if (!stadium) {
        throw new Error('Stadium not found');
      }
      
      // Return default config if none exists
      const defaultConfig: WidgetConfig = {
        enabled: (stadium as any).widgetConfig?.enabled ?? false,
        theme: {
          primaryColor: (stadium as any).widgetConfig?.theme?.primaryColor ?? '#2563eb',
          backgroundColor: (stadium as any).widgetConfig?.theme?.backgroundColor ?? '#ffffff',
          textColor: (stadium as any).widgetConfig?.theme?.textColor ?? '#000000'
        },
        features: {
          showPricing: (stadium as any).widgetConfig?.features?.showPricing ?? true,
          showReviews: (stadium as any).widgetConfig?.features?.showReviews ?? true,
          requirePhone: (stadium as any).widgetConfig?.features?.requirePhone ?? false
        },
        customMessage: (stadium as any).widgetConfig?.customMessage
      };
      
      return defaultConfig;
    } catch (error) {
      console.error('Error getting widget config:', error);
      throw error;
    }
  }

  // Update widget configuration for a stadium
  static async updateWidgetConfig(stadiumId: string, config: WidgetConfig): Promise<WidgetConfig> {
    try {
      const stadium = await Stadium.findByIdAndUpdate(
        stadiumId,
        { widgetConfig: config },
        { new: true, runValidators: true }
      );
      
      if (!stadium) {
        throw new Error('Stadium not found');
      }
      
      return (stadium as any).widgetConfig as WidgetConfig;
    } catch (error) {
      console.error('Error updating widget config:', error);
      throw error;
    }
  }

  // Get available time slots for a stadium on a specific date
  static async getAvailability(stadiumId: string, date: string): Promise<AvailabilitySlot[]> {
    try {
      const stadium = await Stadium.findById(stadiumId);
      
      if (!stadium) {
        throw new Error('Stadium not found');
      }
      
      // Parse date manually since we don't have date-fns
      const targetDate = new Date(date);
      const startOfDayDate = new Date(targetDate);
      startOfDayDate.setHours(0, 0, 0, 0);
      
      const endOfDayDate = new Date(targetDate);
      endOfDayDate.setHours(23, 59, 59, 999);
      
      // Get existing bookings for the date
      const existingBookings = await Booking.find({
        stadiumId: new mongoose.Types.ObjectId(stadiumId),
        bookingDate: {
          $gte: startOfDayDate,
          $lte: endOfDayDate
        },
        status: { $in: ['confirmed', 'pending'] }
      });
      
      // Generate time slots based on stadium operating hours
      const slots: AvailabilitySlot[] = [];
      const openTime = (stadium as any).openingTime || '08:00';
      const closeTime = (stadium as any).closingTime || '22:00';
      
      // Convert times to minutes for easier calculation
      const [openHours, openMinutes] = openTime.split(':').map(Number);
      const [closeHours, closeMinutes] = closeTime.split(':').map(Number);
      const openTotalMinutes = openHours * 60 + openMinutes;
      const closeTotalMinutes = closeHours * 60 + closeMinutes;
      
      // Generate 1-hour slots
      for (let minutes = openTotalMinutes; minutes < closeTotalMinutes; minutes += 60) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const nextHour = Math.floor((minutes + 60) / 60);
        const nextMinute = (minutes + 60) % 60;
        
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endTime = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
        
        // Check if this slot is already booked
        const isBooked = existingBookings.some((booking: any) => {
          return (
            (startTime >= booking.startTime && startTime < booking.endTime) ||
            (endTime > booking.startTime && endTime <= booking.endTime) ||
            (startTime <= booking.startTime && endTime >= booking.endTime)
          );
        });
        
        slots.push({
          startTime,
          endTime,
          price: (stadium as any).pricePerHour || 0,
          available: !isBooked
        });
      }
      
      return slots;
    } catch (error) {
      console.error('Error getting availability:', error);
      throw error;
    }
  }

  // Create booking through widget
  static async createBooking(stadiumId: string, bookingData: any): Promise<any> {
    try {
      const stadium = await Stadium.findById(stadiumId);
      
      if (!stadium) {
        throw new Error('Stadium not found');
      }
      
      // Validate time slot is available
      const availability = await this.getAvailability(stadiumId, bookingData.date);
      const slot = availability.find(s => s.startTime === bookingData.startTime && s.endTime === bookingData.endTime);
      
      if (!slot || !slot.available) {
        throw new Error('Selected time slot is not available');
      }
      
      // Create booking
      const booking = new Booking({
        stadiumId: new mongoose.Types.ObjectId(stadiumId),
        bookingDate: new Date(bookingData.date),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        totalPrice: slot.price,
        status: 'pending',
        paymentStatus: 'pending',
        source: 'widget'
      });
      
      const savedBooking = await booking.save();
      
      // Populate stadium reference
      await savedBooking.populate('stadiumId');
      
      return savedBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }
}