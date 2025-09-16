import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { TranslationService } from '../services/translation.service';

export class UserController {
  /**
   * Get current user's notification preferences
   */
  static async getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      const user = await User.findById(userId).select('profile.notificationPreferences');
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        data: user.profile?.notificationPreferences || {
          email: true,
          sms: true,
          push: true,
          bookingReminders: true,
          promotions: false
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user's notification preferences
   */
  static async updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = req.user?.userId;
      const { notificationPreferences } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      // Initialize profile if it doesn't exist
      if (!user.profile) {
        user.profile = {};
      }

      // Update notification preferences
      user.profile.notificationPreferences = {
        ...user.profile.notificationPreferences,
        ...notificationPreferences
      };

      await user.save();

      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: user.profile.notificationPreferences
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user's preferred language
   */
  static async updatePreferredLanguage(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = req.user?.userId;
      const { preferredLanguage } = req.body;

      // Validate language is supported
      const supportedLanguages = TranslationService.getSupportedLanguages();
      if (!supportedLanguages.includes(preferredLanguage)) {
        res.status(400).json({
          success: false,
          message: TranslationService.t('error'),
          errors: [{ msg: 'Unsupported language' }]
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      // Initialize profile if it doesn't exist
      if (!user.profile) {
        user.profile = {};
      }

      // Update preferred language
      user.profile.preferredLanguage = preferredLanguage;

      await user.save();

      res.json({
        success: true,
        message: TranslationService.t('success'),
        data: { preferredLanguage: user.profile.preferredLanguage }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's preferred language
   */
  static async getPreferredLanguage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      const user = await User.findById(userId).select('profile.preferredLanguage');
      if (!user) {
        res.status(404).json({
          success: false,
          message: TranslationService.t('userNotFound')
        });
        return;
      }

      res.json({
        success: true,
        data: { 
          preferredLanguage: user.profile?.preferredLanguage || 'lo' // Default to Lao
        }
      });
    } catch (error) {
      next(error);
    }
  }
}