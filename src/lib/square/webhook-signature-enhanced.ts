import crypto from 'crypto';

/**
 * Enhanced webhook signature validation for Square webhooks
 * Properly handles Sandbox vs Production environments
 */

interface ValidationResult {
  valid: boolean;
  details?: Record<string, any>;
}

/**
 * Get the appropriate webhook secret based on Square environment
 */
function getWebhookSecret(headers: Headers): string | undefined {
  const squareEnvironment = headers.get('square-environment');
  const isSandbox = squareEnvironment?.toLowerCase() === 'sandbox';

  console.log(
    `🔐 Square Environment: ${squareEnvironment || 'not specified'} (sandbox: ${isSandbox})`
  );

  if (isSandbox) {
    // For sandbox, prioritize sandbox secret, fallback to production
    const sandboxSecret = process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
    const productionSecret = process.env.SQUARE_WEBHOOK_SECRET;

    if (sandboxSecret) {
      console.log('🔑 Using SQUARE_WEBHOOK_SECRET_SANDBOX');
      return sandboxSecret;
    } else if (productionSecret) {
      console.log('⚠️  No sandbox secret found, falling back to production secret');
      return productionSecret;
    } else {
      console.error('❌ No webhook secrets found in environment');
      return undefined;
    }
  } else {
    // For production, use production secret
    const productionSecret = process.env.SQUARE_WEBHOOK_SECRET;
    if (productionSecret) {
      console.log('🔑 Using SQUARE_WEBHOOK_SECRET (production)');
      return productionSecret;
    } else {
      console.error('❌ No production webhook secret found');
      return undefined;
    }
  }
}

/**
 * Validate webhook signature with proper sandbox/production handling
 */
