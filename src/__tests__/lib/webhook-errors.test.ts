import {
  WebhookError,
  MerchantMismatchError,
  UnauthorizedError,
  BadRequestError,
  ResourceNotFoundError,
  RateLimitError,
  ServerError,
  isWebhookError,
  isNonRetryableError,
  isRetryableError,
} from '@/lib/errors/webhook-errors';

describe('Webhook Error Classes', () => {
  describe('WebhookError base class', () => {
    it('should create error with all required properties', () => {
      const error = new WebhookError('Test error', {
        shouldRetry: false,
        httpStatusCode: 400,
        errorCode: 'TEST_ERROR',
      });

      expect(error.message).toBe('Test error');
      expect(error.shouldRetry).toBe(false);
      expect(error.httpStatusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.name).toBe('WebhookError');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new WebhookError('Wrapped error', {
        shouldRetry: false,
        httpStatusCode: 500,
        errorCode: 'WRAPPED',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('MerchantMismatchError', () => {
    it('should create 403 error that never retries', () => {
      const error = new MerchantMismatchError('order_123');

      expect(error.name).toBe('MerchantMismatchError');
      expect(error.shouldRetry).toBe(false);
      expect(error.httpStatusCode).toBe(403);
      expect(error.errorCode).toBe('MERCHANT_MISMATCH');
      expect(error.squareOrderId).toBe('order_123');
      expect(error.message).toContain('order_123');
      expect(error.message).toContain('different merchant');
    });

    it('should include original message when provided', () => {
      const error = new MerchantMismatchError('order_456', 'Cannot fetch orders for a different merchant');

      expect(error.message).toContain('Original error: Cannot fetch orders for a different merchant');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error that never retries', () => {
      const error = new UnauthorizedError('Square API');

      expect(error.name).toBe('UnauthorizedError');
      expect(error.shouldRetry).toBe(false);
      expect(error.httpStatusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
      expect(error.service).toBe('Square API');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error that never retries', () => {
      const error = new BadRequestError('fetchOrder', 'Invalid order ID format');

      expect(error.name).toBe('BadRequestError');
      expect(error.shouldRetry).toBe(false);
      expect(error.httpStatusCode).toBe(400);
      expect(error.errorCode).toBe('BAD_REQUEST');
      expect(error.operation).toBe('fetchOrder');
    });
  });

  describe('ResourceNotFoundError', () => {
    it('should create 404 error that never retries', () => {
      const error = new ResourceNotFoundError('Order', 'order_789');

      expect(error.name).toBe('ResourceNotFoundError');
      expect(error.shouldRetry).toBe(false);
      expect(error.httpStatusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.resourceType).toBe('Order');
      expect(error.resourceId).toBe('order_789');
    });
  });

  describe('RateLimitError', () => {
    it('should create 429 error that SHOULD retry', () => {
      const error = new RateLimitError(30000);

      expect(error.name).toBe('RateLimitError');
      expect(error.shouldRetry).toBe(true);
      expect(error.httpStatusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMITED');
      expect(error.retryAfterMs).toBe(30000);
    });

    it('should use default retry delay when not provided', () => {
      const error = new RateLimitError();

      expect(error.retryAfterMs).toBe(60000); // Default 60 seconds
    });
  });

  describe('ServerError', () => {
    it('should create 5xx error that SHOULD retry', () => {
      const error = new ServerError(503, 'Service Unavailable');

      expect(error.name).toBe('ServerError');
      expect(error.shouldRetry).toBe(true);
      expect(error.httpStatusCode).toBe(503);
      expect(error.errorCode).toBe('SERVER_ERROR');
    });
  });
});

describe('Type Guards', () => {
  describe('isWebhookError', () => {
    it('should return true for WebhookError instances', () => {
      const error = new MerchantMismatchError('order_123');
      expect(isWebhookError(error)).toBe(true);
    });

    it('should return true for base WebhookError', () => {
      const error = new WebhookError('Test', {
        shouldRetry: false,
        httpStatusCode: 400,
        errorCode: 'TEST',
      });
      expect(isWebhookError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isWebhookError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isWebhookError(null)).toBe(false);
      expect(isWebhookError(undefined)).toBe(false);
      expect(isWebhookError('string error')).toBe(false);
      expect(isWebhookError({ message: 'object error' })).toBe(false);
    });
  });

  describe('isNonRetryableError', () => {
    it('should return true for 403 MerchantMismatchError', () => {
      const error = new MerchantMismatchError('order_123');
      expect(isNonRetryableError(error)).toBe(true);
    });

    it('should return true for 401 UnauthorizedError', () => {
      const error = new UnauthorizedError('Square API');
      expect(isNonRetryableError(error)).toBe(true);
    });

    it('should return true for 400 BadRequestError', () => {
      const error = new BadRequestError('operation');
      expect(isNonRetryableError(error)).toBe(true);
    });

    it('should return false for 429 RateLimitError', () => {
      const error = new RateLimitError();
      expect(isNonRetryableError(error)).toBe(false);
    });

    it('should return false for 5xx ServerError', () => {
      const error = new ServerError(500);
      expect(isNonRetryableError(error)).toBe(false);
    });

    it('should return true for error objects with 4xx status codes', () => {
      const error = { statusCode: 403, message: 'Forbidden' };
      expect(isNonRetryableError(error)).toBe(true);
    });

    it('should return true for error objects with status property', () => {
      const error = { status: 401, message: 'Unauthorized' };
      expect(isNonRetryableError(error)).toBe(true);
    });

    it('should return false for 429 status code (rate limit)', () => {
      const error = { statusCode: 429, message: 'Too Many Requests' };
      expect(isNonRetryableError(error)).toBe(false);
    });

    it('should return true for merchant mismatch message patterns', () => {
      const error1 = new Error('Cannot fetch orders for a different merchant');
      expect(isNonRetryableError(error1)).toBe(true);

      const error2 = new Error('Merchant mismatch detected');
      expect(isNonRetryableError(error2)).toBe(true);

      const error3 = { message: 'Forbidden access' };
      expect(isNonRetryableError(error3)).toBe(true);
    });

    it('should return false for regular Error without status code', () => {
      const error = new Error('Something went wrong');
      expect(isNonRetryableError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for RateLimitError', () => {
      const error = new RateLimitError();
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ServerError', () => {
      const error = new ServerError(503);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for MerchantMismatchError', () => {
      const error = new MerchantMismatchError('order_123');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return true for 429 status code', () => {
      const error = { statusCode: 429 };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 5xx status codes', () => {
      expect(isRetryableError({ statusCode: 500 })).toBe(true);
      expect(isRetryableError({ statusCode: 502 })).toBe(true);
      expect(isRetryableError({ statusCode: 503 })).toBe(true);
    });

    it('should return false for 4xx status codes (except 429)', () => {
      expect(isRetryableError({ statusCode: 400 })).toBe(false);
      expect(isRetryableError({ statusCode: 401 })).toBe(false);
      expect(isRetryableError({ statusCode: 403 })).toBe(false);
      expect(isRetryableError({ statusCode: 404 })).toBe(false);
    });

    it('should return false for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(isRetryableError(error)).toBe(false);
    });
  });
});
