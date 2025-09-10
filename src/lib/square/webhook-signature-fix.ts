import crypto from 'crypto';

/**
 * Fixed webhook signature validation for Square webhooks
 * Handles both timestamp-based and direct signature validation
 */
export async function validateWebhookSignature(
  request: Request,
  body: string
): Promise<boolean> {
  try {
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const timestamp = request.headers.get('x-square-hmacsha256-timestamp');
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ SQUARE_WEBHOOK_SECRET environment variable not set');
      return false;
    }
    
    if (!signature) {
      console.warn('⚠️ No signature header found in webhook request');
      return false;
    }
    
    // For Square webhooks without timestamp header (common case)
    if (signature && !timestamp) {
      console.log('🔐 Validating webhook signature without timestamp');
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('base64');
      
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        console.warn('⚠️ Webhook signature validation failed (no timestamp method)');
        if (process.env.NODE_ENV === 'development') {
          console.log('Expected:', expectedSignature);
          console.log('Received:', signature);
          console.log('Body length:', body.length);
        }
      } else {
        console.log('✅ Webhook signature validated successfully (no timestamp method)');
      }
      
      return isValid;
    }
    
    // Standard validation when both headers are present
    if (signature && timestamp) {
      console.log('🔐 Validating webhook signature with timestamp');
      
      const payload = timestamp + body;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');
      
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        console.warn('⚠️ Webhook signature validation failed (timestamp method)');
        if (process.env.NODE_ENV === 'development') {
          console.log('Expected:', expectedSignature);
          console.log('Received:', signature);
          console.log('Timestamp:', timestamp);
          console.log('Body length:', body.length);
        }
      } else {
        console.log('✅ Webhook signature validated successfully (timestamp method)');
      }
      
      return isValid;
    }
    
    console.warn('⚠️ No valid signature validation method available');
    return false;
    
  } catch (error) {
    console.error('❌ Error validating webhook signature:', error);
    return false;
  }
}

/**
 * Quick signature validation for fast webhook acknowledgment
 * Returns immediately without detailed logging
 */
export async function quickSignatureValidation(
  request: Request,
  body: string
): Promise<boolean> {
  try {
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    
    if (!webhookSecret || !signature) {
      return false;
    }
    
    // Try direct signature validation first (most common for Square)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('base64');
    
    return expectedSignature === signature;
  } catch (error) {
    return false;
  }
}

/**
 * Validate webhook signature with comprehensive error reporting
 * Use this for debugging signature issues
 */
export async function debugWebhookSignature(
  request: Request,
  body: string
): Promise<{ valid: boolean; details: Record<string, any> }> {
  const details: Record<string, any> = {
    hasSecret: !!process.env.SQUARE_WEBHOOK_SECRET,
    hasSignature: !!request.headers.get('x-square-hmacsha256-signature'),
    hasTimestamp: !!request.headers.get('x-square-hmacsha256-timestamp'),
    bodyLength: body.length,
    bodyPreview: body.substring(0, 100),
  };
  
  try {
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const timestamp = request.headers.get('x-square-hmacsha256-timestamp');
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    
    details.signature = signature;
    details.timestamp = timestamp;
    
    if (!webhookSecret) {
      details.error = 'Missing SQUARE_WEBHOOK_SECRET';
      return { valid: false, details };
    }
    
    if (!signature) {
      details.error = 'Missing signature header';
      return { valid: false, details };
    }
    
    // Try both validation methods
    const directSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('base64');
    
    details.expectedDirectSignature = directSignature;
    details.directSignatureMatch = directSignature === signature;
    
    if (timestamp) {
      const timestampSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(timestamp + body)
        .digest('base64');
      
      details.expectedTimestampSignature = timestampSignature;
      details.timestampSignatureMatch = timestampSignature === signature;
    }
    
    const valid = details.directSignatureMatch || details.timestampSignatureMatch;
    
    return { valid, details };
  } catch (error) {
    details.error = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, details };
  }
}
