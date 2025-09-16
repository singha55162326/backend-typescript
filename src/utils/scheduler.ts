import cron from 'node-cron';
import moment from 'moment-timezone';
import Booking from '../models/Booking';
import User from '../models/User';
import NotificationService from '../services/notificationService';
import { LoyaltyController } from '../controllers/loyalty.controller';
import { Types } from 'mongoose';

class SchedulerService {
  static init(): void {
    // Send booking reminders daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.sendBookingReminders();
    }, {
      timezone: 'Asia/Vientiane'
    });

    // Update booking status to completed after booking time
    cron.schedule('*/30 * * * *', async () => {
      await this.updateCompletedBookings();
    });

    console.log('Scheduler initialized');
  }

  static async sendBookingReminders(): Promise<void> {
    try {
      const tomorrow = moment().tz('Asia/Vientiane').add(1, 'day');
      
      const upcomingBookings = await Booking.find({
        bookingDate: {
          $gte: tomorrow.startOf('day').toDate(),
          $lte: tomorrow.endOf('day').toDate()
        },
        status: 'confirmed'
      }).populate('userId', 'firstName lastName email phone')
        .populate('stadiumId', 'name')
        .populate('fieldId', 'name');

      for (const booking of upcomingBookings) {
        // Get user with full profile
        const user = await User.findById(booking.userId);
        
        // Check if user has notification preferences and wants booking reminders
        if (user && user.profile?.notificationPreferences?.bookingReminders !== false) {
          // Send email reminder if enabled
          if (user.profile?.notificationPreferences?.email !== false) {
            await NotificationService.sendBookingReminder(booking);
          }
          
          // Send SMS reminder if enabled and user has phone number
          if (user.profile?.notificationPreferences?.sms !== false && user.phone) {
            await this.sendSMSReminder(booking, user);
          }
        }
      }

      console.log(`Processed ${upcomingBookings.length} booking reminders`);
    } catch (error) {
      console.error('Failed to send booking reminders:', error);
    }
  }

  static async sendSMSReminder(booking: any, user: any): Promise<void> {
    try {
      // In a real implementation, you would integrate with an SMS service provider
      // For now, we'll just log the SMS that would be sent
      const smsContent = `Booking Reminder: You have a booking tomorrow at ${booking.startTime} at ${booking.stadiumId.name}. Booking #: ${booking.bookingNumber}`;
      
      console.log(`SMS Reminder would be sent to ${user.phone}: ${smsContent}`);
      
      // TODO: Integrate with actual SMS service provider like Twilio
      // Example with Twilio:
      // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      // await twilio.messages.create({
      //   body: smsContent,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: user.phone
      // });
    } catch (error) {
      console.error('Failed to send SMS reminder:', error);
    }
  }

  static async updateCompletedBookings(): Promise<void> {
    try {
      const now = moment().tz('Asia/Vientiane');
      const currentDate = now.format('YYYY-MM-DD');

      // Find bookings that need to be marked as completed
      const bookingsToComplete = await Booking.find({
        bookingDate: { $lt: new Date(currentDate) },
        status: 'confirmed'
      });

      // Update bookings to completed status
      const result = await Booking.updateMany({
        bookingDate: { $lt: new Date(currentDate) },
        status: 'confirmed'
      }, {
        $set: { status: 'completed' },
        $push: {
          history: {
            action: 'completed',
            changedBy: null, // System action
            oldValues: { status: 'confirmed' },
            newValues: { status: 'completed' },
            notes: 'Automatically marked as completed'
          }
        }
      });

      // For each completed booking, add loyalty points
      for (const booking of bookingsToComplete) {
        try {
          await LoyaltyController.addPointsForBooking(booking._id as Types.ObjectId);
        } catch (error) {
          console.error(`Failed to add loyalty points for booking ${booking._id}:`, error);
        }
      }

      if (result.modifiedCount > 0) {
        console.log(`Marked ${result.modifiedCount} bookings as completed and processed loyalty points`);
      }
    } catch (error) {
      console.error('Failed to update completed bookings:', error);
    }
  }
}

export default SchedulerService;