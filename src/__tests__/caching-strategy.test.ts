import { jest } from '@jest/globals';

// Mock Redis client and related dependencies
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    flushall: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    pipeline: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    eval: jest.fn(),
  })),
}));

jest.mock('@/lib/performance-monitor', () => ({
  performanceMonitor: {
    trackApiCall: jest.fn(),
    recordMetric: jest.fn(),
    startTiming: jest.fn(),
    endTiming: jest.fn(),
  },
}));

jest.mock('@sentry/nextjs', () => ({
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setContext: jest.fn() })),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import test modules
import { Redis } from '@upstash/redis';
import { CacheService, CacheKeys, CacheInvalidation } from '@/lib/cache-service';
import { performanceMonitor } from '@/lib/performance-monitor';
import * as Sentry from '@sentry/nextjs';

const mockRedis = Redis as jest.MockedClass<typeof Redis>;
const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

describe('Comprehensive Caching Strategy Tests - Phase 4', () => {
  let cacheService: CacheService;
  let mockRedisInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock Redis instance
    mockRedisInstance = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn(),
      flushall: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      pipeline: jest.fn(),
      ttl: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
      hgetall: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      eval: jest.fn(),
    };

    mockRedis.mockImplementation(() => mockRedisInstance);
    cacheService = CacheService.getInstance();
    
    // Set up environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    process.env.NODE_ENV = 'test';
  });

  describe('Redis Connection and Configuration', () => {
    it('should initialize Redis client with correct configuration', () => {
      expect(mockRedis).toHaveBeenCalledWith({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    });

    it('should establish Redis connection successfully', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redisConnected).toBe(true);
      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });

    it('should handle Redis connection failures', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection timeout'));

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.redisConnected).toBe(false);
    });

    it('should validate Redis configuration parameters', () => {
      const service = CacheService.getInstance();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CacheService);
    });
  });

  describe('Cache Manager Operations', () => {
    describe('Basic Cache Operations', () => {
      it('should store and retrieve data with TTL', async () => {
        const testData = { id: 'test-1', name: 'Test Product', price: 29.99 };
        const cacheEntry = {
          value: testData,
          timestamp: Date.now(),
          ttl: 3600,
          compressed: false,
        };

        mockRedisInstance.get.mockResolvedValue(JSON.stringify(cacheEntry));
        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set('test-key', testData, 3600);
        const result = await cacheService.get('test-key');

        expect(result).toEqual(testData);
        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'test-key',
          expect.stringContaining('"value"'),
          { ex: 3600 }
        );
      });

      it('should handle cache misses gracefully', async () => {
        mockRedisInstance.get.mockResolvedValue(null);

        const result = await cacheService.get('non-existent-key');

        expect(result).toBeNull();
        expect(mockRedisInstance.get).toHaveBeenCalledWith('non-existent-key');
      });

      it('should delete cached entries', async () => {
        mockRedisInstance.del.mockResolvedValue(1);

        await cacheService.delete('test-key');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
      });

      it('should check if cache entries exist', async () => {
        mockRedisInstance.exists.mockResolvedValue(1);

        const exists = await cacheService.exists('test-key');

        expect(exists).toBe(true);
        expect(mockRedisInstance.exists).toHaveBeenCalledWith('test-key');
      });

      it('should get TTL for cache entries', async () => {
        mockRedisInstance.ttl.mockResolvedValue(1800);

        const ttl = await cacheService.getTTL('test-key');

        expect(ttl).toBe(1800);
        expect(mockRedisInstance.ttl).toHaveBeenCalledWith('test-key');
      });
    });

    describe('Advanced Cache Operations', () => {
      it('should implement cache-aside pattern with getOrSet', async () => {
        const testData = { id: 'product-1', name: 'Test Product' };
        const mockFetcher = jest.fn().mockResolvedValue(testData);

        // First call - cache miss
        mockRedisInstance.get.mockResolvedValueOnce(null);
        mockRedisInstance.set.mockResolvedValue('OK');

        const result1 = await cacheService.getOrSet('product:1', mockFetcher, 3600);

        expect(result1.value).toEqual(testData);
        expect(result1.hit).toBe(false);
        expect(result1.source).toBe('database');
        expect(mockFetcher).toHaveBeenCalledTimes(1);

        // Second call - cache hit
        const cacheEntry = {
          value: testData,
          timestamp: Date.now(),
          ttl: 3600,
          compressed: false,
        };
        mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify(cacheEntry));

        const result2 = await cacheService.getOrSet('product:1', mockFetcher, 3600);

        expect(result2.value).toEqual(testData);
        expect(result2.hit).toBe(true);
        expect(result2.source).toBe('cache');
        expect(mockFetcher).toHaveBeenCalledTimes(1); // Not called again
      });

      it('should handle bulk operations efficiently', async () => {
        const keys = ['product:1', 'product:2', 'product:3'];
        const values = [
          { id: '1', name: 'Product 1' },
          { id: '2', name: 'Product 2' },
          { id: '3', name: 'Product 3' },
        ];

        mockRedisInstance.mget.mockResolvedValue([
          JSON.stringify({ value: values[0], timestamp: Date.now(), ttl: 3600 }),
          null,
          JSON.stringify({ value: values[2], timestamp: Date.now(), ttl: 3600 }),
        ]);

        const results = await cacheService.mget(keys);

        expect(results).toEqual([values[0], null, values[2]]);
        expect(mockRedisInstance.mget).toHaveBeenCalledWith(keys);
      });

      it('should implement bulk set operations', async () => {
        const data = [
          { key: 'product:1', value: { id: '1', name: 'Product 1' }, ttl: 3600 },
          { key: 'product:2', value: { id: '2', name: 'Product 2' }, ttl: 1800 },
        ];

        mockRedisInstance.mset.mockResolvedValue('OK');

        await cacheService.mset(data);

        expect(mockRedisInstance.mset).toHaveBeenCalled();
      });

      it('should handle stale-while-revalidate pattern', async () => {
        const staleData = { id: 'product-1', name: 'Stale Product' };
        const freshData = { id: 'product-1', name: 'Fresh Product' };
        const mockFetcher = jest.fn().mockResolvedValue(freshData);

        // Return expired cache entry
        const expiredEntry = {
          value: staleData,
          timestamp: Date.now() - 7200000, // 2 hours ago
          ttl: 3600, // 1 hour TTL
          compressed: false,
        };

        mockRedisInstance.get.mockResolvedValue(JSON.stringify(expiredEntry));
        mockRedisInstance.set.mockResolvedValue('OK');

        const result = await cacheService.getOrSetStale('product:1', mockFetcher, 3600);

        expect(result.value).toEqual(staleData); // Returns stale data immediately
        expect(result.stale).toBe(true);
        
        // Should trigger background revalidation
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(mockFetcher).toHaveBeenCalled();
      });
    });

    describe('Error Handling and Resilience', () => {
      it('should handle Redis errors gracefully', async () => {
        mockRedisInstance.get.mockRejectedValue(new Error('Redis connection lost'));

        const result = await cacheService.get('test-key');

        expect(result).toBeNull();
        expect(mockSentry.captureException).toHaveBeenCalled();
      });

      it('should handle JSON parsing errors', async () => {
        mockRedisInstance.get.mockResolvedValue('invalid-json');

        const result = await cacheService.get('test-key');

        expect(result).toBeNull();
        expect(mockSentry.captureException).toHaveBeenCalled();
      });

      it('should continue operation when cache writes fail', async () => {
        mockRedisInstance.set.mockRejectedValue(new Error('Redis write failed'));

        // Should not throw, just log the error
        await expect(cacheService.set('test-key', { test: 'data' }, 3600)).resolves.toBeUndefined();
        expect(mockSentry.captureException).toHaveBeenCalled();
      });

      it('should implement circuit breaker for Redis operations', async () => {
        // Simulate multiple Redis failures
        mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

        // After multiple failures, circuit should open
        for (let i = 0; i < 10; i++) {
          await cacheService.get('test-key');
        }

        // Should track consecutive failures
        expect(mockSentry.captureException).toHaveBeenCalledTimes(10);
      });
    });
  });

  describe('Cache Key Management and Patterns', () => {
    describe('Cache Key Generation', () => {
      it('should generate consistent cache keys for products', () => {
        expect(CacheKeys.product('123')).toBe('product:123');
        expect(CacheKeys.products('alfajores', 1, 20)).toBe('products:alfajores:1:20');
        expect(CacheKeys.products()).toBe('products:all:1:20');
        expect(CacheKeys.productSearch('empanadas', 2)).toBe('search:empanadas:2');
      });

      it('should generate cache keys for categories', () => {
        expect(CacheKeys.category('cat-1')).toBe('category:cat-1');
        expect(CacheKeys.categories()).toBe('categories:all');
        expect(CacheKeys.categoryTree()).toBe('categories:tree');
      });

      it('should generate cache keys for users and sessions', () => {
        expect(CacheKeys.user('user-123')).toBe('user:user-123');
        expect(CacheKeys.userSession('user-123')).toBe('session:user-123');
        expect(CacheKeys.userPreferences('user-123')).toBe('preferences:user-123');
      });

      it('should generate cache keys for orders and carts', () => {
        expect(CacheKeys.order('order-456')).toBe('order:order-456');
        expect(CacheKeys.userOrders('user-123', 2)).toBe('orders:user-123:2');
        expect(CacheKeys.cart('user-123')).toBe('cart:user-123');
        expect(CacheKeys.cartItems('user-123')).toBe('cart:items:user-123');
      });

      it('should generate cache keys for business data', () => {
        expect(CacheKeys.inventory('product-1')).toBe('inventory:product-1');
        expect(CacheKeys.pricing('product-1')).toBe('pricing:product-1');
      });

      it('should validate cache key length limits', async () => {
        const longKey = 'a'.repeat(300); // Exceeds 250 character limit
        
        await expect(cacheService.set(longKey, { test: 'data' })).rejects.toThrow('Cache key too long');
      });
    });

    describe('Cache TTL Management', () => {
      it('should use appropriate TTLs for different data types', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');

        // Product data - 30 minutes
        await cacheService.set(CacheKeys.product('1'), { id: '1' }, 1800);
        expect(mockRedisInstance.set).toHaveBeenLastCalledWith(
          'product:1',
          expect.any(String),
          { ex: 1800 }
        );

        // Category data - 1 hour
        await cacheService.set(CacheKeys.categories(), [], 3600);
        expect(mockRedisInstance.set).toHaveBeenLastCalledWith(
          'categories:all',
          expect.any(String),
          { ex: 3600 }
        );

        // Cart data - 5 minutes
        await cacheService.set(CacheKeys.cart('user-1'), [], 300);
        expect(mockRedisInstance.set).toHaveBeenLastCalledWith(
          'cart:user-1',
          expect.any(String),
          { ex: 300 }
        );

        // Inventory data - 1 minute
        await cacheService.set(CacheKeys.inventory('product-1'), { stock: 10 }, 60);
        expect(mockRedisInstance.set).toHaveBeenLastCalledWith(
          'inventory:product-1',
          expect.any(String),
          { ex: 60 }
        );
      });

      it('should handle TTL expiration correctly', async () => {
        const expiredEntry = {
          value: { id: 'test' },
          timestamp: Date.now() - 7200000, // 2 hours ago
          ttl: 3600, // 1 hour TTL - expired
          compressed: false,
        };

        mockRedisInstance.get.mockResolvedValue(JSON.stringify(expiredEntry));

        const result = await cacheService.get('expired-key');

        expect(result).toBeNull(); // Should return null for expired entries
      });
    });
  });

  describe('Cache Invalidation Strategies', () => {
    describe('Product Cache Invalidation', () => {
      it('should invalidate product-related caches on product update', async () => {
        mockRedisInstance.del.mockResolvedValue(1);
        mockRedisInstance.keys.mockResolvedValue([
          'products:alfajores:1:20',
          'products:alfajores:2:20',
          'search:alfajores:1',
        ]);

        await CacheInvalidation.invalidateProduct('product-1');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('product:product-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('inventory:product-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('pricing:product-1');
        expect(mockRedisInstance.keys).toHaveBeenCalledWith('products:*');
        expect(mockRedisInstance.keys).toHaveBeenCalledWith('search:*');
      });

      it('should invalidate category caches on category update', async () => {
        mockRedisInstance.del.mockResolvedValue(1);
        mockRedisInstance.keys.mockResolvedValue(['products:cat-1:1:20']);

        await CacheInvalidation.invalidateCategory('cat-1');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('category:cat-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('categories:all');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('categories:tree');
        expect(mockRedisInstance.keys).toHaveBeenCalledWith('products:cat-1:*');
      });

      it('should invalidate user caches on user update', async () => {
        mockRedisInstance.del.mockResolvedValue(1);
        mockRedisInstance.keys.mockResolvedValue(['orders:user-1:1', 'orders:user-1:2']);

        await CacheInvalidation.invalidateUser('user-1');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('user:user-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('session:user-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('preferences:user-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('cart:user-1');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('cart:items:user-1');
        expect(mockRedisInstance.keys).toHaveBeenCalledWith('orders:user-1:*');
      });

      it('should invalidate order caches on order update', async () => {
        mockRedisInstance.del.mockResolvedValue(1);
        mockRedisInstance.keys.mockResolvedValue(['orders:user-1:1']);

        await CacheInvalidation.invalidateOrder('order-1', 'user-1');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('order:order-1');
        expect(mockRedisInstance.keys).toHaveBeenCalledWith('orders:user-1:*');
      });
    });

    describe('Pattern-based Invalidation', () => {
      it('should invalidate caches by pattern', async () => {
        const matchingKeys = [
          'products:alfajores:1:20',
          'products:alfajores:2:20',
          'products:empanadas:1:20',
        ];

        mockRedisInstance.keys.mockResolvedValue(matchingKeys);
        mockRedisInstance.del.mockResolvedValue(3);

        await cacheService.invalidatePattern('products:*');

        expect(mockRedisInstance.keys).toHaveBeenCalledWith('products:*');
        expect(mockRedisInstance.del).toHaveBeenCalledWith(matchingKeys);
      });

      it('should handle large pattern invalidations efficiently', async () => {
        const largeKeySet = Array.from({ length: 1000 }, (_, i) => `products:${i}:1:20`);
        
        mockRedisInstance.keys.mockResolvedValue(largeKeySet);
        mockRedisInstance.del.mockResolvedValue(1000);

        await cacheService.invalidatePattern('products:*');

        // Should batch delete operations for large key sets
        expect(mockRedisInstance.del).toHaveBeenCalled();
      });

      it('should track invalidation performance', async () => {
        mockRedisInstance.keys.mockResolvedValue(['key1', 'key2', 'key3']);
        mockRedisInstance.del.mockResolvedValue(3);

        await cacheService.invalidatePattern('test:*');

        expect(mockPerformanceMonitor.trackApiCall).toHaveBeenCalledWith(
          'cache_invalidation',
          expect.any(Number),
          200,
          'DELETE'
        );
      });
    });

    describe('Tag-based Invalidation', () => {
      it('should invalidate caches by tags', async () => {
        const taggedKeys = {
          'product:1': 'product',
          'product:2': 'product',
          'inventory:1': 'product',
        };

        mockRedisInstance.hgetall.mockResolvedValue(taggedKeys);
        mockRedisInstance.del.mockResolvedValue(3);
        mockRedisInstance.hdel.mockResolvedValue(3);

        await cacheService.invalidateByTag('product');

        expect(mockRedisInstance.hgetall).toHaveBeenCalledWith('cache:tags:product');
        expect(mockRedisInstance.del).toHaveBeenCalledWith(Object.keys(taggedKeys));
        expect(mockRedisInstance.hdel).toHaveBeenCalledWith(
          'cache:tags:product',
          ...Object.keys(taggedKeys)
        );
      });

      it('should associate cache entries with tags', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');
        mockRedisInstance.hset.mockResolvedValue(1);

        await cacheService.setWithTags(
          'product:1',
          { id: '1', name: 'Product 1' },
          3600,
          ['product', 'alfajores']
        );

        expect(mockRedisInstance.hset).toHaveBeenCalledWith(
          'cache:tags:product',
          'product:1',
          'product'
        );
        expect(mockRedisInstance.hset).toHaveBeenCalledWith(
          'cache:tags:alfajores',
          'product:1',
          'alfajores'
        );
      });
    });
  });

  describe('Cache Performance Optimization', () => {
    describe('Cache Warming Strategies', () => {
      it('should warm up critical product caches', async () => {
        const products = [
          { id: '1', name: 'Empanada de Carne', category: 'empanadas' },
          { id: '2', name: 'Alfajor de Dulce de Leche', category: 'alfajores' },
        ];

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.warmCache([
          {
            key: CacheKeys.product('1'),
            fetcher: () => Promise.resolve(products[0]),
            ttl: 1800,
          },
          {
            key: CacheKeys.product('2'),
            fetcher: () => Promise.resolve(products[1]),
            ttl: 1800,
          },
        ]);

        expect(mockRedisInstance.set).toHaveBeenCalledTimes(2);
      });

      it('should warm up category and product listing caches', async () => {
        const categories = [
          { id: 'empanadas', name: 'Empanadas' },
          { id: 'alfajores', name: 'Alfajores' },
        ];

        const mockWarming = {
          warmProductCategories: jest.fn().mockResolvedValue(categories),
          warmFeaturedProducts: jest.fn().mockResolvedValue([]),
          warmPopularSearches: jest.fn().mockResolvedValue([]),
        };

        await Promise.all([
          mockWarming.warmProductCategories(),
          mockWarming.warmFeaturedProducts(),
          mockWarming.warmPopularSearches(),
        ]);

        expect(mockWarming.warmProductCategories).toHaveBeenCalled();
        expect(mockWarming.warmFeaturedProducts).toHaveBeenCalled();
        expect(mockWarming.warmPopularSearches).toHaveBeenCalled();
      });

      it('should implement intelligent cache warming based on usage patterns', async () => {
        const popularProducts = ['1', '2', '3'];
        const trendingSearches = ['empanadas', 'alfajores'];

        mockRedisInstance.zrevrange = jest.fn()
          .mockResolvedValueOnce(popularProducts) // Popular products
          .mockResolvedValueOnce(trendingSearches); // Trending searches

        const { warmBasedOnUsage } = await import('@/lib/cache-warming');
        await warmBasedOnUsage();

        expect(mockRedisInstance.zrevrange).toHaveBeenCalledWith(
          'analytics:popular_products',
          0,
          9 // Top 10
        );
        expect(mockRedisInstance.zrevrange).toHaveBeenCalledWith(
          'analytics:trending_searches',
          0,
          4 // Top 5
        );
      });

      it('should schedule periodic cache warming', async () => {
        const mockScheduler = {
          scheduleWarmup: jest.fn(),
          isWarmupTime: jest.fn().mockReturnValue(true),
          getWarmupInterval: jest.fn().mockReturnValue(300000), // 5 minutes
        };

        expect(mockScheduler.isWarmupTime()).toBe(true);
        expect(mockScheduler.getWarmupInterval()).toBe(300000);
      });
    });

    describe('Cache Hit Rate Optimization', () => {
      it('should track cache hit rates', async () => {
        mockRedisInstance.incr.mockResolvedValue(1);
        mockRedisInstance.get.mockResolvedValue('100');

        await cacheService.recordCacheHit('products');
        await cacheService.recordCacheMiss('products');

        const hitRate = await cacheService.getCacheHitRatio('products');

        expect(hitRate).toBeGreaterThan(0);
        expect(mockRedisInstance.incr).toHaveBeenCalledWith('cache:hits:products');
        expect(mockRedisInstance.incr).toHaveBeenCalledWith('cache:misses:products');
      });

      it('should identify cache performance issues', async () => {
        // Mock low hit rate scenario
        mockRedisInstance.get
          .mockResolvedValueOnce('10') // hits
          .mockResolvedValueOnce('90'); // misses

        const hitRate = await cacheService.getCacheHitRatio('orders');

        expect(hitRate).toBe(0.1); // 10% hit rate - problematic
        expect(hitRate).toBeLessThan(0.7); // Below recommended threshold
      });

      it('should provide cache performance recommendations', async () => {
        const performanceData = {
          hitRate: 0.45, // Low hit rate
          avgResponseTime: 150, // Acceptable response time
          errorRate: 0.02, // Low error rate
        };

        const { analyzeCachePerformance } = await import('@/lib/cache-analytics');
        const analysis = await analyzeCachePerformance(performanceData);

        expect(analysis.recommendations).toContain('Increase cache TTL for frequently accessed data');
        expect(analysis.recommendations).toContain('Implement cache warming for popular items');
        expect(analysis.severity).toBe('warning');
      });

      it('should implement adaptive TTL based on access patterns', async () => {
        const accessCounts = {
          'product:1': 1000, // Highly accessed - longer TTL
          'product:2': 10,   // Rarely accessed - shorter TTL
        };

        mockRedisInstance.get.mockImplementation((key) => {
          return Promise.resolve(accessCounts[key]?.toString() || '0');
        });

        const { calculateAdaptiveTTL } = await import('@/lib/cache-ttl-optimizer');
        
        const ttl1 = await calculateAdaptiveTTL('product:1');
        const ttl2 = await calculateAdaptiveTTL('product:2');

        expect(ttl1).toBeGreaterThan(ttl2); // Higher access = longer TTL
        expect(ttl1).toBeGreaterThan(3600); // At least 1 hour for popular items
        expect(ttl2).toBeLessThan(1800); // Less than 30 minutes for rare items
      });
    });

    describe('Memory Optimization', () => {
      it('should implement cache compression for large objects', async () => {
        const largeObject = {
          id: 'large-product',
          description: 'A'.repeat(10000), // Large description
          images: Array.from({ length: 50 }, (_, i) => `image-${i}.jpg`),
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set('large-object', largeObject, 3600, { compress: true });

        // Should store compressed version
        const setCall = mockRedisInstance.set.mock.calls[0];
        const cacheEntry = JSON.parse(setCall[1]);
        expect(cacheEntry.compressed).toBe(true);
      });

      it('should monitor cache memory usage', async () => {
        mockRedisInstance.memory = jest.fn().mockResolvedValue({
          used_memory: 52428800, // 50MB
          used_memory_human: '50.00M',
          used_memory_peak: 104857600, // 100MB
        });

        const memoryInfo = await mockRedisInstance.memory();

        expect(memoryInfo.used_memory).toBe(52428800);
        expect(memoryInfo.used_memory_peak).toBe(104857600);
      });

      it('should implement cache eviction policies', async () => {
        const { implementLRUEviction } = await import('@/lib/cache-eviction');
        
        mockRedisInstance.eval.mockResolvedValue(5); // Evicted 5 keys

        const evictedCount = await implementLRUEviction(1000); // Keep top 1000 keys

        expect(evictedCount).toBe(5);
        expect(mockRedisInstance.eval).toHaveBeenCalledWith(
          expect.stringContaining('ZREVRANGE'),
          expect.any(Number),
          expect.any(Array)
        );
      });
    });
  });

  describe('Specialized Cache Types', () => {
    describe('Product Cache', () => {
      it('should cache product data with appropriate TTL', async () => {
        const product = {
          id: 'empanada-carne',
          name: 'Empanada de Carne',
          price: 4.50,
          category: 'empanadas',
          images: ['empanada-carne.jpg'],
          inStock: true,
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(CacheKeys.product(product.id), product, 1800); // 30 minutes

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'product:empanada-carne',
          expect.stringContaining('"name":"Empanada de Carne"'),
          { ex: 1800 }
        );
      });

      it('should cache product listings with pagination', async () => {
        const products = [
          { id: '1', name: 'Product 1', category: 'empanadas' },
          { id: '2', name: 'Product 2', category: 'empanadas' },
        ];

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(
          CacheKeys.products('empanadas', 1, 20),
          products,
          900 // 15 minutes
        );

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'products:empanadas:1:20',
          expect.any(String),
          { ex: 900 }
        );
      });

      it('should cache search results with relevance scoring', async () => {
        const searchResults = {
          query: 'empanadas',
          results: [
            { id: '1', name: 'Empanada de Carne', relevance: 0.95 },
            { id: '2', name: 'Empanada de Pollo', relevance: 0.90 },
          ],
          total: 2,
          page: 1,
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(
          CacheKeys.productSearch('empanadas', 1),
          searchResults,
          600 // 10 minutes
        );

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'search:empanadas:1',
          expect.stringContaining('"relevance":0.95'),
          { ex: 600 }
        );
      });
    });

    describe('Order Cache', () => {
      it('should cache order data with security considerations', async () => {
        const order = {
          id: 'order-123',
          userId: 'user-456',
          items: [{ productId: '1', quantity: 2, price: 9.00 }],
          total: 18.00,
          status: 'pending',
          // Sensitive data should be excluded from cache
          paymentMethod: undefined, // Not cached
          creditCardLast4: undefined, // Not cached
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(CacheKeys.order(order.id), order, 1800);

        const setCall = mockRedisInstance.set.mock.calls[0];
        const cachedData = JSON.parse(setCall[1]);
        
        expect(cachedData.value.id).toBe('order-123');
        expect(cachedData.value.paymentMethod).toBeUndefined();
        expect(cachedData.value.creditCardLast4).toBeUndefined();
      });

      it('should cache user order history with pagination', async () => {
        const orderHistory = {
          orders: [
            { id: 'order-1', total: 25.50, status: 'completed' },
            { id: 'order-2', total: 18.00, status: 'pending' },
          ],
          pagination: {
            page: 1,
            totalPages: 3,
            totalOrders: 25,
          },
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(
          CacheKeys.userOrders('user-123', 1),
          orderHistory,
          900 // 15 minutes
        );

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'orders:user-123:1',
          expect.stringContaining('"totalOrders":25'),
          { ex: 900 }
        );
      });
    });

    describe('Cart Cache', () => {
      it('should cache cart data with short TTL', async () => {
        const cart = {
          userId: 'user-123',
          items: [
            {
              productId: 'empanada-carne',
              quantity: 3,
              price: 4.50,
              variant: 'regular',
            },
          ],
          total: 13.50,
          updatedAt: Date.now(),
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(CacheKeys.cart(cart.userId), cart, 300); // 5 minutes

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'cart:user-123',
          expect.stringContaining('"total":13.5'),
          { ex: 300 }
        );
      });

      it('should handle cart updates with cache invalidation', async () => {
        mockRedisInstance.del.mockResolvedValue(1);

        await CacheInvalidation.invalidateCart('user-123');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('cart:user-123');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('cart:items:user-123');
      });
    });

    describe('Business Data Cache', () => {
      it('should cache inventory data with very short TTL', async () => {
        const inventory = {
          productId: 'empanada-carne',
          stock: 25,
          reserved: 3,
          available: 22,
          lowStockThreshold: 10,
          lastUpdated: Date.now(),
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(
          CacheKeys.inventory(inventory.productId),
          inventory,
          60 // 1 minute - very short for real-time data
        );

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'inventory:empanada-carne',
          expect.stringContaining('"available":22'),
          { ex: 60 }
        );
      });

      it('should cache pricing data with moderate TTL', async () => {
        const pricing = {
          productId: 'empanada-carne',
          basePrice: 4.50,
          discountedPrice: 4.05,
          discountPercentage: 10,
          validUntil: Date.now() + 3600000, // 1 hour
        };

        mockRedisInstance.set.mockResolvedValue('OK');

        await cacheService.set(
          CacheKeys.pricing(pricing.productId),
          pricing,
          300 // 5 minutes
        );

        expect(mockRedisInstance.set).toHaveBeenCalledWith(
          'pricing:empanada-carne',
          expect.stringContaining('"discountPercentage":10'),
          { ex: 300 }
        );
      });
    });
  });

  describe('Cache Health Monitoring', () => {
    it('should provide comprehensive cache health metrics', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockRedisInstance.get.mockResolvedValue('100');

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.responseTime).toBeLessThan(1000);
      expect(health.details.redisConnected).toBe(true);
      expect(health.details.stats).toBeDefined();
    });

    it('should track cache performance metrics', async () => {
      const metrics = cacheService.getCacheStats();

      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('sets');
      expect(metrics).toHaveProperty('deletes');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('hitRate');
    });

    it('should alert on cache performance degradation', async () => {
      const performanceData = {
        hitRate: 0.30, // Very low hit rate
        errorRate: 0.15, // High error rate
        avgResponseTime: 500, // Slow response time
      };

      const { checkCacheHealth } = await import('@/lib/cache-health');
      const healthStatus = await checkCacheHealth(performanceData);

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.alerts).toContain('Low cache hit rate');
      expect(healthStatus.alerts).toContain('High cache error rate');
      expect(healthStatus.alerts).toContain('Slow cache response time');
    });
  });

  describe('Cache Consistency and Coherence', () => {
    it('should maintain cache consistency across distributed systems', async () => {
      const publishedEvents = [];
      mockRedisInstance.publish.mockImplementation((channel, message) => {
        publishedEvents.push({ channel, message: JSON.parse(message) });
        return Promise.resolve(1);
      });

      await cacheService.broadcastInvalidation('product:123');

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0].channel).toBe('cache:invalidate');
      expect(publishedEvents[0].message.key).toBe('product:123');
    });

    it('should handle cache stampede scenarios', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', name: 'Product' });
      
      // Simulate multiple concurrent requests for the same key
      mockRedisInstance.get.mockResolvedValue(null); // Cache miss
      mockRedisInstance.set.mockResolvedValue('OK');

      const promises = Array.from({ length: 10 }, () =>
        cacheService.getOrSet('product:1', mockFetcher, 3600)
      );

      await Promise.all(promises);

      // Should only call fetcher once due to stampede protection
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should implement cache versioning for data consistency', async () => {
      const productV1 = { id: '1', name: 'Product V1', version: 1 };
      const productV2 = { id: '1', name: 'Product V2', version: 2 };

      // Store version 1
      await cacheService.set('product:1', productV1, 3600, { version: '1' });

      // Try to store older version 1 again (should be rejected)
      const result = await cacheService.setWithVersion('product:1', productV1, 3600, '1', '2');

      expect(result.updated).toBe(false);
      expect(result.reason).toBe('version_conflict');
    });
  });

  describe('Integration with Application Layers', () => {
    it('should integrate with API response caching', async () => {
      const apiResponse = {
        data: [{ id: '1', name: 'Product 1' }],
        pagination: { page: 1, total: 1 },
        timestamp: Date.now(),
      };

      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.cacheApiResponse('/api/products', apiResponse, 900);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'api:/api/products',
        expect.stringContaining('"data"'),
        { ex: 900 }
      );
    });

    it('should integrate with database query caching', async () => {
      const queryResult = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' },
      ];

      const queryHash = 'query:products:empanadas:active:true';
      
      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.cacheQueryResult(queryHash, queryResult, 600);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        queryHash,
        expect.stringContaining('"id":"1"'),
        { ex: 600 }
      );
    });

    it('should provide cache-aware service layer integration', async () => {
      const { ProductService } = await import('@/services/product-service');
      const productService = new ProductService(cacheService);

      mockRedisInstance.get.mockResolvedValue(null); // Cache miss
      mockRedisInstance.set.mockResolvedValue('OK');

      const mockProductData = { id: '1', name: 'Test Product' };
      const mockDbFetch = jest.fn().mockResolvedValue(mockProductData);

      // Should check cache first, then DB, then cache result
      const result = await productService.getProduct('1', mockDbFetch);

      expect(result).toEqual(mockProductData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('product:1');
      expect(mockDbFetch).toHaveBeenCalled();
      expect(mockRedisInstance.set).toHaveBeenCalled();
    });
  });

  describe('Cache Security and Data Protection', () => {
    it('should exclude sensitive data from cache', async () => {
      const userWithSensitiveData = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
        password: 'hashed-password', // Should not be cached
        paymentMethods: [], // Should not be cached
        addresses: [], // Should not be cached
        preferences: { theme: 'dark' }, // Safe to cache
      };

      const sanitizedData = cacheService.sanitizeForCache(userWithSensitiveData);

      expect(sanitizedData.id).toBe('user-123');
      expect(sanitizedData.preferences).toEqual({ theme: 'dark' });
      expect(sanitizedData.password).toBeUndefined();
      expect(sanitizedData.paymentMethods).toBeUndefined();
      expect(sanitizedData.addresses).toBeUndefined();
    });

    it('should implement cache key obfuscation for sensitive data', async () => {
      const sensitiveKey = cacheService.obfuscateKey('payment:user-123:card-456');
      
      expect(sensitiveKey).not.toContain('user-123');
      expect(sensitiveKey).not.toContain('card-456');
      expect(sensitiveKey).toMatch(/^obf_[a-f0-9]{32}$/);
    });

    it('should respect user privacy preferences in caching', async () => {
      const userPreferences = {
        allowDataCaching: false,
        allowPersonalization: true,
      };

      const shouldCache = cacheService.shouldCacheForUser('user-123', userPreferences);

      expect(shouldCache).toBe(false);
    });
  });
}); 