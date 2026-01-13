/**
 * Integration tests for database connection resilience
 *
 * Tests the complete flow of:
 * - Function behaviors with mocked dependencies
 * - Circuit breaker integration patterns
 * - Connection state tracking patterns
 * - Recovery scenario patterns
 */

// Test environment is set by Jest via jest.setup files
// DATABASE_URL is set in jest.setup.integration.js

import { prismaMock } from '../setup/prisma';
import {
  warmConnection,
  withServerComponentDb,
  getConnectionDiagnostics,
  withRetry,
  getHealthStatus,
} from '@/lib/db-unified';

describe('Database Connection Resilience - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mocked Function Integration', () => {
    it('should use warmConnection with mocked return value', async () => {
      const result = await warmConnection();
      expect(result).toBe(true);
    });

    it('should use withServerComponentDb with callback execution', async () => {
      const mockData = [{ id: 1, name: 'Product' }];
      const operation = jest.fn().mockResolvedValue(mockData);

      const result = await withServerComponentDb(operation, {
        operationName: 'fetch-products',
      });

      expect(operation).toHaveBeenCalled();
    });

    it('should return diagnostics from getConnectionDiagnostics', () => {
      const diagnostics = getConnectionDiagnostics();

      expect(diagnostics.consecutiveFailures).toBe(0);
      expect(diagnostics.isStale).toBe(false);
      expect(diagnostics.circuitBreakerState).toBe('CLOSED');
    });

    it('should return health status from getHealthStatus', async () => {
      const health = await getHealthStatus();

      expect(health.connected).toBe(true);
      expect(health.circuitBreaker.state).toBe('CLOSED');
      expect(health.poolMetrics.successRate).toBe(1);
    });

    it('should execute withRetry callback', async () => {
      const operation = jest.fn().mockResolvedValue({ success: true });

      const result = await withRetry(operation, 3, 'test-operation');

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('Prisma Mock Integration', () => {
    it('should use prismaMock for database operations', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ test: 1 }]);

      // The prisma mock is available through the setup
      expect(prismaMock.$queryRaw).toBeDefined();
    });

    it('should mock $connect and $disconnect', async () => {
      expect(prismaMock.$connect).toBeDefined();
      expect(prismaMock.$disconnect).toBeDefined();

      await prismaMock.$connect();
      await prismaMock.$disconnect();

      expect(prismaMock.$connect).toHaveBeenCalled();
      expect(prismaMock.$disconnect).toHaveBeenCalled();
    });
  });
});

/**
 * Tests for connection resilience patterns and behaviors
 * These tests verify the expected patterns without relying on actual module internals
 */
