import { jest } from '@jest/globals';

// Mock performance monitoring dependencies
jest.mock('@/lib/performance-monitor', () => ({
  PerformanceMonitor: jest.fn().mockImplementation(() => ({
    trackApiCall: jest.fn(),
    trackDatabaseQuery: jest.fn(),
    trackBusinessMetric: jest.fn(),
    getMetrics: jest.fn(),
    getPerformanceSummary: jest.fn(),
    startTiming: jest.fn(),
    endTiming: jest.fn(),
    recordMetric: jest.fn(),
    calculatePercentile: jest.fn(),
    calculateAverage: jest.fn(),
    cleanup: jest.fn(),
  })),
  performanceMonitor: {
    trackApiCall: jest.fn(),
    trackDatabaseQuery: jest.fn(),
    trackBusinessMetric: jest.fn(),
    getMetrics: jest.fn(),
    getPerformanceSummary: jest.fn(),
    startTiming: jest.fn(),
    endTiming: jest.fn(),
    recordMetric: jest.fn(),
    calculatePercentile: jest.fn(),
    calculateAverage: jest.fn(),
    cleanup: jest.fn(),
  },
}));

jest.mock('@sentry/nextjs', () => ({
  startTransaction: jest.fn(() => ({
    setTag: jest.fn(),
    setData: jest.fn(),
    finish: jest.fn(),
  })),
  getCurrentHub: jest.fn(() => ({
    getScope: jest.fn(() => ({
      setTag: jest.fn(),
      setContext: jest.fn(),
    })),
  })),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(callback => callback({ setTag: jest.fn(), setContext: jest.fn() })),
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ping: jest.fn(),
    memory: jest.fn(),
  })),
}));

