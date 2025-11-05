/**
 * Shippo Webhook Signature Validator
 *
 * This validator implements webhook signature validation for Shippo webhooks
 * following the pattern established by our Square webhook validator.
 *
 * Reference: https://docs.goshippo.com/docs/tracking/webhooks/#webhook-security
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { env } from '@/env';

/**
 * Shippo webhook validation result
 */
export interface ShippoWebhookValidationResult {
  valid: boolean;
  error?: {
    type:
      | 'MISSING_SIGNATURE'
      | 'MISSING_SECRET'
      | 'INVALID_SIGNATURE'
      | 'MALFORMED_BODY'
      | 'EVENT_TOO_OLD';
    details?: string;
    headers?: string[];
  };
  metadata?: {
    signature: string;
    algorithm: string;
    processingTimeMs: number;
    webhookId: string;
  };
}

/**
 * Shippo webhook event types
 */
export type ShippoWebhookEvent =
  | 'transaction_created'
  | 'transaction_updated'
  | 'track_updated'
  | 'batch_created'
  | 'batch_purchased'
  | 'all';

/**
 * Shippo webhook payload structure
 */
export interface ShippoWebhookPayload {
  event: ShippoWebhookEvent;
  test: boolean;
  data: any;
}

/**
 * Shippo webhook constants
 */
const SHIPPO_CONSTANTS = {
  SIGNATURE_HEADER: 'x-shippo-signature',
  MAX_EVENT_AGE_MS: 5 * 60 * 1000, // 5 minutes
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
} as const;

/**
 * Clean and validate environment variables
 * Critical fix: Remove any trailing newlines that cause signature failures
 */
function cleanEnvironmentVariables(): void {
  if (process.env.SHIPPO_WEBHOOK_SECRET) {
    process.env.SHIPPO_WEBHOOK_SECRET = process.env.SHIPPO_WEBHOOK_SECRET.trim();
  }
}

/**
 * Get the Shippo webhook secret from environment
 */
function getWebhookSecret(): string | null {
  cleanEnvironmentVariables();
  return env.SHIPPO_WEBHOOK_SECRET || null;
}

/**
 * Extract signature from request headers
 * Shippo uses X-Shippo-Signature header with HMAC-SHA256
 */
function extractSignature(headers: Headers): string | null {
  return headers.get(SHIPPO_CONSTANTS.SIGNATURE_HEADER);
}

/**
 * Calculate HMAC signature for Shippo webhook
 * Shippo uses: HMAC-SHA256(request_body, secret)
 *
 * Note: Unlike Square, Shippo only signs the body, not the URL
 */
function calculateSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Validate webhook payload structure
 */
