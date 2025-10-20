import NodeCache from 'node-cache';
import MonitoringService from './monitoring.service';

// Initialize cache with default settings
// TTL: 300 seconds (5 minutes), Check period: 600 seconds (10 minutes)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Get monitoring service instance
const monitoringService = MonitoringService.getInstance();

// Cache keys prefixes
const CACHE_PREFIXES = {
  STADIUM: 'stadium:',
  FIELD: 'field:',
  AVAILABILITY: 'availability:',
  USER: 'user:',
  BOOKING: 'booking:'
};

class CacheService {
  /**
   * Get data from cache
   * @param key Cache key
   * @returns Cached data or undefined
   */
  static get<T>(key: string): T | undefined {
    const result = cache.get<T>(key);
    if (result !== undefined) {
      monitoringService.recordCacheHit();
    } else {
      monitoringService.recordCacheMiss();
    }
    return result;
  }

  /**
   * Set data in cache
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Time to live in seconds (optional)
   * @returns True if successful, false otherwise
   */
  static set<T>(key: string, value: T, ttl?: number): boolean {
    let result: boolean;
    if (ttl !== undefined) {
      result = cache.set<T>(key, value, ttl);
    } else {
      result = cache.set<T>(key, value);
    }
    
    // Update cache key count
    monitoringService.updateCacheKeys(cache.keys().length);
    
    return result;
  }

  /**
   * Delete data from cache
   * @param key Cache key
   * @returns Number of deleted keys
   */
  static del(key: string): number {
    const result = cache.del(key);
    
    // Update cache key count
    monitoringService.updateCacheKeys(cache.keys().length);
    
    return result;
  }

  /**
   * Flush all cache data
   * @returns True if successful, false otherwise
   */
  static flush(): boolean {
    cache.flushAll();
    
    // Update cache key count
    monitoringService.updateCacheKeys(0);
    
    return true; // flushAll() returns void, so we return true to indicate success
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  static getStats(): NodeCache.Stats {
    return cache.getStats();
  }

  /**
   * Cache stadium data
   * @param stadiumId Stadium ID
   * @param data Stadium data
   * @param ttl Time to live in seconds (optional)
   */
  static setStadium(stadiumId: string, data: any, ttl?: number): boolean {
    const key = `${CACHE_PREFIXES.STADIUM}${stadiumId}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get stadium data from cache
   * @param stadiumId Stadium ID
   * @returns Cached stadium data or undefined
   */
  static getStadium(stadiumId: string): any | undefined {
    const key = `${CACHE_PREFIXES.STADIUM}${stadiumId}`;
    return this.get(key);
  }

  /**
   * Cache field data
   * @param fieldId Field ID
   * @param data Field data
   * @param ttl Time to live in seconds (optional)
   */
  static setField(fieldId: string, data: any, ttl?: number): boolean {
    const key = `${CACHE_PREFIXES.FIELD}${fieldId}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get field data from cache
   * @param fieldId Field ID
   * @returns Cached field data or undefined
   */
  static getField(fieldId: string): any | undefined {
    const key = `${CACHE_PREFIXES.FIELD}${fieldId}`;
    return this.get(key);
  }

  /**
   * Cache availability data
   * @param fieldId Field ID
   * @param date Date string (YYYY-MM-DD)
   * @param data Availability data
   * @param ttl Time to live in seconds (optional)
   */
  static setAvailability(fieldId: string, date: string, data: any, ttl?: number): boolean {
    const key = `${CACHE_PREFIXES.AVAILABILITY}${fieldId}:${date}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get availability data from cache
   * @param fieldId Field ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Cached availability data or undefined
   */
  static getAvailability(fieldId: string, date: string): any | undefined {
    const key = `${CACHE_PREFIXES.AVAILABILITY}${fieldId}:${date}`;
    return this.get(key);
  }

  /**
   * Cache user data
   * @param userId User ID
   * @param data User data
   * @param ttl Time to live in seconds (optional)
   */
  static setUser(userId: string, data: any, ttl?: number): boolean {
    const key = `${CACHE_PREFIXES.USER}${userId}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get user data from cache
   * @param userId User ID
   * @returns Cached user data or undefined
   */
  static getUser(userId: string): any | undefined {
    const key = `${CACHE_PREFIXES.USER}${userId}`;
    return this.get(key);
  }

  /**
   * Cache booking data
   * @param bookingId Booking ID
   * @param data Booking data
   * @param ttl Time to live in seconds (optional)
   */
  static setBooking(bookingId: string, data: any, ttl?: number): boolean {
    const key = `${CACHE_PREFIXES.BOOKING}${bookingId}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get booking data from cache
   * @param bookingId Booking ID
   * @returns Cached booking data or undefined
   */
  static getBooking(bookingId: string): any | undefined {
    const key = `${CACHE_PREFIXES.BOOKING}${bookingId}`;
    return this.get(key);
  }

  /**
   * Invalidate all cache entries for a stadium
   * @param stadiumId Stadium ID
   */
  static invalidateStadium(stadiumId: string): void {
    const stadiumKey = `${CACHE_PREFIXES.STADIUM}${stadiumId}`;
    this.del(stadiumKey);
    
    // Invalidate all fields of this stadium (would need to be called when stadium fields change)
    // This would require tracking field IDs associated with stadiums
  }

  /**
   * Invalidate all cache entries for a field
   * @param fieldId Field ID
   */
  static invalidateField(fieldId: string): void {
    const fieldKey = `${CACHE_PREFIXES.FIELD}${fieldId}`;
    this.del(fieldKey);
    
    // Invalidate all availability data for this field
    // Note: This will only invalidate future dates as we don't know which dates are cached
    // A more sophisticated approach would be needed for production
  }

  /**
   * Invalidate availability cache for a specific field and date
   * @param fieldId Field ID
   * @param date Date string (YYYY-MM-DD)
   */
  static invalidateAvailability(fieldId: string, date: string): void {
    const availabilityKey = `${CACHE_PREFIXES.AVAILABILITY}${fieldId}:${date}`;
    this.del(availabilityKey);
  }

  /**
   * Invalidate user cache
   * @param userId User ID
   */
  static invalidateUser(userId: string): void {
    const userKey = `${CACHE_PREFIXES.USER}${userId}`;
    this.del(userKey);
  }

  /**
   * Invalidate booking cache
   * @param bookingId Booking ID
   */
  static invalidateBooking(bookingId: string): void {
    const bookingKey = `${CACHE_PREFIXES.BOOKING}${bookingId}`;
    this.del(bookingKey);
  }
}

export default CacheService;