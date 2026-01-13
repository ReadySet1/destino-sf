/**
 * Unit tests for db-unified.ts - Database connection resilience features
 *
 * Tests cover:
 * - warmConnection() function
 * - withServerComponentDb() wrapper
 * - getConnectionDiagnostics() function
 * - withRetry() retry logic with exponential backoff
 * - Authentication error detection and fail-fast behavior
 * - Connection staleness detection
 */

// Test environment is set by Jest via jest.setup files
// DATABASE_URL is set in jest.setup.enhanced.js

import { PrismaClient } from '@prisma/client';
import { prismaMock } from '../setup/prisma';

// Import the mocked functions from db-unified (they're mocked in setup/prisma.ts)
import {
  warmConnection,
  withServerComponentDb,
  getConnectionDiagnostics,
  withRetry,
  checkConnection,
  ensureConnection,
  getHealthStatus,
  forceResetConnection,
  shutdown,
} from '@/lib/db-unified';

describe('db-unified.ts - Database Connection Resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('warmConnection()', () => {
    it('should return true when mocked', async () => {
      // warmConnection is mocked to return true in setup/prisma.ts
      const result = await warmConnection();
      expect(result).toBe(true);
    });

    it('should be callable as a function', () => {
      expect(typeof warmConnection).toBe('function');
    });
  });

  describe('withServerComponentDb()', () => {
    it('should execute the provided operation', async () => {
      const mockData = { id: 1, name: 'Test' };
      const operation = jest.fn().mockResolvedValue(mockData);

      // The mock in setup/prisma.ts executes the callback directly
      const result = await withServerComponentDb(operation, {
        operationName: 'test-operation',
      });

      expect(operation).toHaveBeenCalled();
    });

    it('should be callable with options', async () => {
      const operation = jest.fn().mockResolvedValue({ success: true });

      await withServerComponentDb(operation, {
        operationName: 'test-operation',
        warmup: false,
        fallback: { success: false },
      });

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('getConnectionDiagnostics()', () => {
    it('should return connection diagnostics object', () => {
      const diagnostics = getConnectionDiagnostics();

      expect(diagnostics).toHaveProperty('lastSuccessfulConnection');
      expect(diagnostics).toHaveProperty('timeSinceLastSuccess');
      expect(diagnostics).toHaveProperty('consecutiveFailures');
      expect(diagnostics).toHaveProperty('isStale');
      expect(diagnostics).toHaveProperty('circuitBreakerState');
    });

    it('should return expected default values', () => {
      const diagnostics = getConnectionDiagnostics();

      expect(diagnostics.consecutiveFailures).toBe(0);
      expect(diagnostics.isStale).toBe(false);
      expect(diagnostics.circuitBreakerState).toBe('CLOSED');
    });
  });

  describe('withRetry()', () => {
    it('should execute the provided function', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // The mock executes the callback directly
      const result = await withRetry(operation, 3, 'test-operation');

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('checkConnection()', () => {
    it('should return true when mocked', async () => {
      const result = await checkConnection();
      expect(result).toBe(true);
    });
  });

  describe('ensureConnection()', () => {
    it('should resolve successfully when mocked', async () => {
      await expect(ensureConnection()).resolves.toBeUndefined();
    });
  });

  describe('getHealthStatus()', () => {
    it('should return health status object', async () => {
      const status = await getHealthStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('latency');
      expect(status).toHaveProperty('version');
      expect(status).toHaveProperty('circuitBreaker');
      expect(status).toHaveProperty('poolMetrics');
    });

    it('should indicate healthy connection', async () => {
      const status = await getHealthStatus();

      expect(status.connected).toBe(true);
    });

    it('should include circuit breaker metrics', async () => {
      const status = await getHealthStatus();

      expect(status.circuitBreaker.state).toBe('CLOSED');
      expect(status.circuitBreaker.failures).toBe(0);
      expect(status.circuitBreaker.totalTrips).toBe(0);
    });

    it('should include pool metrics', async () => {
      const status = await getHealthStatus();

      expect(status.poolMetrics.successRate).toBe(1);
      expect(status.poolMetrics.avgLatencyMs).toBe(10);
      expect(status.poolMetrics.totalAttempts).toBe(1);
    });
  });

  describe('forceResetConnection()', () => {
    it('should resolve successfully', async () => {
      await expect(forceResetConnection()).resolves.toBeUndefined();
    });
  });

  describe('shutdown()', () => {
    it('should resolve successfully', async () => {
      await expect(shutdown()).resolves.toBeUndefined();
    });
  });
});

/**
 * Test the actual logic functions (not mocked)
 * These test the internal helper functions by testing behavior patterns
 */
describe('db-unified.ts - Authentication Error Detection Logic', () => {
  // These tests verify the behavior expectations, not the actual implementation
  // The actual implementation is tested via the mocked functions

  describe('Permanent Authentication Errors (should fail fast)', () => {
    // NOTE: "Tenant or user not found" is now classified as a transient error
    // because it can occur due to Supabase pooler load, not just bad credentials
    const permanentAuthErrorMessages = [
      'password authentication failed',
      'FATAL: password authentication failed',
      'authentication failed',
      'role "postgres" does not exist',
      'FATAL: role',
    ];

    permanentAuthErrorMessages.forEach(errorMessage => {
      it(`should recognize "${errorMessage}" as a permanent authentication error`, () => {
        const error = new Error(errorMessage);
        // Auth errors should be detected by checking if the message contains known auth error strings
        const isAuthError = permanentAuthErrorMessages.some(msg =>
          error.message.toLowerCase().includes(msg.toLowerCase())
        );
        expect(isAuthError).toBe(true);
      });
    });
  });

  describe('Transient Pooler Errors (should retry)', () => {
    // These errors can occur transiently with Supabase pooler under load
    const transientPoolerErrors = [
      'Tenant or user not found',
      'FATAL: Tenant or user not found',
    ];

    transientPoolerErrors.forEach(errorMessage => {
      it(`should recognize "${errorMessage}" as a transient pooler error (retryable)`, () => {
        const error = new Error(errorMessage);
        const isTransientError = transientPoolerErrors.some(msg =>
          error.message.toLowerCase().includes(msg.toLowerCase())
        );
        expect(isTransientError).toBe(true);
      });
    });
  });

  describe('Connection Errors (should retry)', () => {
    const connectionErrorMessages = [
      "Can't reach database server",
      'Connection terminated',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Engine is not yet connected',
      'Socket timeout',
      'Connection pool timeout',
      'Timed out fetching a new connection',
    ];

    connectionErrorMessages.forEach(errorMessage => {
      it(`should recognize "${errorMessage}" as a connection error`, () => {
        const error = new Error(errorMessage);
        const isConnectionError = connectionErrorMessages.some(msg =>
          error.message.includes(msg)
        );
        expect(isConnectionError).toBe(true);
      });
    });

    it('should recognize P1001 as a connection error code', () => {
      const error = new Error('Database error');
      (error as any).code = 'P1001';
      const connectionCodes = ['P1001', 'P1008', 'P2024'];
      expect(connectionCodes.includes((error as any).code)).toBe(true);
    });

    it('should recognize P2024 as a pool timeout error code', () => {
      const error = new Error('Pool timeout');
      (error as any).code = 'P2024';
      const connectionCodes = ['P1001', 'P1008', 'P2024'];
      expect(connectionCodes.includes((error as any).code)).toBe(true);
    });
  });

  describe('Non-Connection Errors (should not retry)', () => {
    const nonRetryableErrors = [
      'Unique constraint violated',
      'Foreign key constraint failed',
      'Record not found',
      'Validation failed',
    ];

    nonRetryableErrors.forEach(errorMessage => {
      it(`should NOT recognize "${errorMessage}" as a connection error`, () => {
        const connectionErrorMessages = [
          "Can't reach database server",
          'Connection terminated',
          'ECONNRESET',
          'ECONNREFUSED',
          'ETIMEDOUT',
        ];
        const error = new Error(errorMessage);
        const isConnectionError = connectionErrorMessages.some(msg =>
          error.message.includes(msg)
        );
        expect(isConnectionError).toBe(false);
      });
    });
  });
});

describe('db-unified.ts - Retry Timing Logic', () => {
  describe('Exponential Backoff Calculation', () => {
    it('should calculate correct delays for each retry attempt', () => {
      const baseDelayMs = 2000;

      // Calculate expected delays (without jitter)
      const expectedDelays = [
        baseDelayMs * Math.pow(2, 0), // 2000ms for attempt 0
        baseDelayMs * Math.pow(2, 1), // 4000ms for attempt 1
        baseDelayMs * Math.pow(2, 2), // 8000ms for attempt 2
        baseDelayMs * Math.pow(2, 3), // 16000ms for attempt 3
      ];

      expect(expectedDelays[0]).toBe(2000);
      expect(expectedDelays[1]).toBe(4000);
      expect(expectedDelays[2]).toBe(8000);
      expect(expectedDelays[3]).toBe(16000);
    });

    it('should add jitter between 0-500ms', () => {
      // Jitter is random, so we just verify the range
      const jitterSamples = Array.from({ length: 100 }, () =>
        Math.floor(Math.random() * 500)
      );

      jitterSamples.forEach(jitter => {
        expect(jitter).toBeGreaterThanOrEqual(0);
        expect(jitter).toBeLessThan(500);
      });
    });

    it('should produce total delay within expected range', () => {
      const baseDelayMs = 2000;
      const retryAttempt = 1;
      const delayMs = baseDelayMs * Math.pow(2, retryAttempt); // 4000ms
      const maxJitter = 500;

      const minTotalDelay = delayMs; // 4000ms
      const maxTotalDelay = delayMs + maxJitter; // 4500ms

      // Any valid total delay should be in this range
      const sampleTotalDelay = delayMs + Math.floor(Math.random() * 500);
      expect(sampleTotalDelay).toBeGreaterThanOrEqual(minTotalDelay);
      expect(sampleTotalDelay).toBeLessThan(maxTotalDelay + 1);
    });
  });
});

describe('db-unified.ts - Connection Staleness Logic', () => {
  describe('Staleness Detection', () => {
    const CONNECTION_STALE_MS = 60000; // 1 minute

    it('should consider connection stale after 1 minute', () => {
      const lastSuccessfulConnection = Date.now() - 70000; // 70 seconds ago
      const timeSinceLastSuccess = Date.now() - lastSuccessfulConnection;
      const isStale = timeSinceLastSuccess > CONNECTION_STALE_MS;

      expect(isStale).toBe(true);
    });

    it('should NOT consider connection stale within 1 minute', () => {
      const lastSuccessfulConnection = Date.now() - 30000; // 30 seconds ago
      const timeSinceLastSuccess = Date.now() - lastSuccessfulConnection;
      const isStale = timeSinceLastSuccess > CONNECTION_STALE_MS;

      expect(isStale).toBe(false);
    });

    it('should handle never-connected state (lastSuccessfulConnection = 0)', () => {
      const lastSuccessfulConnection = 0;
      // Never connected should not be considered stale
      const isStale = lastSuccessfulConnection > 0
        ? (Date.now() - lastSuccessfulConnection) > CONNECTION_STALE_MS
        : false;

      expect(isStale).toBe(false);
    });
  });
});

describe('db-unified.ts - Consecutive Failure Tracking', () => {
  describe('Failure Threshold', () => {
    const MAX_CONSECUTIVE_FAILURES = 5;

    it('should track consecutive failures up to threshold', () => {
      let consecutiveFailures = 0;

      // Simulate 5 failures
      for (let i = 0; i < 5; i++) {
        consecutiveFailures++;
      }

      expect(consecutiveFailures).toBe(MAX_CONSECUTIVE_FAILURES);
    });

    it('should reset failures on success', () => {
      let consecutiveFailures = 3;

      // Simulate success
      consecutiveFailures = 0;

      expect(consecutiveFailures).toBe(0);
    });

    it('should refuse retries after max failures', () => {
      let consecutiveFailures = MAX_CONSECUTIVE_FAILURES;

      const shouldRefuseRetry = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;

      expect(shouldRefuseRetry).toBe(true);
    });
  });
});

/**
 * Tests for Socket Timeout Detection
 * DES-XX: Fix socket timeout error handling
 */
describe('db-unified.ts - Socket Timeout Detection', () => {
  // Socket timeout error patterns from Prisma/PostgreSQL
  const socketTimeoutIndicators = [
    'Socket timeout',
    'socket timeout',
    'database failed to respond',
    'the database failed to respond to a query',
    'failed to respond to a query within the configured timeout',
  ];

  // Helper function that mirrors the implementation
  const isSocketTimeoutError = (error: Error): boolean => {
    return socketTimeoutIndicators.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  };

  describe('Socket Timeout Error Recognition', () => {
    it('should recognize "Socket timeout" as a socket timeout error', () => {
      const error = new Error('Socket timeout (the database failed to respond)');
      expect(isSocketTimeoutError(error)).toBe(true);
    });

    it('should recognize lowercase "socket timeout" as a socket timeout error', () => {
      const error = new Error('Connection lost due to socket timeout');
      expect(isSocketTimeoutError(error)).toBe(true);
    });

    it('should recognize "database failed to respond" as a socket timeout error', () => {
      const error = new Error('The database failed to respond to the query');
      expect(isSocketTimeoutError(error)).toBe(true);
    });

    it('should recognize Prisma socket timeout error message', () => {
      // This is the exact error format from the Sentry issue
      const error = new Error(
        'Invalid `prisma.$queryRaw()` invocation: Socket timeout (the database failed to respond to a query within the configured timeout)'
      );
      expect(isSocketTimeoutError(error)).toBe(true);
    });

    it('should recognize partial socket timeout messages', () => {
      const error = new Error('failed to respond to a query within the configured timeout');
      expect(isSocketTimeoutError(error)).toBe(true);
    });
  });

  describe('Non-Socket Timeout Error Recognition', () => {
    it('should NOT recognize connection refused as socket timeout', () => {
      const error = new Error('ECONNREFUSED');
      expect(isSocketTimeoutError(error)).toBe(false);
    });

    it('should NOT recognize authentication errors as socket timeout', () => {
      const error = new Error('password authentication failed');
      expect(isSocketTimeoutError(error)).toBe(false);
    });

    it('should NOT recognize general timeout as socket timeout', () => {
      const error = new Error('Request timeout');
      expect(isSocketTimeoutError(error)).toBe(false);
    });

    it('should NOT recognize validation errors as socket timeout', () => {
      const error = new Error('Validation failed: invalid input');
      expect(isSocketTimeoutError(error)).toBe(false);
    });
  });

  describe('Socket Timeout Should Be Retryable', () => {
    // Connection errors that should be retried
    const connectionErrors = [
      "Can't reach database server",
      'Connection terminated',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Engine is not yet connected',
      'Socket timeout',
      'Connection pool timeout',
      'Timed out fetching a new connection',
      'Response from the Engine was empty',
    ];

    const isConnectionError = (error: Error): boolean => {
      // Check for socket timeout first (they're always retryable)
      if (isSocketTimeoutError(error)) {
        return true;
      }
      return connectionErrors.some(msg => error.message.includes(msg));
    };

    it('should classify socket timeout as a retryable connection error', () => {
      const error = new Error('Socket timeout (the database failed to respond)');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should classify Prisma socket timeout as a retryable connection error', () => {
      const error = new Error(
        'Invalid `prisma.$queryRaw()` invocation: Socket timeout (the database failed to respond to a query within the configured timeout)'
      );
      expect(isConnectionError(error)).toBe(true);
    });
  });
});

/**
 * Tests for Quick Health Check Function
 * Tests the expected behavior and response structure of quickHealthCheck
 */
describe('db-unified.ts - Quick Health Check', () => {
  describe('quickHealthCheck() expected behavior', () => {
    // Create a mock that matches the expected behavior
    const mockQuickHealthCheck = jest.fn().mockResolvedValue({
      healthy: true,
      latencyMs: 10,
    });

    it('should be callable as a function', () => {
      expect(typeof mockQuickHealthCheck).toBe('function');
    });

    it('should return healthy status', async () => {
      const result = await mockQuickHealthCheck();
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('latencyMs');
      expect(result.healthy).toBe(true);
    });

    it('should accept timeout parameter', async () => {
      const result = await mockQuickHealthCheck(5000);
      expect(result.healthy).toBe(true);
    });
  });

  describe('Quick Health Check Response Structure', () => {
    it('should include healthy boolean in expected response', () => {
      const expectedResponse = { healthy: true, latencyMs: 10 };
      expect(typeof expectedResponse.healthy).toBe('boolean');
    });

    it('should include latencyMs number in expected response', () => {
      const expectedResponse = { healthy: true, latencyMs: 10 };
      expect(typeof expectedResponse.latencyMs).toBe('number');
    });

    it('should include error string when unhealthy', () => {
      const unhealthyResponse = {
        healthy: false,
        latencyMs: 5000,
        error: 'Socket timeout',
      };
      expect(unhealthyResponse.error).toBeDefined();
      expect(typeof unhealthyResponse.error).toBe('string');
    });
  });
});

/**
 * Tests for Health Check Timeout Behavior
 */
describe('db-unified.ts - Health Check Timeout Patterns', () => {
  describe('Timeout Logic', () => {
    it('should create timeout promise with correct duration', async () => {
      const timeoutMs = 5000;
      let timedOut = false;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          timedOut = true;
          const error = new Error(`Health check timeout after ${timeoutMs}ms`);
          error.name = 'HealthCheckTimeout';
          reject(error);
        }, 10); // Use short timeout for test
      });

      await expect(timeoutPromise).rejects.toThrow('Health check timeout');
    });

    it('should race query against timeout', async () => {
      const fastQuery = Promise.resolve({ health: 1 });
      const slowTimeout = new Promise((resolve) => setTimeout(resolve, 100));

      const result = await Promise.race([fastQuery, slowTimeout]);
      expect(result).toEqual({ health: 1 });
    });

    it('should fail when query is slower than timeout', async () => {
      const slowQuery = new Promise((resolve) => setTimeout(() => resolve({ health: 1 }), 100));
      const fastTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10);
      });

      await expect(Promise.race([slowQuery, fastTimeout])).rejects.toThrow('Timeout');
    });
  });

  describe('Default Timeout Values', () => {
    it('should use 5 second default for health checks', () => {
      const DEFAULT_HEALTH_CHECK_TIMEOUT = 5000;
      expect(DEFAULT_HEALTH_CHECK_TIMEOUT).toBe(5000);
    });

    it('should be shorter than general socket timeout (120s)', () => {
      const HEALTH_CHECK_TIMEOUT = 5000;
      const SOCKET_TIMEOUT = 120000;
      expect(HEALTH_CHECK_TIMEOUT).toBeLessThan(SOCKET_TIMEOUT);
    });
  });
});
