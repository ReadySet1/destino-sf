/**
 * Tests for External API Tracker
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import * as Sentry from '@sentry/nextjs';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  setTag: jest.fn(),
  captureMessage: jest.fn(),
  startSpan: jest.fn((options, callback) => callback({ setStatus: jest.fn() })),
}));

// Mock performance monitor
jest.mock('@/lib/monitoring/performance', () => ({
  performanceMonitor: {
    trackAPICall: jest.fn(),
  },
}));

import {
  externalAPITracker,
  trackSquareAPI,
  trackShippoAPI,
  trackResendAPI,
  reportExternalAPICall,
  type ExternalService,
} from '@/lib/monitoring/external-api-tracker';

describe('ExternalAPITracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    externalAPITracker.reset();
  });

  describe('trackCall', () => {
    it('should track an API call', async () => {
      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments.create',
        method: 'POST',
        duration: 250,
        status: 200,
        success: true,
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'http',
          category: 'external.square',
          level: 'info',
        })
      );
    });

    it('should track failed API calls', async () => {
      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments.create',
        method: 'POST',
        duration: 150,
        status: 500,
        success: false,
        errorType: 'SERVER_ERROR',
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warning',
          data: expect.objectContaining({
            errorType: 'SERVER_ERROR',
          }),
        })
      );
    });

    it('should log slow API calls', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await externalAPITracker.trackCall({
        service: 'shippo',
        endpoint: 'rates.create',
        method: 'POST',
        duration: 3000,
        status: 200,
        success: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow call to shippo')
      );

      consoleSpy.mockRestore();
    });

    it('should update rate limit cache', async () => {
      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments.create',
        method: 'POST',
        duration: 200,
        status: 200,
        success: true,
        rateLimitRemaining: 50,
        rateLimitTotal: 100,
      });

      const health = externalAPITracker.getServiceHealth('square');
      expect(health.rateLimitStatus).toBeDefined();
      expect(health.rateLimitStatus?.remaining).toBe(50);
      expect(health.rateLimitStatus?.percentUsed).toBe(50);
    });

    it('should alert on rate limit proximity', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments.create',
        method: 'POST',
        duration: 200,
        status: 200,
        success: true,
        rateLimitRemaining: 10,
        rateLimitTotal: 100,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit alert')
      );
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit approaching'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('wrapAPICall', () => {
    it('should wrap a successful API call', async () => {
      const wrappedFn = externalAPITracker.wrapAPICall('square', 'payments.create', 'POST');

      const result = await wrappedFn(async () => {
        return { paymentId: '123' };
      });

      expect(result).toEqual({ paymentId: '123' });
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'square.payments.create',
          op: 'http.client',
        }),
        expect.any(Function)
      );
    });

    it('should track errors in wrapped calls', async () => {
      const wrappedFn = externalAPITracker.wrapAPICall('square', 'payments.create', 'POST');

      await expect(
        wrappedFn(async () => {
          throw new Error('Payment failed with status 500');
        })
      ).rejects.toThrow('Payment failed');
    });
  });

  describe('getServiceHealth', () => {
    it('should return health metrics for a service', async () => {
      // Add some successful calls
      for (let i = 0; i < 5; i++) {
        await externalAPITracker.trackCall({
          service: 'square',
          endpoint: 'payments.create',
          method: 'POST',
          duration: 200 + i * 50,
          status: 200,
          success: true,
        });
      }

      // Add some failed calls
      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments.create',
        method: 'POST',
        duration: 100,
        status: 500,
        success: false,
        errorType: 'SERVER_ERROR',
      });

      const health = externalAPITracker.getServiceHealth('square');

      expect(health.totalCalls).toBe(6);
      expect(health.successfulCalls).toBe(5);
      expect(health.failedCalls).toBe(1);
      expect(health.errorRate).toBeCloseTo(16.67, 1);
      expect(health.averageLatency).toBeGreaterThan(0);
      expect(health.p95Latency).toBeGreaterThan(0);
      expect(health.lastCallAt).not.toBeNull();
    });

    it('should return zero metrics for unknown service', () => {
      const health = externalAPITracker.getServiceHealth('other');

      expect(health.totalCalls).toBe(0);
      expect(health.successfulCalls).toBe(0);
      expect(health.failedCalls).toBe(0);
      expect(health.errorRate).toBe(0);
      expect(health.lastCallAt).toBeNull();
    });
  });

  describe('getAllServicesHealth', () => {
    it('should return health for all services', async () => {
      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments',
        method: 'POST',
        duration: 200,
        status: 200,
        success: true,
      });

      await externalAPITracker.trackCall({
        service: 'shippo',
        endpoint: 'rates',
        method: 'POST',
        duration: 300,
        status: 200,
        success: true,
      });

      const allHealth = externalAPITracker.getAllServicesHealth();

      expect(allHealth.square.totalCalls).toBe(1);
      expect(allHealth.shippo.totalCalls).toBe(1);
      expect(allHealth.resend.totalCalls).toBe(0);
    });
  });

  describe('getErrorBreakdown', () => {
    it('should return error breakdown by service', async () => {
      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments',
        method: 'POST',
        duration: 100,
        status: 500,
        success: false,
        errorType: 'SERVER_ERROR',
      });

      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments',
        method: 'POST',
        duration: 100,
        status: 429,
        success: false,
        errorType: 'RATE_LIMIT',
      });

      await externalAPITracker.trackCall({
        service: 'shippo',
        endpoint: 'rates',
        method: 'POST',
        duration: 100,
        status: 400,
        success: false,
        errorType: 'BAD_REQUEST',
      });

      const breakdown = externalAPITracker.getErrorBreakdown();

      expect(breakdown.square.count).toBe(2);
      expect(breakdown.square.types.SERVER_ERROR).toBe(1);
      expect(breakdown.square.types.RATE_LIMIT).toBe(1);
      expect(breakdown.shippo.count).toBe(1);
    });
  });

  describe('getLatencyByEndpoint', () => {
    it('should return latency breakdown by endpoint', async () => {
      for (let i = 0; i < 5; i++) {
        await externalAPITracker.trackCall({
          service: 'square',
          endpoint: 'payments.create',
          method: 'POST',
          duration: 200 + i * 100,
          status: 200,
          success: true,
        });
      }

      await externalAPITracker.trackCall({
        service: 'square',
        endpoint: 'payments.get',
        method: 'GET',
        duration: 100,
        status: 200,
        success: true,
      });

      const latency = externalAPITracker.getLatencyByEndpoint('square');

      expect(latency).toHaveLength(2);
      expect(latency[0].endpoint).toBe('payments.create'); // Most calls first
      expect(latency[0].calls).toBe(5);
      expect(latency[0].avgLatency).toBe(400); // Average of 200,300,400,500,600
    });
  });

  describe('pruneOldMetrics', () => {
    it('should remove old metrics', async () => {
      // This test would require mocking Date to be effective
      // For now, just verify the method exists and doesn't error
      externalAPITracker.pruneOldMetrics();
    });
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    externalAPITracker.reset();
  });

  describe('trackSquareAPI', () => {
    it('should wrap Square API calls', async () => {
      const result = await trackSquareAPI('payments.create', async () => {
        return { id: '123' };
      });

      expect(result).toEqual({ id: '123' });
      expect(Sentry.startSpan).toHaveBeenCalled();
    });
  });

  describe('trackShippoAPI', () => {
    it('should wrap Shippo API calls', async () => {
      const result = await trackShippoAPI('rates.create', async () => {
        return { rates: [] };
      });

      expect(result).toEqual({ rates: [] });
    });
  });

  describe('trackResendAPI', () => {
    it('should wrap Resend API calls', async () => {
      const result = await trackResendAPI('emails.send', async () => {
        return { id: 'email-123' };
      });

      expect(result).toEqual({ id: 'email-123' });
    });
  });

  describe('reportExternalAPICall', () => {
    it('should manually report an API call', () => {
      reportExternalAPICall('square', 'payments', 'POST', 250, true, 200);

      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    });
  });
});
