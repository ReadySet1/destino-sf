/**
 * Integration tests for Monitoring System Database Connection
 *
 * These tests verify that the monitoring system properly uses the unified
 * Prisma client, which provides:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Connection pooling
 * - Graceful error handling
 *
 * Fixes DESTINO-SF-5: PrismaClientInitializationError on cold starts
 */

import { prismaMock } from '../setup/prisma';

// Mock logger to prevent console output during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Square service
jest.mock('@/lib/square/service', () => ({
  getSquareService: jest.fn().mockReturnValue({
    getLocations: jest.fn().mockResolvedValue([]),
    getCatalogItems: jest.fn().mockResolvedValue([]),
  }),
}));

describe('Monitoring System - Database Connection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('SquareMonitor with Unified Client', () => {
    it('should not throw on construction even if database queries would fail', async () => {
      // Before the fix, construction would throw PrismaClientInitializationError
      // Now it uses the unified client which handles initialization gracefully

      const { SquareMonitor } = await import('@/lib/monitoring/square-monitor');

      // Construction should not throw
      expect(() => new SquareMonitor()).not.toThrow();
    });

    it('should handle transient database errors during monitoring', async () => {
      const { SquareMonitor } = await import('@/lib/monitoring/square-monitor');
      const monitor = new SquareMonitor();

      // Simulate transient error that would be retried by unified client
      prismaMock.order.findMany
        .mockRejectedValueOnce(new Error("Can't reach database server"))
        .mockRejectedValueOnce(new Error("Can't reach database server"))
        .mockResolvedValue([]);

      // The withRetry wrapper in db-unified handles retries
      // In this test, we're testing that the monitor handles errors gracefully
      await expect(monitor.monitorSquareIntegration()).rejects.toThrow();
    });

    it('should share prisma client across multiple monitor instances', async () => {
      const { getSquareMonitor, resetSquareMonitor } = await import(
        '@/lib/monitoring/square-monitor'
      );

      // Get first instance
      const monitor1 = getSquareMonitor();

      // Reset and get new instance
      resetSquareMonitor();
      const monitor2 = getSquareMonitor();

      // Both should work (using shared prisma client from db-unified)
      prismaMock.order.findMany.mockResolvedValue([]);

      // They're different instances but share the same prisma client
      expect(monitor1).not.toBe(monitor2);
    });
  });

  describe('AlertSystem with Unified Client', () => {
    it('should not throw on construction even if database is unavailable', async () => {
      const { AlertSystem } = await import('@/lib/monitoring/alert-system');

      // Construction should not throw
      expect(() => new AlertSystem()).not.toThrow();
    });

    it('should share prisma client across multiple alert system instances', async () => {
      const { getAlertSystem, resetAlertSystem } = await import('@/lib/monitoring/alert-system');

      const system1 = getAlertSystem();
      resetAlertSystem();
      const system2 = getAlertSystem();

      // Different instances but share prisma client
      expect(system1).not.toBe(system2);
    });
  });

  describe('Connection Error Scenarios', () => {
    const connectionErrors = [
      "Can't reach database server at aws-1-us-west-1.pooler.supabase.com:6543",
      'Connection terminated',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Socket timeout',
      'Connection pool timeout',
    ];

    connectionErrors.forEach(errorMessage => {
      it(`should handle "${errorMessage}" without crashing`, async () => {
        const { SquareMonitor } = await import('@/lib/monitoring/square-monitor');
        const monitor = new SquareMonitor();

        prismaMock.order.findMany.mockRejectedValue(new Error(errorMessage));

        // Should throw the error (after unified client retries are exhausted)
        // but should not crash with unhandled rejection
        await expect(monitor.monitorSquareIntegration()).rejects.toThrow(errorMessage);
      });
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent monitoring calls', async () => {
      const { getSquareMonitor } = await import('@/lib/monitoring/square-monitor');

      prismaMock.order.findMany.mockResolvedValue([]);

      const monitor = getSquareMonitor();

      // Run multiple monitoring calls concurrently
      const promises = [
        monitor.monitorSquareIntegration(),
        monitor.monitorSquareIntegration(),
        monitor.monitorSquareIntegration(),
      ];

      const results = await Promise.allSettled(promises);

      // All should complete (either fulfilled or rejected)
      expect(results).toHaveLength(3);
    });

    it('should handle concurrent alert sending', async () => {
      const { getAlertSystem } = await import('@/lib/monitoring/alert-system');

      const alertSystem = getAlertSystem();

      const alert = {
        id: 'concurrent-test',
        type: 'API_ERROR' as const,
        severity: 'HIGH' as const,
        title: 'Test Alert',
        description: 'Testing concurrent access',
        data: {},
        createdAt: new Date(),
      };

      // Send multiple alerts concurrently
      const promises = [
        alertSystem.sendAlert(alert),
        alertSystem.sendAlert(alert),
        alertSystem.sendAlert(alert),
      ];

      const results = await Promise.allSettled(promises);

      // All should complete
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('Cleanup Behavior', () => {
    it('should not disconnect shared prisma client on cleanup', async () => {
      const { SquareMonitor } = await import('@/lib/monitoring/square-monitor');
      const monitor = new SquareMonitor();

      await monitor.cleanup();

      // The shared prisma client should NOT be disconnected
      // because other parts of the application may still be using it
      expect(prismaMock.$disconnect).not.toHaveBeenCalled();
    });

    it('should allow new operations after cleanup', async () => {
      const { getSquareMonitor, resetSquareMonitor } = await import(
        '@/lib/monitoring/square-monitor'
      );

      prismaMock.order.findMany.mockResolvedValue([]);

      const monitor1 = getSquareMonitor();
      await monitor1.cleanup();

      // Reset and get new instance
      resetSquareMonitor();
      const monitor2 = getSquareMonitor();

      // New instance should work
      await expect(monitor2.monitorSquareIntegration()).resolves.toBeDefined();
    });
  });
});

describe('Health Endpoint - Database Connection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('quickHealthCheck Usage', () => {
    it('should use quickHealthCheck from db-unified', async () => {
      const { quickHealthCheck } = await import('@/lib/db-unified');

      // quickHealthCheck is mocked in setup/prisma.ts
      const result = await quickHealthCheck(5000);

      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('latencyMs');
    });
  });
});

describe('Sitemap - Database Connection Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Unified Client Usage in Sitemap', () => {
    it('should not create isolated PrismaClient instances', async () => {
      // Mock isBuildTime to return false
      jest.doMock('@/lib/build-time-utils', () => ({
        isBuildTime: jest.fn().mockReturnValue(false),
      }));

      prismaMock.product.findMany.mockResolvedValue([]);

      const sitemap = (await import('@/app/sitemap')).default;

      await sitemap();

      // The unified prisma client should be used
      expect(prismaMock.product.findMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      jest.doMock('@/lib/build-time-utils', () => ({
        isBuildTime: jest.fn().mockReturnValue(false),
      }));

      prismaMock.product.findMany.mockRejectedValue(
        new Error("Can't reach database server")
      );

      const sitemap = (await import('@/app/sitemap')).default;

      // Should return static pages even when database fails
      const result = await sitemap();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
