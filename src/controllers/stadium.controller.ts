import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Stadium from '../models/Stadium';
import User from '../models/User';


export class StadiumController {
  /**
   * Get all stadiums (public)
   */
  static async getAllStadiums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      let dbQuery: any = { status: 'active' };

      // Location-based search
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
      if (lat !== null && lng !== null) {
        const radius = parseFloat(req.query.radius as string) || 10; // km
        dbQuery['address.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: radius * 1000,
          },
        };
      }

      // City filter
      if (req.query.city) {
        dbQuery['address.city'] = new RegExp(req.query.city as string, 'i');
      }

      // Sorting logic
      const sortField = (req.query.sort as string) || 'stats.averageRating';
      const sortOrder = (req.query.order as string) === 'asc' ? 1 : -1;

      const sortOptions: Record<string, any> = {
        name: { name: sortOrder },
        createdAt: { createdAt: sortOrder },
        capacity: { capacity: sortOrder },
        averageRating: { 'stats.averageRating': sortOrder },
      };

      const dbSort = sortOptions[sortField] || { 'stats.averageRating': -1 };

      const stadiums = await Stadium.find(dbQuery)
        .populate('ownerId', 'firstName lastName email')
        .select('-staff.bankAccountDetails')
        .skip(skip)
        .limit(limit)
        .sort(dbSort)
        .exec();

      const total = await Stadium.countDocuments(dbQuery);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: stadiums,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stadiums owned by current user
   */
  static async getMyStadiums(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const stadiums = await Stadium.find({ ownerId: req.user?.userId })
        .populate('ownerId', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

      const total = await Stadium.countDocuments({ ownerId: req.user?.userId });

      res.json({
        success: true,
        data: stadiums,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stadium by ID
   */
  static async getStadiumById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.id)
        .populate('ownerId', 'firstName lastName email phone')
        .exec();

      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      res.json({
        success: true,
        data: stadium,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new stadium
   */
  static async createStadium(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      // Check if user can create stadium
      const user = await User.findById(req.user?.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      if (user.role !== 'stadium_owner' && user.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          message: 'Only stadium owners can create stadiums',
        });
        return;
      }

      // Set owner based on user role
      let ownerId = req.user?.userId;
      if (user.role === 'superadmin' && req.body.ownerId) {
        ownerId = req.body.ownerId;
      }

      const stadiumData = {
        ...req.body,
        ownerId,
        stats: {
          totalBookings: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalReviews: 0,
        },
      };

      const stadium = new Stadium(stadiumData);
      await stadium.save();

      const populatedStadium = await Stadium.findById(stadium._id)
        .populate('ownerId', 'firstName lastName email')
        .exec();

      res.status(201).json({
        success: true,
        message: 'Stadium created successfully',
        data: populatedStadium,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update stadium
   */
  static async updateStadium(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to update this stadium',
        });
        return;
      }

      const updatedStadium = await Stadium.findByIdAndUpdate(
        req.params.stadiumId,
        req.body,
        { new: true, runValidators: true }
      ).populate('ownerId', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Stadium updated successfully',
        data: updatedStadium,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete stadium
   */
  static async deleteStadium(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.id);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to delete this stadium',
        });
        return;
      }

      await Stadium.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Stadium deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload stadium images
   */
  static async uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to update this stadium',
        });
        return;
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No images uploaded',
        });
        return;
      }

      const imagePaths = (req.files as Express.Multer.File[]).map(file => `/uploads/stadiums/${file.filename}`);
      
      stadium.images = [...(stadium.images || []), ...imagePaths];
      await stadium.save();

      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          uploadedImages: imagePaths,
          totalImages: stadium.images.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add staff member to stadium
   */
  static async addStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to manage this stadium',
        });
        return;
      }

      // Initialize staff array if undefined
      if (!Array.isArray(stadium.staff)) {
        stadium.staff = [];
      }

      const staffData = {
        ...req.body,
        rates: {
          ...req.body.rates,
          currency: 'LAK',
        },
      };

      stadium.staff.push(staffData);
      await stadium.save();

      res.status(201).json({
        success: true,
        message: 'Staff member added successfully',
        data: stadium.staff[stadium.staff.length - 1],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update staff member
   */
  static async updateStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to manage this stadium',
        });
        return;
      }

      if (!Array.isArray(stadium.staff)) {
        res.status(404).json({
          success: false,
          message: 'Staff member not found',
        });
        return;
      }

      const staffIndex = stadium.staff.findIndex(
        (staff: any) => staff._id?.toString() === req.params.staffId
      );

      if (staffIndex === -1) {
        res.status(404).json({
          success: false,
          message: 'Staff member not found',
        });
        return;
      }

      stadium.staff[staffIndex] = {
        ...stadium.staff[staffIndex],
        ...req.body,
        rates: {
          ...stadium.staff[staffIndex].rates,
          ...req.body.rates,
          currency: 'LAK',
        },
      };

      await stadium.save();

      res.json({
        success: true,
        message: 'Staff member updated successfully',
        data: stadium.staff[staffIndex],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete staff member
   */
  static async deleteStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const stadium = await Stadium.findById(req.params.stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Check ownership
      if (req.user?.role !== 'superadmin' && stadium.ownerId.toString() !== req.user?.userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to manage this stadium',
        });
        return;
      }

      if (!Array.isArray(stadium.staff)) {
        res.status(404).json({
          success: false,
          message: 'Staff member not found',
        });
        return;
      }

      const staffIndex = stadium.staff.findIndex(
        (staff: any) => staff._id?.toString() === req.params.staffId
      );

      if (staffIndex === -1) {
        res.status(404).json({
          success: false,
          message: 'Staff member not found',
        });
        return;
      }

      stadium.staff.splice(staffIndex, 1);
      await stadium.save();

      res.json({
        success: true,
        message: 'Staff member deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}