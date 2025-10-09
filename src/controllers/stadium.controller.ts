import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Stadium from '../models/Stadium';
import User from '../models/User';
import Booking from '../models/Booking';
import AvailabilityService from '../utils/availability';
import { Types } from 'mongoose';

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

  /**
   * Get comprehensive availability information for all fields in a stadium on a specific date
   */
  static async getStadiumAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { date } = req.query;

      // Validate date format
      const moment = require('moment');
      const requestedDate = moment(date as string, 'YYYY-MM-DD', true);
      if (!requestedDate.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD',
        });
        return;
      }

      // Check if date is in the past
      const today = moment().startOf('day');
      if (requestedDate.isBefore(today)) {
        res.status(400).json({
          success: false,
          message: 'Cannot check availability for past dates',
        });
        return;
      }

      // Find stadium
      const stadium = await Stadium.findById(stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Process each field in the stadium
      const fieldsData: any[] = [];
      
      if (stadium.fields && Array.isArray(stadium.fields)) {
        for (const field of stadium.fields) {
          // Get the field's ID (Mongoose automatically adds _id to subdocuments)
          const fieldId = (field as any)._id.toString();
          
          // Get comprehensive availability for this field
          const availability = await AvailabilityService.getComprehensiveAvailability(
            fieldId,
            date as string,
            field
          );

          fieldsData.push({
            id: fieldId,
            name: field.name,
            type: field.fieldType,
            surface: field.surfaceType,
            ...availability
          });
        }
      }

      // Get available referees for this time (whole day)
      const availableReferees = stadium.staff ? await AvailabilityService.getAvailableReferees(
        stadium.staff,
        date as string,
        '00:00',
        '23:59'
      ) : [];

      res.json({
        success: true,
        data: {
          stadium: {
            id: stadium._id,
            name: stadium.name,
            address: stadium.address
          },
          fields: fieldsData,
          availableReferees: availableReferees.map(ref => ({
            id: ref._id,
            name: ref.name,
            specializations: ref.specializations,
            rate: ref.rate,
            currency: ref.currency
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check availability of a specific time slot across all fields in a stadium
   */
  static async checkStadiumSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { date, startTime, endTime } = req.query;

      // Validate that end time is after start time
      const moment = require('moment');
      const startMoment = moment(startTime as string, 'HH:mm');
      const endMoment = moment(endTime as string, 'HH:mm');
      
      if (!endMoment.isAfter(startMoment)) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time',
        });
        return;
      }

      // Find stadium
      const stadium = await Stadium.findById(stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      const duration = endMoment.diff(startMoment, 'hours', true);
      const fieldsData: any[] = [];

      // Check each field in the stadium
      if (stadium.fields && Array.isArray(stadium.fields)) {
        for (const field of stadium.fields) {
          // Get the field's ID (Mongoose automatically adds _id to subdocuments)
          const fieldId = (field as any)._id.toString();
          
          // Check if field is active
          if (field.status !== 'active') {
            fieldsData.push({
              id: fieldId,
              name: field.name,
              type: field.fieldType,
              isAvailable: false,
              reason: `Field is currently ${field.status}`,
              pricing: null
            });
            continue;
          }

          // Check if time slot is available for this field
          const isAvailable = await AvailabilityService.checkFieldAvailability(
            fieldId,
            date as string,
            startTime as string,
            endTime as string
          );

          const rate = field.pricing.baseHourlyRate;
          const total = rate * duration;

          if (!isAvailable) {
            // Find the conflicting booking
            const conflictingBooking = await Booking.findOne({
              fieldId: new Types.ObjectId(fieldId),
              bookingDate: new Date(date as string),
              $or: [
                {
                  $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } }
                  ]
                }
              ],
              status: { $in: ['pending', 'confirmed'] }
            });

            fieldsData.push({
              id: fieldId,
              name: field.name,
              type: field.fieldType,
              isAvailable: false,
              reason: conflictingBooking 
                ? `Time slot conflicts with existing ${conflictingBooking.status} booking` 
                : 'Time slot is not available',
              pricing: {
                rate,
                duration,
                total,
                currency: field.pricing.currency || 'LAK'
              }
            });
            continue;
          }

          // Check if slot is within field's operating hours
          const dayOfWeek = moment(date as string).day();
          const daySchedule = field.availabilitySchedule?.find((schedule: any) => 
            schedule.dayOfWeek === dayOfWeek
          );

          if (!daySchedule) {
            fieldsData.push({
              id: fieldId,
              name: field.name,
              type: field.fieldType,
              isAvailable: false,
              reason: 'Field is not open on this day',
              pricing: {
                rate,
                duration,
                total,
                currency: field.pricing.currency || 'LAK'
              }
            });
            continue;
          }

          // Check if the requested time falls within any available slot
          const isWithinOperatingHours = daySchedule.timeSlots.some((slot: any) => 
            slot.isAvailable &&
            slot.startTime <= (startTime as string) &&
            slot.endTime >= (endTime as string)
          );

          if (!isWithinOperatingHours) {
            fieldsData.push({
              id: fieldId,
              name: field.name,
              type: field.fieldType,
              isAvailable: false,
              reason: 'Requested time is outside field operating hours',
              pricing: {
                rate,
                duration,
                total,
                currency: field.pricing.currency || 'LAK'
              }
            });
            continue;
          }

          fieldsData.push({
            id: fieldId,
            name: field.name,
            type: field.fieldType,
            isAvailable: true,
            reason: 'ເວລານີ້ຫວ່າງ',
            pricing: {
              rate,
              duration,
              total,
              currency: field.pricing.currency || 'LAK'
            }
          });
        }
      }

      // Get available referees for this time slot
      const availableReferees = stadium.staff ? await AvailabilityService.getAvailableReferees(
        stadium.staff,
        date as string,
        startTime as string,
        endTime as string
      ) : [];

      res.json({
        success: true,
        data: {
          stadium: {
            id: stadium._id,
            name: stadium.name
          },
          fields: fieldsData,
          availableReferees: availableReferees.map(ref => ({
            id: ref._id,
            name: ref.name,
            rate: ref.rate,
            currency: ref.currency
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive availability information for a specific field in a stadium on a specific date
   */
  static async getFieldAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { stadiumId, fieldId } = req.params;
      const { date } = req.query;

      // Validate date format
      const moment = require('moment');
      const requestedDate = moment(date as string, 'YYYY-MM-DD', true);
      if (!requestedDate.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD',
        });
        return;
      }

      // Check if date is in the past
      const today = moment().startOf('day');
      if (requestedDate.isBefore(today)) {
        res.status(400).json({
          success: false,
          message: 'Cannot check availability for past dates',
        });
        return;
      }

      // Find stadium
      const stadium = await Stadium.findById(stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Find the specific field
      const field = stadium.fields?.find((f: any) => 
        f._id && f._id.toString() === fieldId
      );
      
      if (!field) {
        res.status(404).json({
          success: false,
          message: 'Field not found',
        });
        return;
      }

      // Get comprehensive availability for this field
      const availability = await AvailabilityService.getComprehensiveAvailability(
        fieldId,
        date as string,
        field
      );

      // Get available referees for this time (whole day)
      const availableReferees = stadium.staff ? await AvailabilityService.getAvailableReferees(
        stadium.staff,
        date as string,
        '00:00',
        '23:59'
      ) : [];

      const dayOfWeek = requestedDate.day();
      
      // Check for special dates
      const specialDate = field.specialDates?.find((special: any) => 
        moment(special.date).isSame(requestedDate, 'day')
      );

      res.json({
        success: true,
        data: {
          date: date,
          dayOfWeek: dayOfWeek,
          fieldInfo: {
            id: fieldId,
            name: field.name,
            type: field.fieldType,
            surface: field.surfaceType,
            status: field.status,
            baseRate: field.pricing.baseHourlyRate,
            currency: field.pricing.currency || 'LAK'
          },
          stadiumInfo: {
            id: stadiumId,
            name: stadium.name
          },
          ...availability,
          availableReferees: availableReferees.map(ref => ({
            _id: ref._id,
            name: ref.name,
            specializations: ref.specializations,
            rate: ref.rate,
            currency: ref.currency
          })),
          specialDateInfo: specialDate ? {
            isSpecialDate: true,
            reason: specialDate.reason || 'Special schedule'
          } : {
            isSpecialDate: false
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check availability of a specific time slot for a specific field in a stadium
   */
  static async checkFieldSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { stadiumId, fieldId } = req.params;
      const { date, startTime, endTime } = req.query;

      // Validate that end time is after start time
      const moment = require('moment');
      const startMoment = moment(startTime as string, 'HH:mm');
      const endMoment = moment(endTime as string, 'HH:mm');
      
      if (!endMoment.isAfter(startMoment)) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time',
        });
        return;
      }

      // Find stadium
      const stadium = await Stadium.findById(stadiumId);
      if (!stadium) {
        res.status(404).json({
          success: false,
          message: 'Stadium not found',
        });
        return;
      }

      // Find the specific field
      const field = stadium.fields?.find((f: any) => 
        f._id && f._id.toString() === fieldId
      );
      
      if (!field) {
        res.status(404).json({
          success: false,
          message: 'Field not found',
        });
        return;
      }

      if (field.status !== 'active') {
        res.json({
          success: true,
          data: {
            isAvailable: false,
            reason: `Field is currently ${field.status}`,
            pricing: null
          }
        });
        return;
      }

      // Check if time slot is available
      const isAvailable = await AvailabilityService.checkFieldAvailability(
        fieldId,
        date as string,
        startTime as string,
        endTime as string
      );

      const duration = endMoment.diff(startMoment, 'hours', true);
      const rate = field.pricing.baseHourlyRate;
      const total = rate * duration;

      if (!isAvailable) {
        // Find the conflicting booking
        const conflictingBooking = await Booking.findOne({
          fieldId: new Types.ObjectId(fieldId),
          bookingDate: new Date(date as string),
          $or: [
            {
              $and: [
                { startTime: { $lt: endTime } },
                { endTime: { $gt: startTime } }
              ]
            }
          ],
          status: { $in: ['pending', 'confirmed'] }
        });

        res.json({
          success: true,
          data: {
            isAvailable: false,
            reason: conflictingBooking 
              ? `Time slot conflicts with existing ${conflictingBooking.status} booking` 
              : 'Time slot is not available',
            pricing: {
              rate,
              duration,
              total,
              currency: field.pricing.currency || 'LAK'
            }
          }
        });
        return;
      }

      // Check if slot is within field's operating hours
      // const dayOfWeek = moment(date as string).day();
      // const daySchedule = field.availabilitySchedule?.find((schedule: any) => 
      //   schedule.dayOfWeek === dayOfWeek
      // );

      // if (!daySchedule) {
      //   res.json({
      //     success: true,
      //     data: {
      //       isAvailable: false,
      //       reason: 'Field is not open on this day',
      //       pricing: {
      //         rate,
      //         duration,
      //         total,
      //         currency: field.pricing.currency || 'LAK'
      //       }
      //     }
      //   });
      //   return;
      // }

      // Check if the requested time falls within any available slot
      // const isWithinOperatingHours = daySchedule.timeSlots.some((slot: any) => 
      //   slot.isAvailable &&
      //   slot.startTime <= (startTime as string) &&
      //   slot.endTime >= (endTime as string)
      // );

      // if (!isWithinOperatingHours) {
      //   res.json({
      //     success: true,
      //     data: {
      //       isAvailable: false,
      //       reason: 'Requested time is outside field operating hours',
      //       pricing: {
      //         rate,
      //         duration,
      //         total,
      //         currency: field.pricing.currency || 'LAK'
      //       }
      //     }
      //   });
      //   return;
      // }

      // Get available referees for this time slot
      const availableReferees = stadium.staff ? await AvailabilityService.getAvailableReferees(
        stadium.staff,
        date as string,
        startTime as string,
        endTime as string
      ) : [];

      res.json({
        success: true,
        data: {
          isAvailable: true,
          reason: 'ເວລານີ້ຫວ່າງ',
          pricing: {
            rate,
            duration,
            total,
            currency: field.pricing.currency || 'LAK'
          },
          availableReferees: availableReferees.map(ref => ({
            id: ref._id,
            name: ref.name,
            rate: ref.rate,
            currency: ref.currency
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby stadiums based on user's location
   */
  static async getNearbyStadiums(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Get user's location from query parameters
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
      
      if (lat === null || lng === null) {
        res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required for nearby search',
        });
        return;
      }

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        res.status(400).json({
          success: false,
          message: 'Invalid coordinates provided',
        });
        return;
      }

      // Default radius is 10km, but can be customized
      const radius = parseFloat(req.query.radius as string) || 10; // km
      const maxDistance = radius * 1000; // Convert to meters

      // Build query for nearby stadiums
      const dbQuery: any = {
        status: 'active',
        'address.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: maxDistance,
          },
        },
      };

      // Sorting by distance (nearest first)
      const stadiums = await Stadium.find(dbQuery)
        .populate('ownerId', 'firstName lastName email')
        .select('-staff.bankAccountDetails')
        .skip(skip)
        .limit(limit)
        .exec();

      const total = await Stadium.countDocuments(dbQuery);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        message: 'Nearby stadiums retrieved successfully',
        data: stadiums,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
        location: {
          latitude: lat,
          longitude: lng,
          radius: radius,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}