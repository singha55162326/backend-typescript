import { Request, Response, NextFunction } from 'express';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import User from '../models/User';
import moment from 'moment-timezone';
import mongoose from 'mongoose';

export class ServiceFeeController {
  /**
   * Generate service fee report for stadium owners
   */
  static async getServiceFeeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get date range from query parameters or default to current month
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : moment().startOf('month').toDate();
        
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : moment().endOf('month').toDate();

      // Find all stadium owners
      const stadiumOwners = await User.find({ role: 'stadium_owner', status: 'active' });

      // Calculate service fees for each owner
      const serviceFeeReport = [];
      let totalServiceFee = 0;

      for (const owner of stadiumOwners) {
        // Find all stadiums owned by this user
        const stadiums = await Stadium.find({ ownerId: owner._id });
        const stadiumIds = stadiums.map(stadium => stadium._id);

        // Find all paid bookings for these stadiums in the date range
        const bookings = await Booking.find({
          stadiumId: { $in: stadiumIds },
          bookingDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'completed'] },
          paymentStatus: 'paid'
        }).populate('stadiumId', 'name serviceFeePercentage');

        // Calculate total revenue and service fee (using stadium-specific percentage)
        let totalRevenue = 0;
        let totalServiceFeeAmount = 0;
        
        // Group bookings by stadium to calculate service fee per stadium
        const stadiumBookings: { [key: string]: { bookings: any[], revenue: number, serviceFee: number, percentage: number } } = {};
        
        for (const booking of bookings) {
          const stadiumId = (booking.stadiumId as any)._id.toString();
          const stadiumPercentage = (booking.stadiumId as any).serviceFeePercentage || 10; // Default to 10%
          
          if (!stadiumBookings[stadiumId]) {
            stadiumBookings[stadiumId] = {
              bookings: [],
              revenue: 0,
              serviceFee: 0,
              percentage: stadiumPercentage
            };
          }
          
          stadiumBookings[stadiumId].bookings.push(booking);
          const bookingRevenue = booking.pricing.totalAmount;
          stadiumBookings[stadiumId].revenue += bookingRevenue;
          stadiumBookings[stadiumId].serviceFee += (bookingRevenue * stadiumPercentage / 100);
        }
        
        // Sum up revenue and service fees across all stadiums
        for (const stadiumId in stadiumBookings) {
          totalRevenue += stadiumBookings[stadiumId].revenue;
          totalServiceFeeAmount += stadiumBookings[stadiumId].serviceFee;
        }

        totalServiceFee += totalServiceFeeAmount;

        if (totalServiceFeeAmount > 0) {
          serviceFeeReport.push({
            ownerId: owner._id,
            ownerName: `${owner.firstName} ${owner.lastName}`,
            ownerEmail: owner.email,
            stadiums: stadiums.map(stadium => ({
              id: stadium._id,
              name: stadium.name,
              serviceFeePercentage: stadium.serviceFeePercentage || 10
            })),
            totalBookings: bookings.length,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            serviceFee: parseFloat(totalServiceFeeAmount.toFixed(2)),
            period: {
              startDate,
              endDate
            }
          });
        }
      }

      // Sort by service fee amount (highest first)
      serviceFeeReport.sort((a, b) => b.serviceFee - a.serviceFee);

      res.json({
        success: true,
        data: {
          report: serviceFeeReport,
          summary: {
            totalOwners: serviceFeeReport.length,
            totalServiceFee: parseFloat(totalServiceFee.toFixed(2)),
            period: {
              startDate,
              endDate
            }
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed service fee report for a specific owner
   */
  static async getOwnerServiceFeeDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ownerId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid owner ID'
        });
        return;
      }

      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : moment().startOf('month').toDate();
        
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : moment().endOf('month').toDate();

      // Find the owner
      const owner = await User.findById(ownerId);
      if (!owner || owner.role !== 'stadium_owner') {
        res.status(404).json({
          success: false,
          message: 'Stadium owner not found'
        });
        return;
      }

      // Find all stadiums owned by this user
      const stadiums = await Stadium.find({ ownerId: owner._id });
      const stadiumIds = stadiums.map(stadium => stadium._id);

      // Find all paid bookings for these stadiums in the date range
      const bookings = await Booking.find({
        stadiumId: { $in: stadiumIds },
        bookingDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'completed'] },
        paymentStatus: 'paid'
      }).populate('stadiumId', 'name serviceFeePercentage')
        .populate('userId', 'firstName lastName email');

      // Calculate total revenue and service fee (using stadium-specific percentage)
      let totalRevenue = 0;
      let totalServiceFeeAmount = 0;
      
      // Group bookings by stadium to calculate service fee per stadium
      const stadiumBookings: { [key: string]: { bookings: any[], revenue: number, serviceFee: number, percentage: number, name: string } } = {};
      
      for (const booking of bookings) {
        const stadiumId = (booking.stadiumId as any)._id.toString();
        const stadiumName = (booking.stadiumId as any).name;
        const stadiumPercentage = (booking.stadiumId as any).serviceFeePercentage || 10; // Default to 10%
        
        if (!stadiumBookings[stadiumId]) {
          stadiumBookings[stadiumId] = {
            bookings: [],
            revenue: 0,
            serviceFee: 0,
            percentage: stadiumPercentage,
            name: stadiumName
          };
        }
        
        stadiumBookings[stadiumId].bookings.push(booking);
        const bookingRevenue = booking.pricing.totalAmount;
        stadiumBookings[stadiumId].revenue += bookingRevenue;
        stadiumBookings[stadiumId].serviceFee += (bookingRevenue * stadiumPercentage / 100);
      }
      
      // Sum up revenue and service fees across all stadiums
      for (const stadiumId in stadiumBookings) {
        totalRevenue += stadiumBookings[stadiumId].revenue;
        totalServiceFeeAmount += stadiumBookings[stadiumId].serviceFee;
      }

      // Format booking details with stadium-specific service fee percentages
      const bookingDetails = bookings.map(booking => {
        const stadiumPercentage = (booking.stadiumId as any).serviceFeePercentage || 10;
        const serviceFeeAmount = booking.pricing.totalAmount * stadiumPercentage / 100;
        
        return {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          bookingDate: booking.bookingDate,
          stadiumName: (booking.stadiumId as any).name,
          stadiumPercentage: stadiumPercentage,
          customerName: `${(booking.userId as any).firstName} ${(booking.userId as any).lastName}`,
          customerEmail: (booking.userId as any).email,
          amount: booking.pricing.totalAmount,
          serviceFee: parseFloat(serviceFeeAmount.toFixed(2))
        };
      });

      res.json({
        success: true,
        data: {
          owner: {
            id: owner._id,
            name: `${owner.firstName} ${owner.lastName}`,
            email: owner.email
          },
          stadiums: stadiums.map(stadium => ({
            id: stadium._id,
            name: stadium.name,
            serviceFeePercentage: stadium.serviceFeePercentage || 10
          })),
          period: {
            startDate,
            endDate
          },
          bookings: bookingDetails,
          summary: {
            totalBookings: bookings.length,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            serviceFee: parseFloat(totalServiceFeeAmount.toFixed(2))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}