function validatePayloadStructure(body: string): {
  valid: boolean;
  payload?: ShippoWebhookPayload;
  error?: string;
} {
  try {
    const payload = JSON.parse(body) as ShippoWebhookPayload;

    // Basic validation - ensure required fields exist
    if (!payload.event) {
      return {
        valid: false,
        error: 'Missing required field: event',
      };
    }

    // Validate event type
    const validEvents: ShippoWebhookEvent[] = [
      'transaction_created',
      'transaction_updated',
      'track_updated',
      'batch_created',
      'batch_purchased',
      'all',
    ];

    if (!validEvents.includes(payload.event)) {
      return {
        valid: false,
        error: `Invalid event type: ${payload.event}`,
      };
    }

    return { valid: true, payload };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

/**
 * Generate unique webhook ID for tracking
 */
function generateWebhookId(event: string, timestamp: number): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${event}-${timestamp}`)
    .digest('hex')
    .substring(0, 16);
  return `shippo_webhook_${hash}`;
}

/**
 * Main Shippo webhook signature validation function
 *
 * This validates the webhook signature using Shippo's HMAC-SHA256 algorithm
 * and performs additional security checks.
 */
export async function validateShippoWebhookSignature(
  request: NextRequest,
  body: string
): Promise<ShippoWebhookValidationResult> {
  const startTime = performance.now();

  try {
    // 1. Extract signature from headers
    const signature = extractSignature(request.headers);

    if (!signature) {
      console.error('❌ Shippo webhook: Missing signature header');
      return {
        valid: false,
        error: {
          type: 'MISSING_SIGNATURE',
          details: `Missing ${SHIPPO_CONSTANTS.SIGNATURE_HEADER} header`,
          headers: Array.from(request.headers.keys()),
        },
      };
    }

    // 2. Get webhook secret
    const webhookSecret = getWebhookSecret();

    if (!webhookSecret) {
      console.error('❌ Shippo webhook: Missing SHIPPO_WEBHOOK_SECRET environment variable');
      return {
        valid: false,
        error: {
          type: 'MISSING_SECRET',
          details: 'SHIPPO_WEBHOOK_SECRET not configured',
        },
      };
    }

    // 3. Validate payload structure
    const payloadValidation = validatePayloadStructure(body);
    if (!payloadValidation.valid) {
      console.error('❌ Shippo webhook: Invalid payload structure', payloadValidation.error);
      return {
        valid: false,
        error: {
          type: 'MALFORMED_BODY',
          details: payloadValidation.error,
        },
      };
    }

    const payload = payloadValidation.payload!;

    // 4. Calculate expected signature
    const expectedSignature = calculateSignature(body, webhookSecret);

    // 5. Use constant-time comparison to prevent timing attacks
    let isValid: boolean;
    try {
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      // timingSafeEqual requires buffers of the same length
      if (signatureBuffer.length !== expectedBuffer.length) {
        isValid = false;
      } else {
        isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
      }
    } catch {
      // If hex decoding fails, fall back to string comparison
      isValid = signature === expectedSignature;
    }

    // 6. Generate webhook ID for tracking
    const webhookId = generateWebhookId(payload.event, Date.now());

    if (!isValid) {
      console.error('❌ Shippo webhook: Invalid signature', {
        expected: expectedSignature.substring(0, 20) + '...',
        received: signature.substring(0, 20) + '...',
        event: payload.event,
      });

      return {
        valid: false,
        error: {
          type: 'INVALID_SIGNATURE',
          details: 'Signature mismatch',
        },
        metadata: {
          signature,
          algorithm: 'sha256',
          processingTimeMs: performance.now() - startTime,
          webhookId,
        },
      };
    }

    // 7. Success case
    console.log('✅ Shippo webhook signature validated successfully', {
      event: payload.event,
      test: payload.test,
      webhookId,
    });

    return {
      valid: true,
      metadata: {
        signature,
        algorithm: 'sha256',
        processingTimeMs: performance.now() - startTime,
        webhookId,
      },
    };
  } catch (error) {
    console.error('❌ Unexpected error in Shippo webhook validation:', error);

    return {
      valid: false,
      error: {
        type: 'MALFORMED_BODY',
        details: error instanceof Error ? error.message : 'Unknown validation error',
      },
    };
  }
}

/**
 * Quick signature validation for fast webhook acknowledgment
 * Optimized version for minimal latency
 */
export async function quickShippoSignatureValidation(
  request: NextRequest,
  body: string
): Promise<boolean> {
  try {
    // Clean environment variables immediately
    cleanEnvironmentVariables();

    // Fast path: get signature and secret
    const signature = extractSignature(request.headers);
    if (!signature) {
      return false;
    }

    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      return false;
    }

    // Calculate and compare signatures
    const expectedSignature = calculateSignature(body, webhookSecret);

    // Use constant-time comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return signature === expectedSignature;
    }
  } catch (error) {
    console.error('❌ Quick Shippo validation error:', error);
    return false;
  }
}

/**
 * Validate webhook security (content length, headers, etc.)
 * Called before signature validation for additional security
 */
export async function validateShippoWebhookSecurity(
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 1. Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > SHIPPO_CONSTANTS.MAX_BODY_SIZE) {
      return { valid: false, error: 'Request body too large' };
    }

    // 2. Validate required headers exist
    const hasSignature = request.headers.has(SHIPPO_CONSTANTS.SIGNATURE_HEADER);

    if (!hasSignature) {
      return { valid: false, error: 'Missing signature header' };
    }

    // 3. Basic user agent validation (Shippo should identify itself)
    const userAgent = request.headers.get('user-agent');
    if (userAgent && !userAgent.toLowerCase().includes('shippo')) {
      console.warn('⚠️ Webhook from non-Shippo user agent:', userAgent);
      // Don't reject, just log for monitoring
    }

    return { valid: true };
  } catch (error) {
    console.error('❌ Shippo security validation error:', error);
    return { valid: false, error: 'Security validation failed' };
  }
}

/**
 * Debug helper for troubleshooting webhook signature issues
 * Only active in development mode
 */
export function debugShippoWebhookSignature(
  request: NextRequest,
  body: string,
  validationResult: ShippoWebhookValidationResult
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('🔍 Shippo Webhook Debug Information:');
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  console.log('Body length:', body.length);
  console.log('Validation result:', validationResult);

  if (validationResult.error) {
    console.log('Validation error details:', validationResult.error);
  }

  if (validationResult.metadata) {
    console.log('Processing metadata:', validationResult.metadata);
  }
}
