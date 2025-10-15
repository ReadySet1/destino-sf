/**
 * Square API Caching Utility
 *
 * Provides caching for Square API responses to improve sync performance
 */

import { logger } from '@/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SquareAPICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or execute fetcher function
   */
  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number = this.DEFAULT_TTL): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Check if cache hit and not expired
    if (cached && now < cached.expiresAt) {
      logger.info(
        `🎯 Cache HIT for key: ${key} (${Math.round((cached.expiresAt - now) / 1000)}s remaining)`
      );
      return cached.data as T;
    }

    // Cache miss or expired - fetch new data
    logger.info(`🔄 Cache MISS for key: ${key} - fetching from Square API...`);

    try {
      const data = await fetcher();

      // Store in cache
      this.cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl,
      });

      logger.info(`✅ Cached new data for key: ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
      return data;
    } catch (error) {
      logger.error(`❌ Failed to fetch data for cache key: ${key}`, error);

      // If we have stale data, return it as fallback
      if (cached) {
        logger.info(`🔄 Using stale cache data for key: ${key} as fallback`);
        return cached.data as T;
      }

      throw error;
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);

    if (existed) {
      logger.info(`🗑️ Invalidated cache key: ${key}`);
    }

    return existed;
  }

  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`🗑️ Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`);
    }

    return deletedCount;
  }

  /**
   * Clear all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`🗑️ Cleared all cache entries (${size} total)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    totalSizeEstimate: string;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const now = Date.now();
    let expiredCount = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        expiredCount++;
      }

      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }

      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }

      // Rough size estimation
      totalSize += JSON.stringify(entry.data).length + key.length;
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      totalSizeEstimate: `${Math.round(totalSize / 1024)}KB`,
      oldestEntry: oldestTimestamp === Infinity ? undefined : new Date(oldestTimestamp),
      newestEntry: newestTimestamp === 0 ? undefined : new Date(newestTimestamp),
    };
  }

  /**
   * Generate cache key for Square API calls
   */
  static generateKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, any>
      );

    // Create a unique hash of the parameters for cache key
    const paramsHash = Buffer.from(JSON.stringify(sortedParams)).toString('base64');
    return `square_${endpoint}_${paramsHash}`;
  }
}

// Singleton instance
export const squareAPICache = new SquareAPICache();

/**
 * Helper function to cache Square catalog searches
 */
export async function cachedSearchCatalogObjects(
  requestBody: any,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): Promise<any> {
  const { searchCatalogObjects } = await import('./catalog-api');

  const cacheKey = SquareAPICache.generateKey('search_catalog', requestBody);

  return squareAPICache.get(cacheKey, () => searchCatalogObjects(requestBody), ttl);
}

export default SquareAPICache;
