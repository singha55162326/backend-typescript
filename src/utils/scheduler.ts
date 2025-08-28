import cron from 'node-cron';
import moment from 'moment-timezone';
import Booking from '../models/Booking';
import NotificationService from '../services/notificationService';

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
      }).populate('userId stadiumId');

      for (const booking of upcomingBookings) {
        await NotificationService.sendBookingReminder(booking);
      }

      console.log(`Sent ${upcomingBookings.length} booking reminders`);
    } catch (error) {
      console.error('Failed to send booking reminders:', error);
    }
  }

  static async updateCompletedBookings(): Promise<void> {
    try {
      const now = moment().tz('Asia/Vientiane');
      const currentDate = now.format('YYYY-MM-DD');

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

      if (result.modifiedCount > 0) {
        console.log(`Marked ${result.modifiedCount} bookings as completed`);
      }
    } catch (error) {
      console.error('Failed to update completed bookings:', error);
    }
  }
}

export default SchedulerService;