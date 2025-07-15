import { Redis } from '@upstash/redis';
import { performanceMonitor } from './performance-monitor';
import * as Sentry from '@sentry/nextjs';

/**
 * Cache configuration interface
 */
interface CacheConfig {
  defaultTTL: number;
  maxKeyLength: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  staleWhileRevalidate: boolean;
}

/**
 * Cache entry metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
  version?: string;
}

/**
 * Cache operation result
 */
interface CacheResult<T> {
  value: T | null;
  hit: boolean;
  source: 'cache' | 'database' | 'api';
  duration: number;
}

/**
 * Production cache configuration
 */
const CACHE_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  maxKeyLength: 250,
  enableCompression: process.env.NODE_ENV === 'production',
  enableMetrics: true,
  staleWhileRevalidate: true,
};

/**
 * Cache key patterns for different data types
 */
export const CacheKeys = {
  // Product cache keys
  product: (id: string) => `product:${id}`,
  products: (categoryId?: string, page = 1, limit = 20) => 
    categoryId ? `products:${categoryId}:${page}:${limit}` : `products:all:${page}:${limit}`,
  productSearch: (query: string, page = 1) => `search:${query}:${page}`,
  
  // Category cache keys
  category: (id: string) => `category:${id}`,
  categories: () => 'categories:all',
  categoryTree: () => 'categories:tree',
  
  // User cache keys
  user: (id: string) => `user:${id}`,
  userSession: (id: string) => `session:${id}`,
  userPreferences: (id: string) => `preferences:${id}`,
  
  // Order cache keys
  order: (id: string) => `order:${id}`,
  userOrders: (userId: string, page = 1) => `orders:${userId}:${page}`,
  
  // Cart cache keys
  cart: (userId: string) => `cart:${userId}`,
  cartItems: (userId: string) => `cart:items:${userId}`,
  
  // Business cache keys
  inventory: (productId: string) => `inventory:${productId}`,
  pricing: (productId: string) => `pricing:${productId}`,
  
  // System cache keys
  health: () => 'system:health',
  metrics: () => 'system:metrics',
} as const;

/**
 * Cache TTL configurations for different data types
 */
const CacheTTLs = {
  // Product data - moderate TTL
  product: 1800, // 30 minutes
  products: 900, // 15 minutes
  productSearch: 600, // 10 minutes
  
  // Category data - long TTL (changes infrequently)
  category: 3600, // 1 hour
  categories: 3600, // 1 hour
  categoryTree: 7200, // 2 hours
  
  // User data - short TTL
  user: 600, // 10 minutes
  userSession: 3600, // 1 hour
  userPreferences: 1800, // 30 minutes
  
  // Order data - moderate TTL
  order: 1800, // 30 minutes
  userOrders: 900, // 15 minutes
  
  // Cart data - short TTL
  cart: 300, // 5 minutes
  cartItems: 300, // 5 minutes
  
  // Business data - very short TTL
  inventory: 60, // 1 minute
  pricing: 300, // 5 minutes
  
  // System data - short TTL
  health: 60, // 1 minute
  metrics: 300, // 5 minutes
} as const;

/**
 * Enhanced cache service with Redis integration
 */
