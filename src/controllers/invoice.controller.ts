import { Request, Response, NextFunction } from 'express';
import Booking from '../models/Booking';
import { InvoiceService } from '../services/invoice.service';
import mongoose from 'mongoose';
import { IStadium } from '../models/Stadium';
import { IUser } from '../models/User';
import pdf = require('html-pdf');

export class InvoiceController {
  /**
   * Get invoice history for a user
   */
  static async getUserInvoiceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, startDate, endDate } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Build query filters
      const filters: any = {
        userId: new mongoose.Types.ObjectId(userId),
        paymentStatus: { $in: ['paid', 'completed'] }
      };

      // Add date filters if provided
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate as string);
        }
      }

      // Get paginated results
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const [bookings, total] = await Promise.all([
        Booking.find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber)
          .populate('stadiumId')
          .populate('userId', 'firstName lastName email phone')
          .lean(),
        Booking.countDocuments(filters)
      ]);

      // Generate invoice data for each booking
      const invoices = await Promise.all(
        bookings.map(async (booking: any) => {
          // Get customer data
          let customer: IUser | null = null;
          if (booking.userId && typeof booking.userId === 'object' && '_id' in booking.userId) {
            customer = booking.userId as IUser;
          }

          // Get stadium data
          let stadium: IStadium | null = null;
          if (booking.stadiumId && typeof booking.stadiumId === 'object' && '_id' in booking.stadiumId) {
            stadium = booking.stadiumId as IStadium;
          }

          return InvoiceService.generateInvoiceData(booking, stadium!, customer!);
        })
      );

      res.json({
        success: true,
        data: invoices,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice history for stadium owner
   */
  static async getStadiumOwnerInvoiceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, startDate, endDate, stadiumId } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Find stadiums owned by this user
      const stadiumFilter: any = { ownerId: new mongoose.Types.ObjectId(userId) };
      if (stadiumId) {
        stadiumFilter._id = new mongoose.Types.ObjectId(stadiumId as string);
      }

      const stadiums = await require('../models/Stadium').default.find(stadiumFilter);
      const stadiumIds = stadiums.map((stadium: any) => stadium._id);

      if (stadiumIds.length === 0) {
        res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 10,
            total: 0,
            pages: 0
          }
        });
        return;
      }

      // Build query filters
      const filters: any = {
        stadiumId: { $in: stadiumIds },
        paymentStatus: { $in: ['paid', 'completed'] }
      };

      // Add date filters if provided
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate as string);
        }
      }

      // Get paginated results
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const [bookings, total] = await Promise.all([
        Booking.find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber)
          .populate('stadiumId')
          .populate('userId', 'firstName lastName email phone')
          .lean(),
        Booking.countDocuments(filters)
      ]);

      // Generate invoice data for each booking
      const invoices = await Promise.all(
        bookings.map(async (booking: any) => {
          // Get customer data
          let customer: IUser | null = null;
          if (booking.userId && typeof booking.userId === 'object' && '_id' in booking.userId) {
            customer = booking.userId as IUser;
          }

          // Get stadium data
          let stadium: IStadium | null = null;
          if (booking.stadiumId && typeof booking.stadiumId === 'object' && '_id' in booking.stadiumId) {
            stadium = booking.stadiumId as IStadium;
          }

          return InvoiceService.generateInvoiceData(booking, stadium!, customer!);
        })
      );

      res.json({
        success: true,
        data: invoices,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice history for admin (all invoices)
   */
  static async getAdminInvoiceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, startDate, endDate, stadiumId, userId } = req.query;

      // Build query filters
      const filters: any = {
        paymentStatus: { $in: ['paid', 'completed'] }
      };

      // Add optional filters
      if (stadiumId) {
        filters.stadiumId = new mongoose.Types.ObjectId(stadiumId as string);
      }
      
      if (userId) {
        filters.userId = new mongoose.Types.ObjectId(userId as string);
      }

      // Add date filters if provided
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filters.createdAt.$lte = new Date(endDate as string);
        }
      }

      // Get paginated results
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      const [bookings, total] = await Promise.all([
        Booking.find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber)
          .populate('stadiumId')
          .populate('userId', 'firstName lastName email phone')
          .lean(),
        Booking.countDocuments(filters)
      ]);

      // Generate invoice data for each booking
      const invoices = await Promise.all(
        bookings.map(async (booking: any) => {
          // Get customer data
          let customer: IUser | null = null;
          if (booking.userId && typeof booking.userId === 'object' && '_id' in booking.userId) {
            customer = booking.userId as IUser;
          }

          // Get stadium data
          let stadium: IStadium | null = null;
          if (booking.stadiumId && typeof booking.stadiumId === 'object' && '_id' in booking.stadiumId) {
            stadium = booking.stadiumId as IStadium;
          }

          return InvoiceService.generateInvoiceData(booking, stadium!, customer!);
        })
      );

      res.json({
        success: true,
        data: invoices,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download invoice as PDF
   */
  static async downloadInvoicePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      
      // First try to find by MongoDB ID
      let booking = await Booking.findById(bookingId)
        .populate('userId', 'firstName lastName email phone')
        .populate('stadiumId')
        .lean();

      // If not found by ID, try to find by bookingNumber
      if (!booking) {
        booking = await Booking.findOne({ bookingNumber: bookingId })
          .populate('userId', 'firstName lastName email phone')
          .populate('stadiumId')
          .lean();
      }
      
      // If still not found, return error
      if (!booking) {
        // Check if it looks like a MongoDB ID format
        if (mongoose.Types.ObjectId.isValid(bookingId)) {
          res.status(404).json({
            success: false,
            message: 'Booking not found'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Invalid booking ID format'
          });
        }
        return;
      }

      // Check authorization - only booking owner, stadium owner, or superadmin can download invoice
      const isOwner = booking.userId && 
        typeof booking.userId === 'object' && 
        '_id' in booking.userId && 
        (booking.userId as any)._id.toString() === req.user?.userId;
        
      const isSuperAdmin = req.user?.role === 'superadmin';
      
      let isStadiumOwner = false;
      if (booking.stadiumId && typeof booking.stadiumId === 'object' && '_id' in booking.stadiumId) {
        const stadium = booking.stadiumId as any;
        if (stadium.ownerId) {
          isStadiumOwner = stadium.ownerId.toString() === req.user?.userId;
        }
      }

      if (!isOwner && !isSuperAdmin && !isStadiumOwner) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to download invoice for this booking'
        });
        return;
      }

      // Get customer data
      let customer = null;
      if (booking.userId && typeof booking.userId === 'object' && '_id' in booking.userId) {
        customer = booking.userId as any;
      }

      // Get stadium data
      let stadium = null;
      if (booking.stadiumId && typeof booking.stadiumId === 'object' && '_id' in booking.stadiumId) {
        stadium = booking.stadiumId as any;
      }

      // Generate invoice data using the InvoiceService
      const invoiceData = InvoiceService.generateInvoiceData(booking, stadium, customer);

      // Generate HTML for PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
            .header-content { display: flex; justify-content: space-between; align-items: center; }
            .company-info h1 { font-size: 24px; font-weight: bold; color: #1f2937; }
            .company-info p { color: #6b7280; }
            .invoice-header { text-align: right; }
            .invoice-header h2 { font-size: 24px; font-weight: bold; color: #1f2937; }
            .invoice-header p { color: #6b7280; }
            .info-section { margin-bottom: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-box h3 { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
            .info-box p { color: #6b7280; margin: 2px 0; }
            .booking-details { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
            .detail-item p:first-child { font-size: 12px; color: #6b7280; }
            .detail-item p:last-child { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-weight: bold; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; }
            .totals { margin-left: auto; max-width: 200px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total-label { color: #6b7280; }
            .total-amount { font-weight: bold; }
            .grand-total { border-top: 1px solid #e5e7eb; padding-top: 10px; }
            .payment-info { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-paid { background-color: #dcfce7; color: #166534; }
            .status-pending { background-color: #fef3c7; color: #92400e; }
            .status-cancelled { background-color: #fee2e2; color: #991b1b; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="company-info">
                <h1>Stadium Booking</h1>
                <p>Professional Sports Facility Booking</p>
              </div>
              <div class="invoice-header">
                <h2>INVOICE</h2>
                <p>#${invoiceData.invoiceNumber}</p>
                <p>${new Date(invoiceData.invoiceDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-grid">
              <div class="info-box">
                <h3>Bill To</h3>
                <p>${invoiceData.customer.name}</p>
                <p>${invoiceData.customer.email}</p>
                ${invoiceData.customer.phone ? `<p>${invoiceData.customer.phone}</p>` : ''}
              </div>
              <div class="info-box">
                <h3>Stadium Information</h3>
                <p>${invoiceData.stadium.name}</p>
                <p>${invoiceData.stadium.address}</p>
                ${invoiceData.stadium.ownerName ? `<p>Owner: ${invoiceData.stadium.ownerName}</p>` : ''}
              </div>
            </div>
          </div>
          
          <div class="booking-details">
            <div class="details-grid">
              <div class="detail-item">
                <p>Booking Date</p>
                <p>${new Date(invoiceData.booking.bookingDate).toLocaleDateString()}</p>
              </div>
              <div class="detail-item">
                <p>Time</p>
                <p>${invoiceData.booking.startTime} - ${invoiceData.booking.endTime}</p>
              </div>
              <div class="detail-item">
                <p>Duration</p>
                <p>${invoiceData.booking.durationHours} hours</p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${invoiceData.currency} ${item.unitPrice.toFixed(2)}</td>
                  <td>${invoiceData.currency} ${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span class="total-label">Subtotal:</span>
              <span class="total-amount">${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            ${invoiceData.taxes > 0 ? `
            <div class="total-row">
              <span class="total-label">Taxes:</span>
              <span class="total-amount">${invoiceData.currency} ${invoiceData.taxes.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row grand-total">
              <span class="total-label">Total:</span>
              <span class="total-amount">${invoiceData.currency} ${invoiceData.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <span class="status-badge status-${invoiceData.paymentStatus}">
                ${invoiceData.paymentStatus.charAt(0).toUpperCase() + invoiceData.paymentStatus.slice(1)}
              </span>
              <div>
                <p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            ${(invoiceData.stadium.bankAccountName || invoiceData.stadium.bankAccountNumber) ? `
            <div class="payment-grid">
              ${invoiceData.stadium.bankAccountName ? `
              <div>
                <p><strong>Account Name:</strong></p>
                <p>${invoiceData.stadium.bankAccountName}</p>
              </div>
              ` : ''}
              ${invoiceData.stadium.bankAccountNumber ? `
              <div>
                <p><strong>Account Number:</strong></p>
                <p>${invoiceData.stadium.bankAccountNumber}</p>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Please keep this invoice for your records.</p>
          </div>
        </body>
        </html>
      `;

      pdf.create(html, { format: 'A4', orientation: 'portrait' }).toBuffer((err: Error, buffer: Buffer) => {
        if (err) {
          next(err);
          return;
        }
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceNumber}.pdf`);
        
        // Send PDF buffer
        res.send(buffer);
      });
    } catch (error) {
      next(error);
    }
  }
}