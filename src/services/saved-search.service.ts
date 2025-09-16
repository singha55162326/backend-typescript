import SavedSearch, { ISavedSearch } from '../models/SavedSearch';
import { StadiumSearchFilters } from './stadium-search.service';
import mongoose from 'mongoose';

export interface SavedSearchCreateData {
  userId: string;
  name: string;
  filters: StadiumSearchFilters;
  isDefault?: boolean;
}

export interface SavedSearchUpdateData {
  name?: string;
  filters?: StadiumSearchFilters;
  isDefault?: boolean;
}

export class SavedSearchService {
  /**
   * Create a new saved search
   * @param data Saved search data
   * @returns Created saved search
   */
  static async createSavedSearch(data: SavedSearchCreateData): Promise<ISavedSearch> {
    try {
      // If this is set as default, unset any existing default for this user
      if (data.isDefault) {
        await SavedSearch.updateMany(
          { user: data.userId, isDefault: true },
          { isDefault: false }
        );
      }

      const savedSearch = new SavedSearch({
        user: data.userId,
        name: data.name,
        filters: data.filters,
        isDefault: data.isDefault || false
      });

      return await savedSearch.save();
    } catch (error) {
      throw new Error(`Failed to create saved search: ${error}`);
    }
  }

  /**
   * Get all saved searches for a user
   * @param userId User ID
   * @returns Array of saved searches
   */
  static async getUserSavedSearches(userId: string): Promise<ISavedSearch[]> {
    try {
      return await SavedSearch.find({ user: userId }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get user saved searches: ${error}`);
    }
  }

  /**
   * Get a specific saved search by ID
   * @param searchId Saved search ID
   * @param userId User ID (for validation)
   * @returns Saved search document
   */
  static async getSavedSearchById(searchId: string, userId: string): Promise<ISavedSearch | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(searchId)) {
        throw new Error('Invalid saved search ID');
      }

      return await SavedSearch.findOne({ 
        _id: searchId, 
        user: userId 
      });
    } catch (error) {
      throw new Error(`Failed to get saved search: ${error}`);
    }
  }

  /**
   * Update a saved search
   * @param searchId Saved search ID
   * @param userId User ID (for validation)
   * @param data Update data
   * @returns Updated saved search
   */
  static async updateSavedSearch(
    searchId: string, 
    userId: string, 
    data: SavedSearchUpdateData
  ): Promise<ISavedSearch | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(searchId)) {
        throw new Error('Invalid saved search ID');
      }

      // If this is set as default, unset any existing default for this user
      if (data.isDefault) {
        await SavedSearch.updateMany(
          { user: userId, isDefault: true },
          { isDefault: false }
        );
      }

      return await SavedSearch.findOneAndUpdate(
        { _id: searchId, user: userId },
        { $set: data },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to update saved search: ${error}`);
    }
  }

  /**
   * Delete a saved search
   * @param searchId Saved search ID
   * @param userId User ID (for validation)
   * @returns Deletion result
   */
  static async deleteSavedSearch(searchId: string, userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(searchId)) {
        throw new Error('Invalid saved search ID');
      }

      const result = await SavedSearch.deleteOne({ 
        _id: searchId, 
        user: userId 
      });

      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete saved search: ${error}`);
    }
  }

  /**
   * Get the default saved search for a user
   * @param userId User ID
   * @returns Default saved search or null
   */
  static async getUserDefaultSearch(userId: string): Promise<ISavedSearch | null> {
    try {
      return await SavedSearch.findOne({ 
        user: userId, 
        isDefault: true 
      });
    } catch (error) {
      throw new Error(`Failed to get user default search: ${error}`);
    }
  }
}