export class CacheService {
  private static instance: CacheService;
  private redis: Redis;
  private metrics: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
  };

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache with performance monitoring
   */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    
    try {
      // Validate key length
      if (key.length > CACHE_CONFIG.maxKeyLength) {
        throw new Error(`Cache key too long: ${key.length} > ${CACHE_CONFIG.maxKeyLength}`);
      }

      const cached = await this.redis.get(key);
      const duration = Date.now() - start;

      if (cached) {
        this.metrics.hits++;
        
        // Track cache hit performance
        if (CACHE_CONFIG.enableMetrics) {
          performanceMonitor.trackApiCall('cache_hit', duration, 200, 'GET');
        }

        // Parse cached entry
        const entry: CacheEntry<T> = typeof cached === 'string' 
          ? JSON.parse(cached) 
          : cached as CacheEntry<T>;

        // Check if entry is expired but still serve if stale-while-revalidate is enabled
        const isExpired = Date.now() > (entry.timestamp + (entry.ttl * 1000));
        
        if (isExpired && !CACHE_CONFIG.staleWhileRevalidate) {
          this.metrics.misses++;
          return null;
        }

        return entry.value;
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache get error for key ${key}:`, error);
      
      // Track cache errors in Sentry
      Sentry.withScope((scope) => {
        scope.setTag('cache.operation', 'get');
        scope.setTag('cache.key', key);
        scope.setContext('cache_operation', {
          key,
          operation: 'get',
          duration: Date.now() - start,
        });
        
        Sentry.captureException(
          error instanceof Error ? error : new Error('Cache get error')
        );
      });

      // Return null on cache errors to fall back to data source
      return null;
    }
  }

  /**
   * Set value in cache with TTL and monitoring
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl?: number,
    options?: { 
      compress?: boolean;
      version?: string;
    }
  ): Promise<void> {
    const start = Date.now();
    
    try {
      // Validate key length
      if (key.length > CACHE_CONFIG.maxKeyLength) {
        throw new Error(`Cache key too long: ${key.length} > ${CACHE_CONFIG.maxKeyLength}`);
      }

      const finalTTL = ttl || CACHE_CONFIG.defaultTTL;
      
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: finalTTL,
        compressed: options?.compress && CACHE_CONFIG.enableCompression,
        version: options?.version,
      };

      // Store with Redis TTL
      await this.redis.set(key, JSON.stringify(entry), { ex: finalTTL });
      
      this.metrics.sets++;
      
      // Track cache set performance
      if (CACHE_CONFIG.enableMetrics) {
        const duration = Date.now() - start;
        performanceMonitor.trackApiCall('cache_set', duration, 200, 'SET');
      }
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache set error for key ${key}:`, error);
      
      // Track cache errors in Sentry
      Sentry.withScope((scope) => {
        scope.setTag('cache.operation', 'set');
        scope.setTag('cache.key', key);
        scope.setContext('cache_operation', {
          key,
          operation: 'set',
          ttl: ttl || CACHE_CONFIG.defaultTTL,
          duration: Date.now() - start,
        });
        
        Sentry.captureException(
          error instanceof Error ? error : new Error('Cache set error')
        );
      });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.metrics.deletes++;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.metrics.deletes += keys.length;
        return keys.length;
      }
      return 0;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Cache-aside pattern with automatic fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    options?: { version?: string }
  ): Promise<CacheResult<T>> {
    const start = Date.now();
    
    // Try to get from cache first
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return {
        value: cached,
        hit: true,
        source: 'cache',
        duration: Date.now() - start,
      };
    }

    // Cache miss - fetch from source
    try {
      const value = await fetcher();
      const fetchDuration = Date.now() - start;
      
      // Store in cache for next time
      await this.set(key, value, ttl, options);
      
      return {
        value,
        hit: false,
        source: 'database',
        duration: fetchDuration,
      };
    } catch (error) {
      // Log fetch errors
      console.error(`Cache fetcher error for key ${key}:`, error);
      
      Sentry.withScope((scope) => {
        scope.setTag('cache.operation', 'getOrSet');
        scope.setTag('cache.key', key);
        scope.setContext('cache_operation', {
          key,
          operation: 'getOrSet',
          duration: Date.now() - start,
        });
        
        Sentry.captureException(
          error instanceof Error ? error : new Error('Cache fetcher error')
        );
      });
      
      throw error;
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache(
    keys: { key: string; fetcher: () => Promise<any>; ttl?: number }[]
  ): Promise<void> {
    const start = Date.now();
    
    try {
      const promises = keys.map(async ({ key, fetcher, ttl }) => {
        try {
          const value = await fetcher();
          await this.set(key, value, ttl);
        } catch (error) {
          console.error(`Cache warming failed for key ${key}:`, error);
        }
      });
      
      await Promise.all(promises);
      
      console.log(`✅ Cache warmed for ${keys.length} keys in ${Date.now() - start}ms`);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

     /**
    * Get cache statistics
    */
   getCacheStats() {
     const totalOperations = this.metrics.hits + this.metrics.misses;
     const hitRate = totalOperations > 0 ? this.metrics.hits / totalOperations : 0;
     
     return {
       ...this.metrics,
       hitRate,
       totalOperations,
     };
   }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      responseTime: number;
      stats: {
        hits: number;
        misses: number;
        sets: number;
        deletes: number;
        errors: number;
        hitRate: number;
        totalOperations: number;
      };
      redisConnected: boolean;
    };
  }> {
    const start = Date.now();
    
    try {
      // Test Redis connection
      await this.redis.ping();
      
      const responseTime = Date.now() - start;
      const stats = this.getCacheStats();
      
      const status = responseTime > 100 ? 'degraded' : 'healthy';
      
      return {
        status,
        details: {
          responseTime,
          stats,
          redisConnected: true,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          responseTime: Date.now() - start,
          stats: this.getCacheStats(),
          redisConnected: false,
        },
      };
    }
  }
}

/**
 * Global cache service instance
 */
export const cacheService = CacheService.getInstance();

/**
 * Cache invalidation strategies
 */
export class CacheInvalidation {
     /**
    * Invalidate product-related cache
    */
   static async invalidateProduct(productId: string): Promise<void> {
     await Promise.all([
       cacheService.delete(CacheKeys.product(productId)),
       cacheService.delete(CacheKeys.inventory(productId)),
       cacheService.delete(CacheKeys.pricing(productId)),
       cacheService.invalidatePattern('products:*').then(() => {}),
       cacheService.invalidatePattern('search:*').then(() => {}),
     ]);
   }

  /**
   * Invalidate category-related cache
   */
  static async invalidateCategory(categoryId: string): Promise<void> {
    await Promise.all([
      cacheService.delete(CacheKeys.category(categoryId)),
      cacheService.delete(CacheKeys.categories()),
      cacheService.delete(CacheKeys.categoryTree()),
      cacheService.invalidatePattern(`products:${categoryId}:*`),
    ]);
  }

     /**
    * Invalidate user-related cache
    */
   static async invalidateUser(userId: string): Promise<void> {
     await Promise.all([
       cacheService.delete(CacheKeys.user(userId)),
       cacheService.delete(CacheKeys.userSession(userId)),
       cacheService.delete(CacheKeys.userPreferences(userId)),
       cacheService.delete(CacheKeys.cart(userId)),
       cacheService.delete(CacheKeys.cartItems(userId)),
       cacheService.invalidatePattern(`orders:${userId}:*`).then(() => {}),
     ]);
   }

  /**
   * Invalidate order-related cache
   */
  static async invalidateOrder(orderId: string, userId?: string): Promise<void> {
    const promises = [cacheService.delete(CacheKeys.order(orderId))];
    
    if (userId) {
      promises.push(cacheService.invalidatePattern(`orders:${userId}:*`).then(() => {}));
    }
    
    await Promise.all(promises);
  }
}

/**
 * Cache TTL helper functions
 */
export function getCacheTTL(type: keyof typeof CacheTTLs): number {
  return CacheTTLs[type] || CACHE_CONFIG.defaultTTL;
} 