export async function validateWebhookSignature(request: Request, body: string): Promise<boolean> {
  try {
    // Get the appropriate signature header
    const signatureV2 = request.headers.get('x-square-hmacsha256-signature');
    const signatureV1 = request.headers.get('x-square-signature');
    const signature = signatureV2 || signatureV1;

    if (!signature) {
      console.warn('⚠️ No signature header found in webhook request');
      return false;
    }

    // Get the appropriate webhook secret
    const webhookSecret = getWebhookSecret(request.headers);

    if (!webhookSecret) {
      console.error('❌ No webhook secret available for validation');
      return false;
    }

    // Calculate expected signature according to Square's documentation
    // Square requires: HMAC(secret, notification_url + body)
    const notificationUrl = `https://${request.headers.get('host')}${request.headers.get('x-matched-path') || '/api/webhooks/square'}`;
    const stringToSign = notificationUrl + body;
    const algorithm = signatureV2 ? 'sha256' : 'sha1';

    const expectedSignature = crypto
      .createHmac(algorithm, webhookSecret)
      .update(stringToSign)
      .digest('base64');

    const isValid = expectedSignature === signature;

    if (!isValid) {
      console.warn('⚠️ Webhook signature validation failed');
      console.log('Expected:', expectedSignature.substring(0, 10) + '...');
      console.log('Received:', signature.substring(0, 10) + '...');
    } else {
      console.log('✅ Webhook signature validated successfully');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error validating webhook signature:', error);
    return false;
  }
}

/**
 * Quick signature validation for fast webhook acknowledgment
 */
export async function quickSignatureValidation(request: Request, body: string): Promise<boolean> {
  try {
    const signature =
      request.headers.get('x-square-hmacsha256-signature') ||
      request.headers.get('x-square-signature');

    if (!signature) return false;

    const webhookSecret = getWebhookSecret(request.headers);
    if (!webhookSecret) return false;

    // Calculate according to Square's documentation: HMAC(secret, body)
    const stringToSign = body;
    const signatureV2 = request.headers.get('x-square-hmacsha256-signature');
    const algorithm = signatureV2 ? 'sha256' : 'sha1';

    const expectedSignature = crypto
      .createHmac(algorithm, webhookSecret)
      .update(stringToSign)
      .digest('base64');

    return expectedSignature === signature;
  } catch {
    return false;
  }
}

/**
 * Debug webhook signature with comprehensive error reporting
 */
export async function debugWebhookSignature(
  request: Request,
  body: string
): Promise<ValidationResult> {
  const details: Record<string, any> = {
    headers: Object.fromEntries(request.headers.entries()),
    bodyLength: body.length,
    bodyPreview: body.substring(0, 100) + '...',
  };

  try {
    // Check Square environment
    const squareEnvironment = request.headers.get('square-environment');
    const isSandbox = squareEnvironment?.toLowerCase() === 'sandbox';

    details.squareEnvironment = squareEnvironment;
    details.isSandbox = isSandbox;

    // Check available secrets
    details.hasProductionSecret = !!process.env.SQUARE_WEBHOOK_SECRET;
    details.hasSandboxSecret = !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;

    // Get signature headers
    const signatureV2 = request.headers.get('x-square-hmacsha256-signature');
    const signatureV1 = request.headers.get('x-square-signature');
    const signature = signatureV2 || signatureV1;

    details.hasSignatureV2 = !!signatureV2;
    details.hasSignatureV1 = !!signatureV1;
    details.signature = signature;
    details.signatureHeader = signatureV2
      ? 'x-square-hmacsha256-signature'
      : signatureV1
        ? 'x-square-signature'
        : 'none';

    if (!signature) {
      details.error = 'No signature header found';
      return { valid: false, details };
    }

    // Get the appropriate webhook secret
    const webhookSecret = getWebhookSecret(request.headers);

    if (!webhookSecret) {
      details.error = `No ${isSandbox ? 'sandbox' : 'production'} webhook secret available`;
      details.recommendation = isSandbox
        ? 'Set SQUARE_WEBHOOK_SECRET_SANDBOX in environment variables'
        : 'Set SQUARE_WEBHOOK_SECRET in environment variables';
      return { valid: false, details };
    }

    details.secretUsed = isSandbox ? 'sandbox' : 'production';
    details.secretPreview = webhookSecret.substring(0, 4) + '...';

    // Calculate signature according to Square's documentation
    // Square requires: HMAC(secret, body) - NOT url + body
    const stringToSign = body;

    // Use different algorithms based on header type
    const algorithm = signatureV2 ? 'sha256' : 'sha1';
    const expectedSignature = crypto
      .createHmac(algorithm, webhookSecret)
      .update(stringToSign)
      .digest('base64');

    details.expectedSignature = expectedSignature;
    details.receivedSignature = signature;
    details.signatureMatch = expectedSignature === signature;

    // Add detailed debugging for HMAC calculation
    details.bodyAsBuffer = Buffer.from(body, 'utf8').toString('hex').substring(0, 200) + '...';
    details.secretAsBuffer = Buffer.from(webhookSecret, 'utf8').toString('hex');
    details.stringToSign = stringToSign.substring(0, 200) + '...';
    details.hmacCalculation = {
      algorithm: algorithm,
      secretLength: webhookSecret.length,
      bodyLength: body.length,
      totalLength: stringToSign.length,
      bodyPreview: body.substring(0, 100),
      stringToSignPreview: stringToSign.substring(0, 150),
      expectedResult: expectedSignature,
      receivedSignature: signature,
      secretHex: Buffer.from(webhookSecret, 'utf8').toString('hex'),
      stringToSignHex: Buffer.from(stringToSign, 'utf8').toString('hex').substring(0, 300) + '...',
    };

    // If sandbox and no match, try with production secret as fallback
    if (isSandbox && !details.signatureMatch && process.env.SQUARE_WEBHOOK_SECRET) {
      console.log('🔄 Trying production secret as fallback for sandbox webhook');
      const fallbackSignature = crypto
        .createHmac('sha256', process.env.SQUARE_WEBHOOK_SECRET)
        .update(body)
        .digest('base64');

      details.fallbackSignature = fallbackSignature;
      details.fallbackMatch = fallbackSignature === signature;

      if (details.fallbackMatch) {
        details.warning =
          'Webhook validated with production secret but sent from sandbox environment';
        return { valid: true, details };
      }
    }

    if (!details.signatureMatch) {
      details.error = 'Signature mismatch';
      details.troubleshooting = [
        '1. Verify the webhook secret in Square Dashboard matches environment variable',
        '2. For sandbox webhooks, use SQUARE_WEBHOOK_SECRET_SANDBOX',
        '3. For production webhooks, use SQUARE_WEBHOOK_SECRET',
        '4. Ensure the secret is copied exactly without extra spaces',
        '5. Check that Vercel has the latest environment variables (redeploy if needed)',
      ];
    }

    return { valid: details.signatureMatch, details };
  } catch (error) {
    details.error = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, details };
  }
}

/**
 * Bypass validation for testing (use with extreme caution)
 * Only use this in development with proper authentication
 */
export function bypassValidation(request: Request): boolean {
  // Only allow bypass in development with special header
  if (process.env.NODE_ENV === 'development') {
    const bypassToken = request.headers.get('x-webhook-bypass-token');
    const expectedToken = process.env.WEBHOOK_BYPASS_TOKEN;

    if (bypassToken && expectedToken && bypassToken === expectedToken) {
      console.warn('⚠️  WEBHOOK VALIDATION BYPASSED - DEVELOPMENT ONLY');
      return true;
    }
  }

  return false;
}
