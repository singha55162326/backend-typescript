import { Router, Request, Response, NextFunction } from 'express';
import moment from 'moment-timezone';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics endpoints for stadium owners and admins
 */

/**
 * @swagger
 * /api/analytics/stadiums/{stadiumId}:
 *   get:
 *     summary: Get stadium analytics (owner/admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stadiumId
 *         schema:
 *           type: string
 *         required: true
 *         description: Stadium ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: Stadium analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyAnalytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             format: date
 *                           totalBookings:
 *                             type: number
 *                           totalRevenue:
 *                             type: number
 *                           totalRefereeRevenue:
 *                             type: number
 *                           statusBreakdown:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 status:
 *                                   type: string
 *                                 count:
 *                                   type: number
 *                     staffPerformance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           refereeName:
 *                             type: string
 *                           totalBookings:
 *                             type: number
 *                           totalHours:
 *                             type: number
 *                           totalEarnings:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                         totalRefereeRevenue:
 *                           type: number
 *                         currency:
 *                           type: string
 *       403:
 *         description: Not authorized to view this stadium analytics
 *       404:
 *         description: Stadium not found
 *       500:
 *         description: Failed to get analytics
 */
router.get('/stadiums/:stadiumId', authenticateToken, authorizeRoles(['superadmin', 'stadium_owner']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stadiumId } = req.params;
    const { startDate, endDate } = req.query;

    // Check access rights
    const stadium = await Stadium.findById(stadiumId);
    if (!stadium) {
      return res.status(404).json({
        success: false,
        message: 'Stadium not found'
      });
    }

    if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this stadium analytics'
      });
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
    return next(error);
  }
});

export default router;