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

  /**
   * Get predictive analytics for booking trends
   */
  static async getPredictiveAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Date range for historical data (last 6 months)
      const endDate = moment().endOf('day').toDate();
      const startDate = moment().subtract(6, 'months').startOf('day').toDate();

      // Get booking data grouped by month
      const monthlyBookings = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$bookingDate' },
              month: { $month: '$bookingDate' }
            },
            bookingCount: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.totalAmount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Simple linear regression for prediction
      const predictions = [];
      if (monthlyBookings.length > 2) {
        // Calculate trend for next 3 months
        const n = monthlyBookings.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        // Use booking counts for trend analysis
        monthlyBookings.forEach((data, index) => {
          const x = index + 1;
          const y = data.bookingCount;
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumXX += x * x;
        });
        
        // Calculate slope and intercept
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Predict next 3 months
        for (let i = 1; i <= 3; i++) {
          const nextMonthIndex = n + i;
          const predictedBookings = Math.max(0, Math.round(intercept + slope * nextMonthIndex));
          
          // Simple revenue prediction based on average revenue per booking
          const avgRevenuePerBooking = monthlyBookings.reduce((sum, data) => 
            sum + (data.totalRevenue / data.bookingCount), 0) / monthlyBookings.length;
          const predictedRevenue = Math.max(0, Math.round(predictedBookings * avgRevenuePerBooking));
          
          predictions.push({
            month: moment().add(i, 'months').format('YYYY-MM'),
            predictedBookings,
            predictedRevenue
          });
        }
      }

      res.json({
        success: true,
        data: {
          historicalData: monthlyBookings,
          predictions,
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
   * Get customer segmentation data
   */
  static async getCustomerSegmentation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Define date range for segmentation analysis (last 12 months)
      const endDate = moment().endOf('day').toDate();
      const startDate = moment().subtract(12, 'months').startOf('day').toDate();

      // Get all users with their booking history
      const usersWithBookings = await User.aggregate([
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'userId',
            as: 'bookings'
          }
        },
        {
          $addFields: {
            bookingHistory: {
              $filter: {
                input: '$bookings',
                cond: {
                  $and: [
                    { $gte: ['$$this.bookingDate', startDate] },
                    { $lte: ['$$this.bookingDate', endDate] },
                    { $in: ['$$this.status', ['confirmed', 'completed']] }
                  ]
                }
              }
            }
          }
        },
        {
          $match: {
            'bookingHistory.0': { $exists: true } // Only users with bookings
          }
        }
      ]);

      // Segment users based on booking frequency and spending
      const segments = {
        frequentHighSpenders: [] as any[],
        frequentLowSpenders: [] as any[],
        occasionalHighSpenders: [] as any[],
        occasionalLowSpenders: [] as any[],
        newCustomers: [] as any[]
      };

      const newCustomerThreshold = moment().subtract(3, 'months').toDate();

      usersWithBookings.forEach((user: any) => {
        const bookingCount = user.bookingHistory.length;
        const totalSpent = user.bookingHistory.reduce((sum: number, booking: any) => 
          sum + (booking.pricing?.totalAmount || 0), 0);
        
        const avgSpentPerBooking = bookingCount > 0 ? totalSpent / bookingCount : 0;
        
        // Determine if user is new (first booking within last 3 months)
        const firstBookingDate = user.bookingHistory
          .map((b: any) => new Date(b.bookingDate))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
        
        if (firstBookingDate && firstBookingDate >= newCustomerThreshold) {
          segments.newCustomers.push({
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            bookingCount,
            totalSpent,
            firstBookingDate
          });
          return;
        }

        // Segment based on booking frequency and spending
        if (bookingCount >= 5) { // Frequent (5+ bookings)
          if (avgSpentPerBooking >= 500000) { // High spender (avg 500,000 LAK+ per booking)
            segments.frequentHighSpenders.push({
              userId: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              bookingCount,
              totalSpent,
              avgSpentPerBooking
            });
          } else {
            segments.frequentLowSpenders.push({
              userId: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              bookingCount,
              totalSpent,
              avgSpentPerBooking
            });
          }
        } else { // Occasional (1-4 bookings)
          if (avgSpentPerBooking >= 500000) { // High spender
            segments.occasionalHighSpenders.push({
              userId: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              bookingCount,
              totalSpent,
              avgSpentPerBooking
            });
          } else {
            segments.occasionalLowSpenders.push({
              userId: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              bookingCount,
              totalSpent,
              avgSpentPerBooking
            });
          }
        }
      });

      res.json({
        success: true,
        data: {
          segments: {
            frequentHighSpenders: {
              count: segments.frequentHighSpenders.length,
              users: segments.frequentHighSpenders.slice(0, 10) // Limit to top 10
            },
            frequentLowSpenders: {
              count: segments.frequentLowSpenders.length,
              users: segments.frequentLowSpenders.slice(0, 10)
            },
            occasionalHighSpenders: {
              count: segments.occasionalHighSpenders.length,
              users: segments.occasionalHighSpenders.slice(0, 10)
            },
            occasionalLowSpenders: {
              count: segments.occasionalLowSpenders.length,
              users: segments.occasionalLowSpenders.slice(0, 10)
            },
            newCustomers: {
              count: segments.newCustomers.length,
              users: segments.newCustomers.slice(0, 10)
            }
          },
          summary: {
            totalSegmentedUsers: usersWithBookings.length,
            dateRange: {
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
   * Get revenue projections
   */
  static async getRevenueProjections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Get current date and define projection periods
      const currentDate = moment().toDate();
      const currentYearStart = moment().startOf('year').toDate();
      const currentYearEnd = moment().endOf('year').toDate();
      const nextYearStart = moment().add(1, 'year').startOf('year').toDate();
      const nextYearEnd = moment().add(1, 'year').endOf('year').toDate();

      // Get current year revenue data
      const currentYearData = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: currentYearStart, $lte: currentDate },
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$bookingDate' }
            },
            revenue: { $sum: '$pricing.totalAmount' },
            bookings: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.month': 1 }
        }
      ]);

      // Calculate projection based on current year performance
      const totalMonthsPassed = moment().month() + 1; // Months 0-11, so +1
      const totalRevenueSoFar = currentYearData.reduce((sum, data) => sum + data.revenue, 0);
      const totalBookingsSoFar = currentYearData.reduce((sum, data) => sum + data.bookings, 0);
      
      // Project full year revenue
      const projectedAnnualRevenue = totalMonthsPassed > 0 
        ? Math.round((totalRevenueSoFar / totalMonthsPassed) * 12)
        : 0;
      
      const projectedAnnualBookings = totalMonthsPassed > 0
        ? Math.round((totalBookingsSoFar / totalMonthsPassed) * 12)
        : 0;

      // Calculate monthly projections
      const monthlyProjections = [];
      for (let i = 1; i <= 12; i++) {
        const monthName = moment().month(i - 1).format('MMM');
        const isPast = i <= moment().month();
        
        if (isPast) {
          // Use actual data for past months
          const actualData = currentYearData.find(data => data._id.month === i);
          monthlyProjections.push({
            month: monthName,
            revenue: actualData ? actualData.revenue : 0,
            bookings: actualData ? actualData.bookings : 0,
            isProjected: false
          });
        } else {
          // Project future months
          const avgMonthlyRevenue = totalMonthsPassed > 0 
            ? totalRevenueSoFar / totalMonthsPassed 
            : 0;
          const avgMonthlyBookings = totalMonthsPassed > 0
            ? totalBookingsSoFar / totalMonthsPassed
            : 0;
          
          monthlyProjections.push({
            month: monthName,
            revenue: Math.round(avgMonthlyRevenue),
            bookings: Math.round(avgMonthlyBookings),
            isProjected: true
          });
        }
      }

      res.json({
        success: true,
        data: {
          currentPerformance: {
            revenue: totalRevenueSoFar,
            bookings: totalBookingsSoFar,
            monthsPassed: totalMonthsPassed
          },
          projections: {
            annualRevenue: projectedAnnualRevenue,
            annualBookings: projectedAnnualBookings,
            monthlyProjections
          },
          dateRange: {
            currentYear: {
              start: currentYearStart,
              end: currentYearEnd
            },
            nextYear: {
              start: nextYearStart,
              end: nextYearEnd
            }
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff scheduling data
   */
  static async getStaffScheduling(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Validate stadium access
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
          message: 'Not authorized to view this stadium staff scheduling'
        });
        return;
      }

      // Define date range
      const start = startDate ? new Date(startDate as string) : moment().startOf('week').toDate();
      const end = endDate ? new Date(endDate as string) : moment().endOf('week').toDate();

      // Get staff with their availability and assigned bookings
      const staffData = await Stadium.findById(stadiumId).select('staff');

      if (!staffData || !staffData.staff) {
        res.json({
          success: true,
          data: {
            staff: [],
            dateRange: { start, end }
          }
        });
        return;
      }

      // Get bookings for the date range to show scheduled assignments
      const bookings = await Booking.find({
        stadiumId: stadiumId,
        bookingDate: { $gte: start, $lte: end },
        status: { $in: ['confirmed', 'completed'] }
      }).populate('assignedStaff.staffId', 'name role');

      // Get all staff members
      const allStaff = staffData.staff || [];

      // Format staff data with scheduling information
      const staffWithSchedules = allStaff.map((staff: any) => {
        // Find bookings where this staff member is assigned
        const assignedBookings = bookings.filter(booking => 
          booking.assignedStaff?.some(assigned => 
            assigned.staffId && assigned.staffId.toString() === staff._id.toString()
          )
        );

        return {
          staffId: staff._id,
          name: staff.name,
          role: staff.role,
          availability: staff.availability || [],
          assignedBookings: assignedBookings.map(booking => ({
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            fieldId: booking.fieldId,
            status: booking.status,
            assignedStaff: booking.assignedStaff || [] // Include assigned staff info
          })),
          totalAssignments: assignedBookings.length
        };
      });

      // Also include all bookings for the date range to show in the UI
      const allBookingsWithStaffInfo = bookings.map(booking => ({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        fieldId: booking.fieldId,
        status: booking.status,
        assignedStaff: booking.assignedStaff || []
      }));

      res.json({
        success: true,
        data: {
          staff: staffWithSchedules,
          bookings: allBookingsWithStaffInfo, // Add all bookings to the response
          dateRange: { start, end }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff performance metrics
   */
  static async getStaffPerformanceMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Validate stadium access
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
          message: 'Not authorized to view this stadium staff performance'
        });
        return;
      }

      // Define date range (default to last 30 days)
      const end = endDate ? new Date(endDate as string) : moment().endOf('day').toDate();
      const start = startDate ? new Date(startDate as string) : moment().subtract(30, 'days').startOf('day').toDate();

      // Get bookings with assigned staff for the period
      const bookings = await Booking.find({
        stadiumId: stadiumId,
        bookingDate: { $gte: start, $lte: end },
        status: { $in: ['confirmed', 'completed'] }
      }).populate('assignedStaff.staffId', 'name role rates');

      // Calculate performance metrics for each staff member
      const staffPerformance: any = {};

      bookings.forEach(booking => {
        if (booking.assignedStaff && booking.assignedStaff.length > 0) {
          booking.assignedStaff.forEach(assignment => {
            if (assignment.staffId) {
              const staffId = assignment.staffId.toString();
              
              if (!staffPerformance[staffId]) {
                const staffMember = assignment.staffId as any;
                const hourlyRate = (staffMember.rates && staffMember.rates.hourlyRate) ? staffMember.rates.hourlyRate : 0;
                
                staffPerformance[staffId] = {
                  staffId: staffId,
                  name: staffMember.name,
                  role: staffMember.role,
                  hourlyRate: hourlyRate,
                  totalAssignments: 0,
                  totalHours: 0,
                  totalEarnings: 0,
                  bookingsHandled: [],
                  rating: 0 // We would need a rating system to populate this
                };
              }
              
              // Calculate hours for this booking
              const startTime = moment(booking.startTime, 'HH:mm');
              const endTime = moment(booking.endTime, 'HH:mm');
              const durationHours = endTime.diff(startTime, 'hours', true);
              
              staffPerformance[staffId].totalAssignments += 1;
              staffPerformance[staffId].totalHours += durationHours;
              staffPerformance[staffId].totalEarnings += 
                durationHours * staffPerformance[staffId].hourlyRate;
              
              staffPerformance[staffId].bookingsHandled.push({
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                bookingDate: booking.bookingDate,
                durationHours: durationHours,
                earnings: durationHours * staffPerformance[staffId].hourlyRate
              });
            }
          });
        }
      });

      // Convert to array and sort by total earnings
      const performanceArray = Object.values(staffPerformance)
        .sort((a: any, b: any) => b.totalEarnings - a.totalEarnings);

      res.json({
        success: true,
        data: {
          staffPerformance: performanceArray,
          summary: {
            totalStaff: performanceArray.length,
            totalAssignments: performanceArray.reduce((sum: number, staff: any) => 
              sum + staff.totalAssignments, 0),
            totalHours: performanceArray.reduce((sum: number, staff: any) => 
              sum + staff.totalHours, 0),
            totalEarnings: performanceArray.reduce((sum: number, staff: any) => 
              sum + staff.totalEarnings, 0)
          },
          dateRange: { start, end }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll data for staff
   */
  static async getStaffPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { startDate, endDate, format } = req.query;

      // Validate stadium access
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
          message: 'Not authorized to view this stadium payroll data'
        });
        return;
      }

      // Define date range (default to current month)
      const end = endDate ? new Date(endDate as string) : moment().endOf('month').toDate();
      const start = startDate ? new Date(startDate as string) : moment().startOf('month').toDate();

      // Get bookings with assigned staff for the payroll period
      const bookings = await Booking.find({
        stadiumId: stadiumId,
        bookingDate: { $gte: start, $lte: end },
        status: { $in: ['confirmed', 'completed'] }
      }).populate('assignedStaff.staffId', 'name role rates');

      // Calculate payroll for each staff member
      const payrollData: any = {};

      bookings.forEach(booking => {
        if (booking.assignedStaff && booking.assignedStaff.length > 0) {
          booking.assignedStaff.forEach(assignment => {
            if (assignment.staffId) {
              const staffId = assignment.staffId.toString();
              
              if (!payrollData[staffId]) {
                const staffMember = assignment.staffId as any;
                const hourlyRate = (staffMember.rates && staffMember.rates.hourlyRate) ? staffMember.rates.hourlyRate : 0;
                
                payrollData[staffId] = {
                  staffId: staffId,
                  name: staffMember.name,
                  role: staffMember.role,
                  hourlyRate: hourlyRate,
                  totalHours: 0,
                  totalEarnings: 0,
                  overtimeHours: 0,
                  overtimeEarnings: 0,
                  assignments: [],
                  bankAccount: staffMember.bankAccount || null
                };
              }
              
              // Calculate hours for this booking
              const startTime = moment(booking.startTime, 'HH:mm');
              const endTime = moment(booking.endTime, 'HH:mm');
              let durationHours = endTime.diff(startTime, 'hours', true);
              
              // Calculate overtime (hours > 8 in a day)
              let regularHours = Math.min(durationHours, 8);
              let overtimeHours = Math.max(0, durationHours - 8);
              
              // Apply overtime rate (1.5x regular rate)
              const overtimeRate = payrollData[staffId].hourlyRate * 1.5;
              
              payrollData[staffId].totalHours += regularHours;
              payrollData[staffId].totalEarnings += regularHours * payrollData[staffId].hourlyRate;
              payrollData[staffId].overtimeHours += overtimeHours;
              payrollData[staffId].overtimeEarnings += overtimeHours * overtimeRate;
              
              payrollData[staffId].assignments.push({
                bookingId: booking._id,
                bookingNumber: booking.bookingNumber,
                bookingDate: booking.bookingDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                regularEarnings: regularHours * payrollData[staffId].hourlyRate,
                overtimeEarnings: overtimeHours * overtimeRate
              });
            }
          });
        }
      });

      // Convert to array and calculate totals
      const payrollArray = Object.values(payrollData);
      const totalPayrollCost = payrollArray.reduce((sum: number, staff: any) => 
        sum + staff.totalEarnings + staff.overtimeEarnings, 0);

      // Format response based on requested format
      if (format === 'csv') {
        let csvContent = 'Staff Name,Role,Regular Hours,Overtime Hours,Regular Earnings,Overtime Earnings,Total Earnings\n';
        
        payrollArray.forEach((staff: any) => {
          csvContent += `"${staff.name}","${staff.role}",${staff.totalHours},${staff.overtimeHours},${staff.totalEarnings},${staff.overtimeEarnings},${staff.totalEarnings + staff.overtimeEarnings}\n`;
        });
        
        csvContent += `TOTAL,,${payrollArray.reduce((sum: number, staff: any) => sum + staff.totalHours, 0)},${payrollArray.reduce((sum: number, staff: any) => sum + staff.overtimeHours, 0)},${payrollArray.reduce((sum: number, staff: any) => sum + staff.totalEarnings, 0)},${payrollArray.reduce((sum: number, staff: any) => sum + staff.overtimeEarnings, 0)},${totalPayrollCost}\n`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payroll-${moment(start).format('YYYY-MM')}.csv`);
        res.send(csvContent);
        return;
      }

      res.json({
        success: true,
        data: {
          payroll: payrollArray,
          summary: {
            totalStaff: payrollArray.length,
            totalRegularHours: payrollArray.reduce((sum: number, staff: any) => sum + staff.totalHours, 0),
            totalOvertimeHours: payrollArray.reduce((sum: number, staff: any) => sum + staff.overtimeHours, 0),
            totalRegularEarnings: payrollArray.reduce((sum: number, staff: any) => sum + staff.totalEarnings, 0),
            totalOvertimeEarnings: payrollArray.reduce((sum: number, staff: any) => sum + staff.overtimeEarnings, 0),
            totalPayrollCost: totalPayrollCost
          },
          dateRange: { start, end }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}