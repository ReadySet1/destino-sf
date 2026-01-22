/**
 * Webhook retry logic utilities.
 *
 * Extracted for better testability and to fix Issue #46:
 * 403 "Merchant Mismatch" errors should NOT be retried.
 */

import { isNonRetryableError, isWebhookError } from '@/lib/errors/webhook-errors';

/**
 * Determine if a webhook should be retried based on error type.
 *
 * IMPORTANT: This function now defaults to NOT retrying unknown errors
 * to prevent infinite retry loops. Only specific retryable conditions
 * will trigger a retry.
 */
export function determineShouldRetry(error: any, eventType: string): boolean {
  // 0. Handle null/undefined errors - don't retry
  if (error == null) {
    console.log(`🚫 [RETRY-CHECK] Null/undefined error - not retrying`);
    return false;
  }

  // 1. Check for custom WebhookError with explicit retry metadata
  if (isWebhookError(error)) {
    console.log(
      `🔍 [RETRY-CHECK] WebhookError detected: ${error.name}, shouldRetry=${error.shouldRetry}`
    );
    return error.shouldRetry;
  }

  // 2. Check for non-retryable errors (4xx status codes, merchant mismatch messages)
  if (isNonRetryableError(error)) {
    console.log(
      `🚫 [RETRY-CHECK] Non-retryable error detected: ${error.message?.substring(0, 100)}`
    );
    return false;
  }

  // 3. Check HTTP status codes from Square API errors
  const statusCode = error.statusCode || error.status || error.httpStatusCode;
  if (statusCode) {
    // 4xx errors (except 429) are permanent - do NOT retry
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
      console.log(`🚫 [RETRY-CHECK] HTTP ${statusCode} error - not retrying`);
      return false;
    }
    // 429 Rate limit - retry with backoff
    if (statusCode === 429) {
      console.log(`⏳ [RETRY-CHECK] HTTP 429 rate limit - will retry`);
      return true;
    }
    // 5xx Server errors - retry
    if (statusCode >= 500) {
      console.log(`🔄 [RETRY-CHECK] HTTP ${statusCode} server error - will retry`);
      return true;
    }
  }

  // 4. Check for merchant mismatch message patterns (403 without status code)
  const msg = (error.message || '').toLowerCase();
  if (
    msg.includes('merchant mismatch') ||
    msg.includes('different merchant') ||
    msg.includes('cannot fetch orders for a different') ||
    msg.includes('forbidden')
  ) {
    console.log(`🚫 [RETRY-CHECK] Merchant mismatch detected - not retrying: ${error.message}`);
    return false;
  }

  // 5. Retry race conditions (Prisma record not found during concurrent operations)
  if (error.code === 'P2025' && error.message?.includes('not found')) {
    console.log(`🔄 [RETRY-CHECK] Prisma P2025 race condition - will retry`);
    return true;
  }

  // 6. Retry database connection issues (common in serverless environments)
  if (error.code === 'P1001' || error.code === 'P1008' || error.code === 'P1017') {
    console.log(`🔄 [RETRY-CHECK] Prisma connection error ${error.code} - will retry`);
    return true;
  }

  // 7. Retry timeout errors
  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    console.log(`🔄 [RETRY-CHECK] Timeout error - will retry`);
    return true;
  }

  // 8. Retry webhook processing timeouts specifically
  if (error.message?.includes('timed out after')) {
    console.log(`🔄 [RETRY-CHECK] Processing timeout - will retry`);
    return true;
  }

  // 9. Retry temporary database issues and connection errors
  if (
    error.message?.includes('connection') ||
    error.message?.includes('ECONNRESET') ||
    error.message?.includes("Can't reach database server") ||
    error.message?.includes('connection terminated') ||
    error.message?.includes('Engine is not yet connected')
  ) {
    console.log(`🔄 [RETRY-CHECK] Database connection error - will retry`);
    return true;
  }

  // 10. Don't retry validation errors or permanent failures
  if (error.message?.includes('validation') || error.code === 'P2003') {
    console.log(`🚫 [RETRY-CHECK] Validation/constraint error - not retrying`);
    return false;
  }

  // 11. Default: Do NOT retry unknown errors (prevents infinite retry loops)
  // This is the critical fix for issue #46
  console.log(
    `🚫 [RETRY-CHECK] Unknown error type - not retrying to prevent infinite loops: ${error.message?.substring(0, 100)}`
  );
  return false;
}

/**
 * Calculate retry delay based on error type and event type
 */
export function calculateRetryDelay(error: any, eventType: string): number {
  // Webhook processing timeouts get longer delays since they need more time
  if (error.message?.includes('timed out after')) {
    return 30000; // 30 seconds for timeout errors
  }

  // Database connection issues get shorter delays (they often resolve quickly)
  if (
    error.code === 'P1001' ||
    error.code === 'P1008' ||
    error.code === 'P1017' ||
    error.message?.includes("Can't reach database server") ||
    error.message?.includes('connection terminated') ||
    error.message?.includes('Engine is not yet connected')
  ) {
    return 5000; // 5 seconds for connection issues
  }

  // Race conditions get shorter delays
  if (error.code === 'P2025' && error.message?.includes('not found')) {
    return eventType === 'order.updated' ? 10000 : 7000; // 10s for order.updated, 7s for others
  }

  // Payment processing gets priority with shorter delays
  if (eventType.startsWith('payment.')) {
    return 8000; // 8 seconds
  }

  // Default delay for other errors
  return 12000; // 12 seconds
}