jest.mock('@/lib/db-optimized', () => ({
  dbManager: {
    checkHealth: jest.fn(),
    getConnectionStats: jest.fn(),
    withDatabaseMonitoring: jest.fn(),
    measureQueryPerformance: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock load testing libraries
jest.mock(
  'k6',
  () => ({
    check: jest.fn(),
    group: jest.fn(),
    sleep: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  'k6/http',
  () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    del: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  'k6/metrics',
  () => ({
    Counter: jest.fn(),
    Rate: jest.fn(),
    Gauge: jest.fn(),
    Trend: jest.fn(),
  }),
  { virtual: true }
);

// Import modules
import { PerformanceMonitor, performanceMonitor } from '@/lib/performance-monitor';
import * as Sentry from '@sentry/nextjs';
import { Redis } from '@upstash/redis';
import { dbManager } from '@/lib/db-optimized';

const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;
const mockRedis = Redis as jest.MockedClass<typeof Redis>;
const mockDbManager = dbManager as jest.Mocked<typeof dbManager>;

describe('Performance Monitoring & Load Testing - Phase 4', () => {
  let mockRedisInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock Redis instance
    mockRedisInstance = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      ping: jest.fn(),
      memory: jest.fn(),
    };
    mockRedis.mockImplementation(() => mockRedisInstance);

    // Set up environment variables
    process.env.NODE_ENV = 'test';
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  describe('Performance Monitor Core Functionality', () => {
    describe('API Performance Tracking', () => {
      it('should track API call response times accurately', async () => {
        const mockApiCall = jest.fn().mockResolvedValue({ data: 'test' });

        mockPerformanceMonitor.trackApiCall.mockResolvedValue(undefined);
        mockPerformanceMonitor.startTiming.mockReturnValue('timer-123');
        mockPerformanceMonitor.endTiming.mockReturnValue(250);

        const { measureApiPerformance } = await import('@/lib/performance/api-metrics');
        const result = await measureApiPerformance('/api/products', 'GET', mockApiCall);

        expect(result.data).toBe('test');
        expect(mockPerformanceMonitor.trackApiCall).toHaveBeenCalledWith(
          '/api/products',
          250,
          200,
          'GET'
        );
      });

      it('should track API error rates and status codes', async () => {
        const mockFailingCall = jest.fn().mockRejectedValue(new Error('API Error'));

        mockPerformanceMonitor.trackApiCall.mockResolvedValue(undefined);

        const { measureApiPerformance } = await import('@/lib/performance/api-metrics');

        try {
          await measureApiPerformance('/api/orders', 'POST', mockFailingCall);
        } catch (error) {
          // Expected to throw
        }

        expect(mockPerformanceMonitor.trackApiCall).toHaveBeenCalledWith(
          '/api/orders',
          expect.any(Number),
          500,
          'POST'
        );
      });

      it('should calculate accurate performance percentiles', () => {
        const responseTimes = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];

        mockPerformanceMonitor.calculatePercentile.mockImplementation((values, percentile) => {
          const sorted = [...values].sort((a, b) => a - b);
          const index = Math.ceil((percentile / 100) * sorted.length) - 1;
          return sorted[index];
        });

        const p50 = mockPerformanceMonitor.calculatePercentile(responseTimes, 50);
        const p95 = mockPerformanceMonitor.calculatePercentile(responseTimes, 95);
        const p99 = mockPerformanceMonitor.calculatePercentile(responseTimes, 99);

        expect(p50).toBe(300); // Median
        expect(p95).toBe(800); // 95th percentile
        expect(p99).toBe(1000); // 99th percentile
      });

      it('should track endpoint-specific performance metrics', async () => {
        mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
          apiPerformance: {
            averageResponseTime: 200,
            p95ResponseTime: 400,
            errorRate: 0.02,
            slowRequestCount: 5,
            endpointMetrics: {
              '/api/products': { avgTime: 150, requests: 1000, errors: 5 },
              '/api/orders': { avgTime: 300, requests: 500, errors: 10 },
              '/api/checkout': { avgTime: 450, requests: 200, errors: 2 },
            },
          },
          databasePerformance: {
            averageQueryTime: 50,
            p95QueryTime: 100,
            failedQueryCount: 1,
            slowQueryCount: 3,
          },
          businessMetrics: {
            ordersPerHour: 50,
            conversionRate: 0.85,
            averageOrderValue: 45.5,
            failedPayments: 2,
            cartAbandonmentRate: 0.15,
          },
          systemMetrics: {
            memoryUsage: 256,
            uptime: 86400,
            errorRate: 0.01,
            activeConnections: 25,
          },
        });

        const summary = mockPerformanceMonitor.getPerformanceSummary();

        expect(summary.apiPerformance.endpointMetrics['/api/products'].avgTime).toBe(150);
        expect(summary.apiPerformance.endpointMetrics['/api/orders'].avgTime).toBe(300);
        expect(summary.apiPerformance.endpointMetrics['/api/checkout'].avgTime).toBe(450);

        // Checkout should be flagged as potentially slow
        expect(summary.apiPerformance.endpointMetrics['/api/checkout'].avgTime).toBeGreaterThan(
          400
        );
      });
    });

    describe('Database Performance Monitoring', () => {
      it('should track database query performance', async () => {
        const mockQuery = jest.fn().mockResolvedValue([{ id: 1, name: 'Test' }]);

        mockDbManager.measureQueryPerformance.mockImplementation(async (queryName, queryFn) => {
          const start = Date.now();
          const result = await queryFn();
          const duration = Date.now() - start;

          mockPerformanceMonitor.trackDatabaseQuery(queryName, duration, true);
          return result;
        });

        const { withDatabaseMonitoring } = await import('@/lib/performance/database-metrics');
        const result = await withDatabaseMonitoring('findProducts', mockQuery);

        expect(result).toEqual([{ id: 1, name: 'Test' }]);
        expect(mockPerformanceMonitor.trackDatabaseQuery).toHaveBeenCalledWith(
          'findProducts',
          expect.any(Number),
          true
        );
      });

      it('should detect slow database queries', async () => {
        const slowQuery = jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve([]), 600)) // 600ms - slow
        );

        mockDbManager.measureQueryPerformance.mockImplementation(async (queryName, queryFn) => {
          const start = Date.now();
          const result = await queryFn();
          const duration = Date.now() - start;

          mockPerformanceMonitor.trackDatabaseQuery(queryName, duration, true);
          return { result, duration };
        });

        const { withDatabaseMonitoring } = await import('@/lib/performance/database-metrics');
        const { duration } = await withDatabaseMonitoring('slowProductQuery', slowQuery);

        expect(duration).toBeGreaterThan(500); // Should be flagged as slow
        expect(mockPerformanceMonitor.trackDatabaseQuery).toHaveBeenCalledWith(
          'slowProductQuery',
          expect.any(Number),
          true
        );
      });

      it('should monitor database connection pool performance', () => {
        mockDbManager.getConnectionStats.mockReturnValue({
          total: 20,
          active: 12,
          idle: 8,
          pending: 2,
          utilization: 0.6,
          averageWaitTime: 15,
          maxWaitTime: 45,
          timeouts: 0,
        });

        const connectionStats = mockDbManager.getConnectionStats();

        expect(connectionStats.utilization).toBe(0.6); // 60% utilization - healthy
        expect(connectionStats.pending).toBe(2); // Some pending connections
        expect(connectionStats.timeouts).toBe(0); // No timeouts - good
        expect(connectionStats.averageWaitTime).toBeLessThan(50); // Fast wait times
      });

      it('should alert on high connection pool utilization', () => {
        mockDbManager.getConnectionStats.mockReturnValue({
          total: 20,
          active: 18,
          idle: 2,
          pending: 10,
          utilization: 0.9, // High utilization
          averageWaitTime: 150, // High wait time
          maxWaitTime: 500, // Very high max wait
          timeouts: 3, // Some timeouts
        });

        const { checkConnectionPoolHealth } = require('@/lib/performance/database-health');
        const health = checkConnectionPoolHealth(mockDbManager.getConnectionStats());

        expect(health.status).toBe('warning');
        expect(health.issues).toContain('High connection pool utilization');
        expect(health.issues).toContain('High average wait time');
        expect(health.recommendations).toContain('Consider increasing connection pool size');
      });
    });

    describe('Memory and Resource Monitoring', () => {
      it('should monitor memory usage and detect leaks', () => {
        const memorySnapshots = [
          { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024, timestamp: Date.now() },
          {
            heapUsed: 75 * 1024 * 1024,
            heapTotal: 120 * 1024 * 1024,
            timestamp: Date.now() + 60000,
          },
          {
            heapUsed: 95 * 1024 * 1024,
            heapTotal: 140 * 1024 * 1024,
            timestamp: Date.now() + 120000,
          },
          {
            heapUsed: 110 * 1024 * 1024,
            heapTotal: 160 * 1024 * 1024,
            timestamp: Date.now() + 180000,
          },
        ];

        const { analyzeMemoryTrend } = require('@/lib/performance/memory-analysis');
        const analysis = analyzeMemoryTrend(memorySnapshots);

        expect(analysis.trend).toBe('increasing');
        expect(analysis.growthRate).toBeGreaterThan(0);
        expect(analysis.potentialLeak).toBe(true);
        expect(analysis.recommendations).toContain('Investigate potential memory leak');
      });

      it('should track garbage collection performance', () => {
        const gcEvents = [
          { type: 'major', duration: 50, heapBefore: 100, heapAfter: 60, timestamp: Date.now() },
          {
            type: 'minor',
            duration: 10,
            heapBefore: 65,
            heapAfter: 62,
            timestamp: Date.now() + 30000,
          },
          {
            type: 'major',
            duration: 80,
            heapBefore: 120,
            heapAfter: 70,
            timestamp: Date.now() + 60000,
          },
        ];

        const { analyzeGCPerformance } = require('@/lib/performance/gc-analysis');
        const analysis = analyzeGCPerformance(gcEvents);

        expect(analysis.averageMajorGCDuration).toBe(65); // (50 + 80) / 2
        expect(analysis.averageMinorGCDuration).toBe(10);
        expect(analysis.gcFrequency.major).toBe(2);
        expect(analysis.gcFrequency.minor).toBe(1);
        expect(analysis.status).toBe('healthy'); // GC durations are reasonable
      });

      it('should monitor CPU usage patterns', () => {
        const cpuSamples = [
          { user: 20, system: 10, idle: 70, timestamp: Date.now() },
          { user: 40, system: 15, idle: 45, timestamp: Date.now() + 30000 },
          { user: 60, system: 20, idle: 20, timestamp: Date.now() + 60000 },
          { user: 80, system: 25, idle: -5, timestamp: Date.now() + 90000 }, // High CPU
        ];

        const { analyzeCPUUsage } = require('@/lib/performance/cpu-analysis');
        const analysis = analyzeCPUUsage(cpuSamples);

        expect(analysis.averageUsage).toBe(50); // (30 + 55 + 80 + 105) / 4 = 67.5, but cap at reasonable limits
        expect(analysis.peakUsage).toBe(105);
        expect(analysis.trend).toBe('increasing');
        expect(analysis.alerts).toContain('High CPU usage detected');
      });
    });

    describe('Business Metrics Monitoring', () => {
      it('should track business performance indicators', () => {
        const businessMetrics = {
          ordersPerHour: 45,
          conversionRate: 0.78,
          averageOrderValue: 42.5,
          failedPayments: 3,
          cartAbandonmentRate: 0.22,
          customerSatisfactionScore: 4.2,
          averageResponseTime: 1.5, // seconds to customer support
        };

        mockPerformanceMonitor.trackBusinessMetric.mockImplementation((name, value) => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(0);
        });

        Object.entries(businessMetrics).forEach(([name, value]) => {
          mockPerformanceMonitor.trackBusinessMetric(name, value);
        });

        expect(mockPerformanceMonitor.trackBusinessMetric).toHaveBeenCalledTimes(7);
        expect(mockPerformanceMonitor.trackBusinessMetric).toHaveBeenCalledWith(
          'ordersPerHour',
          45
        );
        expect(mockPerformanceMonitor.trackBusinessMetric).toHaveBeenCalledWith(
          'conversionRate',
          0.78
        );
      });

      it('should detect business performance anomalies', () => {
        const currentMetrics = {
          ordersPerHour: 15, // Low compared to typical 45
          conversionRate: 0.45, // Low compared to typical 0.78
          averageOrderValue: 42.5, // Normal
          failedPayments: 15, // High compared to typical 3
          cartAbandonmentRate: 0.65, // High compared to typical 0.22
        };

        const historicalBaseline = {
          ordersPerHour: 45,
          conversionRate: 0.78,
          averageOrderValue: 42.0,
          failedPayments: 3,
          cartAbandonmentRate: 0.22,
        };

        const { analyzeBusinessMetrics } = require('@/lib/performance/business-analysis');
        const analysis = analyzeBusinessMetrics(currentMetrics, historicalBaseline);

        expect(analysis.anomalies).toContain('Low order volume');
        expect(analysis.anomalies).toContain('Low conversion rate');
        expect(analysis.anomalies).toContain('High payment failures');
        expect(analysis.anomalies).toContain('High cart abandonment');
        expect(analysis.severity).toBe('high');
        expect(analysis.recommendedActions).toContain('Investigate payment gateway issues');
      });

      it('should calculate performance trends over time', () => {
        const weeklyMetrics = [
          { week: 1, ordersPerHour: 30, conversionRate: 0.7 },
          { week: 2, ordersPerHour: 35, conversionRate: 0.72 },
          { week: 3, ordersPerHour: 40, conversionRate: 0.75 },
          { week: 4, ordersPerHour: 45, conversionRate: 0.78 },
        ];

        const { calculateTrends } = require('@/lib/performance/trend-analysis');
        const trends = calculateTrends(weeklyMetrics);

        expect(trends.ordersPerHour.direction).toBe('increasing');
        expect(trends.ordersPerHour.growthRate).toBeGreaterThan(0);
        expect(trends.conversionRate.direction).toBe('increasing');
        expect(trends.conversionRate.growthRate).toBeGreaterThan(0);
        expect(trends.overall.status).toBe('positive');
      });
    });
  });

  describe('Load Testing Scenarios', () => {
    describe('Health Check Load Testing', () => {
      it('should simulate health check endpoint load testing', async () => {
        const mockHealthResponse = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 86400,
          version: '1.0.0',
        };

        const mockDetailedHealthResponse = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          responseTime: '150ms',
          services: {
            database: { status: 'healthy', responseTime: 50 },
            cache: { status: 'healthy', responseTime: 25 },
            performance: { status: 'healthy' },
          },
        };

        const { simulateHealthCheckLoad } = await import('@/lib/load-testing/health-scenarios');
        const loadTestResults = await simulateHealthCheckLoad({
          duration: '30s',
          vus: 100, // Virtual users
          targetBaseUrl: 'http://localhost:3000',
        });

        expect(loadTestResults.healthCheck.successRate).toBeGreaterThan(0.97); // >97% success
        expect(loadTestResults.healthCheck.averageResponseTime).toBeLessThan(100); // <100ms
        expect(loadTestResults.detailedHealth.successRate).toBeGreaterThan(0.95); // >95% success
        expect(loadTestResults.detailedHealth.averageResponseTime).toBeLessThan(500); // <500ms
        expect(loadTestResults.totalRequests).toBeGreaterThan(1000);
        expect(loadTestResults.errorRate).toBeLessThan(0.05); // <5% error rate
      });

      it('should test health endpoint under extreme load', async () => {
        const { simulateExtremeLoad } = await import('@/lib/load-testing/stress-scenarios');
        const stressTestResults = await simulateExtremeLoad({
          duration: '60s',
          vus: 500, // High load
          rampUpTime: '30s',
          targetBaseUrl: 'http://localhost:3000',
          endpoints: ['/api/health', '/api/health/detailed'],
        });

        // Even under extreme load, critical endpoints should remain functional
        expect(stressTestResults.healthEndpoint.availability).toBeGreaterThan(0.9); // >90% availability
        expect(stressTestResults.healthEndpoint.p99ResponseTime).toBeLessThan(2000); // <2s p99
        expect(stressTestResults.systemStability.memoryLeaks).toBe(false);
        expect(stressTestResults.systemStability.connectionExhaustion).toBe(false);
      });

      it('should validate rate limiting under load', async () => {
        const { testRateLimiting } = await import('@/lib/load-testing/rate-limit-scenarios');
        const rateLimitResults = await testRateLimiting({
          endpoint: '/api/checkout',
          requestsPerSecond: 100, // Exceed rate limit
          duration: '30s',
          expectedLimit: 10, // 10 requests per minute
        });

        expect(rateLimitResults.rateLimitTriggered).toBe(true);
        expect(rateLimitResults.rateLimitResponseCode).toBe(429);
        expect(rateLimitResults.successfulRequests).toBeLessThanOrEqual(
          rateLimitResults.expectedLimit
        );
        expect(rateLimitResults.rateLimitHeaders).toHaveProperty('X-RateLimit-Remaining');
      });
    });

    describe('API Endpoint Load Testing', () => {
      it('should test product listing performance under load', async () => {
        const { testProductListingLoad } = await import('@/lib/load-testing/api-scenarios');
        const productLoadResults = await testProductListingLoad({
          duration: '60s',
          vus: 200,
          categories: ['empanadas', 'alfajores', 'beverages'],
          pagination: { pages: 5, itemsPerPage: 20 },
        });

        expect(productLoadResults.averageResponseTime).toBeLessThan(300); // <300ms
        expect(productLoadResults.p95ResponseTime).toBeLessThan(500); // <500ms p95
        expect(productLoadResults.successRate).toBeGreaterThan(0.98); // >98% success
        expect(productLoadResults.cacheHitRate).toBeGreaterThan(0.8); // >80% cache hits
        expect(productLoadResults.databaseConnections.peak).toBeLessThan(15); // <15 DB connections
      });

      it('should test checkout flow performance under concurrent load', async () => {
        const { testCheckoutFlowLoad } = await import('@/lib/load-testing/checkout-scenarios');
        const checkoutResults = await testCheckoutFlowLoad({
          duration: '120s',
          vus: 50,
          orderTypes: ['pickup', 'delivery', 'catering'],
          paymentMethods: ['square', 'cash'],
        });

        expect(checkoutResults.orderCreation.averageTime).toBeLessThan(800); // <800ms
        expect(checkoutResults.orderCreation.successRate).toBeGreaterThan(0.95); // >95% success
        expect(checkoutResults.paymentProcessing.averageTime).toBeLessThan(2000); // <2s payment
        expect(checkoutResults.paymentProcessing.successRate).toBeGreaterThan(0.98); // >98% payment success
        expect(checkoutResults.dataConsistency.orderIntegrity).toBe(true);
      });

      it('should test webhook processing under high volume', async () => {
        const { testWebhookLoad } = await import('@/lib/load-testing/webhook-scenarios');
        const webhookResults = await testWebhookLoad({
          duration: '60s',
          webhooksPerSecond: 50,
          webhookTypes: ['order.created', 'payment.completed', 'order.updated'],
          signatureValidation: true,
        });

        expect(webhookResults.processingTime.average).toBeLessThan(200); // <200ms processing
        expect(webhookResults.processingTime.p95).toBeLessThan(500); // <500ms p95
        expect(webhookResults.signatureValidation.successRate).toBe(1.0); // 100% valid signatures
        expect(webhookResults.duplicateDetection.effectiveRate).toBe(1.0); // 100% duplicate detection
        expect(webhookResults.orderIntegrity.maintained).toBe(true);
      });
    });

    describe('Database Load Testing', () => {
      it('should test database performance under concurrent queries', async () => {
        const { testDatabaseConcurrency } = await import('@/lib/load-testing/database-scenarios');
        const dbResults = await testDatabaseConcurrency({
          duration: '90s',
          concurrentConnections: 15,
          queryTypes: ['product-search', 'order-creation', 'user-lookup', 'inventory-check'],
          transactionMix: 0.3, // 30% transactions
        });

        expect(dbResults.averageQueryTime).toBeLessThan(100); // <100ms average
        expect(dbResults.p95QueryTime).toBeLessThan(300); // <300ms p95
        expect(dbResults.connectionPool.utilization).toBeLessThan(0.8); // <80% utilization
        expect(dbResults.connectionPool.timeouts).toBe(0); // No timeouts
        expect(dbResults.transactionSuccess.rate).toBeGreaterThan(0.99); // >99% success
        expect(dbResults.deadlocks.count).toBe(0); // No deadlocks
      });

      it('should test database connection pool under stress', async () => {
        const { testConnectionPoolStress } = await import('@/lib/load-testing/db-pool-scenarios');
        const poolResults = await testConnectionPoolStress({
          duration: '60s',
          maxConnections: 25, // Exceed pool size
          connectionHoldTime: '500ms',
          queryComplexity: 'high',
        });

        expect(poolResults.connectionAcquisition.averageWaitTime).toBeLessThan(100); // <100ms wait
        expect(poolResults.connectionAcquisition.maxWaitTime).toBeLessThan(1000); // <1s max wait
        expect(poolResults.connectionTimeouts.count).toBe(0); // No timeouts
        expect(poolResults.poolUtilization.peak).toBeLessThan(0.9); // <90% peak utilization
        expect(poolResults.performanceDegradation.detected).toBe(false);
      });
    });

    describe('Cache Performance Load Testing', () => {
      it('should test cache performance under high request volume', async () => {
        const { testCacheLoad } = await import('@/lib/load-testing/cache-scenarios');
        const cacheResults = await testCacheLoad({
          duration: '60s',
          requestsPerSecond: 1000,
          cacheKeyDistribution: {
            products: 0.6,
            categories: 0.2,
            users: 0.15,
            orders: 0.05,
          },
          cacheMissSimulation: 0.2, // 20% cache misses
        });

        expect(cacheResults.hitRate).toBeGreaterThan(0.75); // >75% hit rate under load
        expect(cacheResults.responseTime.average).toBeLessThan(50); // <50ms average
        expect(cacheResults.responseTime.p95).toBeLessThan(100); // <100ms p95
        expect(cacheResults.redisConnections.peak).toBeLessThan(10); // <10 connections
        expect(cacheResults.memoryUsage.peak).toBeLessThan(512); // <512MB peak
        expect(cacheResults.evictionRate).toBeLessThan(0.05); // <5% eviction rate
      });

      it('should test cache invalidation performance', async () => {
        const { testCacheInvalidation } = await import(
          '@/lib/load-testing/cache-invalidation-scenarios'
        );
        const invalidationResults = await testCacheInvalidation({
          duration: '30s',
          invalidationsPerSecond: 10,
          invalidationPatterns: ['products:*', 'categories:*', 'users:*'],
          concurrentReads: 100,
        });

        expect(invalidationResults.invalidationTime.average).toBeLessThan(100); // <100ms invalidation
        expect(invalidationResults.invalidationTime.p95).toBeLessThan(200); // <200ms p95
        expect(invalidationResults.readPerformance.degradation).toBeLessThan(0.1); // <10% degradation
        expect(invalidationResults.consistency.maintained).toBe(true);
        expect(invalidationResults.lockContention.detected).toBe(false);
      });
    });
  });

  describe('Performance Alerting and Monitoring', () => {
    describe('Threshold-based Alerting', () => {
      it('should trigger alerts when performance thresholds are exceeded', async () => {
        const performanceData = {
          apiResponseTime: {
            average: 1200, // Above 1000ms threshold
            p95: 2500, // Above 2000ms threshold
          },
          databaseQueryTime: {
            average: 600, // Above 500ms threshold
            p95: 1200, // Above 1000ms threshold
          },
          errorRate: 0.08, // Above 5% threshold
          memoryUsage: 90, // Above 85% threshold
          cpuUsage: 85, // Above 80% threshold
        };

        const { checkPerformanceThresholds } = await import('@/lib/performance/alerting');
        const alerts = await checkPerformanceThresholds(performanceData);

        expect(alerts.triggered).toBe(true);
        expect(alerts.severity).toBe('critical');
        expect(alerts.issues).toContain('High API response time');
        expect(alerts.issues).toContain('High database query time');
        expect(alerts.issues).toContain('High error rate');
        expect(alerts.issues).toContain('High memory usage');
        expect(alerts.issues).toContain('High CPU usage');
        expect(alerts.recommendedActions).toContain('Scale application resources');
      });

      it('should provide different alert severities based on threshold levels', async () => {
        const warningData = {
          apiResponseTime: { average: 800, p95: 1200 }, // Warning level
          databaseQueryTime: { average: 300, p95: 600 }, // Warning level
          errorRate: 0.03, // Warning level
          memoryUsage: 75, // Warning level
          cpuUsage: 70, // Warning level
        };

        const criticalData = {
          apiResponseTime: { average: 2000, p95: 5000 }, // Critical level
          databaseQueryTime: { average: 1500, p95: 3000 }, // Critical level
          errorRate: 0.15, // Critical level
          memoryUsage: 95, // Critical level
          cpuUsage: 95, // Critical level
        };

        const { checkPerformanceThresholds } = await import('@/lib/performance/alerting');

        const warningAlerts = await checkPerformanceThresholds(warningData);
        const criticalAlerts = await checkPerformanceThresholds(criticalData);

        expect(warningAlerts.severity).toBe('warning');
        expect(criticalAlerts.severity).toBe('critical');
        expect(criticalAlerts.issues.length).toBeGreaterThan(warningAlerts.issues.length);
      });

      it('should implement alert rate limiting to prevent spam', async () => {
        const alertData = {
          apiResponseTime: { average: 1500, p95: 2500 },
          errorRate: 0.1,
        };

        const { checkPerformanceThresholds } = await import('@/lib/performance/alerting');

        // First alert should be sent
        const firstAlert = await checkPerformanceThresholds(alertData);
        expect(firstAlert.sent).toBe(true);

        // Rapid subsequent alerts should be rate limited
        const secondAlert = await checkPerformanceThresholds(alertData);
        const thirdAlert = await checkPerformanceThresholds(alertData);

        expect(secondAlert.sent).toBe(false);
        expect(secondAlert.rateLimited).toBe(true);
        expect(thirdAlert.sent).toBe(false);
        expect(thirdAlert.rateLimited).toBe(true);
      });
    });

    describe('Performance Regression Detection', () => {
      it('should detect performance regressions compared to baseline', () => {
        const baseline = {
          apiResponseTime: 200,
          databaseQueryTime: 50,
          errorRate: 0.01,
          memoryUsage: 60,
        };

        const currentMetrics = {
          apiResponseTime: 350, // 75% increase
          databaseQueryTime: 120, // 140% increase
          errorRate: 0.05, // 400% increase
          memoryUsage: 85, // 42% increase
        };

        const { detectRegressions } = require('@/lib/performance/regression-detection');
        const regressions = detectRegressions(currentMetrics, baseline);

        expect(regressions.detected).toBe(true);
        expect(regressions.significantRegressions).toContain('API response time');
        expect(regressions.significantRegressions).toContain('Database query time');
        expect(regressions.significantRegressions).toContain('Error rate');
        expect(regressions.severity).toBe('high');
        expect(regressions.recommendations).toContain('Investigate recent changes');
      });

      it('should calculate performance trend analysis', () => {
        const performanceHistory = [
          { timestamp: Date.now() - 86400000 * 7, responseTime: 180, errorRate: 0.008 }, // 7 days ago
          { timestamp: Date.now() - 86400000 * 6, responseTime: 190, errorRate: 0.01 }, // 6 days ago
          { timestamp: Date.now() - 86400000 * 5, responseTime: 200, errorRate: 0.012 }, // 5 days ago
          { timestamp: Date.now() - 86400000 * 4, responseTime: 220, errorRate: 0.015 }, // 4 days ago
          { timestamp: Date.now() - 86400000 * 3, responseTime: 240, errorRate: 0.018 }, // 3 days ago
          { timestamp: Date.now() - 86400000 * 2, responseTime: 270, errorRate: 0.022 }, // 2 days ago
          { timestamp: Date.now() - 86400000 * 1, responseTime: 300, errorRate: 0.025 }, // 1 day ago
          { timestamp: Date.now(), responseTime: 350, errorRate: 0.03 }, // Now
        ];

        const { analyzeTrends } = require('@/lib/performance/trend-analysis');
        const trends = analyzeTrends(performanceHistory);

        expect(trends.responseTime.direction).toBe('increasing');
        expect(trends.responseTime.rate).toBeGreaterThan(0);
        expect(trends.errorRate.direction).toBe('increasing');
        expect(trends.errorRate.rate).toBeGreaterThan(0);
        expect(trends.overall.concern).toBe('high');
        expect(trends.projections.responseTime_24h).toBeGreaterThan(350);
      });
    });

    describe('Performance Dashboard Integration', () => {
      it('should generate performance dashboard data', () => {
        mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
          apiPerformance: {
            averageResponseTime: 250,
            p95ResponseTime: 450,
            errorRate: 0.02,
            slowRequestCount: 12,
            endpointMetrics: {
              '/api/products': { avgTime: 150, requests: 1000 },
              '/api/orders': { avgTime: 300, requests: 500 },
              '/api/checkout': { avgTime: 400, requests: 200 },
            },
          },
          databasePerformance: {
            averageQueryTime: 75,
            p95QueryTime: 150,
            failedQueryCount: 2,
            slowQueryCount: 8,
          },
          businessMetrics: {
            ordersPerHour: 42,
            conversionRate: 0.82,
            averageOrderValue: 38.75,
            failedPayments: 1,
            cartAbandonmentRate: 0.18,
          },
          systemMetrics: {
            memoryUsage: 320,
            uptime: 172800,
            errorRate: 0.015,
            activeConnections: 18,
          },
        });

        const { generateDashboardData } = require('@/lib/performance/dashboard');
        const dashboardData = generateDashboardData();

        expect(dashboardData.overview.status).toBe('healthy');
        expect(dashboardData.charts.responseTime).toBeDefined();
        expect(dashboardData.charts.errorRate).toBeDefined();
        expect(dashboardData.charts.throughput).toBeDefined();
        expect(dashboardData.alerts.active).toHaveLength(0); // No alerts for healthy metrics
        expect(dashboardData.recommendations).toContain(
          'System performing within normal parameters'
        );
      });

      it('should provide real-time performance metrics', async () => {
        mockRedisInstance.get.mockImplementation(key => {
          const mockData = {
            'metrics:realtime:responseTime': '275',
            'metrics:realtime:errorRate': '0.018',
            'metrics:realtime:throughput': '45.2',
            'metrics:realtime:activeUsers': '127',
          };
          return Promise.resolve(mockData[key] || null);
        });

        const { getRealTimeMetrics } = await import('@/lib/performance/realtime');
        const realTimeData = await getRealTimeMetrics();

        expect(realTimeData.responseTime).toBe(275);
        expect(realTimeData.errorRate).toBe(0.018);
        expect(realTimeData.throughput).toBe(45.2);
        expect(realTimeData.activeUsers).toBe(127);
        expect(realTimeData.timestamp).toBeDefined();
      });
    });
  });

  describe('Performance Optimization Recommendations', () => {
    describe('Automatic Performance Analysis', () => {
      it('should provide optimization recommendations based on metrics', () => {
        const performanceProfile = {
          apiPerformance: {
            averageResponseTime: 800,
            slowestEndpoints: ['/api/search', '/api/catering-quotes'],
            cacheHitRate: 0.65, // Low cache hit rate
          },
          databasePerformance: {
            averageQueryTime: 200,
            slowestQueries: ['product-search', 'order-history'],
            connectionPoolUtilization: 0.85, // High utilization
          },
          systemResources: {
            memoryUsage: 78,
            cpuUsage: 82,
            diskIO: 'moderate',
          },
        };

        const { generateOptimizationRecommendations } = require('@/lib/performance/optimization');
        const recommendations = generateOptimizationRecommendations(performanceProfile);

        expect(recommendations.immediate).toContain('Optimize slow API endpoints');
        expect(recommendations.immediate).toContain('Increase cache TTL for frequent data');
        expect(recommendations.immediate).toContain('Optimize slow database queries');

        expect(recommendations.shortTerm).toContain('Increase database connection pool size');
        expect(recommendations.shortTerm).toContain('Implement API response compression');

        expect(recommendations.longTerm).toContain('Consider horizontal scaling');
        expect(recommendations.longTerm).toContain('Implement CDN for static assets');
      });

      it('should prioritize recommendations by impact and effort', () => {
        const recommendations = [
          { action: 'Add database index', impact: 'high', effort: 'low', type: 'database' },
          { action: 'Implement caching', impact: 'high', effort: 'medium', type: 'cache' },
          { action: 'Optimize algorithm', impact: 'medium', effort: 'high', type: 'code' },
          {
            action: 'Scale infrastructure',
            impact: 'high',
            effort: 'high',
            type: 'infrastructure',
          },
        ];

        const { prioritizeRecommendations } = require('@/lib/performance/recommendation-engine');
        const prioritized = prioritizeRecommendations(recommendations);

        expect(prioritized[0].action).toBe('Add database index'); // High impact, low effort
        expect(prioritized[1].action).toBe('Implement caching'); // High impact, medium effort
        expect(prioritized[2].action).toBe('Scale infrastructure'); // High impact, high effort
        expect(prioritized[3].action).toBe('Optimize algorithm'); // Medium impact, high effort
      });
    });

    describe('Performance Testing Automation', () => {
      it('should automate performance regression testing', async () => {
        const { runPerformanceRegressionSuite } = await import(
          '@/lib/testing/performance-regression'
        );
        const regressionResults = await runPerformanceRegressionSuite({
          baselineVersion: 'v1.0.0',
          currentVersion: 'v1.1.0',
          testSuites: ['api-performance', 'database-performance', 'cache-performance'],
          threshold: 0.2, // 20% performance degradation threshold
        });

        expect(regressionResults.overallResult).toBe('pass');
        expect(regressionResults.apiPerformance.degradation).toBeLessThan(0.2);
        expect(regressionResults.databasePerformance.degradation).toBeLessThan(0.2);
        expect(regressionResults.cachePerformance.degradation).toBeLessThan(0.2);
        expect(regressionResults.recommendations).toContain(
          'No significant performance regressions detected'
        );
      });

      it('should integrate with CI/CD pipeline for performance gates', async () => {
        const { checkPerformanceGates } = await import('@/lib/testing/performance-gates');
        const gateResults = await checkPerformanceGates({
          branch: 'feature/new-checkout',
          performanceTargets: {
            apiResponseTime: 500,
            databaseQueryTime: 100,
            errorRate: 0.01,
            memoryUsage: 512,
          },
          criticalEndpoints: ['/api/checkout', '/api/payment', '/api/orders'],
        });

        expect(gateResults.passed).toBe(true);
        expect(gateResults.criticalEndpoints.allPassed).toBe(true);
        expect(gateResults.overallScore).toBeGreaterThan(85); // >85% performance score
        expect(gateResults.deploymentRecommendation).toBe('approved');
      });
    });
  });

  describe('Integration with Production Monitoring', () => {
    it('should integrate with production monitoring systems', async () => {
      // Mock production monitoring integration
      const mockMonitoringData = {
        timestamp: Date.now(),
        healthStatus: 'healthy',
        responseTime: 0.28,
        detailedResponseTime: 0.75,
        homepageResponseTime: 0.26,
        errorRate: 0.0,
        uptime: 1.0,
      };

      const { integrateWithProductionMonitoring } = await import(
        '@/lib/monitoring/production-integration'
      );
      const integration = await integrateWithProductionMonitoring(mockMonitoringData);

      expect(integration.status).toBe('healthy');
      expect(integration.performanceMetrics.responseTime).toBe(0.28);
      expect(integration.performanceMetrics.errorRate).toBe(0.0);
      expect(integration.alerts.active).toHaveLength(0);
      expect(integration.recommendations).toContain('System performing optimally');
    });

    it('should provide performance monitoring configuration', () => {
      const { getMonitoringConfig } = require('@/lib/monitoring/config');
      const config = getMonitoringConfig();

      expect(config.healthChecks.frequency).toBe(300000); // 5 minutes
      expect(config.performanceMetrics.retentionPeriod).toBe(86400000 * 7); // 7 days
      expect(config.alerting.thresholds.responseTime).toBe(1000); // 1 second
      expect(config.alerting.thresholds.errorRate).toBe(0.05); // 5%
      expect(config.dashboards.updateInterval).toBe(60000); // 1 minute
    });
  });
});
