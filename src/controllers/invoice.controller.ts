import { Request, Response, NextFunction } from 'express';
import Booking from '../models/Booking';
import { InvoiceService } from '../services/invoice.service';
import mongoose from 'mongoose';
import { IStadium } from '../models/Stadium';
import { IUser } from '../models/User';

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
}