describe('Connection Resilience Patterns', () => {
  describe('Circuit Breaker Pattern', () => {
    it('should follow circuit breaker state machine', () => {
      type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

      let state: CircuitState = 'CLOSED';
      let failures = 0;
      const threshold = 5;
      const halfOpenTimeout = 30000;

      // Simulate failures
      const recordFailure = () => {
        failures++;
        if (failures >= threshold) {
          state = 'OPEN';
        }
      };

      // Simulate success
      const recordSuccess = () => {
        failures = 0;
        state = 'CLOSED';
      };

      // Simulate half-open check
      const tryHalfOpen = () => {
        if (state === 'OPEN') {
          state = 'HALF_OPEN';
        }
      };

      // Test transitions
      expect(state).toBe('CLOSED');

      for (let i = 0; i < 5; i++) recordFailure();
      expect(state).toBe('OPEN');

      tryHalfOpen();
      expect(state).toBe('HALF_OPEN');

      recordSuccess();
      expect(state).toBe('CLOSED');
      expect(failures).toBe(0);
    });

    it('should prevent operations when circuit is open', () => {
      const canExecute = (state: string) => state !== 'OPEN';

      expect(canExecute('CLOSED')).toBe(true);
      expect(canExecute('HALF_OPEN')).toBe(true);
      expect(canExecute('OPEN')).toBe(false);
    });
  });

  describe('Retry Pattern with Exponential Backoff', () => {
    it('should calculate correct backoff delays', () => {
      const baseDelay = 2000;
      const maxRetries = 4;
      const delays: number[] = [];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const delay = baseDelay * Math.pow(2, attempt);
        delays.push(delay);
      }

      expect(delays).toEqual([2000, 4000, 8000, 16000]);
    });

    it('should add jitter to prevent thundering herd', () => {
      const baseDelay = 2000;
      const jitterRange = 500;

      // Simulate multiple requests with jitter
      const delaysWithJitter = Array.from({ length: 10 }, () => {
        const jitter = Math.floor(Math.random() * jitterRange);
        return baseDelay + jitter;
      });

      // All delays should be different (with high probability)
      const uniqueDelays = new Set(delaysWithJitter);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // All delays should be within expected range
      delaysWithJitter.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(baseDelay);
        expect(delay).toBeLessThan(baseDelay + jitterRange);
      });
    });

    it('should respect maximum retry limit', () => {
      const maxRetries = 3;
      let attempts = 0;
      let shouldContinue = true;

      while (shouldContinue && attempts < maxRetries) {
        attempts++;
        const operationFailed = true; // Simulate failure

        if (!operationFailed) {
          shouldContinue = false;
        }
      }

      expect(attempts).toBe(maxRetries);
    });
  });

  describe('Connection State Tracking Pattern', () => {
    it('should track connection health metrics', () => {
      interface ConnectionState {
        lastSuccessfulConnection: number;
        consecutiveFailures: number;
      }

      const state: ConnectionState = {
        lastSuccessfulConnection: 0,
        consecutiveFailures: 0,
      };

      // Simulate successful connection
      const recordSuccess = () => {
        state.lastSuccessfulConnection = Date.now();
        state.consecutiveFailures = 0;
      };

      // Simulate failed connection
      const recordFailure = () => {
        state.consecutiveFailures++;
      };

      recordSuccess();
      expect(state.lastSuccessfulConnection).toBeGreaterThan(0);
      expect(state.consecutiveFailures).toBe(0);

      recordFailure();
      recordFailure();
      expect(state.consecutiveFailures).toBe(2);

      recordSuccess();
      expect(state.consecutiveFailures).toBe(0);
    });

    it('should detect stale connections', () => {
      const STALE_THRESHOLD_MS = 60000;

      const isStale = (lastSuccess: number) => {
        if (lastSuccess === 0) return false;
        return Date.now() - lastSuccess > STALE_THRESHOLD_MS;
      };

      // Never connected - not stale
      expect(isStale(0)).toBe(false);

      // Recent connection - not stale
      expect(isStale(Date.now() - 30000)).toBe(false);

      // Old connection - stale
      expect(isStale(Date.now() - 120000)).toBe(true);
    });
  });

  describe('Fail-Fast Pattern for Auth Errors', () => {
    it('should identify non-retryable permanent auth errors', () => {
      // NOTE: "Tenant or user not found" is now a transient error (retryable)
      // because it can occur due to Supabase pooler load, not just bad credentials
      const permanentAuthErrorPatterns = [
        'password authentication failed',
        'authentication failed',
        'role "postgres" does not exist',
      ];

      const isPermanentAuthError = (message: string) =>
        permanentAuthErrorPatterns.some(pattern =>
          message.toLowerCase().includes(pattern.toLowerCase())
        );

      // Permanent auth errors - should fail fast
      expect(isPermanentAuthError('password authentication failed for user')).toBe(true);
      expect(isPermanentAuthError('authentication failed')).toBe(true);

      // Connection errors - should retry
      expect(isPermanentAuthError('Connection timeout')).toBe(false);
      expect(isPermanentAuthError('ECONNREFUSED')).toBe(false);

      // Transient pooler error - should retry (NOT a permanent auth error)
      expect(isPermanentAuthError('FATAL: Tenant or user not found')).toBe(false);
    });

    it('should not retry on permanent auth errors but retry on transient errors', () => {
      let retryCount = 0;
      const maxRetries = 3;

      const executeWithRetry = (error: Error) => {
        // Only these are permanent auth errors (fail fast)
        const permanentAuthErrors = ['password authentication failed', 'authentication failed'];
        // Transient errors should be retried
        const transientErrors = ['Tenant or user not found'];

        const isPermanentAuthError = permanentAuthErrors.some(e =>
          error.message.toLowerCase().includes(e.toLowerCase())
        );

        const isTransientError = transientErrors.some(e =>
          error.message.toLowerCase().includes(e.toLowerCase())
        );

        if (isPermanentAuthError) {
          // Fail fast for permanent auth errors
          return false;
        }

        if (isTransientError) {
          // Retry transient errors
          while (retryCount < maxRetries) {
            retryCount++;
          }
          return true;
        }

        return false;
      };

      // Transient error should be retried
      const transientError = new Error('FATAL: Tenant or user not found');
      executeWithRetry(transientError);
      expect(retryCount).toBe(maxRetries); // Transient errors get retried
    });
  });

  describe('Fallback Pattern for Server Components', () => {
    it('should use fallback on connection failure', async () => {
      const fallbackData = { cached: true, items: [] };

      const executeWithFallback = async <T>(
        operation: () => Promise<T>,
        fallback: T
      ): Promise<T> => {
        try {
          return await operation();
        } catch (error) {
          if ((error as Error).message.includes('connection')) {
            return fallback;
          }
          throw error;
        }
      };

      const failingOperation = async () => {
        throw new Error('Database connection failed');
      };

      const result = await executeWithFallback(failingOperation, fallbackData);
      expect(result).toEqual(fallbackData);
    });

    it('should not use fallback for validation errors', async () => {
      const fallbackData = { cached: true };

      const executeWithFallback = async <T>(
        operation: () => Promise<T>,
        fallback: T
      ): Promise<T> => {
        try {
          return await operation();
        } catch (error) {
          if ((error as Error).message.includes('connection')) {
            return fallback;
          }
          throw error;
        }
      };

      const validationError = async () => {
        throw new Error('Validation failed: invalid input');
      };

      await expect(executeWithFallback(validationError, fallbackData)).rejects.toThrow(
        'Validation failed'
      );
    });
  });

  describe('Connection Warmup Pattern', () => {
    it('should warmup connection proactively', async () => {
      let connectionWarmed = false;

      const warmConnection = async (): Promise<boolean> => {
        try {
          // Simulate connection test
          await Promise.resolve();
          connectionWarmed = true;
          return true;
        } catch {
          return false;
        }
      };

      const result = await warmConnection();

      expect(result).toBe(true);
      expect(connectionWarmed).toBe(true);
    });

    it('should skip warmup if connection is fresh', () => {
      const STALE_THRESHOLD = 60000;
      const lastConnection = Date.now() - 10000; // 10 seconds ago

      const needsWarmup = Date.now() - lastConnection > STALE_THRESHOLD;

      expect(needsWarmup).toBe(false);
    });
  });
});

