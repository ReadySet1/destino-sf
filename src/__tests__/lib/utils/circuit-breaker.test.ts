/**
 * Circuit Breaker Test Suite
 *
 * Tests circuit breaker state machine and failure handling.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 */

import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerError,
  isCircuitBreakerError,
} from '@/lib/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('State Machine - CLOSED State', () => {
    test('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
        serviceName: 'testService',
      });

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should execute requests successfully in CLOSED state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      const result = await breaker.execute(async () => 'success');

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should track successful executions', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(0);
    });

    test('should track failed executions', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.consecutiveFailures).toBe(1);
    });

    test('should reset consecutive failures on success', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      // Fail once
      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch {}

      // Then succeed
      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.consecutiveFailures).toBe(0); // Reset on success
    });
  });

  describe('State Machine - OPEN State', () => {
    test('should transition to OPEN after threshold failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
        serviceName: 'testService',
      });

      // Cause 3 failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('should reject requests immediately when OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
        serviceName: 'testService',
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      // Try to execute - should fail immediately
      await expect(breaker.execute(async () => 'should not execute')).rejects.toThrow(
        CircuitBreakerError
      );
    });

    test('should include service name in error when OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
        serviceName: 'MyService',
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      // Verify error message
      try {
        await breaker.execute(async () => 'test');
        fail('Should have thrown CircuitBreakerError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerError);
        expect((error as CircuitBreakerError).serviceName).toBe('MyService');
        expect((error as CircuitBreakerError).state).toBe(CircuitState.OPEN);
      }
    });

    test('should transition to HALF_OPEN after reset timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
        serviceName: 'testService',
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Advance time past reset timeout
      jest.advanceTimersByTime(6000);

      // Next request should find circuit in HALF_OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('Still failing');
        });
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.OPEN); // Back to OPEN after failure
    });
  });

  describe('State Machine - HALF_OPEN State', () => {
    test('should allow limited requests in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        halfOpenRequests: 3,
        serviceName: 'testService',
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      // Wait for reset timeout
      jest.advanceTimersByTime(1100);

      // Should allow halfOpenRequests (3) attempts
      const results = [];
      for (let i = 0; i < 3; i++) {
        try {
          results.push(await breaker.execute(async () => `success-${i}`));
        } catch (error) {
          results.push(error);
        }
      }

      expect(results).toHaveLength(3);
      expect(results.every(r => typeof r === 'string')).toBe(true);
    });

    test('should transition to CLOSED after successful HALF_OPEN requests', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        halfOpenRequests: 2,
        serviceName: 'testService',
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset
      jest.advanceTimersByTime(1100);

      // Succeed in HALF_OPEN
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('should transition back to OPEN on HALF_OPEN failure', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        halfOpenRequests: 2,
        serviceName: 'testService',
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      // Wait for reset
      jest.advanceTimersByTime(1100);

      // Fail in HALF_OPEN - should immediately go back to OPEN
      try {
        await breaker.execute(async () => {
          throw new Error('Still failing');
        });
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Custom Failure Detection', () => {
    test('should use custom isFailure function', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
        serviceName: 'testService',
        isFailure: (error: Error) => {
          // Only count "CRITICAL" errors as failures
          return error.message.includes('CRITICAL');
        },
      });

      // This error should NOT count as failure
      try {
        await breaker.execute(async () => {
          throw new Error('Minor error');
        });
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // These errors SHOULD count as failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('CRITICAL error');
          });
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('should not count validation errors as failures by default', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
      });

      // Validation errors should not count
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Validation failed');
          });
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track last failure time', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      const beforeTime = Date.now();

      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch {}

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
    });

    test('should track last success time', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      const beforeTime = Date.now();

      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.lastSuccessTime).toBeGreaterThanOrEqual(beforeTime);
    });

    test('should provide complete statistics', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      await breaker.execute(async () => 'success');

      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch {}

      const stats = breaker.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('successes');
      expect(stats).toHaveProperty('consecutiveFailures');
      expect(stats).toHaveProperty('lastFailureTime');
      expect(stats).toHaveProperty('lastSuccessTime');
      expect(stats).toHaveProperty('halfOpenAttempts');
    });
  });

  describe('Manual Reset', () => {
    test('should allow manual reset of circuit', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Manually reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.consecutiveFailures).toBe(0);
    });
  });

  describe('Error Type Detection', () => {
    test('isCircuitBreakerError should correctly identify circuit breaker errors', () => {
      const error = new CircuitBreakerError('test', 'testService', CircuitState.OPEN);

      expect(isCircuitBreakerError(error)).toBe(true);
      expect(isCircuitBreakerError(new Error('regular error'))).toBe(false);
      expect(isCircuitBreakerError('string')).toBe(false);
      expect(isCircuitBreakerError(null)).toBe(false);
      expect(isCircuitBreakerError(undefined)).toBe(false);
    });

    test('CircuitBreakerError should have correct properties', () => {
      const error = new CircuitBreakerError('Circuit is open', 'MyService', CircuitState.OPEN);

      expect(error.name).toBe('CircuitBreakerError');
      expect(error.message).toBe('Circuit is open');
      expect(error.serviceName).toBe('MyService');
      expect(error.state).toBe(CircuitState.OPEN);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle concurrent successful requests', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 5000,
      });

      const requests = Array.from({ length: 10 }, (_, i) =>
        breaker.execute(async () => `result-${i}`)
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().successes).toBe(10);
    });

    test('should handle concurrent failing requests', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      const requests = Array.from({ length: 5 }, () =>
        breaker
          .execute(async () => {
            throw new Error('Failure');
          })
          .catch(e => e)
      );

      await Promise.all(requests);

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getStats().failures).toBe(5);
    });
  });
});
