import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import User from '../models/User';
import moment from 'moment-timezone';
import mongoose from 'mongoose';

export class AnalyticsController {
  /**
   * Get analytics for admin dashboard
   */
  static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Date range for analytics
      const endDate = moment().endOf('day').toDate();
      const startDate = moment().subtract(30, 'days').startOf('day').toDate();

      if (req.query.startDate) {
        startDate.setTime(new Date(req.query.startDate as string).getTime());
      }
      if (req.query.endDate) {
        endDate.setTime(new Date(req.query.endDate as string).getTime());
      }

      // Basic counts
      const [totalUsers, totalStadiums, totalBookings] = await Promise.all([
        User.countDocuments({ status: 'active' }),
        Stadium.countDocuments({ status: 'active' }),
        Booking.countDocuments({
          bookingDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'completed'] }
        })
      ]);

      // Revenue calculation
      const revenueData = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$pricing.totalAmount' }
          }
        }
      ]);

      const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

      // Monthly revenue trends
      const monthlyRevenue = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: moment().subtract(12, 'months').startOf('month').toDate() },
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$bookingDate' },
              month: { $month: '$bookingDate' }
            },
            revenue: { $sum: '$pricing.totalAmount' },
            bookings: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]}
              ]
            },
            revenue: 1,
            bookings: 1
          }
        }
      ]);

      // Top stadiums by bookings
      const topStadiums = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: '$stadiumId',
            bookingCount: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.totalAmount' }
          }
        },
        {
          $lookup: {
            from: 'stadiums',
            localField: '_id',
            foreignField: '_id',
            as: 'stadium'
          }
        },
        {
          $unwind: '$stadium'
        },
        {
          $project: {
            stadiumName: '$stadium.name',
            stadiumLocation: '$stadium.address.city',
            bookingCount: 1,
            totalRevenue: 1
          }
        },
        {
          $sort: { bookingCount: -1 }
        },
        {
          $limit: 10
        }
      ]);

      // User registrations over time
      const userRegistrations = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: moment().subtract(12, 'months').startOf('month').toDate() }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]}
              ]
            },
            count: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            totalStadiums,
            totalBookings,
            totalRevenue
          },
          trends: {
            monthlyRevenue,
            userRegistrations
          },
          topStadiums,
          dateRange: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stadium owner analytics
   */
  static async getStadiumOwnerAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Get user's stadiums
      const userStadiums = await Stadium.find({ ownerId: req.user?.userId }).select('_id');
      const stadiumIds = userStadiums.map(stadium => stadium._id);

      if (stadiumIds.length === 0) {
        res.json({
          success: true,
          data: {
            overview: {
              totalStadiums: 0,
              totalBookings: 0,
              totalRevenue: 0,
              averageRating: 0
            },
            trends: {
              monthlyRevenue: [],
              monthlyBookings: []
            },
            stadiumPerformance: []
          }
        });
        return;
      }

      // Date range
      const endDate = moment().endOf('day').toDate();
      const startDate = moment().subtract(30, 'days').startOf('day').toDate();

      // Basic metrics
      const [totalBookings, revenueData, avgRatingData] = await Promise.all([
        Booking.countDocuments({
          stadiumId: { $in: stadiumIds },
          bookingDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'completed'] }
        }),
        Booking.aggregate([
          {
            $match: {
              stadiumId: { $in: stadiumIds },
              bookingDate: { $gte: startDate, $lte: endDate },
              status: { $in: ['confirmed', 'completed'] },
              paymentStatus: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$pricing.totalAmount' }
            }
          }
        ]),
        Stadium.aggregate([
          {
            $match: { _id: { $in: stadiumIds } }
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$stats.averageRating' }
            }
          }
        ])
      ]);

      const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
      const averageRating = avgRatingData.length > 0 ? avgRatingData[0].averageRating : 0;

      // Monthly trends
      const monthlyTrends = await Booking.aggregate([
        {
          $match: {
            stadiumId: { $in: stadiumIds },
            bookingDate: { $gte: moment().subtract(12, 'months').startOf('month').toDate() },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$bookingDate' },
              month: { $month: '$bookingDate' }
            },
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ['$paymentStatus', 'paid'] },
                  '$pricing.totalAmount',
                  0
                ]
              }
            },
            bookings: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]}
              ]
            },
            revenue: 1,
            bookings: 1
          }
        }
      ]);

      // Stadium performance
      const stadiumPerformance = await Booking.aggregate([
        {
          $match: {
            stadiumId: { $in: stadiumIds },
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: '$stadiumId',
            bookingCount: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$paymentStatus', 'paid'] },
                  '$pricing.totalAmount',
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'stadiums',
            localField: '_id',
            foreignField: '_id',
            as: 'stadium'
          }
        },
        {
          $unwind: '$stadium'
        },
        {
          $project: {
            stadiumName: '$stadium.name',
            stadiumLocation: '$stadium.address.city',
            bookingCount: 1,
            totalRevenue: 1,
            averageRating: '$stadium.stats.averageRating'
          }
        },
        {
          $sort: { bookingCount: -1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalStadiums: stadiumIds.length,
            totalBookings,
            totalRevenue,
            averageRating: Math.round(averageRating * 10) / 10
          },
          trends: {
            monthlyRevenue: monthlyTrends,
            monthlyBookings: monthlyTrends
          },
          stadiumPerformance,
          dateRange: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking analytics
   */
  static async getBookingAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Date range
      const endDate = moment().endOf('day').toDate();
      const startDate = moment().subtract(30, 'days').startOf('day').toDate();

      // Booking status distribution
      const statusDistribution = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Peak hours analysis
      const peakHours = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: { $substr: ['$startTime', 0, 2] },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $project: {
            hour: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Daily booking patterns
      const dailyPatterns = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$bookingDate' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        },
        {
          $project: {
            dayOfWeek: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          statusDistribution,
          peakHours,
          dailyPatterns,
          dateRange: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stadium analytics by ID
   */
  static async getStadiumAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { stadiumId } = req.params;
      const { startDate, endDate } = req.query;

      // Check access rights
      const stadium = await Stadium.findById(stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found'
        });
        return;
      }

      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to view this stadium analytics'
        });
        return;
      }

      const start = moment(startDate as string || moment().subtract(30, 'days')).startOf('day');
      const end = moment(endDate as string || moment()).endOf('day');

      // Aggregate booking analytics
      const analytics = await Booking.aggregate([
        {
          $match: {
            stadiumId: new mongoose.Types.ObjectId(stadiumId),
            bookingDate: {
              $gte: start.toDate(),
              $lte: end.toDate()
            }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' } },
              status: '$status'
            },
            count: { $sum: 1 },
            revenue: { $sum: '$pricing.totalAmount' },
            refereeRevenue: { $sum: { $sum: '$pricing.refereeCharges.total' } }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            totalBookings: { $sum: '$count' },
            totalRevenue: { $sum: '$revenue' },
            totalRefereeRevenue: { $sum: '$refereeRevenue' },
            statusBreakdown: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Staff performance analytics
      const staffAnalytics = await Booking.aggregate([
        {
          $match: {
            stadiumId: new mongoose.Types.ObjectId(stadiumId),
            bookingDate: {
              $gte: start.toDate(),
              $lte: end.toDate()
            },
            'assignedStaff.role': 'referee'
          }
        },
        {
          $unwind: '$assignedStaff'
        },
        {
          $match: {
            'assignedStaff.role': 'referee'
          }
        },
        {
          $group: {
            _id: '$assignedStaff.staffId',
            refereeName: { $first: '$assignedStaff.staffName' },
            totalBookings: { $sum: 1 },
            totalHours: { $sum: '$durationHours' },
            totalEarnings: { 
              $sum: {
                $reduce: {
                  input: '$pricing.refereeCharges',
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: ['$$this.staffId', '$assignedStaff.staffId'] },
                      { $add: ['$$value', '$$this.total'] },
                      '$$value'
                    ]
                  }
                }
              }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          dailyAnalytics: analytics,
          staffPerformance: staffAnalytics,
          summary: {
            totalBookings: analytics.reduce((sum: number, day: any) => sum + day.totalBookings, 0),
            totalRevenue: analytics.reduce((sum: number, day: any) => sum + day.totalRevenue, 0),
            totalRefereeRevenue: analytics.reduce((sum: number, day: any) => sum + day.totalRefereeRevenue, 0),
            currency: 'LAK'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed booking analytics with peak hours and popular fields
   */
  static async getDetailedBookingAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Date range
      const endDate = moment().endOf('day').toDate();
      const startDate = moment().subtract(30, 'days').startOf('day').toDate();

      // Peak hours analysis with field information
      const peakHoursByField = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $lookup: {
            from: 'stadiums',
            localField: 'stadiumId',
            foreignField: '_id',
            as: 'stadium'
          }
        },
        {
          $unwind: '$stadium'
        },
        {
          $unwind: '$stadium.fields'
        },
        {
          $match: {
            $expr: { $eq: ['$stadium.fields._id', '$fieldId'] }
          }
        },
        {
          $group: {
            _id: {
              hour: { $substr: ['$startTime', 0, 2] },
              fieldName: '$stadium.fields.name',
              fieldType: '$stadium.fields.fieldType'
            },
            count: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.totalAmount' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $project: {
            hour: '$_id.hour',
            fieldName: '$_id.fieldName',
            fieldType: '$_id.fieldType',
            count: 1,
            totalRevenue: 1,
            _id: 0
          }
        }
      ]);

      // Popular fields analysis
      const popularFields = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $lookup: {
            from: 'stadiums',
            localField: 'stadiumId',
            foreignField: '_id',
            as: 'stadium'
          }
        },
        {
          $unwind: '$stadium'
        },
        {
          $unwind: '$stadium.fields'
        },
        {
          $match: {
            $expr: { $eq: ['$stadium.fields._id', '$fieldId'] }
          }
        },
        {
          $group: {
            _id: {
              fieldName: '$stadium.fields.name',
              fieldType: '$stadium.fields.fieldType',
              stadiumName: '$stadium.name'
            },
            bookingCount: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.totalAmount' },
            totalHours: { $sum: '$durationHours' }
          }
        },
        {
          $sort: { bookingCount: -1 }
        },
        {
          $limit: 20
        },
        {
          $project: {
            fieldName: '$_id.fieldName',
            fieldType: '$_id.fieldType',
            stadiumName: '$_id.stadiumName',
            bookingCount: 1,
            totalRevenue: 1,
            totalHours: 1,
            _id: 0
          }
        }
      ]);

      // Revenue reports by time period
      const revenueReports = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$bookingDate' },
              month: { $month: '$bookingDate' },
              day: { $dayOfMonth: '$bookingDate' }
            },
            dailyRevenue: { $sum: '$pricing.totalAmount' },
            bookingCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            dailyRevenue: 1,
            bookingCount: 1,
            _id: 0
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          peakHoursByField,
          popularFields,
          revenueReports,
          dateRange: {
            startDate,
            endDate
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export analytics data as CSV
   */
  static async exportAnalyticsCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, startDate, endDate } = req.query;
      
      // Date range
      const start = startDate ? new Date(startDate as string) : moment().subtract(30, 'days').startOf('day').toDate();
      const end = endDate ? new Date(endDate as string) : moment().endOf('day').toDate();

      let csvData = '';
      let filename = 'analytics-export';

      switch (type) {
        case 'bookings':
          filename = 'bookings-report';
          const bookings = await Booking.find({
            bookingDate: { $gte: start, $lte: end }
          }).populate('userId', 'firstName lastName email')
            .populate('stadiumId', 'name')
            .populate('fieldId', 'name');
          
          csvData = 'Booking Number,Date,Time,User,Stadium,Field,Status,Payment Status,Amount\n';
          bookings.forEach(booking => {
            const user = booking.userId as any;
            const stadium = booking.stadiumId as any;
            const field = booking.fieldId as any;
            
            csvData += `${booking.bookingNumber},${moment(booking.bookingDate).format('YYYY-MM-DD')},${booking.startTime}-${booking.endTime},${user?.firstName || ''} ${user?.lastName || ''},${stadium?.name || ''},${field?.name || ''},${booking.status},${booking.paymentStatus},${booking.pricing.totalAmount}\n`;
          });
          break;
          
        case 'revenue':
          filename = 'revenue-report';
          const revenueData = await Booking.aggregate([
            {
              $match: {
                bookingDate: { $gte: start, $lte: end },
                status: { $in: ['confirmed', 'completed'] },
                paymentStatus: 'paid'
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$bookingDate' },
                  month: { $month: '$bookingDate' }
                },
                totalRevenue: { $sum: '$pricing.totalAmount' },
                bookingCount: { $sum: 1 }
              }
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1 }
            }
          ]);
          
          csvData = 'Period,Total Revenue,Booking Count\n';
          revenueData.forEach(item => {
            const period = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
            csvData += `${period},${item.totalRevenue},${item.bookingCount}\n`;
          });
          break;
          
        default:
          res.status(400).json({
            success: false,
            message: 'Invalid export type'
          });
          return;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csvData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export analytics data as PDF
   */
  static async exportAnalyticsPDF(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For now, we'll return a simple response indicating PDF export is available
      // In a real implementation, you would use a library like pdfkit or html-pdf
      res.json({
        success: true,
        message: 'PDF export functionality is available. In a full implementation, this would generate a PDF report.',
        data: {
          url: '/api/analytics/export/pdf' // Placeholder URL
        }
      });
    } catch (error) {
      next(error);
    }
  }
}