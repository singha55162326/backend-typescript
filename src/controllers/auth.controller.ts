import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { LoyaltyController } from './loyalty.controller';
import { Types } from 'mongoose';
import { TranslationService } from '../services/translation.service';
import { LaoPhoneUtil } from '../utils/phoneUtils';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('validationError'),
          errors: errors.array()
        });
        return;
      }

      const { email, password, firstName, lastName, phone, role, referralCode } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('userAlreadyExists')
        });
        return;
      }

      const user = new User({
        email,
        passwordHash: password,
        firstName,
        lastName,
        phone,
        role: role || 'general_user'
      });

      await user.save();

      // Process referral if code is provided
      if (referralCode) {
        try {
          await LoyaltyController.processReferral(referralCode, new Types.ObjectId((user._id as any).toString()));
        } catch (error) {
          console.error('Error processing referral:', error);
          // Don't fail registration if referral processing fails
        }
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: TranslationService.t('success'),
        token,
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('validationError'),
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({
          success: false,
          message: TranslationService.t('invalidCredentials')
        });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: TranslationService.t('invalidCredentials')
        });
        return;
      }

      if (user.status !== 'active') {
        res.status(401).json({
          success: false,
          message: TranslationService.t('accountInactive')
        });
        return;
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: TranslationService.t('success'),
        token,
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get current user data
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all stadium owners for assignment
   */
  static async getStadiumOwners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const stadiumOwners = await User.find(
        { role: 'stadium_owner' },
        'firstName lastName email phone'
      ).exec();

      res.json({
        success: true,
        data: stadiumOwners
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      let filter: any = {};
      if (req.query.role) {
        filter.role = req.query.role;
      }
      if (req.query.status) {
        filter.status = req.query.status;
      }

      const users = await User.find(filter)
        .select('-passwordHash')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status (admin only)
   */
  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;

      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        message: TranslationService.t('success')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create user (admin only)
   */
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('validationError'),
          errors: errors.array()
        });
        return;
      }

      const { email, password, firstName, lastName, phone, role, status } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('userAlreadyExists')
        });
        return;
      }

      const user = new User({
        email,
        passwordHash: password,
        firstName,
        lastName,
        phone,
        role: role || 'general_user',
        status: status || 'active'
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: TranslationService.t('success'),
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('validationError'),
          errors: errors.array()
        });
        return;
      }

      const user = await User.findById(req.params.id).select('-passwordHash');
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update user (admin only)
   */
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('validationError'),
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        message: TranslationService.t('success'),
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify user (admin only)
   */
  static async verifyUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('validationError'),
          errors: errors.array()
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isVerified: true, verifiedAt: new Date() },
        { new: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: user
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Replace user data completely (admin only)
   */
  static async replaceUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, role, status, password } = req.body;

      const updateData: any = {};

      if (firstName) updateData.firstName = firstName.trim();
      if (lastName) updateData.lastName = lastName.trim();
      if (phone) updateData.phone = phone.trim();
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (password) {
        if (password.length < 6) {
          res.status(400).json({
            success: false,
            message: TranslationService.t('passwordTooShort')
          });
          return;
        }
        updateData.passwordHash = password;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('error')
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        message: TranslationService.t('success'),
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update current user's profile
   */
  static async updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const updates = req.body;

      // Only allow users to update their own profile
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      // Update profile fields
      if (updates.firstName) user.firstName = updates.firstName.trim();
      if (updates.lastName) user.lastName = updates.lastName.trim();
      if (updates.phone) user.phone = updates.phone.trim();
      
      // Update profile object if provided
      if (updates.profile) {
        user.profile = user.profile || {};
        
        if (updates.profile.dateOfBirth !== undefined) 
          user.profile.dateOfBirth = updates.profile.dateOfBirth;
        if (updates.profile.gender !== undefined) 
          user.profile.gender = updates.profile.gender;
        if (updates.profile.bio !== undefined) 
          user.profile.bio = updates.profile.bio;
        if (updates.profile.preferredLanguage !== undefined) 
          user.profile.preferredLanguage = updates.profile.preferredLanguage;
        if (updates.profile.timezone !== undefined) 
          user.profile.timezone = updates.profile.timezone;
          
        // Update notification preferences
        if (updates.profile.notificationPreferences) {
          user.profile.notificationPreferences = {
            ...user.profile.notificationPreferences,
            ...updates.profile.notificationPreferences
          };
        }
      }

      await user.save();

      res.json({
        success: true,
        message: TranslationService.t('success'),
        user: user.toJSON()
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async phoneLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: TranslationService.t('validationError'),
        errors: errors.array()
      });
      return;
    }

    const { phone, password } = req.body;

    // 👇 Normalize & validate Lao phone number
    const normalizedPhone = LaoPhoneUtil.normalize(phone);
    if (!normalizedPhone) {
      res.status(400).json({
        success: false,
        message: TranslationService.t('invalidLaoPhoneNumber')
      });
      return;
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      res.status(401).json({
        success: false,
        message: TranslationService.t('invalidCredentials')
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: TranslationService.t('invalidCredentials')
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: TranslationService.t('accountInactive')
      });
      return;
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: TranslationService.t('success'),
      token,
      user: user.toJSON()
    });
  } catch (error: any) {
    next(error);
  }
}
}