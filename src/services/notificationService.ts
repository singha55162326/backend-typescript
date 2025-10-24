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
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendBookingConfirmation(booking: any): Promise<void> {
    try {
      const user = await User.findById(booking.userId);
      const stadium = await Stadium.findById(booking.stadiumId);
      
      if (!user || !stadium || !user.email) return;

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
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
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
      
      if (!user || !stadium || !user.email) return;
      
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
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: user.email,
        subject: 'Booking Reminder - ' + booking.bookingNumber,
        text: emailContent
      });

      console.log(`Reminder email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send reminder email:', error);
    }
  }

  async sendInvoiceEmail(booking: any, invoiceData: any, recipientEmail: string): Promise<void> {
    try {
      const user = await User.findById(booking.userId);
      const stadium = await Stadium.findById(booking.stadiumId);
      
      if (!user || !stadium) return;

      // Create a simple text version of the invoice
      let invoiceText = `
Invoice Details:
================
Invoice Number: ${invoiceData.invoiceNumber}
Invoice Date: ${moment(invoiceData.invoiceDate).format('YYYY-MM-DD HH:mm')}
Due Date: ${moment(invoiceData.dueDate).format('YYYY-MM-DD')}

Booking Information:
- Booking Number: ${invoiceData.booking.bookingNumber}
- Stadium: ${stadium.name}
- Field: ${invoiceData.field?.name || 'N/A'}
- Date: ${moment(invoiceData.booking.bookingDate).format('YYYY-MM-DD')}
- Time: ${invoiceData.booking.startTime} - ${invoiceData.booking.endTime}
- Duration: ${invoiceData.booking.durationHours} hours

Customer Information:
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- Phone: ${user.phone || 'N/A'}

Items:
`;

      invoiceData.items.forEach((item: any, index: number) => {
        invoiceText += `${index + 1}. ${item.description}
   Quantity: ${item.quantity}
   Unit Price: ${invoiceData.currency} ${item.unitPrice.toFixed(2)}
   Total: ${invoiceData.currency} ${item.total.toFixed(2)}
`;
      });

      invoiceText += `
Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}
Taxes: ${invoiceData.currency} ${invoiceData.taxes.toFixed(2)}
Total Amount: ${invoiceData.currency} ${invoiceData.totalAmount.toFixed(2)}

Payment Status: ${invoiceData.paymentStatus.charAt(0).toUpperCase() + invoiceData.paymentStatus.slice(1)}

`;

      if (invoiceData.stadium.bankAccountName || invoiceData.stadium.bankAccountNumber) {
        invoiceText += `Bank Account Information:
- Account Name: ${invoiceData.stadium.bankAccountName || 'N/A'}
- Account Number: ${invoiceData.stadium.bankAccountNumber || 'N/A'}
`;
      }

      invoiceText += `
Thank you for your booking!
Please keep this invoice for your records.
`;

      await this.emailTransporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: recipientEmail,
        subject: `Invoice - ${invoiceData.invoiceNumber} for Booking ${invoiceData.booking.bookingNumber}`,
        text: invoiceText
      });

      console.log(`Invoice email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      throw error;
    }
  }
}

export default new NotificationService();