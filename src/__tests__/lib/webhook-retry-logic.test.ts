/**
 * Unit tests for webhook retry logic (Issue #46 fix)
 *
 * Tests the determineShouldRetry function to ensure:
 * - 403 Forbidden errors are NOT retried (merchant mismatch)
 * - 401 Unauthorized errors are NOT retried
 * - 400 Bad Request errors are NOT retried
 * - 429 Rate Limit errors ARE retried
 * - 5xx Server errors ARE retried
 * - Unknown errors are NOT retried (new default behavior)
 */

import { determineShouldRetry } from '@/lib/webhook-retry-utils';
import {
  MerchantMismatchError,
  UnauthorizedError,
  BadRequestError,
  RateLimitError,
  ServerError,
} from '@/lib/errors/webhook-errors';

// Mock console to suppress test output
let consoleSpy: jest.SpyInstance;

beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe('determineShouldRetry', () => {
  describe('HTTP Status Code Handling', () => {
    it('should NOT retry 403 Forbidden errors', () => {
      const error = { statusCode: 403, message: 'Forbidden' };
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should NOT retry 401 Unauthorized errors', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      expect(determineShouldRetry(error, 'payment.created')).toBe(false);
    });

    it('should NOT retry 400 Bad Request errors', () => {
      const error = { statusCode: 400, message: 'Bad Request' };
      expect(determineShouldRetry(error, 'order.updated')).toBe(false);
    });

    it('should NOT retry 404 Not Found errors', () => {
      const error = { statusCode: 404, message: 'Not Found' };
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should retry 429 Rate Limit errors', () => {
      const error = { statusCode: 429, message: 'Too Many Requests' };
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry 500 Server errors', () => {
      const error = { statusCode: 500, message: 'Internal Server Error' };
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry 502 Bad Gateway errors', () => {
      const error = { statusCode: 502, message: 'Bad Gateway' };
      expect(determineShouldRetry(error, 'payment.updated')).toBe(true);
    });

    it('should retry 503 Service Unavailable errors', () => {
      const error = { statusCode: 503, message: 'Service Unavailable' };
      expect(determineShouldRetry(error, 'order.fulfillment.updated')).toBe(true);
    });

    it('should handle errors with status property instead of statusCode', () => {
      const error = { status: 403, message: 'Forbidden' };
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should handle errors with httpStatusCode property', () => {
      const error = { httpStatusCode: 401, message: 'Unauthorized' };
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });
  });

  describe('Custom WebhookError Handling', () => {
    it('should NOT retry MerchantMismatchError', () => {
      const error = new MerchantMismatchError('order_123');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should NOT retry UnauthorizedError', () => {
      const error = new UnauthorizedError('Square API');
      expect(determineShouldRetry(error, 'payment.created')).toBe(false);
    });

    it('should NOT retry BadRequestError', () => {
      const error = new BadRequestError('fetchOrder');
      expect(determineShouldRetry(error, 'order.updated')).toBe(false);
    });

    it('should retry RateLimitError', () => {
      const error = new RateLimitError(30000);
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry ServerError', () => {
      const error = new ServerError(503, 'Service Unavailable');
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });
  });

  describe('Merchant Mismatch Message Patterns', () => {
    it('should NOT retry errors with "merchant mismatch" message', () => {
      const error = new Error('merchant mismatch detected');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should NOT retry errors with "different merchant" message', () => {
      const error = new Error('Cannot access different merchant data');
      expect(determineShouldRetry(error, 'order.updated')).toBe(false);
    });

    it('should NOT retry errors with "cannot fetch orders for a different" message', () => {
      const error = new Error('Cannot fetch orders for a different merchant');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should NOT retry errors with "forbidden" message', () => {
      const error = new Error('Access forbidden');
      expect(determineShouldRetry(error, 'payment.created')).toBe(false);
    });

    it('should be case-insensitive for message matching', () => {
      const error = new Error('MERCHANT MISMATCH DETECTED');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });
  });

  describe('Prisma Error Handling', () => {
    it('should retry P2025 record not found errors (race conditions)', () => {
      const error = { code: 'P2025', message: 'Record not found' };
      expect(determineShouldRetry(error, 'order.updated')).toBe(true);
    });

    it('should retry P1001 database connection errors', () => {
      const error = { code: 'P1001', message: 'Cannot reach database server' };
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry P1008 database timeout errors', () => {
      const error = { code: 'P1008', message: 'Operations timed out' };
      expect(determineShouldRetry(error, 'payment.created')).toBe(true);
    });

    it('should retry P1017 server closed connection errors', () => {
      const error = { code: 'P1017', message: 'Server has closed the connection' };
      expect(determineShouldRetry(error, 'order.fulfillment.updated')).toBe(true);
    });

    it('should NOT retry P2003 foreign key constraint errors', () => {
      const error = { code: 'P2003', message: 'Foreign key constraint failed' };
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });
  });

  describe('Connection Error Messages', () => {
    it('should retry "connection" errors', () => {
      const error = new Error('Database connection failed');
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry "ECONNRESET" errors', () => {
      const error = new Error('ECONNRESET: Connection reset by peer');
      expect(determineShouldRetry(error, 'payment.updated')).toBe(true);
    });

    it('should retry "Can\'t reach database server" errors', () => {
      const error = new Error("Can't reach database server");
      expect(determineShouldRetry(error, 'order.updated')).toBe(true);
    });

    it('should retry "connection terminated" errors', () => {
      const error = new Error('connection terminated unexpectedly');
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry "Engine is not yet connected" errors', () => {
      const error = new Error('Engine is not yet connected');
      expect(determineShouldRetry(error, 'refund.created')).toBe(true);
    });
  });

  describe('Timeout Error Handling', () => {
    it('should retry timeout errors', () => {
      const error = new Error('Request timeout');
      expect(determineShouldRetry(error, 'order.created')).toBe(true);
    });

    it('should retry "timed out after" errors', () => {
      const error = new Error('Operation timed out after 30000ms');
      expect(determineShouldRetry(error, 'payment.created')).toBe(true);
    });

    it('should retry TIMEOUT code errors', () => {
      const error = { code: 'TIMEOUT', message: 'Request timed out' };
      expect(determineShouldRetry(error, 'order.updated')).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should NOT retry validation errors', () => {
      const error = new Error('Validation failed: invalid email');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });
  });

  describe('Default Behavior (Critical Fix for Issue #46)', () => {
    it('should NOT retry unknown errors by default', () => {
      const error = new Error('Some unknown error');
      expect(determineShouldRetry(error, 'order.created')).toBe(false);
    });

    it('should NOT retry errors without status codes or recognized patterns', () => {
      const error = { message: 'Unexpected condition occurred' };
      expect(determineShouldRetry(error, 'payment.updated')).toBe(false);
    });

    it('should NOT retry null/undefined errors', () => {
      expect(determineShouldRetry(null, 'order.created')).toBe(false);
      expect(determineShouldRetry(undefined, 'order.created')).toBe(false);
    });

    it('should NOT retry empty error objects', () => {
      expect(determineShouldRetry({}, 'order.created')).toBe(false);
    });
  });

  describe('Real-world Scenario: 403 Merchant Mismatch', () => {
    /**
     * This test simulates the exact scenario from Issue #46:
     * Production webhook arrives at a development server with sandbox credentials.
     * The Square API returns 403 "Cannot fetch orders for a different merchant".
     */
    it('should NOT retry the exact error from Issue #46', () => {
      // Simulate the error from Square SDK when accessing wrong merchant
      const error = {
        statusCode: 403,
        message: 'Cannot fetch orders for a different merchant',
        code: 'FORBIDDEN',
      };

      expect(determineShouldRetry(error, 'order.created')).toBe(false);
      expect(determineShouldRetry(error, 'order.updated')).toBe(false);
      expect(determineShouldRetry(error, 'payment.created')).toBe(false);
    });

    it('should NOT retry MerchantMismatchError thrown by fetchAndCreateOrderFromSquare', () => {
      const error = new MerchantMismatchError(
        'sq_order_abc123',
        'Cannot fetch orders for a different merchant'
      );

      expect(determineShouldRetry(error, 'order.fulfillment.updated')).toBe(false);
    });
  });
});
