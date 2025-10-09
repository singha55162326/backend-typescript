import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Review from '../models/Review';
import Booking from '../models/Booking';
import Stadium from '../models/Stadium';


import mongoose from 'mongoose';

export class ReviewController {
  /**
   * Create a new review
   */
  static async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
        return;
      }

      const { stadiumId, bookingId, rating, title, comment } = req.body;
      const userId = req.user?.userId;

      // Check if user has a completed booking for this stadium
      const booking = await Booking.findOne({
        _id: bookingId,
        userId,
        stadiumId,
        status: 'completed'
      });

      if (!booking) {
        res.status(400).json({
          success: false,
          message: 'You can only review stadiums you have completed bookings for'
        });
        return;
      }

      // Check if user has already reviewed this booking
      const existingReview = await Review.findOne({ bookingId, userId });
      if (existingReview) {
        res.status(400).json({
          success: false,
          message: 'You have already reviewed this booking'
        });
        return;
      }

      // Create review
      const review = new Review({
        userId,
        stadiumId,
        bookingId,
        rating,
        title,
        comment,
        isVerified: true, // Verified because they have a completed booking
        status: 'pending' // Pending moderation
      });

      await review.save();

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully and is pending approval',
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reviews for a stadium
   */
  static async getStadiumReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stadiumId } = req.params;
      const { page = 1, limit = 10, status = 'approved' } = req.query;

      // Validate stadium exists
      const stadium = await Stadium.findById(stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found'
        });
        return;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const reviews = await Review.find({
        stadiumId,
        status
      })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

      const total = await Review.countDocuments({
        stadiumId,
        status
      });

      res.json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reviews (for superadmin) or reviews for owned stadiums (for stadium_owner)
   */
  static async getAllReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const { page = 1, limit = 10, status } = req.query;

      // Check if user is authorized
      if (!userId || !userRole) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build query based on user role
      let query: any = {};
      
      // If status is provided, add to query
      if (status && status !== 'all') {
        query.status = status;
      }

      // If user is a stadium owner, only show reviews for their stadiums
      if (userRole === 'stadium_owner') {
        const stadiums = await Stadium.find({ ownerId: userId }, '_id');
        const stadiumIds = stadiums.map(stadium => stadium._id);
        query.stadiumId = { $in: stadiumIds };
      }
      // Superadmin can see all reviews, so no additional filtering needed

      const reviews = await Review.find(query)
        .populate('userId', 'firstName lastName')
        .populate('stadiumId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string));

      const total = await Review.countDocuments(query);

      res.json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's reviews
   */
  static async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const reviews = await Review.find({ userId })
        .populate('stadiumId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string));

      const total = await Review.countDocuments({ userId });

      res.json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update review status (moderation)
   */
  static async moderateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { status, notes } = req.body;

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { 
          status,
          ...(notes && { moderationNotes: notes })
        },
        { new: true }
      ).populate('userId', 'firstName lastName')
       .populate('stadiumId', 'name');

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
        return;
      }

      // If approved, update stadium rating
      if (status === 'approved') {
        await ReviewController.updateStadiumRating(review.stadiumId as any);
      }

      res.json({
        success: true,
        message: `Review ${status} successfully`,
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark review as helpful
   */
  static async markHelpful(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { $inc: { helpfulCount: 1 } },
        { new: true }
      );

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Review marked as helpful',
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Report a review
   */
  static async reportReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { reason } = req.body;

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { 
          $inc: { reportedCount: 1 },
          $push: { reports: { 
            userId: new mongoose.Types.ObjectId(req.user?.userId),
            reason,
            reportedAt: new Date()
          }}
        },
        { new: true }
      );

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review not found'
        });
        return;
      }

      // Auto-reject if too many reports
      if (review.reportedCount >= 5) {
        review.status = 'rejected';
        await review.save();
        await ReviewController.updateStadiumRating(review.stadiumId as any);
      }

      res.json({
        success: true,
        message: 'Review reported successfully',
        data: review
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update stadium average rating
   */
  static async updateStadiumRating(stadiumId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const approvedReviews = await Review.find({
        stadiumId,
        status: 'approved'
      });

      if (approvedReviews.length === 0) {
        await Stadium.findByIdAndUpdate(stadiumId, {
          'stats.averageRating': 0,
          'stats.totalReviews': 0
        });
        return;
      }

      const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / approvedReviews.length;

      await Stadium.findByIdAndUpdate(stadiumId, {
        'stats.averageRating': Math.round(averageRating * 10) / 10,
        'stats.totalReviews': approvedReviews.length
      });
    } catch (error) {
      console.error('Failed to update stadium rating:', error);
    }
  }
}