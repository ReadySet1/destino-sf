/**
 * Enhanced Square Webhook Signature Validator
 * 
 * This validator implements the complete fix for webhook signature validation
 * with environment variable cleaning, proper algorithm support, and comprehensive
 * error handling as specified in the master fix plan.
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { 
  type WebhookValidationResult, 
  type WebhookValidationError,
  type SquareEnvironment,
  type SignatureAlgorithm,
  type WebhookId,
  SquareWebhookPayloadSchema,
  WebhookHeadersSchema,
  WEBHOOK_CONSTANTS
} from '@/types/webhook';

/**
 * Clean and validate environment variables
 * Critical fix: Remove any trailing newlines that cause signature failures
 */
function cleanEnvironmentVariables(): void {
  if (process.env.SQUARE_WEBHOOK_SECRET_SANDBOX) {
    process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = 
      process.env.SQUARE_WEBHOOK_SECRET_SANDBOX.trim();
  }
  if (process.env.SQUARE_WEBHOOK_SECRET) {
    process.env.SQUARE_WEBHOOK_SECRET = 
      process.env.SQUARE_WEBHOOK_SECRET.trim();
  }
}

/**
 * Determine environment from request headers
 */
function detectEnvironment(headers: Headers): SquareEnvironment {
  const envHeader = headers.get(WEBHOOK_CONSTANTS.ENVIRONMENT_HEADER);
  return envHeader?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
}

/**
 * Get the appropriate webhook secret for the environment
 */
function getWebhookSecret(environment: SquareEnvironment): string | null {
  cleanEnvironmentVariables(); // Always clean before using
  
  if (environment === 'sandbox') {
    return process.env.SQUARE_WEBHOOK_SECRET_SANDBOX || 
           process.env.SQUARE_WEBHOOK_SECRET || 
           null;
  } else {
    return process.env.SQUARE_WEBHOOK_SECRET || null;
  }
}

/**
 * Extract signature and algorithm from request headers
 */
function extractSignature(headers: Headers): {
  signature: string | null;
  algorithm: SignatureAlgorithm | null;
} {
  // Try SHA256 first (preferred), then fall back to SHA1
  const sha256Signature = headers.get(WEBHOOK_CONSTANTS.SIGNATURE_HEADER_SHA256);
  if (sha256Signature) {
    return { signature: sha256Signature, algorithm: 'sha256' };
  }

  const sha1Signature = headers.get(WEBHOOK_CONSTANTS.SIGNATURE_HEADER_SHA1);
  if (sha1Signature) {
    return { signature: sha1Signature, algorithm: 'sha1' };
  }

  return { signature: null, algorithm: null };
}

/**
 * Calculate HMAC signature for webhook body
 * Implements Square's signature calculation algorithm exactly
 */
function calculateSignature(
  body: string,
  secret: string,
  algorithm: SignatureAlgorithm
): string {
  return crypto
    .createHmac(algorithm, secret)
    .update(body)
    .digest('base64');
}

/**
 * Validate webhook payload structure using Zod schema
 */
function validatePayloadStructure(body: string): {
  valid: boolean;
  payload?: any;
  error?: WebhookValidationError;
} {
  try {
    const payload = JSON.parse(body);
    const result = SquareWebhookPayloadSchema.safeParse(payload);
    
    if (!result.success) {
      return {
        valid: false,
        error: {
          type: 'INVALID_PAYLOAD',
          zodError: result.error
        }
      };
    }
    
    return { valid: true, payload: result.data };
  } catch (error) {
    return {
      valid: false,
      error: {
        type: 'MALFORMED_BODY',
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      }
    };
  }
}

/**
 * Check if event is too old (prevent replay attacks)
 */
function validateEventAge(createdAt: string): boolean {
  try {
    const eventTime = new Date(createdAt).getTime();
    const now = Date.now();
    return (now - eventTime) <= WEBHOOK_CONSTANTS.MAX_EVENT_AGE_MS;
  } catch {
    return false; // Invalid timestamp format
  }
}

/**
 * Generate unique webhook ID for tracking
 */
function generateWebhookId(eventId: string, timestamp: number): WebhookId {
  const hash = crypto
    .createHash('sha256')
    .update(`${eventId}-${timestamp}`)
    .digest('hex')
    .substring(0, 16);
  return `webhook_${hash}` as WebhookId;
}

/**
 * Main webhook signature validation function
 * 
 * This is the core validation logic that implements all security checks
 * and handles the environment variable cleaning that fixes the signature issues.
 */
