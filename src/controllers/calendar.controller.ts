import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CalendarService } from '../services/calendar.service';
import moment from 'moment';

export class CalendarController {
  /**
   * Get calendar events for the current user
   */
  static async getUserCalendarEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const events = await CalendarService.getUserCalendarEvents(
        req.user?.userId as string,
        start.toDate(),
        end.toDate()
      );
      
      res.json({
        success: true,
        message: 'Calendar events retrieved successfully',
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar events for stadium owner
   */
  static async getStadiumOwnerCalendarEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const events = await CalendarService.getStadiumOwnerCalendarEvents(
        req.user?.userId as string,
        start.toDate(),
        end.toDate()
      );
      
      res.json({
        success: true,
        message: 'Calendar events retrieved successfully',
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar events for admin
   */
  static async getAdminCalendarEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate, stadiumId } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const events = await CalendarService.getAdminCalendarEvents(
        start.toDate(),
        end.toDate(),
        stadiumId as string | undefined
      );
      
      res.json({
        success: true,
        message: 'Calendar events retrieved successfully',
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar events for a specific stadium
   */
  static async getStadiumCalendarEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const { stadiumId } = req.params;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const events = await CalendarService.getStadiumCalendarEvents(
        stadiumId,
        start.toDate(),
        end.toDate()
      );
      
      res.json({
        success: true,
        message: 'Calendar events retrieved successfully',
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reschedule a booking
   */
  static async rescheduleBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { bookingId } = req.params;
      const { newDate, newStartTime, newEndTime } = req.body;
      
      // Validate input
      if (!newDate || !newStartTime || !newEndTime) {
        res.status(400).json({
          success: false,
          message: 'New date, start time, and end time are required'
        });
        return;
      }
      
      const date = moment(newDate as string, 'YYYY-MM-DD', true);
      if (!date.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      // Validate time format
      const startTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const endTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!startTimeRegex.test(newStartTime as string) || !endTimeRegex.test(newEndTime as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time format. Please use HH:mm'
        });
        return;
      }
      
      // Check that end time is after start time
      const startMoment = moment(newStartTime as string, 'HH:mm');
      const endMoment = moment(newEndTime as string, 'HH:mm');
      
      if (!endMoment.isAfter(startMoment)) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
        return;
      }
      
      const updatedBooking = await CalendarService.rescheduleBooking(
        bookingId,
        date.toDate(),
        newStartTime as string,
        newEndTime as string,
        req.user?.userId as string
      );
      
      res.json({
        success: true,
        message: 'Booking rescheduled successfully',
        data: updatedBooking
      });
    } catch (error: any) {
      if (error.message === 'Booking not found') {
        res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
        return;
      }
      
      if (error.message === 'Not authorized to reschedule this booking') {
        res.status(403).json({
          success: false,
          message: 'Not authorized to reschedule this booking'
        });
        return;
      }
      
      if (error.message === 'Time slot is already booked') {
        res.status(400).json({
          success: false,
          message: 'Selected time slot is already booked'
        });
        return;
      }
      
      next(error);
    }
  }

  /**
   * Get visual calendar data for the current user
   */
  static async getUserVisualCalendarData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const visualData = await CalendarService.getUserVisualCalendarData(
        req.user?.userId as string,
        start.toDate(),
        end.toDate()
      );
      
      res.json({
        success: true,
        message: 'Visual calendar data retrieved successfully',
        data: visualData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get visual calendar data for stadium owner
   */
  static async getStadiumOwnerVisualCalendarData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const visualData = await CalendarService.getStadiumOwnerVisualCalendarData(
        req.user?.userId as string,
        start.toDate(),
        end.toDate()
      );
      
      res.json({
        success: true,
        message: 'Visual calendar data retrieved successfully',
        data: visualData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get visual calendar data for admin
   */
  static async getAdminVisualCalendarData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { startDate, endDate, stadiumId } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }
      
      const start = moment(startDate as string, 'YYYY-MM-DD', true);
      const end = moment(endDate as string, 'YYYY-MM-DD', true);
      
      if (!start.isValid() || !end.isValid()) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
        return;
      }
      
      if (end.isBefore(start)) {
        res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
        return;
      }
      
      // Limit date range to 1 year maximum
      if (end.diff(start, 'days') > 365) {
        res.status(400).json({
          success: false,
          message: 'Date range cannot exceed 1 year'
        });
        return;
      }
      
      const visualData = await CalendarService.getAdminVisualCalendarData(
        start.toDate(),
        end.toDate(),
        stadiumId as string | undefined
      );
      
      res.json({
        success: true,
        message: 'Visual calendar data retrieved successfully',
        data: visualData
      });
    } catch (error) {
      next(error);
    }
  }
}