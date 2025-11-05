/**
 * HTTP Timeout Utilities Test Suite
 *
 * Tests timeout handling for HTTP requests and async operations.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 */

import {
  withTimeout,
  withTimeoutAndRetry,
  createTimeoutController,
  fetchWithTimeout,
  TimeoutError,
  isTimeoutError,
  isNetworkError,
} from '@/lib/utils/http-timeout';

describe('HTTP Timeout Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('withTimeout', () => {
    test('should resolve when promise completes before timeout', async () => {
      const fastPromise = Promise.resolve('success');

      const result = await withTimeout(fastPromise, 1000);

      expect(result).toBe('success');
    });

    test('should reject with TimeoutError when promise exceeds timeout', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('too slow'), 2000));

      await expect(withTimeout(slowPromise, 100)).rejects.toThrow(TimeoutError);
      await expect(withTimeout(slowPromise, 100)).rejects.toThrow(/timed out after 100ms/);
    });

    test('should include operation name in timeout error', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('too slow'), 2000));

      try {
        await withTimeout(slowPromise, 100, undefined, 'fetchUserData');
        fail('Should have thrown TimeoutError');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).message).toContain('fetchUserData');
        expect((error as TimeoutError).operationName).toBe('fetchUserData');
      }
    });

    test('should use custom error message when provided', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('too slow'), 2000));

      await expect(withTimeout(slowPromise, 100, 'Custom timeout message')).rejects.toThrow(
        'Custom timeout message'
      );
    });

    test('should propagate original error when promise rejects', async () => {
      const failingPromise = Promise.reject(new Error('Original error'));

      await expect(withTimeout(failingPromise, 1000)).rejects.toThrow('Original error');
    });

    test('should clear timeout when promise resolves', async () => {
      jest.useFakeTimers();

      const promise = Promise.resolve('quick');
      const result = await withTimeout(promise, 1000);

      expect(result).toBe('quick');

      // Verify no timeout fires
      jest.advanceTimersByTime(2000);
      // No additional expectations - just ensuring no timeout error is thrown

      jest.useRealTimers();
    });

    test('should handle concurrent timeout operations', async () => {
      const promises = [
        withTimeout(Promise.resolve('result1'), 100),
        withTimeout(Promise.resolve('result2'), 200),
        withTimeout(Promise.resolve('result3'), 150),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    test('should timeout correctly with very short timeout', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('too slow'), 100));

      await expect(withTimeout(slowPromise, 10)).rejects.toThrow(TimeoutError);
    });
  });

  describe('withTimeoutAndRetry', () => {
    test('should succeed on first attempt if promise resolves quickly', async () => {
      let attempts = 0;
      const promiseFactory = () => {
        attempts++;
        return Promise.resolve('success');
      };

      const result = await withTimeoutAndRetry(promiseFactory, {
        timeoutMs: 1000,
        maxRetries: 3,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    test('should retry on timeout errors', async () => {
      let attempts = 0;
      const promiseFactory = () => {
        attempts++;
        if (attempts < 3) {
          return new Promise((resolve) => setTimeout(() => resolve('too slow'), 2000));
        }
        return Promise.resolve('success');
      };

      const result = await withTimeoutAndRetry(promiseFactory, {
        timeoutMs: 100,
        maxRetries: 3,
        retryDelayMs: 50,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    }, 10000);

    test('should use exponential backoff when configured', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const promiseFactory = () => {
        attempts++;
        if (attempts < 4) {
          return new Promise((resolve) => setTimeout(() => resolve('too slow'), 2000));
        }
        return Promise.resolve('success');
      };

      const startTime = Date.now();
      await withTimeoutAndRetry(promiseFactory, {
        timeoutMs: 100,
        maxRetries: 3,
        retryDelayMs: 100,
        exponentialBackoff: true,
      });

      const totalTime = Date.now() - startTime;

      // With exponential backoff: 100ms, 200ms, 400ms + timeout attempts
      // Total should be at least 700ms (delays + timeouts)
      expect(totalTime).toBeGreaterThan(500);
      expect(attempts).toBe(4);
    }, 15000);

    test('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const promiseFactory = () => {
        attempts++;
        return Promise.reject(new Error('Non-retryable error'));
      };

      await expect(
        withTimeoutAndRetry(promiseFactory, {
          timeoutMs: 1000,
          maxRetries: 3,
        })
      ).rejects.toThrow('Non-retryable error');

      expect(attempts).toBe(1); // Only one attempt, no retries
    });

    test('should use custom isRetryable function', async () => {
      let attempts = 0;
      const promiseFactory = () => {
        attempts++;
        return Promise.reject(new Error('CUSTOM_RETRYABLE_ERROR'));
      };

      const isRetryable = (error: Error) => error.message.includes('CUSTOM_RETRYABLE');

      await expect(
        withTimeoutAndRetry(promiseFactory, {
          timeoutMs: 100,
          maxRetries: 2,
          retryDelayMs: 10,
          isRetryable,
        })
      ).rejects.toThrow('CUSTOM_RETRYABLE_ERROR');

      expect(attempts).toBe(3); // Initial + 2 retries
    }, 5000);

    test('should respect maxDelayMs cap', async () => {
      let attempts = 0;
      const promiseFactory = () => {
        attempts++;
        if (attempts < 5) {
          return new Promise((resolve) => setTimeout(() => resolve('too slow'), 2000));
        }
        return Promise.resolve('success');
      };

      await withTimeoutAndRetry(promiseFactory, {
        timeoutMs: 100,
        maxRetries: 4,
        retryDelayMs: 5000, // Large base delay
        exponentialBackoff: true,
        maxDelayMs: 500, // Cap at 500ms
      });

      // Each retry should be capped at 500ms + jitter
      expect(attempts).toBe(5);
    }, 15000);

    test('should log retry attempts when operation name is provided', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      let attempts = 0;
      const promiseFactory = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('ETIMEDOUT'));
        }
        return Promise.resolve('success');
      };

      await withTimeoutAndRetry(promiseFactory, {
        timeoutMs: 1000,
        maxRetries: 3,
        retryDelayMs: 10,
        operationName: 'testOperation',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[testOperation]'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    }, 5000);
  });

  describe('createTimeoutController', () => {
    test('should create AbortController with timeout', () => {
      const { controller, cleanup } = createTimeoutController(1000);

      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);

      cleanup();
    });

    test('should abort controller after timeout', async () => {
      jest.useFakeTimers();

      const { controller, cleanup } = createTimeoutController(100);

      expect(controller.signal.aborted).toBe(false);

      jest.advanceTimersByTime(150);

      expect(controller.signal.aborted).toBe(true);

      cleanup();
      jest.useRealTimers();
    });

    test('should allow manual cleanup before timeout', () => {
      jest.useFakeTimers();

      const { controller, cleanup } = createTimeoutController(1000);

      cleanup();
      jest.advanceTimersByTime(2000);

      expect(controller.signal.aborted).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('fetchWithTimeout', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('should complete fetch within timeout', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      });

      const response = await fetchWithTimeout('https://api.example.com/data', {}, 5000);

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    test('should throw TimeoutError on abort', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          })
      );

      await expect(fetchWithTimeout('https://api.example.com/data', {}, 100)).rejects.toThrow(
        TimeoutError
      );
    });

    test('should pass fetch options correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      await fetchWithTimeout('https://api.example.com/data', options, 5000);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          ...options,
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('TimeoutError', () => {
    test('should create TimeoutError with correct properties', () => {
      const error = new TimeoutError('Timeout message', 5000, 'testOp');

      expect(error).toBeInstanceOf(TimeoutError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Timeout message');
      expect(error.timeoutMs).toBe(5000);
      expect(error.operationName).toBe('testOp');
      expect(error.name).toBe('TimeoutError');
    });

    test('should work without operation name', () => {
      const error = new TimeoutError('Timeout message', 3000);

      expect(error.message).toBe('Timeout message');
      expect(error.timeoutMs).toBe(3000);
      expect(error.operationName).toBeUndefined();
    });
  });

  describe('isTimeoutError', () => {
    test('should return true for TimeoutError instances', () => {
      const error = new TimeoutError('Timeout', 1000);

      expect(isTimeoutError(error)).toBe(true);
    });

    test('should return false for non-TimeoutError instances', () => {
      expect(isTimeoutError(new Error('Regular error'))).toBe(false);
      expect(isTimeoutError('string')).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    test('should return true for network-related errors', () => {
      expect(isNetworkError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isNetworkError(new Error('ECONNRESET'))).toBe(true);
      expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true);
      expect(isNetworkError(new Error('ENETUNREACH'))).toBe(true);
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
      expect(isNetworkError(new Error('Request timed out'))).toBe(true);
    });

    test('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('Payment declined'))).toBe(false);
      expect(isNetworkError(new Error('Invalid input'))).toBe(false);
      expect(isNetworkError('string')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });
});
