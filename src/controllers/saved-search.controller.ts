import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { SavedSearchService, SavedSearchCreateData, SavedSearchUpdateData } from '../services/saved-search.service';
// import { StadiumSearchFilters } from '../services/stadium-search.service';
import { StadiumSearchService } from '../services/stadium-search.service';

export class SavedSearchController {
  /**
   * Create a new saved search
   */
  static async createSavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = (req as any).user.id;
      const { name, filters, isDefault } = req.body;

      const data: SavedSearchCreateData = {
        userId,
        name,
        filters,
        isDefault
      };

      const savedSearch = await SavedSearchService.createSavedSearch(data);

      res.status(201).json({
        success: true,
        message: 'Saved search created successfully',
        data: savedSearch
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all saved searches for the current user
   */
  static async getUserSavedSearches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const savedSearches = await SavedSearchService.getUserSavedSearches(userId);

      res.json({
        success: true,
        message: 'Saved searches retrieved successfully',
        data: savedSearches
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific saved search by ID
   */
  static async getSavedSearchById(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = (req as any).user.id;
      const { id } = req.params;

      const savedSearch = await SavedSearchService.getSavedSearchById(id, userId);

      if (!savedSearch) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Saved search retrieved successfully',
        data: savedSearch
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = (req as any).user.id;
      const { id } = req.params;
      const updateData: SavedSearchUpdateData = req.body;

      const savedSearch = await SavedSearchService.updateSavedSearch(id, userId, updateData);

      if (!savedSearch) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Saved search updated successfully',
        data: savedSearch
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = (req as any).user.id;
      const { id } = req.params;

      const deleted = await SavedSearchService.deleteSavedSearch(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Saved search deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the default saved search for the current user
   */
  static async getUserDefaultSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const savedSearch = await SavedSearchService.getUserDefaultSearch(userId);

      if (!savedSearch) {
        res.status(404).json({
          success: false,
          message: 'No default saved search found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Default saved search retrieved successfully',
        data: savedSearch
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply a saved search to get stadiums
   */
  static async applySavedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const userId = (req as any).user.id;
      const { id } = req.params;

      // Get the saved search
      const savedSearch = await SavedSearchService.getSavedSearchById(id, userId);

      if (!savedSearch) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      // Apply the filters to search for stadiums
      const result = await StadiumSearchService.searchStadiums(savedSearch.filters);

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