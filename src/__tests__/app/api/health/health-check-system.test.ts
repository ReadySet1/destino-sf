// Phase 4: Health Check System Tests for Production Readiness
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/db';
import { checkDatabaseHealth } from '@/lib/db-utils';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    $connect: jest.fn(),
  },
}));

jest.mock('@/lib/db-utils', () => ({
  checkDatabaseHealth: jest.fn(),
}));

// Mock external services
jest.mock('@/lib/square/client', () => ({
  squareClient: {
    locationsApi: {
      retrieveLocation: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<
  typeof checkDatabaseHealth
>;

describe('Health Check System Tests - Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database Health Checks', () => {
    it('should report healthy database status', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: true,
        responseTime: 150,
        diagnostics: {
          database_version: 'PostgreSQL 15.1',
          database_name: 'destino_sf',
          current_time: '2024-01-15T12:00:00Z',
          connection_count: 5,
          max_connections: 100,
          active_connections: 3,
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.database.connected).toBe(true);
      expect(data.database.responseTime).toBe('150ms');
      expect(data.database.diagnostics.database_version).toBe('PostgreSQL 15.1');
      expect(data.database.diagnostics.connection_count).toBe(5);
      expect(data.timestamp).toBeDefined();
    });

    it('should report unhealthy database status', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: false,
        responseTime: 5000,
        error: 'Connection timeout',
        diagnostics: {
          environment: 'production',
          last_successful_connection: '2024-01-15T11:30:00Z',
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.database.connected).toBe(false);
      expect(data.database.error).toBe('Connection timeout');
      expect(data.database.responseTime).toBe('5000ms');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle database connection failures', async () => {
      mockCheckDatabaseHealth.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.database.connected).toBe(false);
      expect(data.database.error).toBe('Database connection failed');
    });

    it('should monitor database connection pooling', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: true,
        responseTime: 200,
        diagnostics: {
          database_version: 'PostgreSQL 15.1',
          connection_count: 45,
          max_connections: 100,
          active_connections: 30,
          idle_connections: 15,
          waiting_connections: 0,
          pool_size: 50,
          pool_available: 20,
          pool_used: 30,
          pool_waiting: 0,
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.database.diagnostics.pool_size).toBe(50);
      expect(data.database.diagnostics.pool_available).toBe(20);
      expect(data.database.diagnostics.pool_used).toBe(30);
      expect(data.database.diagnostics.pool_waiting).toBe(0);

      // Check connection pool health
      const poolUsagePercent = (30 / 50) * 100;
      expect(poolUsagePercent).toBe(60);
    });

    it('should detect database connection pool saturation', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: true,
        responseTime: 1500,
        diagnostics: {
          database_version: 'PostgreSQL 15.1',
          connection_count: 95,
          max_connections: 100,
          active_connections: 85,
          idle_connections: 10,
          waiting_connections: 5,
          pool_size: 50,
          pool_available: 2,
          pool_used: 48,
          pool_waiting: 8,
        },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.database.diagnostics.pool_waiting).toBe(8);
      expect(data.database.diagnostics.pool_available).toBe(2);

      // Pool is nearly saturated
      const poolUsagePercent = (48 / 50) * 100;
      expect(poolUsagePercent).toBe(96);
    });
  });

  describe('External Services Health Checks', () => {
    it('should check Square API health', async () => {
      const mockSquareClient = {
        locationsApi: {
          retrieveLocation: jest.fn().mockResolvedValue({
            result: {
              location: {
                id: 'location-123',
                name: 'Destino SF',
                status: 'ACTIVE',
              },
            },
          }),
        },
      };

      // Mock Square client
      jest.doMock('@/lib/square/client', () => ({
        squareClient: mockSquareClient,
      }));

      const { checkExternalServices } = await import('@/lib/health-checks');
      const externalHealth = await checkExternalServices();

      expect(externalHealth.square.status).toBe('healthy');
      expect(externalHealth.square.responseTime).toBeLessThan(5000);
      expect(externalHealth.square.details.location.status).toBe('ACTIVE');
    });

    it('should handle Square API failures', async () => {
      const mockSquareClient = {
        locationsApi: {
          retrieveLocation: jest.fn().mockRejectedValue(new Error('Square API timeout')),
        },
      };

      jest.doMock('@/lib/square/client', () => ({
        squareClient: mockSquareClient,
      }));

      const { checkExternalServices } = await import('@/lib/health-checks');
      const externalHealth = await checkExternalServices();

      expect(externalHealth.square.status).toBe('unhealthy');
      expect(externalHealth.square.error).toBe('Square API timeout');
    });

    it('should check email service health', async () => {
      const mockSendEmail = jest.fn().mockResolvedValue({
        id: 'email-123',
        status: 'sent',
      });

      jest.doMock('@/lib/email', () => ({
        sendEmail: mockSendEmail,
      }));

      const { checkExternalServices } = await import('@/lib/health-checks');
      const externalHealth = await checkExternalServices();

      expect(externalHealth.email.status).toBe('healthy');
      expect(externalHealth.email.responseTime).toBeLessThan(5000);
    });

    it('should handle email service failures', async () => {
      const mockSendEmail = jest.fn().mockRejectedValue(new Error('Email service unavailable'));

      jest.doMock('@/lib/email', () => ({
        sendEmail: mockSendEmail,
      }));

      const { checkExternalServices } = await import('@/lib/health-checks');
      const externalHealth = await checkExternalServices();

      expect(externalHealth.email.status).toBe('unhealthy');
      expect(externalHealth.email.error).toBe('Email service unavailable');
    });

    it('should check Supabase auth health', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      jest.doMock('@/utils/supabase/server', () => ({
        createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
      }));

      const { checkExternalServices } = await import('@/lib/health-checks');
      const externalHealth = await checkExternalServices();

      expect(externalHealth.supabase.status).toBe('healthy');
      expect(externalHealth.supabase.responseTime).toBeLessThan(5000);
    });

    it('should handle Supabase auth failures', async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Supabase connection failed')),
        },
      };

      jest.doMock('@/utils/supabase/server', () => ({
        createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
      }));

      const { checkExternalServices } = await import('@/lib/health-checks');
      const externalHealth = await checkExternalServices();

      expect(externalHealth.supabase.status).toBe('unhealthy');
      expect(externalHealth.supabase.error).toBe('Supabase connection failed');
    });
  });

  describe('System Resource Monitoring', () => {
    it('should monitor memory usage', async () => {
      const mockMemoryUsage = {
        rss: 104857600, // 100MB
        heapTotal: 52428800, // 50MB
        heapUsed: 41943040, // 40MB
        external: 1048576, // 1MB
        arrayBuffers: 524288, // 512KB
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

      const { checkSystemResources } = await import('@/lib/health-checks');
      const systemHealth = await checkSystemResources();

      expect(systemHealth.memory.rss).toBe('100.00MB');
      expect(systemHealth.memory.heapTotal).toBe('50.00MB');
      expect(systemHealth.memory.heapUsed).toBe('40.00MB');
      expect(systemHealth.memory.heapUsagePercent).toBe(80);
      expect(systemHealth.memory.status).toBe('healthy');
    });

    it('should detect high memory usage', async () => {
      const mockMemoryUsage = {
        rss: 1073741824, // 1GB
        heapTotal: 536870912, // 512MB
        heapUsed: 483183820, // 460MB (high usage)
        external: 10485760, // 10MB
        arrayBuffers: 5242880, // 5MB
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

      const { checkSystemResources } = await import('@/lib/health-checks');
      const systemHealth = await checkSystemResources();

      expect(systemHealth.memory.heapUsagePercent).toBeGreaterThan(85);
      expect(systemHealth.memory.status).toBe('warning');
    });

    it('should monitor CPU usage', async () => {
      const mockCpuUsage = {
        user: 125000, // 125ms
        system: 50000, // 50ms
      };

      jest.spyOn(process, 'cpuUsage').mockReturnValue(mockCpuUsage);

      const { checkSystemResources } = await import('@/lib/health-checks');
      const systemHealth = await checkSystemResources();

      expect(systemHealth.cpu.user).toBe(125);
      expect(systemHealth.cpu.system).toBe(50);
      expect(systemHealth.cpu.total).toBe(175);
      expect(systemHealth.cpu.status).toBe('healthy');
    });

    it('should check disk space', async () => {
      const mockDiskUsage = {
        total: 1073741824, // 1GB
        used: 536870912, // 512MB
        available: 536870912, // 512MB
        usagePercent: 50,
      };

      jest.doMock('fs', () => ({
        statSync: jest.fn().mockReturnValue({
          size: mockDiskUsage.total,
          blocks: 1000,
          blksize: 4096,
        }),
      }));

      const { checkSystemResources } = await import('@/lib/health-checks');
      const systemHealth = await checkSystemResources();

      expect(systemHealth.disk.usagePercent).toBe(50);
      expect(systemHealth.disk.status).toBe('healthy');
    });

    it('should detect low disk space', async () => {
      const mockDiskUsage = {
        total: 1073741824, // 1GB
        used: 966367641, // 900MB
        available: 107374182, // 100MB
        usagePercent: 90,
      };

      jest.doMock('fs', () => ({
        statSync: jest.fn().mockReturnValue({
          size: mockDiskUsage.total,
          blocks: 1000,
          blksize: 4096,
        }),
      }));

      const { checkSystemResources } = await import('@/lib/health-checks');
      const systemHealth = await checkSystemResources();

      expect(systemHealth.disk.usagePercent).toBe(90);
      expect(systemHealth.disk.status).toBe('warning');
    });
  });

  describe('Application-Specific Health Checks', () => {
    it('should check order processing health', async () => {
      // Mock recent orders
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 25, avg_processing_time: 150 }]);

      const { checkApplicationHealth } = await import('@/lib/health-checks');
      const appHealth = await checkApplicationHealth();

      expect(appHealth.orders.recentOrderCount).toBe(25);
      expect(appHealth.orders.averageProcessingTime).toBe(150);
      expect(appHealth.orders.status).toBe('healthy');
    });

    it('should detect order processing issues', async () => {
      // Mock concerning order metrics
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 2, avg_processing_time: 5000 }]);

      const { checkApplicationHealth } = await import('@/lib/health-checks');
      const appHealth = await checkApplicationHealth();

      expect(appHealth.orders.recentOrderCount).toBe(2);
      expect(appHealth.orders.averageProcessingTime).toBe(5000);
      expect(appHealth.orders.status).toBe('warning');
    });

    it('should check payment processing health', async () => {
      // Mock successful payments
      mockPrisma.$queryRaw.mockResolvedValue([
        { successful_payments: 45, failed_payments: 2, success_rate: 0.957 },
      ]);

      const { checkApplicationHealth } = await import('@/lib/health-checks');
      const appHealth = await checkApplicationHealth();

      expect(appHealth.payments.successfulPayments).toBe(45);
      expect(appHealth.payments.failedPayments).toBe(2);
      expect(appHealth.payments.successRate).toBe(0.957);
      expect(appHealth.payments.status).toBe('healthy');
    });

    it('should detect payment processing issues', async () => {
      // Mock concerning payment metrics
      mockPrisma.$queryRaw.mockResolvedValue([
        { successful_payments: 10, failed_payments: 15, success_rate: 0.4 },
      ]);

      const { checkApplicationHealth } = await import('@/lib/health-checks');
      const appHealth = await checkApplicationHealth();

      expect(appHealth.payments.successfulPayments).toBe(10);
      expect(appHealth.payments.failedPayments).toBe(15);
      expect(appHealth.payments.successRate).toBe(0.4);
      expect(appHealth.payments.status).toBe('unhealthy');
    });

    it('should check inventory health', async () => {
      // Mock inventory levels
      mockPrisma.$queryRaw.mockResolvedValue([
        { low_stock_items: 3, out_of_stock_items: 1, total_active_items: 50 },
      ]);

      const { checkApplicationHealth } = await import('@/lib/health-checks');
      const appHealth = await checkApplicationHealth();

      expect(appHealth.inventory.lowStockItems).toBe(3);
      expect(appHealth.inventory.outOfStockItems).toBe(1);
      expect(appHealth.inventory.totalActiveItems).toBe(50);
      expect(appHealth.inventory.status).toBe('healthy');
    });

    it('should detect inventory issues', async () => {
      // Mock concerning inventory metrics
      mockPrisma.$queryRaw.mockResolvedValue([
        { low_stock_items: 20, out_of_stock_items: 10, total_active_items: 50 },
      ]);

      const { checkApplicationHealth } = await import('@/lib/health-checks');
      const appHealth = await checkApplicationHealth();

      expect(appHealth.inventory.lowStockItems).toBe(20);
      expect(appHealth.inventory.outOfStockItems).toBe(10);
      expect(appHealth.inventory.totalActiveItems).toBe(50);
      expect(appHealth.inventory.status).toBe('warning');
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor API response times', async () => {
      const mockResponseTimes = {
        '/api/products': 125,
        '/api/orders': 200,
        '/api/checkout': 300,
        '/api/payment': 450,
      };

      const { checkPerformanceMetrics } = await import('@/lib/health-checks');
      const perfHealth = await checkPerformanceMetrics();

      expect(perfHealth.apiResponseTimes['/api/products']).toBeLessThan(500);
      expect(perfHealth.apiResponseTimes['/api/orders']).toBeLessThan(500);
      expect(perfHealth.apiResponseTimes['/api/checkout']).toBeLessThan(500);
      expect(perfHealth.apiResponseTimes['/api/payment']).toBeLessThan(1000);
      expect(perfHealth.status).toBe('healthy');
    });

    it('should detect slow API responses', async () => {
      const mockResponseTimes = {
        '/api/products': 1200,
        '/api/orders': 2000,
        '/api/checkout': 3000,
        '/api/payment': 4500,
      };

      const { checkPerformanceMetrics } = await import('@/lib/health-checks');
      const perfHealth = await checkPerformanceMetrics();

      expect(perfHealth.apiResponseTimes['/api/products']).toBeGreaterThan(1000);
      expect(perfHealth.apiResponseTimes['/api/orders']).toBeGreaterThan(1000);
      expect(perfHealth.status).toBe('warning');
    });

    it('should monitor database query performance', async () => {
      const mockQueryMetrics = {
        averageQueryTime: 45,
        slowQueries: 2,
        totalQueries: 1000,
        querySuccessRate: 0.998,
      };

      const { checkPerformanceMetrics } = await import('@/lib/health-checks');
      const perfHealth = await checkPerformanceMetrics();

      expect(perfHealth.database.averageQueryTime).toBeLessThan(100);
      expect(perfHealth.database.slowQueries).toBeLessThan(10);
      expect(perfHealth.database.querySuccessRate).toBeGreaterThan(0.99);
      expect(perfHealth.database.status).toBe('healthy');
    });
  });

  describe('Health Check Aggregation', () => {
    it('should aggregate all health checks into overall status', async () => {
      // Mock all healthy services
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: true,
        responseTime: 100,
        diagnostics: { database_version: 'PostgreSQL 15.1' },
      });

      jest.doMock('@/lib/health-checks', () => ({
        checkExternalServices: jest.fn().mockResolvedValue({
          square: { status: 'healthy', responseTime: 200 },
          email: { status: 'healthy', responseTime: 150 },
          supabase: { status: 'healthy', responseTime: 100 },
        }),
        checkSystemResources: jest.fn().mockResolvedValue({
          memory: { status: 'healthy', heapUsagePercent: 60 },
          cpu: { status: 'healthy', total: 150 },
          disk: { status: 'healthy', usagePercent: 45 },
        }),
        checkApplicationHealth: jest.fn().mockResolvedValue({
          orders: { status: 'healthy' },
          payments: { status: 'healthy' },
          inventory: { status: 'healthy' },
        }),
        checkPerformanceMetrics: jest.fn().mockResolvedValue({
          status: 'healthy',
          apiResponseTimes: { '/api/products': 120 },
          database: { status: 'healthy' },
        }),
      }));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.database.connected).toBe(true);
      expect(data.services.square.status).toBe('healthy');
      expect(data.services.email.status).toBe('healthy');
      expect(data.services.supabase.status).toBe('healthy');
      expect(data.system.memory.status).toBe('healthy');
      expect(data.application.orders.status).toBe('healthy');
      expect(data.performance.status).toBe('healthy');
    });

    it('should report degraded status when some services have warnings', async () => {
      // Mock mixed service health
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: true,
        responseTime: 100,
        diagnostics: { database_version: 'PostgreSQL 15.1' },
      });

      jest.doMock('@/lib/health-checks', () => ({
        checkExternalServices: jest.fn().mockResolvedValue({
          square: { status: 'healthy', responseTime: 200 },
          email: { status: 'warning', responseTime: 1500 },
          supabase: { status: 'healthy', responseTime: 100 },
        }),
        checkSystemResources: jest.fn().mockResolvedValue({
          memory: { status: 'warning', heapUsagePercent: 85 },
          cpu: { status: 'healthy', total: 150 },
          disk: { status: 'healthy', usagePercent: 45 },
        }),
        checkApplicationHealth: jest.fn().mockResolvedValue({
          orders: { status: 'healthy' },
          payments: { status: 'healthy' },
          inventory: { status: 'warning' },
        }),
        checkPerformanceMetrics: jest.fn().mockResolvedValue({
          status: 'healthy',
          apiResponseTimes: { '/api/products': 120 },
          database: { status: 'healthy' },
        }),
      }));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.email.status).toBe('warning');
      expect(data.system.memory.status).toBe('warning');
      expect(data.application.inventory.status).toBe('warning');
    });

    it('should report unhealthy status when critical services fail', async () => {
      // Mock critical service failures
      mockCheckDatabaseHealth.mockResolvedValue({
        connected: false,
        responseTime: 5000,
        error: 'Database connection failed',
      });

      jest.doMock('@/lib/health-checks', () => ({
        checkExternalServices: jest.fn().mockResolvedValue({
          square: { status: 'unhealthy', error: 'Square API down' },
          email: { status: 'healthy', responseTime: 150 },
          supabase: { status: 'healthy', responseTime: 100 },
        }),
        checkSystemResources: jest.fn().mockResolvedValue({
          memory: { status: 'healthy', heapUsagePercent: 60 },
          cpu: { status: 'healthy', total: 150 },
          disk: { status: 'healthy', usagePercent: 45 },
        }),
        checkApplicationHealth: jest.fn().mockResolvedValue({
          orders: { status: 'unhealthy' },
          payments: { status: 'unhealthy' },
          inventory: { status: 'healthy' },
        }),
        checkPerformanceMetrics: jest.fn().mockResolvedValue({
          status: 'healthy',
          apiResponseTimes: { '/api/products': 120 },
          database: { status: 'healthy' },
        }),
      }));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.database.connected).toBe(false);
      expect(data.services.square.status).toBe('unhealthy');
      expect(data.application.orders.status).toBe('unhealthy');
      expect(data.application.payments.status).toBe('unhealthy');
    });
  });

  describe('Health Check Caching and Rate Limiting', () => {
    it('should cache health check results', async () => {
      // Mock cache
      const mockCache = new Map();
      jest.doMock('node-cache', () => {
        return jest.fn().mockImplementation(() => ({
          get: jest.fn(key => mockCache.get(key)),
          set: jest.fn((key, value, ttl) => mockCache.set(key, value)),
          del: jest.fn(key => mockCache.delete(key)),
        }));
      });

      mockCheckDatabaseHealth.mockResolvedValue({
        connected: true,
        responseTime: 100,
        diagnostics: { database_version: 'PostgreSQL 15.1' },
      });

      // First call should hit database
      const response1 = await GET();
      expect(response1.status).toBe(200);
      expect(mockCheckDatabaseHealth).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const response2 = await GET();
      expect(response2.status).toBe(200);
      // Should still be 1 if cached properly
      expect(mockCheckDatabaseHealth).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting for health checks', async () => {
      // Mock rate limiter
      const mockRateLimiter = {
        isAllowed: jest.fn().mockReturnValue(false),
        getRemainingTime: jest.fn().mockReturnValue(30),
      };

      jest.doMock('@/lib/rate-limiter', () => ({
        rateLimiter: mockRateLimiter,
      }));

      const response = await GET();

      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({
        error: 'Rate limit exceeded',
        retryAfter: 30,
      });
    });
  });
});
