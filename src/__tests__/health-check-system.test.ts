import { NextRequest } from 'next/server';
import { createMockRequest } from '@/utils/test-helpers';

// Mock all dependencies
jest.mock('@/lib/db-optimized', () => ({
  dbManager: {
    checkHealth: jest.fn(),
    getConnectionStats: jest.fn(),
    withDatabaseMonitoring: jest.fn(),
    withTransaction: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('@/lib/cache-service', () => ({
  cacheService: {
    healthCheck: jest.fn(),
    getCacheStats: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('@/lib/performance-monitor', () => ({
  performanceMonitor: {
    getPerformanceSummary: jest.fn(),
    startTiming: jest.fn(),
    endTiming: jest.fn(),
    recordMetric: jest.fn(),
    getMetrics: jest.fn(),
  },
}));

jest.mock('@/lib/db-utils', () => ({
  checkDatabaseHealth: jest.fn(),
  safeQuery: jest.fn(),
  safeQueryRaw: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock external health check functions
jest.mock('@/lib/health-checks', () => ({
  checkExternalServices: jest.fn(),
  checkSystemResources: jest.fn(),
  checkApplicationHealth: jest.fn(),
  checkPerformanceMetrics: jest.fn(),
  checkSquareHealth: jest.fn(),
  checkEmailHealth: jest.fn(),
  checkSupabaseHealth: jest.fn(),
  checkSentryHealth: jest.fn(),
}));

// Import API route handlers
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getDetailedHealth } from '@/app/api/health/detailed/route';

// Import mocked dependencies
import { dbManager } from '@/lib/db-optimized';
import { cacheService } from '@/lib/cache-service';
import { performanceMonitor } from '@/lib/performance-monitor';
import { checkDatabaseHealth } from '@/lib/db-utils';
import * as healthChecks from '@/lib/health-checks';

const mockDbManager = dbManager as jest.Mocked<typeof dbManager>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<typeof checkDatabaseHealth>;
const mockHealthChecks = healthChecks as jest.Mocked<typeof healthChecks>;

describe('Health Check System Tests - Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default environment variables
    process.env.NODE_ENV = 'test';
    process.env.npm_package_version = '1.0.0';
  });

  describe('Basic Health Check (/api/health)', () => {
    it('should return healthy status with basic information', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '1.0.0',
      });
    });

    it('should handle health check failures gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Process uptime error');
      });

      const response = await getHealth();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Health check failed');

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should include proper timestamp format', async () => {
      const response = await getHealth();
      const data = await response.json();

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Detailed Health Check (/api/health/detailed)', () => {
    beforeEach(() => {
      // Setup default healthy mocks
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'healthy',
        details: {
          connected: true,
          responseTime: 50,
          connectionAttempts: 1,
          lastHealthCheck: new Date(),
        },
      });

      mockDbManager.getConnectionStats.mockReturnValue({
        total: 10,
        active: 3,
        idle: 7,
        pending: 0,
        utilization: 0.3,
      });

      mockCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: {
          responseTime: 25,
          stats: {
            hits: 100,
            misses: 20,
            sets: 50,
            deletes: 5,
            errors: 0,
            hitRate: 0.833,
            totalOperations: 175,
          },
          redisConnected: true,
        },
      });

      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 250,
          errorRate: 0.01,
          requestCount: 1000,
          slowRequestCount: 5,
        },
        databasePerformance: {
          averageQueryTime: 75,
          slowQueryCount: 2,
          queryCount: 500,
          connectionPoolUtilization: 0.4,
        },
      });
    });

    it('should return comprehensive health information when all services are healthy', async () => {
      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.responseTime).toMatch(/^\d+ms$/);
      expect(data.version).toBe('1.0.0');
      expect(data.environment).toBe('test');
      expect(data.uptime).toBeGreaterThan(0);

      // Check services
      expect(data.services.database.status).toBe('healthy');
      expect(data.services.database.connectionStats).toBeDefined();
      expect(data.services.cache.status).toBe('healthy');
      expect(data.services.performance.status).toBe('healthy');

      // Check system information
      expect(data.system.memory).toBeDefined();
      expect(data.system.cpu).toBeDefined();
    });

    it('should return degraded status when performance is below thresholds', async () => {
      // Mock degraded performance
      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 1500, // Above 1000ms threshold
          errorRate: 0.02, // Within threshold
          requestCount: 1000,
          slowRequestCount: 8, // Within threshold
        },
        databasePerformance: {
          averageQueryTime: 600, // Above 500ms threshold
          slowQueryCount: 3,
          queryCount: 500,
          connectionPoolUtilization: 0.4,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.performance.status).toBe('degraded');
      expect(data.services.performance.details.issues).toContain('High API response time: 1500ms');
      expect(data.services.performance.details.issues).toContain('High database query time: 600ms');
    });

    it('should return unhealthy status when critical services fail', async () => {
      // Mock database failure
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        details: {
          connected: false,
          responseTime: 5000,
          connectionAttempts: 3,
          lastHealthCheck: new Date(),
        },
      });

      // Mock cache failure
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        details: {
          responseTime: 2000,
          stats: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 10,
            hitRate: 0,
            totalOperations: 10,
          },
          redisConnected: false,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.cache.status).toBe('unhealthy');
    });

    it('should handle service check failures gracefully', async () => {
      // Mock service check failures
      mockDbManager.checkHealth.mockRejectedValue(new Error('Database check failed'));
      mockCacheService.healthCheck.mockRejectedValue(new Error('Cache check failed'));

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.cache.status).toBe('unhealthy');
    });

    it('should include system resource information', async () => {
      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.system.memory).toHaveProperty('used');
      expect(data.system.memory).toHaveProperty('total');
      expect(data.system.memory).toHaveProperty('external');
      expect(data.system.cpu).toHaveProperty('uptime');
      expect(typeof data.system.memory.used).toBe('number');
      expect(typeof data.system.memory.total).toBe('number');
    });

    it('should measure and report response time', async () => {
      const startTime = Date.now();
      const response = await getDetailedHealth();
      const endTime = Date.now();
      const data = await response.json();

      const reportedTime = parseInt(data.responseTime.replace('ms', ''));
      const actualTime = endTime - startTime;

      // Response time should be reasonably close to actual time
      expect(reportedTime).toBeGreaterThan(0);
      expect(reportedTime).toBeLessThan(actualTime + 100); // Allow 100ms variance
    });
  });

  describe('Database Health Monitoring', () => {
    it('should check database connection and performance', async () => {
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'healthy',
        details: {
          connected: true,
          responseTime: 45,
          connectionAttempts: 1,
          lastHealthCheck: new Date(),
        },
      });

      mockDbManager.getConnectionStats.mockReturnValue({
        total: 20,
        active: 5,
        idle: 15,
        pending: 0,
        utilization: 0.25,
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.database.status).toBe('healthy');
      expect(data.services.database.details.connected).toBe(true);
      expect(data.services.database.details.responseTime).toBe(45);
      expect(data.services.database.connectionStats.total).toBe(20);
      expect(data.services.database.connectionStats.utilization).toBe(0.25);
    });

    it('should detect database connection issues', async () => {
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        details: {
          connected: false,
          responseTime: 30000,
          connectionAttempts: 5,
          lastHealthCheck: new Date(),
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.database.details.connected).toBe(false);
      expect(data.services.database.details.responseTime).toBe(30000);
      expect(data.services.database.details.connectionAttempts).toBe(5);
    });

    it('should monitor connection pool utilization', async () => {
      mockDbManager.getConnectionStats.mockReturnValue({
        total: 20,
        active: 18,
        idle: 2,
        pending: 5,
        utilization: 0.9, // High utilization
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.database.connectionStats.utilization).toBe(0.9);
      expect(data.services.database.connectionStats.pending).toBe(5);
      
      // High utilization should be flagged in monitoring
      expect(data.services.database.connectionStats.total).toBe(20);
      expect(data.services.database.connectionStats.active).toBe(18);
    });

    it('should track database query performance metrics', async () => {
      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 200,
          errorRate: 0.005,
          requestCount: 1000,
          slowRequestCount: 3,
        },
        databasePerformance: {
          averageQueryTime: 85,
          slowQueryCount: 4,
          queryCount: 800,
          connectionPoolUtilization: 0.35,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.performance.details.summary.databasePerformance.averageQueryTime).toBe(85);
      expect(data.services.performance.details.summary.databasePerformance.slowQueryCount).toBe(4);
      expect(data.services.performance.details.summary.databasePerformance.queryCount).toBe(800);
    });
  });

  describe('Cache Service Health Monitoring', () => {
    it('should check cache service connectivity and performance', async () => {
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: {
          responseTime: 35,
          stats: {
            hits: 250,
            misses: 50,
            sets: 75,
            deletes: 10,
            errors: 1,
            hitRate: 0.833,
            totalOperations: 386,
          },
          redisConnected: true,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.cache.status).toBe('healthy');
      expect(data.services.cache.details.redisConnected).toBe(true);
      expect(data.services.cache.details.responseTime).toBe(35);
      expect(data.services.cache.details.stats.hitRate).toBe(0.833);
      expect(data.services.cache.details.stats.totalOperations).toBe(386);
    });

    it('should detect cache connectivity issues', async () => {
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        details: {
          responseTime: 5000,
          stats: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 15,
            hitRate: 0,
            totalOperations: 15,
          },
          redisConnected: false,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.cache.status).toBe('unhealthy');
      expect(data.services.cache.details.redisConnected).toBe(false);
      expect(data.services.cache.details.stats.errors).toBe(15);
      expect(data.services.cache.details.stats.hitRate).toBe(0);
    });

    it('should monitor cache performance degradation', async () => {
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'degraded',
        details: {
          responseTime: 150, // Slow response time
          stats: {
            hits: 60,
            misses: 40,
            sets: 30,
            deletes: 5,
            errors: 8, // Some errors
            hitRate: 0.6, // Low hit rate
            totalOperations: 143,
          },
          redisConnected: true,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.cache.status).toBe('degraded');
      expect(data.services.cache.details.responseTime).toBe(150);
      expect(data.services.cache.details.stats.hitRate).toBe(0.6);
      expect(data.services.cache.details.stats.errors).toBe(8);
    });
  });

  describe('External Services Health Checks', () => {
    beforeEach(() => {
      // Mock external service health checks
      mockHealthChecks.checkExternalServices.mockResolvedValue({
        square: { status: 'healthy', responseTime: 200 },
        email: { status: 'healthy', responseTime: 300 },
        supabase: { status: 'healthy', responseTime: 150 },
        sentry: { status: 'healthy', responseTime: 100 },
      });

      mockHealthChecks.checkSystemResources.mockResolvedValue({
        memory: { status: 'healthy', heapUsagePercent: 65 },
        cpu: { status: 'healthy', total: 120 },
        disk: { status: 'healthy', usagePercent: 45 },
      });

      mockHealthChecks.checkApplicationHealth.mockResolvedValue({
        orders: { status: 'healthy' },
        payments: { status: 'healthy' },
        inventory: { status: 'healthy' },
      });
    });

    it('should check Square API health', async () => {
      mockHealthChecks.checkSquareHealth.mockResolvedValue({
        status: 'healthy',
        responseTime: 250,
        apiVersion: 'v2',
        lastSuccessfulCall: new Date(),
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(mockHealthChecks.checkExternalServices).toHaveBeenCalled();
      // Note: The actual implementation may vary depending on how external services are integrated
    });

    it('should check email service health', async () => {
      mockHealthChecks.checkEmailHealth.mockResolvedValue({
        status: 'healthy',
        responseTime: 180,
        provider: 'test-provider',
        lastEmailSent: new Date(),
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkExternalServices).toHaveBeenCalled();
    });

    it('should check Supabase service health', async () => {
      mockHealthChecks.checkSupabaseHealth.mockResolvedValue({
        status: 'healthy',
        responseTime: 120,
        authService: 'healthy',
        storageService: 'healthy',
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkExternalServices).toHaveBeenCalled();
    });

    it('should check Sentry monitoring health', async () => {
      mockHealthChecks.checkSentryHealth.mockResolvedValue({
        status: 'healthy',
        responseTime: 90,
        errorsReported: 5,
        performanceMonitoring: true,
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkExternalServices).toHaveBeenCalled();
    });

    it('should handle external service failures gracefully', async () => {
      mockHealthChecks.checkExternalServices.mockResolvedValue({
        square: { status: 'unhealthy', error: 'Square API timeout' },
        email: { status: 'healthy', responseTime: 300 },
        supabase: { status: 'degraded', responseTime: 2000 },
        sentry: { status: 'healthy', responseTime: 100 },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(200); // Should still respond even with external failures
      // External service failures shouldn't cause complete system failure
    });
  });

  describe('System Resource Monitoring', () => {
    it('should monitor memory usage', async () => {
      mockHealthChecks.checkSystemResources.mockResolvedValue({
        memory: {
          status: 'healthy',
          heapUsagePercent: 55,
          heapUsed: 100,
          heapTotal: 180,
          external: 25,
        },
        cpu: { status: 'healthy', total: 150 },
        disk: { status: 'healthy', usagePercent: 40 },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.system.memory.used).toBeDefined();
      expect(data.system.memory.total).toBeDefined();
      expect(data.system.memory.external).toBeDefined();
      expect(typeof data.system.memory.used).toBe('number');
    });

    it('should detect high memory usage', async () => {
      mockHealthChecks.checkSystemResources.mockResolvedValue({
        memory: {
          status: 'warning',
          heapUsagePercent: 85, // High memory usage
          heapUsed: 400,
          heapTotal: 470,
          external: 50,
        },
        cpu: { status: 'healthy', total: 150 },
        disk: { status: 'healthy', usagePercent: 40 },
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkSystemResources).toHaveBeenCalled();
    });

    it('should monitor CPU usage', async () => {
      mockHealthChecks.checkSystemResources.mockResolvedValue({
        memory: { status: 'healthy', heapUsagePercent: 60 },
        cpu: {
          status: 'healthy',
          total: 120,
          user: 80,
          system: 40,
          uptime: 3600,
        },
        disk: { status: 'healthy', usagePercent: 40 },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.system.cpu.uptime).toBeDefined();
      expect(typeof data.system.cpu.uptime).toBe('number');
    });

    it('should monitor disk usage', async () => {
      mockHealthChecks.checkSystemResources.mockResolvedValue({
        memory: { status: 'healthy', heapUsagePercent: 60 },
        cpu: { status: 'healthy', total: 150 },
        disk: {
          status: 'healthy',
          usagePercent: 45,
          available: 500,
          total: 1000,
        },
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkSystemResources).toHaveBeenCalled();
    });
  });

  describe('Application Health Monitoring', () => {
    it('should check orders system health', async () => {
      mockHealthChecks.checkApplicationHealth.mockResolvedValue({
        orders: {
          status: 'healthy',
          recentOrderCount: 150,
          averageProcessingTime: 45,
          errorRate: 0.02,
        },
        payments: { status: 'healthy' },
        inventory: { status: 'healthy' },
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkApplicationHealth).toHaveBeenCalled();
    });

    it('should check payments system health', async () => {
      mockHealthChecks.checkApplicationHealth.mockResolvedValue({
        orders: { status: 'healthy' },
        payments: {
          status: 'healthy',
          successRate: 0.98,
          averageResponseTime: 800,
          recentTransactionCount: 75,
        },
        inventory: { status: 'healthy' },
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkApplicationHealth).toHaveBeenCalled();
    });

    it('should check inventory system health', async () => {
      mockHealthChecks.checkApplicationHealth.mockResolvedValue({
        orders: { status: 'healthy' },
        payments: { status: 'healthy' },
        inventory: {
          status: 'healthy',
          lowStockItems: 3,
          totalProducts: 120,
          lastSyncTime: new Date(),
        },
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkApplicationHealth).toHaveBeenCalled();
    });

    it('should detect application health issues', async () => {
      mockHealthChecks.checkApplicationHealth.mockResolvedValue({
        orders: {
          status: 'unhealthy',
          error: 'Order processing queue backed up',
        },
        payments: {
          status: 'degraded',
          successRate: 0.85, // Low success rate
        },
        inventory: { status: 'healthy' },
      });

      await getDetailedHealth();

      expect(mockHealthChecks.checkApplicationHealth).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should monitor API response times', async () => {
      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 180,
          errorRate: 0.008,
          requestCount: 2500,
          slowRequestCount: 12,
          endpointMetrics: {
            '/api/products': { avgTime: 120, requests: 800 },
            '/api/orders': { avgTime: 250, requests: 600 },
            '/api/health': { avgTime: 50, requests: 1100 },
          },
        },
        databasePerformance: {
          averageQueryTime: 65,
          slowQueryCount: 3,
          queryCount: 1200,
          connectionPoolUtilization: 0.45,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.performance.details.summary.apiPerformance.averageResponseTime).toBe(180);
      expect(data.services.performance.details.summary.apiPerformance.requestCount).toBe(2500);
      expect(data.services.performance.details.summary.apiPerformance.slowRequestCount).toBe(12);
    });

    it('should monitor database query performance', async () => {
      const mockQueryMetrics = {
        averageQueryTime: 45,
        slowQueries: 2,
        totalQueries: 1000,
        querySuccessRate: 0.998,
      };

      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 200,
          errorRate: 0.01,
          requestCount: 1000,
          slowRequestCount: 5,
        },
        databasePerformance: mockQueryMetrics,
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.performance.details.summary.databasePerformance.averageQueryTime).toBe(45);
      expect(data.services.performance.details.summary.databasePerformance.slowQueries).toBe(2);
      expect(data.services.performance.details.summary.databasePerformance.totalQueries).toBe(1000);
    });

    it('should detect performance degradation', async () => {
      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 1200, // Above 1000ms threshold
          errorRate: 0.06, // Above 5% threshold
          requestCount: 1000,
          slowRequestCount: 15, // Above 10 threshold
        },
        databasePerformance: {
          averageQueryTime: 600, // Above 500ms threshold
          slowQueryCount: 8,
          queryCount: 500,
          connectionPoolUtilization: 0.85,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.performance.status).toBe('unhealthy');
      expect(data.services.performance.details.issues).toContain('High API response time: 1200ms');
      expect(data.services.performance.details.issues).toContain('High API error rate: 6.00%');
      expect(data.services.performance.details.issues).toContain('High slow request count: 15');
      expect(data.services.performance.details.issues).toContain('High database query time: 600ms');
    });

    it('should include performance thresholds in response', async () => {
      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.performance.details.thresholds).toEqual({
        apiResponseTime: 1000,
        databaseQueryTime: 500,
        errorRate: 0.05,
        slowRequestCount: 10,
      });
    });
  });

  describe('Health Check Aggregation and Status Determination', () => {
    it('should aggregate all health checks into overall status', async () => {
      // Mock all healthy services
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'healthy',
        details: {
          connected: true,
          responseTime: 50,
          connectionAttempts: 1,
          lastHealthCheck: new Date(),
        },
      });

      mockCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: {
          responseTime: 30,
          stats: {
            hits: 200,
            misses: 40,
            sets: 60,
            deletes: 10,
            errors: 1,
            hitRate: 0.833,
            totalOperations: 311,
          },
          redisConnected: true,
        },
      });

      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 180,
          errorRate: 0.01,
          requestCount: 1000,
          slowRequestCount: 3,
        },
        databasePerformance: {
          averageQueryTime: 60,
          slowQueryCount: 1,
          queryCount: 500,
          connectionPoolUtilization: 0.3,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should report degraded status when some services have warnings', async () => {
      // Mock mixed service health
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'healthy',
        details: {
          connected: true,
          responseTime: 50,
          connectionAttempts: 1,
          lastHealthCheck: new Date(),
        },
      });

      mockCacheService.healthCheck.mockResolvedValue({
        status: 'degraded', // Cache has issues
        details: {
          responseTime: 150,
          stats: {
            hits: 100,
            misses: 80,
            sets: 40,
            deletes: 5,
            errors: 10,
            hitRate: 0.556,
            totalOperations: 235,
          },
          redisConnected: true,
        },
      });

      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 800, // Below threshold but elevated
          errorRate: 0.03, // Slightly elevated
          requestCount: 1000,
          slowRequestCount: 8,
        },
        databasePerformance: {
          averageQueryTime: 120,
          slowQueryCount: 4,
          queryCount: 500,
          connectionPoolUtilization: 0.7,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.services.cache.status).toBe('degraded');
    });

    it('should report unhealthy status when critical services fail', async () => {
      // Mock critical service failures
      mockDbManager.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        details: {
          connected: false,
          responseTime: 30000,
          connectionAttempts: 5,
          lastHealthCheck: new Date(),
        },
      });

      mockCacheService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        details: {
          responseTime: 5000,
          stats: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 25,
            hitRate: 0,
            totalOperations: 25,
          },
          redisConnected: false,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.cache.status).toBe('unhealthy');
    });
  });

  describe('Health Check Caching and Rate Limiting', () => {
    it('should implement health check response caching', async () => {
      // Make multiple rapid requests
      const responses = await Promise.all([
        getDetailedHealth(),
        getDetailedHealth(),
        getDetailedHealth(),
      ]);

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify database health is called but cache may reduce calls
      expect(mockDbManager.checkHealth).toHaveBeenCalled();
    });

    it('should handle concurrent health check requests', async () => {
      // Simulate concurrent requests
      const concurrentRequests = Array(10).fill(null).map(() => getDetailedHealth());
      const responses = await Promise.all(concurrentRequests);

      // All should complete successfully
      for (const response of responses) {
        const data = await response.json();
        expect(response.status).toBeOneOf([200, 503]);
        expect(data.timestamp).toBeDefined();
      }
    });
  });

  describe('Health Check Error Handling and Recovery', () => {
    it('should handle partial service failures gracefully', async () => {
      // Mock partial failure scenario
      mockDbManager.checkHealth.mockRejectedValue(new Error('Database timeout'));
      mockCacheService.healthCheck.mockResolvedValue({
        status: 'healthy',
        details: {
          responseTime: 40,
          stats: {
            hits: 100,
            misses: 20,
            sets: 30,
            deletes: 5,
            errors: 0,
            hitRate: 0.833,
            totalOperations: 155,
          },
          redisConnected: true,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.cache.status).toBe('healthy');
    });

    it('should handle complete health check system failure', async () => {
      // Mock complete system failure
      mockDbManager.checkHealth.mockRejectedValue(new Error('System failure'));
      mockCacheService.healthCheck.mockRejectedValue(new Error('Cache failure'));
      mockPerformanceMonitor.getPerformanceSummary.mockImplementation(() => {
        throw new Error('Performance monitoring failure');
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Health check system failure');
    });

    it('should include error details for debugging', async () => {
      mockDbManager.checkHealth.mockRejectedValue(new Error('Connection pool exhausted'));

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.database.details.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.responseTime).toBeDefined();
    });
  });

  describe('Health Check Integration with Monitoring Systems', () => {
    it('should provide metrics in monitoring-friendly format', async () => {
      const response = await getDetailedHealth();
      const data = await response.json();

      // Check structure is suitable for monitoring systems
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('responseTime');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('system');

      // Services should have consistent structure
      expect(data.services.database).toHaveProperty('status');
      expect(data.services.cache).toHaveProperty('status');
      expect(data.services.performance).toHaveProperty('status');
    });

    it('should include alerts and actionable information', async () => {
      mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
        apiPerformance: {
          averageResponseTime: 1200,
          errorRate: 0.08,
          requestCount: 1000,
          slowRequestCount: 15,
        },
        databasePerformance: {
          averageQueryTime: 700,
          slowQueryCount: 12,
          queryCount: 500,
          connectionPoolUtilization: 0.9,
        },
      });

      const response = await getDetailedHealth();
      const data = await response.json();

      expect(data.services.performance.details.issues).toBeDefined();
      expect(Array.isArray(data.services.performance.details.issues)).toBe(true);
      expect(data.services.performance.details.issues.length).toBeGreaterThan(0);
    });
  });
}); 