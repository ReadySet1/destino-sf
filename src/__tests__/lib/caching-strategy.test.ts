// Phase 4: Caching Strategy Tests for Production Readiness
import { redis } from '@/lib/redis';
import { CacheManager } from '@/lib/cache-manager';
import { ProductCache } from '@/lib/product-cache';
import { OrderCache } from '@/lib/order-cache';
import { CateringCache } from '@/lib/catering-cache';
import { performanceCache } from '@/lib/performance-cache';

// Mock Redis client
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    keys: jest.fn(),
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
  },
}));

// Mock cache managers
jest.mock('@/lib/cache-manager');
jest.mock('@/lib/product-cache');
jest.mock('@/lib/order-cache');
jest.mock('@/lib/catering-cache');
jest.mock('@/lib/performance-cache');

const mockRedis = redis as jest.Mocked<typeof redis>;
const mockCacheManager = CacheManager as jest.MockedClass<typeof CacheManager>;
const mockProductCache = ProductCache as jest.MockedClass<typeof ProductCache>;
const mockOrderCache = OrderCache as jest.MockedClass<typeof OrderCache>;
const mockCateringCache = CateringCache as jest.MockedClass<typeof CateringCache>;
const mockPerformanceCache = performanceCache as jest.Mocked<typeof performanceCache>;

