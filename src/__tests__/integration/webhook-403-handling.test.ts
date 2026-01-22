/**
 * Integration tests for webhook 403 merchant mismatch handling (Issue #46)
 *
 * Tests the complete flow when Square returns a 403 Forbidden error
 * due to accessing an order from a different merchant/environment.
 */

import { MerchantMismatchError, isNonRetryableError } from '@/lib/errors/webhook-errors';
import { determineShouldRetry } from '@/lib/webhook-retry-utils';

// Mock console to suppress test output
let consoleSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('Webhook 403 Merchant Mismatch Integration', () => {
  describe('Error Detection and Classification', () => {
    it('should correctly identify 403 errors as non-retryable', () => {
      // Simulate the exact error structure from Square SDK
      const squareApiError = {
        statusCode: 403,
        message: 'Cannot fetch orders for a different merchant',
        errors: [
          {
            code: 'FORBIDDEN',
            detail: 'Cannot fetch orders for a different merchant',
            category: 'AUTHENTICATION_ERROR',
          },
        ],
      };

      expect(isNonRetryableError(squareApiError)).toBe(true);
      expect(determineShouldRetry(squareApiError, 'order.created')).toBe(false);
    });

    it('should correctly identify MerchantMismatchError as non-retryable', () => {
      const error = new MerchantMismatchError(
        'sq_order_xyz789',
        'Cannot fetch orders for a different merchant'
      );

      expect(isNonRetryableError(error)).toBe(true);
      expect(determineShouldRetry(error, 'order.fulfillment.updated')).toBe(false);
    });
  });

  describe('Error Flow: Production Webhook to Development Server', () => {
    /**
     * This test simulates the scenario from Issue #46:
     * 1. A production Square account sends a webhook to a development server
     * 2. The development server has sandbox credentials configured
     * 3. When trying to fetch the order, Square returns 403
     * 4. The system should NOT queue this for retry
     */
    it('should not queue 403 errors for retry', () => {
      // Create the error that would be thrown by fetchAndCreateOrderFromSquare
      const error = new MerchantMismatchError(
        'sq_production_order_123',
        'Cannot fetch orders for a different merchant'
      );

      // Verify the error properties
      expect(error.httpStatusCode).toBe(403);
      expect(error.shouldRetry).toBe(false);
      expect(error.errorCode).toBe('MERCHANT_MISMATCH');

      // Verify determineShouldRetry returns false
      const shouldRetry = determineShouldRetry(error, 'order.created');
      expect(shouldRetry).toBe(false);
    });

    it('should not queue errors with merchant mismatch message patterns', () => {
      // Different variations of the merchant mismatch message
      const errorMessages = [
        'Cannot fetch orders for a different merchant',
        'Merchant mismatch: order belongs to different account',
        'Access to different merchant resources is forbidden',
        'Forbidden: cross-merchant access not allowed',
      ];

      errorMessages.forEach(message => {
        const error = { statusCode: 403, message };
        expect(determineShouldRetry(error, 'order.created')).toBe(false);
      });
    });
  });

  describe('Comparison: Retryable vs Non-Retryable Errors', () => {
    const testCases = [
      // Non-retryable errors (should return false)
      {
        name: '403 Merchant Mismatch',
        error: new MerchantMismatchError('order_1'),
        expected: false,
      },
      {
        name: '401 Unauthorized',
        error: { statusCode: 401, message: 'Invalid access token' },
        expected: false,
      },
      {
        name: '400 Bad Request',
        error: { statusCode: 400, message: 'Invalid request format' },
        expected: false,
      },
      {
        name: 'Validation Error',
        error: { message: 'Validation failed: invalid email' },
        expected: false,
      },
      {
        name: 'Foreign Key Constraint',
        error: { code: 'P2003', message: 'Foreign key constraint failed' },
        expected: false,
      },
      {
        name: 'Unknown Error',
        error: new Error('Some random error'),
        expected: false,
      },

      // Retryable errors (should return true)
      {
        name: '429 Rate Limit',
        error: { statusCode: 429, message: 'Rate limit exceeded' },
        expected: true,
      },
      {
        name: '500 Server Error',
        error: { statusCode: 500, message: 'Internal server error' },
        expected: true,
      },
      {
        name: '503 Service Unavailable',
        error: { statusCode: 503, message: 'Service temporarily unavailable' },
        expected: true,
      },
      {
        name: 'Database Connection Error',
        error: { code: 'P1001', message: "Can't reach database server" },
        expected: true,
      },
      {
        name: 'Race Condition (P2025)',
        error: { code: 'P2025', message: 'Record not found' },
        expected: true,
      },
      {
        name: 'Timeout Error',
        error: { message: 'Operation timed out after 30000ms' },
        expected: true,
      },
      {
        name: 'Connection Reset',
        error: { message: 'ECONNRESET' },
        expected: true,
      },
    ];

    testCases.forEach(({ name, error, expected }) => {
      it(`${name}: should ${expected ? '' : 'NOT '}retry`, () => {
        expect(determineShouldRetry(error, 'order.created')).toBe(expected);
      });
    });
  });

  describe('Event Type Independence', () => {
    /**
     * The retry decision for 403 errors should be the same
     * regardless of the webhook event type.
     */
    const eventTypes = [
      'order.created',
      'order.updated',
      'order.fulfillment.updated',
      'payment.created',
      'payment.updated',
      'refund.created',
      'refund.updated',
    ];

    const error403 = new MerchantMismatchError('order_123');

    eventTypes.forEach(eventType => {
      it(`should NOT retry 403 for ${eventType}`, () => {
        expect(determineShouldRetry(error403, eventType)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without statusCode but with message pattern', () => {
      // Some errors might not have statusCode but have merchant mismatch message
      const error = new Error('Request failed: Forbidden - cannot access different merchant');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should handle Square SDK error structure', () => {
      // Square SDK wraps errors in a specific structure
      const squareSdkError = {
        statusCode: 403,
        message: 'Response status code was unacceptable: 403.',
        result: {
          errors: [
            {
              category: 'AUTHENTICATION_ERROR',
              code: 'FORBIDDEN',
              detail: 'Cannot fetch orders for a different merchant',
            },
          ],
        },
      };

      expect(determineShouldRetry(squareSdkError, 'order.created')).toBe(false);
    });

    it('should handle error with both statusCode and retryable message', () => {
      // Even if message suggests retry, 403 status code takes precedence
      const error = {
        statusCode: 403,
        message: 'connection timeout', // Would normally be retryable
      };

      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should prioritize WebhookError shouldRetry over message patterns', () => {
      // A WebhookError with shouldRetry=false should not retry
      // even if it has a message that might otherwise suggest retry
      const error = new MerchantMismatchError('order_123');
      // Add a connection-like message that would normally be retryable
      (error as any).additionalMessage = 'connection issue during merchant check';

      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });
  });

  describe('Logging Verification', () => {
    it('should log appropriate message for 403 errors', () => {
      const error = { statusCode: 403, message: 'Forbidden' };
      determineShouldRetry(error, 'order.created');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RETRY-CHECK]')
      );
      // The log message says "Non-retryable error detected" for 403 errors caught by isNonRetryableError
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Non-retryable error detected')
      );
    });

    it('should log appropriate message for MerchantMismatchError', () => {
      const error = new MerchantMismatchError('order_123');
      determineShouldRetry(error, 'order.created');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebhookError detected')
      );
    });
  });
});
