import nodemailer from 'nodemailer';
import User from '../models/User';
import Stadium from '../models/Stadium';
import moment from 'moment-timezone';
// import Booking from "../models/Booking";

class NotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendBookingConfirmation(booking: any): Promise<void> {
    try {
      const user = await User.findById(booking.userId);
      const stadium = await Stadium.findById(booking.stadiumId);
      
      if (!user || !stadium) return;

      const emailContent = `
        Dear ${user.firstName},
        
        Your booking has been confirmed!
        
        Booking Details:
        - Stadium: ${stadium.name}
        - Date: ${moment(booking.bookingDate).format('YYYY-MM-DD')}
        - Time: ${booking.startTime} - ${booking.endTime}
        - Total Amount: ${booking.pricing.totalAmount.toLocaleString()} LAK
        - Booking Number: ${booking.bookingNumber}
        
        ${booking.assignedStaff && booking.assignedStaff.length > 0 ? 
          `Assigned Staff:\n${booking.assignedStaff.map((staff: any) => 
            `- ${staff.staffName} (${staff.role})`
          ).join('\n')}` : ''
        }
        
        Thank you for choosing our service!
      `;

      await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject: 'Booking Confirmation - ' + booking.bookingNumber,
        text: emailContent
      });

      console.log(`Confirmation email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
  }

  async sendBookingReminder(booking: any): Promise<void> {
    try {
      const user = await User.findById(booking.userId);
      const stadium = await Stadium.findById(booking.stadiumId);
      const field = booking.fieldId;
      
      if (!user || !stadium) return;
      
      const emailContent = `
        Dear ${user.firstName},
        
        This is a reminder for your upcoming booking tomorrow!
        
        Booking Details:
        - Booking Number: ${booking.bookingNumber}
        - Stadium: ${stadium.name}
        - Field: ${field?.name || 'Field'}
        - Date: ${moment(booking.bookingDate).format('YYYY-MM-DD')}
        - Time: ${booking.startTime} - ${booking.endTime}
        - Duration: ${booking.durationHours} hours
        - Total Amount: ${booking.pricing.totalAmount.toLocaleString()} ${booking.pricing.currency}
        
        Please arrive 15 minutes early to prepare for your booking.
        
        If you need to make changes or cancel your booking, please do so at least 24 hours in advance.
        
        Thank you for choosing our service!
      `;

      await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: user.email,
        subject: 'Booking Reminder - ' + booking.bookingNumber,
        text: emailContent
      });

      console.log(`Reminder email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send reminder email:', error);
    }
  }
}

export default new NotificationService();