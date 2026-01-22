/**
 * Custom error classes for webhook processing with retry metadata.
 *
 * These errors carry information about whether the error should trigger a retry,
 * preventing infinite retry loops for permanent failures like merchant mismatches.
 */

/**
 * Base class for webhook-related errors.
 * Carries metadata to determine retry behavior.
 */
export class WebhookError extends Error {
  /** Whether this error should trigger a webhook retry */
  readonly shouldRetry: boolean;

  /** HTTP status code associated with this error */
  readonly httpStatusCode: number;

  /** Error code for categorization */
  readonly errorCode: string;

  constructor(
    message: string,
    options: {
      shouldRetry: boolean;
      httpStatusCode: number;
      errorCode: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'WebhookError';
    this.shouldRetry = options.shouldRetry;
    this.httpStatusCode = options.httpStatusCode;
    this.errorCode = options.errorCode;
    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when trying to access an order from a different merchant.
 * This is a 403 Forbidden error that should NEVER be retried.
 *
 * Common causes:
 * - Production webhook received by development server with sandbox credentials
 * - Webhook routed to wrong environment
 */
export class MerchantMismatchError extends WebhookError {
  readonly squareOrderId: string;

  constructor(squareOrderId: string, originalMessage?: string) {
    super(
      `Cannot fetch order ${squareOrderId} for a different merchant. ` +
        `This webhook may be from a different Square environment. ` +
        (originalMessage ? `Original error: ${originalMessage}` : ''),
      {
        shouldRetry: false,
        httpStatusCode: 403,
        errorCode: 'MERCHANT_MISMATCH',
      }
    );
    this.name = 'MerchantMismatchError';
    this.squareOrderId = squareOrderId;
  }
}

/**
 * Error thrown when the Square API returns 401 Unauthorized.
 * This indicates invalid or expired credentials and should NOT be retried.
 */
export class UnauthorizedError extends WebhookError {
  readonly service: string;

  constructor(service: string, originalMessage?: string) {
    super(
      `Unauthorized access to ${service}. Check API credentials. ` +
        (originalMessage ? `Original error: ${originalMessage}` : ''),
      {
        shouldRetry: false,
        httpStatusCode: 401,
        errorCode: 'UNAUTHORIZED',
      }
    );
    this.name = 'UnauthorizedError';
    this.service = service;
  }
}

/**
 * Error thrown when the Square API returns 400 Bad Request.
 * This indicates malformed request data and should NOT be retried.
 */
export class BadRequestError extends WebhookError {
  readonly operation: string;

  constructor(operation: string, originalMessage?: string) {
    super(
      `Bad request during ${operation}. The request data is invalid. ` +
        (originalMessage ? `Original error: ${originalMessage}` : ''),
      {
        shouldRetry: false,
        httpStatusCode: 400,
        errorCode: 'BAD_REQUEST',
      }
    );
    this.name = 'BadRequestError';
    this.operation = operation;
  }
}

/**
 * Error thrown when the Square API returns 404 Not Found.
 * This indicates the resource doesn't exist and should NOT be retried.
 */
export class ResourceNotFoundError extends WebhookError {
  readonly resourceType: string;
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string, originalMessage?: string) {
    super(
      `${resourceType} ${resourceId} not found in Square. ` +
        (originalMessage ? `Original error: ${originalMessage}` : ''),
      {
        shouldRetry: false,
        httpStatusCode: 404,
        errorCode: 'NOT_FOUND',
      }
    );
    this.name = 'ResourceNotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error thrown when the Square API returns 429 Too Many Requests.
 * This indicates rate limiting and SHOULD be retried with backoff.
 */
export class RateLimitError extends WebhookError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs?: number) {
    const retryDelay = retryAfterMs ?? 60000; // Default to 60 seconds
    super(`Rate limited by Square API. Retry after ${retryDelay}ms.`, {
      shouldRetry: true,
      httpStatusCode: 429,
      errorCode: 'RATE_LIMITED',
    });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryDelay;
  }
}

/**
 * Error thrown for transient server errors (5xx).
 * These SHOULD be retried.
 */
export class ServerError extends WebhookError {
  constructor(statusCode: number, originalMessage?: string) {
    super(
      `Square API server error (${statusCode}). ` +
        (originalMessage ? `Original error: ${originalMessage}` : ''),
      {
        shouldRetry: true,
        httpStatusCode: statusCode,
        errorCode: 'SERVER_ERROR',
      }
    );
    this.name = 'ServerError';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is a WebhookError.
 */
export function isWebhookError(error: unknown): error is WebhookError {
  return error instanceof WebhookError;
}

/**
 * Check if an error should NOT be retried.
 * Returns true for:
 * - WebhookError instances with shouldRetry === false
 * - Errors with 4xx HTTP status codes (except 429)
 * - Errors with merchant mismatch messages
 */
export function isNonRetryableError(error: unknown): boolean {
  // Check WebhookError first
  if (isWebhookError(error)) {
    return !error.shouldRetry;
  }

  // Check for error-like objects with status codes
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;

    // Extract status code from various properties
    const statusCode =
      (errorObj.statusCode as number) ||
      (errorObj.status as number) ||
      (errorObj.httpStatusCode as number);

    if (statusCode) {
      // 4xx errors (except 429 rate limit) are non-retryable
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        return true;
      }
    }

    // Check for merchant mismatch message patterns
    const message = (errorObj.message as string) || '';
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes('merchant mismatch') ||
        lowerMessage.includes('different merchant') ||
        lowerMessage.includes('cannot fetch orders for a different') ||
        lowerMessage.includes('forbidden')
      ) {
        return true;
      }
    }
  }

  // Check Error instances with message
  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes('merchant mismatch') ||
      lowerMessage.includes('different merchant') ||
      lowerMessage.includes('cannot fetch orders for a different') ||
      lowerMessage.includes('forbidden')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an error indicates a retryable condition.
 */
export function isRetryableError(error: unknown): boolean {
  // WebhookError with shouldRetry flag
  if (isWebhookError(error)) {
    return error.shouldRetry;
  }

  // Check for error-like objects
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;

    const statusCode =
      (errorObj.statusCode as number) ||
      (errorObj.status as number) ||
      (errorObj.httpStatusCode as number);

    if (statusCode) {
      // Rate limit (429) is retryable
      if (statusCode === 429) return true;
      // Server errors (5xx) are retryable
      if (statusCode >= 500) return true;
      // Client errors (4xx except 429) are not retryable
      if (statusCode >= 400 && statusCode < 500) return false;
    }
  }

  // Default: unknown errors are NOT retryable (safer than infinite retries)
  return false;
}
