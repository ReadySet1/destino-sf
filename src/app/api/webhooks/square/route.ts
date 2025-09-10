import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateWebhookSignature, quickSignatureValidation, debugWebhookSignature } from '@/lib/square/webhook-signature-enhanced';
import { queueWebhook } from '@/lib/webhook-queue-fix';

/**
 * Square Webhook Handler with Enhanced Sandbox Support
 * 
 * Key improvements:
 * 1. Proper sandbox vs production webhook secret handling
 * 2. Enhanced debugging for signature validation issues
 * 3. Fast acknowledgment to prevent Square retries
 * 4. Queue-based processing to avoid timeouts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    console.log('🔔 Received Square webhook request');
    
    // Log environment for debugging
    const squareEnvironment = request.headers.get('square-environment');
    console.log(`📍 Square Environment: ${squareEnvironment || 'not specified'}`);
    
    // Step 1: Read raw body as text for signature validation
    const bodyText = await request.text();
    console.log('📄 Body read successfully - length:', bodyText?.length || 0);
    
    // Step 2: Debug signature validation (detailed logging)
    const debugResult = await debugWebhookSignature(request, bodyText);
    console.log('🔐 Signature validation result:', {
      valid: debugResult.valid,
      environment: debugResult.details?.squareEnvironment,
      secretUsed: debugResult.details?.secretUsed,
      hasSecret: debugResult.details?.hasSandboxSecret || debugResult.details?.hasProductionSecret,
    });
    
    if (!debugResult.valid) {
      console.error('❌ Invalid webhook signature');
      console.error('Debug details:', JSON.stringify(debugResult.details, null, 2));
      
      // Return 401 to indicate authentication failure
      return NextResponse.json({ 
        error: 'Invalid signature',
        environment: squareEnvironment,
        recommendation: debugResult.details?.recommendation,
        troubleshooting: debugResult.details?.troubleshooting
      }, { status: 401 });
    }
    
    console.log('✅ Signature validation passed');
    
    // Step 3: Parse and validate JSON
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (error) {
      console.error('❌ Failed to parse webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    // Step 4: Validate required fields
    if (!payload.event_id || !payload.type) {
      console.warn('⚠️ Missing required webhook fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Log webhook details for debugging
    console.log('📦 Webhook details:', {
      type: payload.type,
      event_id: payload.event_id,
      merchant_id: payload.merchant_id,
      environment: squareEnvironment
    });
    
    // Step 5: Queue for background processing
    try {
      await queueWebhook(payload);
      console.log('✅ Webhook queued for processing');
    } catch (queueError) {
      console.error('❌ Failed to queue webhook:', queueError);
      // Continue anyway - better to acknowledge than to have Square retry
    }
    
    // Step 6: Return immediate acknowledgment
    const duration = Date.now() - startTime;
    console.log(`✅ Webhook acknowledged in ${duration}ms:`, payload.type, payload.event_id);
    
    return NextResponse.json({ 
      received: true,
      event_id: payload.event_id,
      type: payload.type,
      environment: squareEnvironment,
      processing_time_ms: duration
    }, { status: 200 });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Webhook processing failed in ${duration}ms:`, error);
    
    // Return 200 to prevent Square retries on our internal errors
    // This is critical - Square will retry failed webhooks which can cause issues
    return NextResponse.json({ 
      received: true, 
      error: true,
      message: 'Internal processing error - webhook acknowledged',
      processing_time_ms: duration
    }, { status: 200 });
  }
}

/**
 * GET endpoint for webhook validation and health check
 */
export async function GET(): Promise<NextResponse> {
  const hasProductionSecret = !!process.env.SQUARE_WEBHOOK_SECRET;
  const hasSandboxSecret = !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
  
  return NextResponse.json({ 
    status: 'ok',
    webhook_endpoint: 'square',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      has_production_secret: hasProductionSecret,
      has_sandbox_secret: hasSandboxSecret,
      vercel: !!process.env.VERCEL,
      vercel_env: process.env.VERCEL_ENV
    },
    configuration: {
      production_ready: hasProductionSecret,
      sandbox_ready: hasSandboxSecret,
      recommendation: !hasSandboxSecret ? 
        'Add SQUARE_WEBHOOK_SECRET_SANDBOX to handle sandbox webhooks' : 
        'Both production and sandbox secrets configured'
    },
    fixes_applied: [
      'enhanced_sandbox_support',
      'proper_secret_selection',
      'detailed_error_logging',
      'immediate_acknowledgment',
      'queue_based_processing'
    ]
  });
}
