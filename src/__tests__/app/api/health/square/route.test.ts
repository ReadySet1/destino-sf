/**
 * Unit tests for /api/health/square endpoint
 *
 * Tests verify that the Square health endpoint uses the unified Prisma client
 * with built-in retry logic and connection management.
 *
 * Fixes DESTINO-SF-5: PrismaClientInitializationError on cold starts
 */

import { GET } from '@/app/api/health/square/route';
import { quickHealthCheck } from '@/lib/db-unified';

// Mock the db-unified module
jest.mock('@/lib/db-unified', () => ({
  quickHealthCheck: jest.fn(),
  prisma: {},
}));

// Mock the Square service
jest.mock('@/lib/square/service', () => ({
  getSquareService: jest.fn().mockReturnValue({
    getLocations: jest.fn().mockResolvedValue([{ id: 'test-location' }]),
  }),
}));

// Mock the logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockQuickHealthCheck = quickHealthCheck as jest.MockedFunction<typeof quickHealthCheck>;

describe('/api/health/square', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Healthy State', () => {
    it('should return 200 when database and Square API are healthy', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 15,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should include database response time', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 42,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.services.database.responseTime).toBe(42);
      expect(data.services.database.status).toBe('healthy');
    });

    it('should include Square API status', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.services.square_api).toBeDefined();
      expect(data.services.square_api.status).toBeDefined();
    });

    it('should include version and uptime', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe('number');
    });
  });

  describe('Unhealthy Database', () => {
    it('should return 503 when database is unhealthy', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Connection timeout',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.services.database.status).toBe('unhealthy');
    });

    it('should handle PrismaClientInitializationError gracefully', async () => {
      // This test verifies the fix for DESTINO-SF-5
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 0,
        error: "Can't reach database server at aws-1-us-west-1.pooler.supabase.com:6543",
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.database.status).toBe('unhealthy');
    });

    it('should handle socket timeout errors', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Socket timeout (the database failed to respond to a query)',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.database.status).toBe('unhealthy');
    });
  });

  describe('Unified Client Usage', () => {
    it('should use quickHealthCheck from db-unified', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      await GET();

      // Verify quickHealthCheck was called with timeout
      expect(mockQuickHealthCheck).toHaveBeenCalledWith(5000);
    });

    it('should not create new PrismaClient instances', async () => {
      // The route should use quickHealthCheck which internally uses
      // the shared prisma client, not create a new one
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      await GET();

      // quickHealthCheck should be called, which uses the shared client
      expect(mockQuickHealthCheck).toHaveBeenCalled();
    });
  });

  describe('Response Structure', () => {
    it('should return proper health check result structure', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('uptime');

      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('square_api');

      expect(data.services.database).toHaveProperty('status');
      expect(data.services.database).toHaveProperty('responseTime');

      expect(data.services.square_api).toHaveProperty('status');
      expect(data.services.square_api).toHaveProperty('responseTime');
    });

    it('should have valid timestamp', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      const response = await GET();
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Error Handling', () => {
    it('should handle quickHealthCheck throwing an error', async () => {
      mockQuickHealthCheck.mockRejectedValue(new Error('Unexpected error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.database.status).toBe('unhealthy');
    });
  });

  describe('Status Code Logic', () => {
    it('should return 200 for healthy status', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should return 200 for degraded status', async () => {
      // Degraded status (slow but working) should still return 200
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 100,
      });

      const response = await GET();

      // The implementation returns 200 for both healthy and degraded
      expect(response.status).toBe(200);
    });

    it('should return 503 for unhealthy status', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Database unavailable',
      });

      const response = await GET();

      expect(response.status).toBe(503);
    });
  });
});