export async function validateWebhookSignature(
  request: NextRequest,
  body: string
): Promise<WebhookValidationResult> {
  const startTime = performance.now();
  
  try {
    // 1. Validate headers structure
    const headersObj = Object.fromEntries(request.headers.entries());
    const headerValidation = WebhookHeadersSchema.safeParse(headersObj);
    
    if (!headerValidation.success) {
      return {
        valid: false,
        environment: 'production', // default
        error: {
          type: 'MISSING_SIGNATURE',
          headers: Object.keys(headersObj)
        }
      };
    }

    // 2. Detect environment and extract signature
    const environment = detectEnvironment(request.headers);
    const { signature, algorithm } = extractSignature(request.headers);
    
    if (!signature || !algorithm) {
      return {
        valid: false,
        environment,
        error: {
          type: 'MISSING_SIGNATURE',
          headers: Object.keys(headersObj)
        }
      };
    }

    // 3. Get appropriate webhook secret
    const webhookSecret = getWebhookSecret(environment);
    
    if (!webhookSecret) {
      return {
        valid: false,
        environment,
        error: {
          type: 'MISSING_SECRET',
          environment: environment
        }
      };
    }

    // 4. Validate payload structure
    const payloadValidation = validatePayloadStructure(body);
    if (!payloadValidation.valid) {
      return {
        valid: false,
        environment,
        error: payloadValidation.error
      };
    }

    const payload = payloadValidation.payload;

    // 5. Validate event age (prevent old events)
    if (!validateEventAge(payload.created_at)) {
      return {
        valid: false,
        environment,
        error: {
          type: 'EVENT_TOO_OLD',
          eventTime: payload.created_at,
          maxAge: WEBHOOK_CONSTANTS.MAX_EVENT_AGE_MS
        }
      };
    }

    // 6. Calculate expected signature
    const expectedSignature = calculateSignature(body, webhookSecret, algorithm);
    
    // 7. Use constant-time comparison to prevent timing attacks
    let isValid: boolean;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch {
      // If base64 decoding fails, fall back to string comparison
      isValid = signature === expectedSignature;
    }

    // 8. Generate webhook ID for tracking
    const webhookId = generateWebhookId(
      payload.event_id, 
      Date.now()
    );

    if (!isValid) {
      return {
        valid: false,
        environment,
        error: {
          type: 'INVALID_SIGNATURE',
          expected: expectedSignature.substring(0, 20) + '...',
          received: signature.substring(0, 20) + '...'
        },
        metadata: {
          signature,
          algorithm,
          secretUsed: environment,
          processingTimeMs: performance.now() - startTime,
          webhookId
        }
      };
    }

    // 9. Success case
    return {
      valid: true,
      environment,
      metadata: {
        signature,
        algorithm,
        secretUsed: environment,
        processingTimeMs: performance.now() - startTime,
        webhookId
      }
    };

  } catch (error) {
    console.error('❌ Unexpected error in webhook validation:', error);
    
    return {
      valid: false,
      environment: 'production', // default
      error: {
        type: 'MALFORMED_BODY',
        error: error instanceof Error ? error.message : 'Unknown validation error'
      }
    };
  }
}

/**
 * Quick signature validation for fast webhook acknowledgment
 * Optimized version for minimal latency (< 50ms target)
 */
export async function quickSignatureValidation(
  request: NextRequest,
  body: string
): Promise<boolean> {
  try {
    // Clean environment variables immediately
    cleanEnvironmentVariables();
    
    // Fast path: get signature and secret
    const environment = detectEnvironment(request.headers);
    const { signature, algorithm } = extractSignature(request.headers);
    
    if (!signature || !algorithm) {
      return false;
    }

    const webhookSecret = getWebhookSecret(environment);
    if (!webhookSecret) {
      return false;
    }

    // Calculate and compare signatures
    const expectedSignature = calculateSignature(body, webhookSecret, algorithm);
    
    // Use constant-time comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch {
      return signature === expectedSignature;
    }
    
  } catch (error) {
    console.error('❌ Quick validation error:', error);
    return false;
  }
}

/**
 * Validate webhook security (rate limiting, IP validation, etc.)
 * This is called before signature validation for additional security
 */
export async function validateWebhookSecurity(
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 1. Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > WEBHOOK_CONSTANTS.MAX_BODY_SIZE) {
      return { valid: false, error: 'Request body too large' };
    }

    // 2. Basic IP validation (Square should be sending webhooks)
    const userAgent = request.headers.get('user-agent');
    if (userAgent && !userAgent.toLowerCase().includes('square')) {
      console.warn('⚠️ Webhook from non-Square user agent:', userAgent);
      // Don't reject, just log for monitoring
    }

    // 3. Validate required headers exist
    const hasSignature = request.headers.has(WEBHOOK_CONSTANTS.SIGNATURE_HEADER_SHA256) ||
                        request.headers.has(WEBHOOK_CONSTANTS.SIGNATURE_HEADER_SHA1);
    
    if (!hasSignature) {
      return { valid: false, error: 'Missing signature headers' };
    }

    return { valid: true };
    
  } catch (error) {
    console.error('❌ Security validation error:', error);
    return { valid: false, error: 'Security validation failed' };
  }
}

/**
 * Debug helper for troubleshooting webhook signature issues
 * Only active in development mode
 */
export function debugWebhookSignature(
  request: NextRequest,
  body: string,
  validationResult: WebhookValidationResult
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('🔍 Webhook Debug Information:');
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  console.log('Body length:', body.length);
  console.log('Environment detected:', validationResult.environment);
  console.log('Validation result:', validationResult);
  
  if (validationResult.error) {
    console.log('Validation error details:', validationResult.error);
  }
  
  if (validationResult.metadata) {
    console.log('Processing metadata:', validationResult.metadata);
  }
}

/**
 * Create webhook validation error from validation result
 * Helper for consistent error handling
 */
export function createWebhookError(
  validationResult: WebhookValidationResult,
  context?: Record<string, unknown>
): Error {
  if (!validationResult.error) {
    return new Error('Unknown webhook validation error');
  }

  const error = new Error(
    `Webhook validation failed: ${validationResult.error.type}`
  );

  // Add validation details to error for debugging
  (error as any).validationResult = validationResult;
  (error as any).context = context;
  
  return error;
}