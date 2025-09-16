import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { StadiumSearchService, StadiumSearchFilters } from '../services/stadium-search.service';
import { SavedSearchService } from '../services/saved-search.service';

export class StadiumSearchController {
  /**
   * Advanced stadium search
   */
  static async searchStadiums(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Extract filters from query parameters
      const filters: StadiumSearchFilters = {
        query: req.query.query as string,
        city: req.query.city as string,
        country: req.query.country as string,
        fieldType: req.query.fieldType as string,
        surfaceType: req.query.surfaceType as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };
      
      // Capacity filter
      if (req.query.minCapacity || req.query.maxCapacity) {
        filters.capacity = {};
        if (req.query.minCapacity) {
          filters.capacity.min = parseInt(req.query.minCapacity as string);
        }
        if (req.query.maxCapacity) {
          filters.capacity.max = parseInt(req.query.maxCapacity as string);
        }
      }
      
      // Coordinates filter
      if (req.query.longitude && req.query.latitude) {
        filters.coordinates = {
          longitude: parseFloat(req.query.longitude as string),
          latitude: parseFloat(req.query.latitude as string)
        };
        
        if (req.query.maxDistance) {
          filters.coordinates.maxDistance = parseInt(req.query.maxDistance as string);
        }
      }
      
      // Facility filters
      if (req.query.hasParking !== undefined) {
        filters.hasParking = req.query.hasParking === 'true';
      }
      
      if (req.query.hasChangingRooms !== undefined) {
        filters.hasChangingRooms = req.query.hasChangingRooms === 'true';
      }
      
      if (req.query.hasLighting !== undefined) {
        filters.hasLighting = req.query.hasLighting === 'true';
      }
      
      if (req.query.hasSeating !== undefined) {
        filters.hasSeating = req.query.hasSeating === 'true';
      }
      
      if (req.query.hasRefreshments !== undefined) {
        filters.hasRefreshments = req.query.hasRefreshments === 'true';
      }
      
      if (req.query.hasFirstAid !== undefined) {
        filters.hasFirstAid = req.query.hasFirstAid === 'true';
      }
      
      if (req.query.hasSecurity !== undefined) {
        filters.hasSecurity = req.query.hasSecurity === 'true';
      }
      
      // Pricing filter
      if (req.query.maxPrice) {
        filters.maxPrice = parseFloat(req.query.maxPrice as string);
      }
      
      if (req.query.currency) {
        filters.currency = req.query.currency as string;
      }
      
      const result = await StadiumSearchService.searchStadiums(filters);
      
      res.json({
        success: true,
        message: 'Stadiums retrieved successfully',
        data: result.stadiums,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Search stadiums by facilities
   */
  static async searchByFacilities(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Extract facility filters
      const filters: StadiumSearchFilters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };
      
      // Facility filters
      if (req.query.hasParking !== undefined) {
        filters.hasParking = req.query.hasParking === 'true';
      }
      
      if (req.query.hasChangingRooms !== undefined) {
        filters.hasChangingRooms = req.query.hasChangingRooms === 'true';
      }
      
      if (req.query.hasLighting !== undefined) {
        filters.hasLighting = req.query.hasLighting === 'true';
      }
      
      if (req.query.hasSeating !== undefined) {
        filters.hasSeating = req.query.hasSeating === 'true';
      }
      
      if (req.query.hasRefreshments !== undefined) {
        filters.hasRefreshments = req.query.hasRefreshments === 'true';
      }
      
      if (req.query.hasFirstAid !== undefined) {
        filters.hasFirstAid = req.query.hasFirstAid === 'true';
      }
      
      if (req.query.hasSecurity !== undefined) {
        filters.hasSecurity = req.query.hasSecurity === 'true';
      }
      
      const result = await StadiumSearchService.searchStadiumsByFacilities(filters);
      
      res.json({
        success: true,
        message: 'Stadiums retrieved successfully',
        data: result.stadiums,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Search stadiums by price range
   */
  static async searchByPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : 0;
      const currency = req.query.currency as string || 'LAK';
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (maxPrice <= 0) {
        res.status(400).json({
          success: false,
          message: 'Maximum price must be greater than 0'
        });
        return;
      }
      
      const result = await StadiumSearchService.searchStadiumsByPrice(maxPrice, currency, page, limit);
      
      res.json({
        success: true,
        message: 'Stadiums retrieved successfully',
        data: result.stadiums,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Search stadiums with user's default saved search
   */
  static async searchWithDefaultPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      // If user is not authenticated, use regular search
      if (!userId) {
        await this.searchStadiums(req, res, next);
        return;
      }
      
      // Get user's default search
      const defaultSearch = await SavedSearchService.getUserDefaultSearch(userId);
      
      // If no default search, use regular search
      if (!defaultSearch) {
        await this.searchStadiums(req, res, next);
        return;
      }
      
      // Apply the default search filters
      const result = await StadiumSearchService.searchStadiums(defaultSearch.filters);
      
      res.json({
        success: true,
        message: 'Stadiums retrieved successfully',
        data: result.stadiums,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }
}