import Stadium, { IStadium } from '../models/Stadium';


export interface StadiumSearchFilters {
  // Text search
  query?: string;
  
  // Location filters
  city?: string;
  country?: string;
  coordinates?: {
    longitude: number;
    latitude: number;
    maxDistance?: number; // in meters
  };
  
  // Field filters
  fieldType?: string;
  surfaceType?: string;
  capacity?: {
    min?: number;
    max?: number;
  };
  
  // Facility filters
  hasParking?: boolean;
  hasChangingRooms?: boolean;
  hasLighting?: boolean;
  hasSeating?: boolean;
  hasRefreshments?: boolean;
  hasFirstAid?: boolean;
  hasSecurity?: boolean;
  
  // Pricing filters
  maxPrice?: number;
  currency?: string;
  
  // Status filters
  status?: string;
  
  // Pagination
  page?: number;
  limit?: number;
}

export interface StadiumSearchResult {
  stadiums: IStadium[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class StadiumSearchService {
  /**
   * Search stadiums with advanced filters
   * @param filters Search filters
   * @returns Search results with pagination
   */
  static async searchStadiums(filters: StadiumSearchFilters): Promise<StadiumSearchResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      // Build the query
      const query: any = {
        status: 'active' // Only show active stadiums by default
      };
      
      // Text search
      if (filters.query) {
        query.$or = [
          { name: { $regex: filters.query, $options: 'i' } },
          { description: { $regex: filters.query, $options: 'i' } },
          { 'address.city': { $regex: filters.query, $options: 'i' } },
          { 'address.state': { $regex: filters.query, $options: 'i' } },
          { 'address.country': { $regex: filters.query, $options: 'i' } }
        ];
      }
      
      // Location filters
      if (filters.city) {
        query['address.city'] = { $regex: filters.city, $options: 'i' };
      }
      
      if (filters.country) {
        query['address.country'] = { $regex: filters.country, $options: 'i' };
      }
      
      if (filters.coordinates) {
        query['address.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [
                filters.coordinates.longitude,
                filters.coordinates.latitude
              ]
            },
            $maxDistance: filters.coordinates.maxDistance || 10000 // Default 10km
          }
        };
      }
      
      // Status filter
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Build field filters
      const fieldConditions: any[] = [];
      
      if (filters.fieldType) {
        fieldConditions.push({
          'fields.fieldType': filters.fieldType
        });
      }
      
      if (filters.surfaceType) {
        fieldConditions.push({
          'fields.surfaceType': filters.surfaceType
        });
      }
      
      if (filters.capacity && (filters.capacity.min || filters.capacity.max)) {
        const capacityQuery: any = {};
        if (filters.capacity.min) {
          capacityQuery.$gte = filters.capacity.min;
        }
        if (filters.capacity.max) {
          capacityQuery.$lte = filters.capacity.max;
        }
        fieldConditions.push({
          'fields.capacity': capacityQuery
        });
      }
      
      // If we have field conditions, we need to use aggregation
      if (fieldConditions.length > 0) {
        // Use aggregation pipeline for complex field queries
        const pipeline: any[] = [
          { $match: query },
          { $unwind: '$fields' },
          { $match: { $and: fieldConditions } },
          {
            $group: {
              _id: '$_id',
              doc: { $first: '$$ROOT' }
            }
          },
          { $replaceRoot: { newRoot: '$doc' } }
        ];
        
        // Add pagination
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });
        
        const stadiums = await Stadium.aggregate(pipeline);
        const total = await Stadium.aggregate([
          { $match: query },
          { $unwind: '$fields' },
          { $match: { $and: fieldConditions } },
          {
            $group: {
              _id: '$_id'
            }
          },
          { $count: 'total' }
        ]);
        
        return {
          stadiums: stadiums as IStadium[],
          total: total.length > 0 ? total[0].total : 0,
          page,
          limit,
          totalPages: Math.ceil((total.length > 0 ? total[0].total : 0) / limit)
        };
      } else {
        // Simple query without field conditions
        const stadiums = await Stadium.find(query)
          .skip(skip)
          .limit(limit);
        
        const total = await Stadium.countDocuments(query);
        
        return {
          stadiums,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        };
      }
    } catch (error) {
      throw new Error(`Failed to search stadiums: ${error}`);
    }
  }
  
  /**
   * Get stadiums with specific facilities
   * @param filters Facility filters
   * @returns Search results with pagination
   */
  static async searchStadiumsByFacilities(filters: StadiumSearchFilters): Promise<StadiumSearchResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      // Build the query for facilities
      const query: any = {
        status: 'active'
      };
      
      if (filters.hasParking !== undefined) {
        query['facilities.parking'] = filters.hasParking;
      }
      
      if (filters.hasChangingRooms !== undefined) {
        query['facilities.changingRooms'] = { 
          $exists: true, 
          $gte: filters.hasChangingRooms ? 1 : 0 
        };
      }
      
      if (filters.hasLighting !== undefined) {
        query['facilities.lighting'] = filters.hasLighting;
      }
      
      if (filters.hasSeating !== undefined) {
        query['facilities.seating'] = filters.hasSeating;
      }
      
      if (filters.hasRefreshments !== undefined) {
        query['facilities.refreshments'] = filters.hasRefreshments;
      }
      
      if (filters.hasFirstAid !== undefined) {
        query['facilities.firstAid'] = filters.hasFirstAid;
      }
      
      if (filters.hasSecurity !== undefined) {
        query['facilities.security'] = filters.hasSecurity;
      }
      
      const stadiums = await Stadium.find(query)
        .skip(skip)
        .limit(limit);
      
      const total = await Stadium.countDocuments(query);
      
      return {
        stadiums,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to search stadiums by facilities: ${error}`);
    }
  }
  
  /**
   * Get stadiums within price range
   * @param maxPrice Maximum price per hour
   * @param currency Currency code
   * @param page Page number
   * @param limit Items per page
   * @returns Search results with pagination
   */
  static async searchStadiumsByPrice(
    maxPrice: number,
    currency: string = 'LAK',
    page: number = 1,
    limit: number = 10
  ): Promise<StadiumSearchResult> {
    try {
      const skip = (page - 1) * limit;
      
      // Use aggregation to find stadiums with fields within price range
      const pipeline = [
        { $match: { status: 'active' } },
        { $unwind: '$fields' },
        {
          $match: {
            'fields.pricing.baseHourlyRate': { $lte: maxPrice },
            'fields.pricing.currency': currency
          }
        },
        {
          $group: {
            _id: '$_id',
            doc: { $first: '$$ROOT' }
          }
        },
        { $replaceRoot: { newRoot: '$doc' } },
        { $skip: skip },
        { $limit: limit }
      ];
      
      const stadiums = await Stadium.aggregate(pipeline);
      const totalPipeline = [
        { $match: { status: 'active' } },
        { $unwind: '$fields' },
        {
          $match: {
            'fields.pricing.baseHourlyRate': { $lte: maxPrice },
            'fields.pricing.currency': currency
          }
        },
        {
          $group: {
            _id: '$_id'
          }
        },
        { $count: 'total' }
      ];
      
      const totalResult = await Stadium.aggregate(totalPipeline);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;
      
      return {
        stadiums: stadiums as IStadium[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to search stadiums by price: ${error}`);
    }
  }
}