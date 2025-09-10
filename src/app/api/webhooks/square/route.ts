import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateWebhookSignature, quickSignatureValidation, debugWebhookSignature } from '@/lib/square/webhook-signature-fix';
import { queueWebhook } from '@/lib/webhook-queue-fix';

// CRITICAL: App Router automatically handles raw request body correctly for signature validation

/**
 * FIXED Square Webhook Handler
 * 
 * This implementation follows the critical fix plan for Vercel webhook failures:
 * 1. Quick signature validation (< 100ms)
 * 2. Immediate acknowledgment (< 1 second total)
 * 3. Queue for background processing
 * 4. Robust error handling that prevents Square retries
 * 5. No database connection issues through resilient client
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    console.log('🔔 Received Square webhook request');
    
    // Step 1: Read raw body as buffer for signature validation
    const bodyBuffer = await request.arrayBuffer();
    const bodyText = new TextDecoder().decode(bodyBuffer);
    console.log('📄 Body read successfully - length:', bodyText?.length || 0);
    
    // Step 2: Enhanced signature validation with debugging
    const debugResult = await debugWebhookSignature(request, bodyText);
    console.log('🔐 Signature validation debug:', {
      valid: debugResult.valid,
      hasSecret: debugResult.details.hasSecret,
      hasSignature: debugResult.details.hasSignature,
      bodyLength: debugResult.details.bodyLength
    });
    
    if (!debugResult.valid) {
      console.warn('⚠️ Invalid webhook signature - rejecting request');
      console.warn('🔍 Debug details:', debugResult.details);
      return NextResponse.json({ 
        error: 'Invalid signature',
        debug: process.env.NODE_ENV === 'development' ? debugResult.details : undefined
      }, { status: 401 });
    }
    
    console.log('✅ Signature validation passed');
    
    // Step 3: Parse and validate JSON (fast)
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (error) {
      console.error('❌ Failed to parse webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    // Step 4: Quick validation of required fields
    if (!payload.event_id || !payload.type) {
      console.warn('⚠️ Missing required webhook fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Step 5: Queue for background processing (fast database insert with retry logic)
    await queueWebhook(payload);
    
    // Step 6: Return immediate acknowledgment
    const duration = Date.now() - startTime;
    console.log(`✅ Webhook acknowledged successfully in ${duration}ms:`, payload.type, payload.event_id);
    
    return NextResponse.json({ 
      received: true,
      event_id: payload.event_id,
      processing_time_ms: duration
    }, { status: 200 });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Webhook processing failed in ${duration}ms:`, error);
    
    // CRITICAL: Always return 200 to prevent Square retries on our errors
    // Square will retry failed webhooks which can cause cascading issues
    return NextResponse.json({ 
      received: true, 
      error: true,
      processing_time_ms: duration
    }, { status: 200 });
  }
}

/**
 * GET endpoint for webhook validation/health check
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ 
    status: 'ok',
    webhook_endpoint: 'square',
    timestamp: new Date().toISOString(),
    fixes_applied: [
      'resilient_database_connection',
      'signature_validation_restored', 
      'immediate_acknowledgment',
      'background_processing_queue',
      'prevent_square_retries'
    ]
  });
}
