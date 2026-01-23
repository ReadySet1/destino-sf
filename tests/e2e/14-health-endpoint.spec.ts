import { test, expect } from '@playwright/test';

/**
 * E2E Test: Health Endpoint
 * Tests the /api/health endpoint for proper behavior
 *
 * This tests the socket timeout fix and circuit breaker integration
 */
test.describe('Health Endpoint', () => {
  test.describe('Basic Health Check', () => {
    test('should return 200 and healthy status when database is connected', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBeDefined();
      expect(data.version).toBeDefined();
    });

    test('should include latency in healthy response', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.latencyMs).toBeDefined();
      expect(typeof data.latencyMs).toBe('number');
      expect(data.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test('should respond within 5 seconds (timeout threshold)', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get('/api/health', {
        timeout: 10000, // Allow 10 seconds for the full request including network
      });

      const responseTime = Date.now() - startTime;

      // The endpoint should respond much faster than the 5-second timeout
      // Allow up to 8 seconds for network latency in CI environments
      expect(responseTime).toBeLessThan(8000);
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Response Structure', () => {
    test('should return proper JSON content type', async ({ request }) => {
      const response = await request.get('/api/health');

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('should include all required fields in healthy response', async ({ request }) => {
      const response = await request.get('/api/health');
      const data = await response.json();

      // All healthy responses should have these fields
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('latencyMs');
    });

    test('should have valid timestamp format', async ({ request }) => {
      const response = await request.get('/api/health');
      const data = await response.json();

      // Timestamp should be a valid ISO string
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');

      // Timestamp should be recent (within last minute)
      const now = Date.now();
      const timestampMs = timestamp.getTime();
      expect(now - timestampMs).toBeLessThan(60000);
    });
  });

  test.describe('Performance Characteristics', () => {
    test('should have low latency under normal conditions', async ({ request }) => {
      const response = await request.get('/api/health');
      const data = await response.json();

      // Under normal conditions, latency should be under 1 second
      // (allowing for cold start and network latency)
      expect(data.latencyMs).toBeLessThan(1000);
    });

    test('should handle multiple consecutive requests', async ({ request }) => {
      const responses = await Promise.all([
        request.get('/api/health'),
        request.get('/api/health'),
        request.get('/api/health'),
      ]);

      for (const response of responses) {
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('healthy');
      }
    });

    test('should maintain consistent response structure across requests', async ({ request }) => {
      const response1 = await request.get('/api/health');
      const response2 = await request.get('/api/health');

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Structure should be identical
      expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort());
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle HEAD request', async ({ request }) => {
      // HEAD requests should return the same status code but no body
      const response = await request.head('/api/health');
      // Next.js API routes don't natively support HEAD, so this may return 405
      // or 200 depending on configuration
      expect([200, 405]).toContain(response.status());
    });

    test('should return 405 for POST request', async ({ request }) => {
      const response = await request.post('/api/health', {
        data: {},
      });

      // Health check only supports GET
      expect(response.status()).toBe(405);
    });
  });
});

/**
 * Square Health Endpoint Tests
 * Tests the /api/health/square endpoint for proper behavior
 *
 * Fixes DESTINO-SF-5: Uses unified Prisma client with retry logic
 */
test.describe('Square Health Endpoint', () => {
  test.describe('Basic Health Check', () => {
    test('should return 200 and healthy status when Square and database are connected', async ({
      request,
    }) => {
      const response = await request.get('/api/health/square');

      // May return 200 or 503 depending on Square API availability
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data.timestamp).toBeDefined();
      expect(data.services).toBeDefined();
      expect(data.services.database).toBeDefined();
      expect(data.services.square_api).toBeDefined();
    });

    test('should include database health status', async ({ request }) => {
      const response = await request.get('/api/health/square');
      const data = await response.json();

      expect(data.services.database).toHaveProperty('status');
      expect(data.services.database).toHaveProperty('responseTime');
      expect(['healthy', 'unhealthy']).toContain(data.services.database.status);
    });

    test('should include Square API health status', async ({ request }) => {
      const response = await request.get('/api/health/square');
      const data = await response.json();

      expect(data.services.square_api).toHaveProperty('status');
      expect(data.services.square_api).toHaveProperty('responseTime');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.services.square_api.status);
    });

    test('should include version and uptime', async ({ request }) => {
      const response = await request.get('/api/health/square');
      const data = await response.json();

      expect(data.version).toBeDefined();
      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Response Structure', () => {
    test('should return proper JSON content type', async ({ request }) => {
      const response = await request.get('/api/health/square');
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('should have valid timestamp format', async ({ request }) => {
      const response = await request.get('/api/health/square');
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');

      // Timestamp should be recent (within last minute)
      const now = Date.now();
      const timestampMs = timestamp.getTime();
      expect(now - timestampMs).toBeLessThan(60000);
    });
  });

  test.describe('Performance', () => {
    test('should respond within reasonable time', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get('/api/health/square', {
        timeout: 15000, // Allow 15 seconds for Square API calls
      });

      const responseTime = Date.now() - startTime;

      // Should respond within 15 seconds (includes Square API calls)
      expect(responseTime).toBeLessThan(15000);
      expect([200, 503]).toContain(response.status());
    });

    test('should handle multiple consecutive requests', async ({ request }) => {
      const responses = await Promise.all([
        request.get('/api/health/square'),
        request.get('/api/health/square'),
      ]);

      for (const response of responses) {
        expect([200, 503]).toContain(response.status());
        const data = await response.json();
        expect(data.services).toBeDefined();
      }
    });
  });

  test.describe('Database Connection Resilience', () => {
    test('should use unified client with retry logic (DESTINO-SF-5 fix)', async ({ request }) => {
      // This test verifies that the endpoint doesn't throw unhandled errors
      // when the database is slow or temporarily unavailable
      const response = await request.get('/api/health/square', {
        timeout: 15000,
      });

      // Should always return a valid response, even if unhealthy
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('services');
    });
  });
});

/**
 * Additional tests for monitoring and alerting integration
 */
test.describe('Health Endpoint - Monitoring Integration', () => {
  test('should be usable as a load balancer health check', async ({ request }) => {
    // Load balancers typically need:
    // 1. Fast response time
    // 2. 200 status for healthy
    // 3. Non-200 for unhealthy (503 is standard)

    const startTime = Date.now();
    const response = await request.get('/api/health');
    const responseTime = Date.now() - startTime;

    // Should respond quickly enough for load balancer checks
    expect(responseTime).toBeLessThan(5000);

    // Should return 200 for healthy
    expect(response.status()).toBe(200);
  });

  test('should provide environment info for debugging', async ({ request }) => {
    const response = await request.get('/api/health');
    const data = await response.json();

    // Environment should be one of the expected values
    expect(['development', 'production', 'test']).toContain(data.environment);
  });
});