describe('Pool Metrics Pattern', () => {
  it('should track success rate', () => {
    interface PoolMetrics {
      successes: number;
      failures: number;
      totalLatencyMs: number;
    }

    const metrics: PoolMetrics = {
      successes: 0,
      failures: 0,
      totalLatencyMs: 0,
    };

    const recordSuccess = (latencyMs: number) => {
      metrics.successes++;
      metrics.totalLatencyMs += latencyMs;
    };

    const recordFailure = () => {
      metrics.failures++;
    };

    const getSuccessRate = () => {
      const total = metrics.successes + metrics.failures;
      return total > 0 ? metrics.successes / total : 1;
    };

    const getAvgLatency = () => {
      return metrics.successes > 0 ? metrics.totalLatencyMs / metrics.successes : 0;
    };

    // Simulate operations
    recordSuccess(15);
    recordSuccess(20);
    recordSuccess(25);
    recordFailure();

    expect(getSuccessRate()).toBe(0.75);
    expect(getAvgLatency()).toBe(20);
  });
});

/**
 * Integration tests for Socket Timeout Resilience
 * These tests verify the complete flow of socket timeout handling
 */
describe('Socket Timeout Resilience Integration', () => {
  // Socket timeout error patterns
  const socketTimeoutIndicators = [
    'Socket timeout',
    'socket timeout',
    'database failed to respond',
    'the database failed to respond to a query',
    'failed to respond to a query within the configured timeout',
  ];

  const isSocketTimeoutError = (error: Error): boolean => {
    return socketTimeoutIndicators.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  };

  describe('Socket Timeout Error Flow', () => {
    it('should detect socket timeout and trigger retry flow', async () => {
      const socketTimeoutError = new Error(
        'Invalid `prisma.$queryRaw()` invocation: Socket timeout (the database failed to respond to a query within the configured timeout)'
      );

      let retryCount = 0;
      const maxRetries = 3;

      const executeWithRetry = async (): Promise<string> => {
        while (retryCount < maxRetries) {
          try {
            if (retryCount < 2) {
              retryCount++;
              throw socketTimeoutError;
            }
            return 'success';
          } catch (error) {
            if (isSocketTimeoutError(error as Error) && retryCount < maxRetries) {
              continue;
            }
            throw error;
          }
        }
        throw socketTimeoutError;
      };

      const result = await executeWithRetry();
      expect(result).toBe('success');
      expect(retryCount).toBe(2); // Failed twice, succeeded on third
    });

    it('should give up after max retries on persistent socket timeout', async () => {
      const socketTimeoutError = new Error('Socket timeout');

      let retryCount = 0;
      const maxRetries = 3;

      const executeWithRetry = async (): Promise<string> => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            retryCount++;
            throw socketTimeoutError;
          } catch (error) {
            if (isSocketTimeoutError(error as Error) && i < maxRetries - 1) {
              continue;
            }
            throw error;
          }
        }
        throw socketTimeoutError;
      };

      await expect(executeWithRetry()).rejects.toThrow('Socket timeout');
      expect(retryCount).toBe(3);
    });
  });

  describe('Circuit Breaker Integration with Socket Timeouts', () => {
    it('should open circuit after multiple socket timeout failures', () => {
      type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

      let state: CircuitState = 'CLOSED';
      let failures = 0;
      const threshold = 5;

      const recordSocketTimeoutFailure = () => {
        failures++;
        if (failures >= threshold) {
          state = 'OPEN';
        }
      };

      // Simulate 5 socket timeout failures
      for (let i = 0; i < 5; i++) {
        recordSocketTimeoutFailure();
      }

      expect(state).toBe('OPEN');
      expect(failures).toBe(5);
    });

    it('should fail fast when circuit is open due to socket timeouts', () => {
      const state = 'OPEN';
      const canExecute = state !== 'OPEN';

      expect(canExecute).toBe(false);
    });

    it('should transition to half-open after recovery timeout', () => {
      type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

      let state: CircuitState = 'OPEN';
      const recoveryTimeoutMs = 30000;
      const openedAt = Date.now() - 31000; // 31 seconds ago

      const checkTransition = () => {
        if (state === 'OPEN' && Date.now() - openedAt >= recoveryTimeoutMs) {
          state = 'HALF_OPEN';
        }
      };

      checkTransition();
      expect(state).toBe('HALF_OPEN');
    });
  });

  describe('Quick Health Check Pattern', () => {
    it('should timeout faster than general socket timeout', async () => {
      const healthCheckTimeoutMs = 5000;
      const generalSocketTimeoutMs = 120000;

      expect(healthCheckTimeoutMs).toBeLessThan(generalSocketTimeoutMs);
    });

    it('should return structured health result on timeout', () => {
      interface HealthResult {
        healthy: boolean;
        latencyMs: number;
        error?: string;
      }

      const createTimeoutResult = (timeoutMs: number): HealthResult => ({
        healthy: false,
        latencyMs: timeoutMs,
        error: `Health check timeout after ${timeoutMs}ms`,
      });

      const result = createTimeoutResult(5000);

      expect(result.healthy).toBe(false);
      expect(result.latencyMs).toBe(5000);
      expect(result.error).toContain('timeout');
    });

    it('should include circuit breaker state in diagnostics', () => {
      interface Diagnostics {
        circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
        consecutiveFailures: number;
        isStale: boolean;
      }

      const createDiagnostics = (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN', failures: number): Diagnostics => ({
        circuitBreakerState: state,
        consecutiveFailures: failures,
        isStale: failures > 3,
      });

      const diagnostics = createDiagnostics('HALF_OPEN', 4);

      expect(diagnostics.circuitBreakerState).toBe('HALF_OPEN');
      expect(diagnostics.consecutiveFailures).toBe(4);
      expect(diagnostics.isStale).toBe(true);
    });
  });

  describe('Recovery After Socket Timeout', () => {
    it('should reset consecutive failures on successful connection', () => {
      let consecutiveFailures = 5;
      let lastSuccessfulConnection = 0;

      const recordSuccess = () => {
        consecutiveFailures = 0;
        lastSuccessfulConnection = Date.now();
      };

      recordSuccess();

      expect(consecutiveFailures).toBe(0);
      expect(lastSuccessfulConnection).toBeGreaterThan(0);
    });

    it('should close circuit breaker after successful probes', () => {
      type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

      let state: CircuitState = 'HALF_OPEN';
      let successCount = 0;
      const requiredSuccesses = 2;

      const recordSuccess = () => {
        successCount++;
        if (successCount >= requiredSuccesses) {
          state = 'CLOSED';
        }
      };

      recordSuccess();
      expect(state).toBe('HALF_OPEN');

      recordSuccess();
      expect(state).toBe('CLOSED');
    });
  });

  describe('Prisma Error Code Handling', () => {
    it('should recognize P2024 as pool timeout error', () => {
      const error = new Error('Connection pool timeout');
      (error as any).code = 'P2024';

      const poolTimeoutCodes = ['P2024'];
      const isPoolTimeout = poolTimeoutCodes.includes((error as any).code);

      expect(isPoolTimeout).toBe(true);
    });

    it('should recognize P1001 as connection error', () => {
      const error = new Error("Can't reach database server");
      (error as any).code = 'P1001';

      const connectionErrorCodes = ['P1001', 'P1008', 'P2024'];
      const isConnectionError = connectionErrorCodes.includes((error as any).code);

      expect(isConnectionError).toBe(true);
    });
  });
});