describe('Caching Strategy Tests - Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock Date.now for consistent timing
    jest.spyOn(Date, 'now').mockReturnValue(1642665600000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Redis Connection and Configuration', () => {
    it('should connect to Redis successfully', async () => {
      mockRedis.get.mockResolvedValue('test-value');
      
      const result = await redis.get('test-key');
      
      expect(result).toBe('test-value');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis connection failures', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      await expect(redis.get('test-key')).rejects.toThrow('Redis connection failed');
    });

    it('should verify Redis configuration', () => {
      expect(process.env.REDIS_URL).toBeDefined();
      expect(process.env.REDIS_PASSWORD).toBeDefined();
      expect(process.env.REDIS_MAX_RETRIES).toBeDefined();
    });
  });

  describe('Cache Manager Tests', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    describe('Basic Cache Operations', () => {
      it('should store and retrieve cached data', async () => {
        const testData = { id: 'test-1', name: 'Test Item' };
        mockRedis.set.mockResolvedValue('OK');
        mockRedis.get.mockResolvedValue(JSON.stringify(testData));

        await cacheManager.set('test-key', testData, 3600);
        const result = await cacheManager.get('test-key');

        expect(result).toEqual(testData);
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(testData),
          'EX',
          3600
        );
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      });

      it('should handle cache misses', async () => {
        mockRedis.get.mockResolvedValue(null);

        const result = await cacheManager.get('non-existent-key');

        expect(result).toBeNull();
        expect(mockRedis.get).toHaveBeenCalledWith('non-existent-key');
      });

      it('should delete cached data', async () => {
        mockRedis.del.mockResolvedValue(1);

        await cacheManager.delete('test-key');

        expect(mockRedis.del).toHaveBeenCalledWith('test-key');
      });

      it('should check cache existence', async () => {
        mockRedis.exists.mockResolvedValue(1);

        const exists = await cacheManager.exists('test-key');

        expect(exists).toBe(true);
        expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
      });
    });

    describe('Cache Expiration', () => {
      it('should set cache expiration', async () => {
        const testData = { id: 'test-1' };
        mockRedis.set.mockResolvedValue('OK');

        await cacheManager.set('test-key', testData, 1800);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(testData),
          'EX',
          1800
        );
      });

      it('should update cache expiration', async () => {
        mockRedis.expire.mockResolvedValue(1);

        await cacheManager.expire('test-key', 3600);

        expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 3600);
      });

      it('should get remaining TTL', async () => {
        mockRedis.ttl.mockResolvedValue(1200);

        const ttl = await cacheManager.getTTL('test-key');

        expect(ttl).toBe(1200);
        expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
      });
    });

    describe('Bulk Cache Operations', () => {
      it('should get multiple cached items', async () => {
        const testData = [
          JSON.stringify({ id: 'item-1', name: 'Item 1' }),
          JSON.stringify({ id: 'item-2', name: 'Item 2' }),
        ];
        mockRedis.mget.mockResolvedValue(testData);

        const result = await cacheManager.getMultiple(['key-1', 'key-2']);

        expect(result).toEqual([
          { id: 'item-1', name: 'Item 1' },
          { id: 'item-2', name: 'Item 2' },
        ]);
        expect(mockRedis.mget).toHaveBeenCalledWith(['key-1', 'key-2']);
      });

      it('should set multiple cached items', async () => {
        const testData = {
          'key-1': { id: 'item-1', name: 'Item 1' },
          'key-2': { id: 'item-2', name: 'Item 2' },
        };
        mockRedis.mset.mockResolvedValue('OK');

        await cacheManager.setMultiple(testData, 3600);

        expect(mockRedis.mset).toHaveBeenCalledWith([
          'key-1',
          JSON.stringify(testData['key-1']),
          'key-2',
          JSON.stringify(testData['key-2']),
        ]);
      });

      it('should delete multiple cached items', async () => {
        mockRedis.del.mockResolvedValue(2);

        await cacheManager.deleteMultiple(['key-1', 'key-2']);

        expect(mockRedis.del).toHaveBeenCalledWith(['key-1', 'key-2']);
      });
    });

    describe('Cache Invalidation Patterns', () => {
      it('should invalidate by pattern', async () => {
        const keys = ['products:1', 'products:2', 'products:3'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(3);

        await cacheManager.invalidatePattern('products:*');

        expect(mockRedis.keys).toHaveBeenCalledWith('products:*');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });

      it('should invalidate by tags', async () => {
        const taggedKeys = ['products:1', 'products:2'];
        mockRedis.hgetall.mockResolvedValue({
          'products:1': 'product',
          'products:2': 'product',
        });
        mockRedis.del.mockResolvedValue(2);
        mockRedis.hdel.mockResolvedValue(2);

        await cacheManager.invalidateByTag('product');

        expect(mockRedis.hgetall).toHaveBeenCalledWith('cache:tags:product');
        expect(mockRedis.del).toHaveBeenCalledWith(taggedKeys);
        expect(mockRedis.hdel).toHaveBeenCalledWith('cache:tags:product', ...taggedKeys);
      });

      it('should flush all cache', async () => {
        mockRedis.flushall.mockResolvedValue('OK');

        await cacheManager.flushAll();

        expect(mockRedis.flushall).toHaveBeenCalled();
      });
    });
  });

  describe('Product Cache Tests', () => {
    let productCache: ProductCache;

    beforeEach(() => {
      productCache = new ProductCache();
    });

    describe('Product Caching', () => {
      it('should cache product data', async () => {
        const product = {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          price: 12.99,
          category: 'alfajores',
          images: ['image1.jpg'],
        };

        mockRedis.set.mockResolvedValue('OK');
        mockRedis.hset.mockResolvedValue(1);

        await productCache.cacheProduct(product);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'product:prod-1',
          JSON.stringify(product),
          'EX',
          3600
        );
        expect(mockRedis.hset).toHaveBeenCalledWith(
          'cache:tags:product',
          'product:prod-1',
          'product'
        );
      });

      it('should retrieve cached product', async () => {
        const product = {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          price: 12.99,
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(product));

        const result = await productCache.getProduct('prod-1');

        expect(result).toEqual(product);
        expect(mockRedis.get).toHaveBeenCalledWith('product:prod-1');
      });

      it('should cache product list', async () => {
        const products = [
          { id: 'prod-1', name: 'Product 1' },
          { id: 'prod-2', name: 'Product 2' },
        ];

        mockRedis.set.mockResolvedValue('OK');

        await productCache.cacheProductList('category:alfajores', products);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'products:category:alfajores',
          JSON.stringify(products),
          'EX',
          1800
        );
      });

      it('should retrieve cached product list', async () => {
        const products = [
          { id: 'prod-1', name: 'Product 1' },
          { id: 'prod-2', name: 'Product 2' },
        ];

        mockRedis.get.mockResolvedValue(JSON.stringify(products));

        const result = await productCache.getProductList('category:alfajores');

        expect(result).toEqual(products);
        expect(mockRedis.get).toHaveBeenCalledWith('products:category:alfajores');
      });
    });

    describe('Product Cache Invalidation', () => {
      it('should invalidate product cache on update', async () => {
        const keys = ['product:prod-1', 'products:category:alfajores'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(2);

        await productCache.invalidateProduct('prod-1');

        expect(mockRedis.keys).toHaveBeenCalledWith('product:prod-1');
        expect(mockRedis.keys).toHaveBeenCalledWith('products:*');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });

      it('should invalidate category cache', async () => {
        const keys = ['products:category:alfajores'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(1);

        await productCache.invalidateCategory('alfajores');

        expect(mockRedis.keys).toHaveBeenCalledWith('products:category:alfajores');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });
    });
  });

  describe('Order Cache Tests', () => {
    let orderCache: OrderCache;

    beforeEach(() => {
      orderCache = new OrderCache();
    });

    describe('Order Caching', () => {
      it('should cache order data', async () => {
        const order = {
          id: 'order-1',
          userId: 'user-1',
          status: 'PENDING',
          total: 25.98,
          items: [
            { id: 'item-1', name: 'Product 1', quantity: 2 },
          ],
        };

        mockRedis.set.mockResolvedValue('OK');
        mockRedis.hset.mockResolvedValue(1);

        await orderCache.cacheOrder(order);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'order:order-1',
          JSON.stringify(order),
          'EX',
          1800
        );
        expect(mockRedis.hset).toHaveBeenCalledWith(
          'cache:tags:order',
          'order:order-1',
          'order'
        );
      });

      it('should retrieve cached order', async () => {
        const order = {
          id: 'order-1',
          userId: 'user-1',
          status: 'PENDING',
          total: 25.98,
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(order));

        const result = await orderCache.getOrder('order-1');

        expect(result).toEqual(order);
        expect(mockRedis.get).toHaveBeenCalledWith('order:order-1');
      });

      it('should cache user orders', async () => {
        const orders = [
          { id: 'order-1', status: 'PENDING' },
          { id: 'order-2', status: 'COMPLETED' },
        ];

        mockRedis.set.mockResolvedValue('OK');

        await orderCache.cacheUserOrders('user-1', orders);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'orders:user:user-1',
          JSON.stringify(orders),
          'EX',
          900
        );
      });
    });

    describe('Order Cache Invalidation', () => {
      it('should invalidate order cache on status change', async () => {
        const keys = ['order:order-1', 'orders:user:user-1'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(2);

        await orderCache.invalidateOrder('order-1', 'user-1');

        expect(mockRedis.keys).toHaveBeenCalledWith('order:order-1');
        expect(mockRedis.keys).toHaveBeenCalledWith('orders:user:user-1');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });

      it('should invalidate user orders cache', async () => {
        const keys = ['orders:user:user-1'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(1);

        await orderCache.invalidateUserOrders('user-1');

        expect(mockRedis.keys).toHaveBeenCalledWith('orders:user:user-1');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });
    });
  });

  describe('Catering Cache Tests', () => {
    let cateringCache: CateringCache;

    beforeEach(() => {
      cateringCache = new CateringCache();
    });

    describe('Catering Data Caching', () => {
      it('should cache catering packages', async () => {
        const packages = [
          { id: 'pkg-1', name: 'Package 1', price: 150 },
          { id: 'pkg-2', name: 'Package 2', price: 200 },
        ];

        mockRedis.set.mockResolvedValue('OK');

        await cateringCache.cachePackages(packages);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'catering:packages',
          JSON.stringify(packages),
          'EX',
          3600
        );
      });

      it('should retrieve cached catering packages', async () => {
        const packages = [
          { id: 'pkg-1', name: 'Package 1', price: 150 },
          { id: 'pkg-2', name: 'Package 2', price: 200 },
        ];

        mockRedis.get.mockResolvedValue(JSON.stringify(packages));

        const result = await cateringCache.getPackages();

        expect(result).toEqual(packages);
        expect(mockRedis.get).toHaveBeenCalledWith('catering:packages');
      });

      it('should cache delivery zones', async () => {
        const zones = [
          { id: 'zone-1', name: 'Nearby', fee: 5 },
          { id: 'zone-2', name: 'Extended', fee: 10 },
        ];

        mockRedis.set.mockResolvedValue('OK');

        await cateringCache.cacheDeliveryZones(zones);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'catering:delivery-zones',
          JSON.stringify(zones),
          'EX',
          7200
        );
      });
    });

    describe('Catering Cache Invalidation', () => {
      it('should invalidate catering cache on package update', async () => {
        const keys = ['catering:packages', 'catering:package:pkg-1'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(2);

        await cateringCache.invalidatePackages();

        expect(mockRedis.keys).toHaveBeenCalledWith('catering:*');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });

      it('should invalidate delivery zones cache', async () => {
        const keys = ['catering:delivery-zones'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(1);

        await cateringCache.invalidateDeliveryZones();

        expect(mockRedis.keys).toHaveBeenCalledWith('catering:delivery-zones');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });
    });
  });

  describe('Performance Cache Tests', () => {
    describe('Performance Metrics Caching', () => {
      it('should cache API response times', async () => {
        const metrics = {
          '/api/products': { avg: 150, min: 100, max: 200, count: 50 },
          '/api/orders': { avg: 200, min: 150, max: 300, count: 30 },
        };

        mockRedis.set.mockResolvedValue('OK');

        await performanceCache.cacheMetrics('api-response-times', metrics);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'performance:api-response-times',
          JSON.stringify(metrics),
          'EX',
          300
        );
      });

      it('should retrieve cached performance metrics', async () => {
        const metrics = {
          '/api/products': { avg: 150, min: 100, max: 200, count: 50 },
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(metrics));

        const result = await performanceCache.getMetrics('api-response-times');

        expect(result).toEqual(metrics);
        expect(mockRedis.get).toHaveBeenCalledWith('performance:api-response-times');
      });

      it('should cache database query performance', async () => {
        const queryMetrics = {
          'SELECT * FROM orders': { avg: 45, count: 100 },
          'SELECT * FROM products': { avg: 25, count: 200 },
        };

        mockRedis.set.mockResolvedValue('OK');

        await performanceCache.cacheQueryMetrics(queryMetrics);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'performance:db-queries',
          JSON.stringify(queryMetrics),
          'EX',
          600
        );
      });
    });

    describe('Performance Cache Invalidation', () => {
      it('should invalidate performance cache periodically', async () => {
        const keys = ['performance:api-response-times', 'performance:db-queries'];
        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(2);

        await performanceCache.invalidateAll();

        expect(mockRedis.keys).toHaveBeenCalledWith('performance:*');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });
    });
  });

  describe('Cache Performance and Optimization', () => {
    describe('Cache Hit Ratio Monitoring', () => {
      it('should track cache hit ratios', async () => {
        mockRedis.incr.mockResolvedValue(1);
        mockRedis.get.mockResolvedValue('50');

        const cacheManager = new CacheManager();
        await cacheManager.recordCacheHit('products');
        await cacheManager.recordCacheMiss('products');

        const hitRatio = await cacheManager.getCacheHitRatio('products');

        expect(hitRatio).toBe(0.5); // 50% hit ratio
        expect(mockRedis.incr).toHaveBeenCalledWith('cache:hits:products');
        expect(mockRedis.incr).toHaveBeenCalledWith('cache:misses:products');
      });

      it('should identify cache performance issues', async () => {
        mockRedis.get.mockResolvedValue('10'); // Low hit ratio

        const cacheManager = new CacheManager();
        const hitRatio = await cacheManager.getCacheHitRatio('orders');

        expect(hitRatio).toBeLessThan(0.7); // Below recommended 70%
        expect(hitRatio).toBe(0.1);
      });
    });

    describe('Cache Size and Memory Management', () => {
      it('should monitor cache memory usage', async () => {
        const mockMemoryInfo = {
          used_memory: 1048576, // 1MB
          used_memory_human: '1M',
          maxmemory: 10485760, // 10MB
          maxmemory_human: '10M',
        };

        mockRedis.info = jest.fn().mockResolvedValue(mockMemoryInfo);

        const cacheManager = new CacheManager();
        const memoryUsage = await cacheManager.getMemoryUsage();

        expect(memoryUsage.usedMemory).toBe(1048576);
        expect(memoryUsage.maxMemory).toBe(10485760);
        expect(memoryUsage.usagePercentage).toBe(10);
      });

      it('should detect memory pressure', async () => {
        const mockMemoryInfo = {
          used_memory: 9437184, // 9MB
          maxmemory: 10485760, // 10MB
        };

        mockRedis.info = jest.fn().mockResolvedValue(mockMemoryInfo);

        const cacheManager = new CacheManager();
        const memoryUsage = await cacheManager.getMemoryUsage();

        expect(memoryUsage.usagePercentage).toBeGreaterThan(80);
        expect(memoryUsage.needsCleanup).toBe(true);
      });
    });

    describe('Cache Warming Strategies', () => {
      it('should warm up product cache', async () => {
        const products = [
          { id: 'prod-1', name: 'Product 1' },
          { id: 'prod-2', name: 'Product 2' },
        ];

        mockRedis.set.mockResolvedValue('OK');
        mockRedis.mset.mockResolvedValue('OK');

        const productCache = new ProductCache();
        await productCache.warmUpCache(products);

        expect(mockRedis.mset).toHaveBeenCalledWith([
          'product:prod-1',
          JSON.stringify(products[0]),
          'product:prod-2',
          JSON.stringify(products[1]),
        ]);
      });

      it('should warm up critical caches on startup', async () => {
        mockRedis.set.mockResolvedValue('OK');
        mockRedis.mset.mockResolvedValue('OK');

        const { warmUpCriticalCaches } = await import('@/lib/cache-warming');
        await warmUpCriticalCaches();

        // Should warm up products, categories, and settings
        expect(mockRedis.set).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Cache Consistency and Coherence', () => {
    describe('Cache Synchronization', () => {
      it('should maintain cache consistency across updates', async () => {
        const pipeline = {
          del: jest.fn(),
          set: jest.fn(),
          exec: jest.fn().mockResolvedValue(['OK', 'OK']),
        };

        mockRedis.pipeline.mockReturnValue(pipeline);

        const cacheManager = new CacheManager();
        await cacheManager.atomicUpdate('product:prod-1', { id: 'prod-1', name: 'Updated Product' });

        expect(mockRedis.pipeline).toHaveBeenCalled();
        expect(pipeline.del).toHaveBeenCalledWith('product:prod-1');
        expect(pipeline.set).toHaveBeenCalledWith(
          'product:prod-1',
          JSON.stringify({ id: 'prod-1', name: 'Updated Product' }),
          'EX',
          3600
        );
        expect(pipeline.exec).toHaveBeenCalled();
      });

      it('should handle cache update conflicts', async () => {
        const pipeline = {
          del: jest.fn(),
          set: jest.fn(),
          exec: jest.fn().mockResolvedValue([null, 'CONFLICT']),
        };

        mockRedis.pipeline.mockReturnValue(pipeline);

        const cacheManager = new CacheManager();
        
        await expect(
          cacheManager.atomicUpdate('product:prod-1', { id: 'prod-1', name: 'Updated Product' })
        ).rejects.toThrow('Cache update conflict');
      });
    });

    describe('Cache Coherence Across Services', () => {
      it('should invalidate related caches on product update', async () => {
        const keys = [
          'product:prod-1',
          'products:category:alfajores',
          'products:featured',
          'search:results:alfajores',
        ];

        mockRedis.keys.mockResolvedValue(keys);
        mockRedis.del.mockResolvedValue(4);

        const { invalidateRelatedCaches } = await import('@/lib/cache-invalidation');
        await invalidateRelatedCaches('product:prod-1');

        expect(mockRedis.keys).toHaveBeenCalledWith('product:prod-1');
        expect(mockRedis.keys).toHaveBeenCalledWith('products:*');
        expect(mockRedis.keys).toHaveBeenCalledWith('search:*');
        expect(mockRedis.del).toHaveBeenCalledWith(keys);
      });

      it('should handle distributed cache invalidation', async () => {
        const mockPublish = jest.fn().mockResolvedValue(1);
        mockRedis.publish = mockPublish;

        const cacheManager = new CacheManager();
        await cacheManager.broadcastInvalidation('product:prod-1');

        expect(mockPublish).toHaveBeenCalledWith(
          'cache:invalidate',
          JSON.stringify({ key: 'product:prod-1', timestamp: Date.now() })
        );
      });
    });
  });

  describe('Cache Monitoring and Alerting', () => {
    describe('Cache Health Monitoring', () => {
      it('should monitor cache health metrics', async () => {
        mockRedis.info = jest.fn().mockResolvedValue({
          connected_clients: 5,
          used_memory: 1048576,
          keyspace_hits: 1000,
          keyspace_misses: 200,
          expired_keys: 50,
        });

        const { getCacheHealthMetrics } = await import('@/lib/cache-monitoring');
        const health = await getCacheHealthMetrics();

        expect(health.hitRatio).toBe(0.833); // 1000/(1000+200)
        expect(health.connectedClients).toBe(5);
        expect(health.memoryUsage).toBe(1048576);
        expect(health.expiredKeys).toBe(50);
        expect(health.status).toBe('healthy');
      });

      it('should detect cache health issues', async () => {
        mockRedis.info = jest.fn().mockResolvedValue({
          connected_clients: 100, // High client count
          used_memory: 9437184, // High memory usage
          keyspace_hits: 100,
          keyspace_misses: 900, // Low hit ratio
          expired_keys: 1000, // High expiration rate
        });

        const { getCacheHealthMetrics } = await import('@/lib/cache-monitoring');
        const health = await getCacheHealthMetrics();

        expect(health.hitRatio).toBeLessThan(0.5);
        expect(health.connectedClients).toBeGreaterThan(50);
        expect(health.status).toBe('warning');
      });
    });

    describe('Cache Performance Alerts', () => {
      it('should trigger alerts for cache performance issues', async () => {
        const { checkCachePerformance } = await import('@/lib/cache-monitoring');
        
        const alerts = await checkCachePerformance({
          hitRatio: 0.3, // Low hit ratio
          responseTime: 500, // High response time
          errorRate: 0.1, // High error rate
        });

        expect(alerts).toHaveLength(3);
        expect(alerts[0].type).toBe('LOW_HIT_RATIO');
        expect(alerts[1].type).toBe('HIGH_RESPONSE_TIME');
        expect(alerts[2].type).toBe('HIGH_ERROR_RATE');
      });
    });
  });
}); 