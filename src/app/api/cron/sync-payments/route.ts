/**
 * Scheduled Payment Sync Cron Job Endpoint
 * 
 * This endpoint is called periodically (e.g., every 5-15 minutes) to sync
 * payments from Square as a fallback mechanism for missed webhooks.
 * 
 * Usage:
 * - Vercel Cron: Configure in vercel.json to call this endpoint
 * - External Cron: Call via HTTP GET/POST request
 * - Manual Trigger: Call directly for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduledPaymentSync } from '@/lib/square/payment-sync';
import { trackMetric, sendWebhookAlert } from '@/lib/monitoring/webhook-metrics';

/**
 * GET handler for cron job execution
 * Vercel cron jobs use GET requests by default
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handlePaymentSync(request, 'scheduled');
}

/**
 * POST handler for manual triggering and external cron systems
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePaymentSync(request, 'manual');
}

/**
 * Main handler for payment sync operations
 */
async function handlePaymentSync(
  request: NextRequest,
  triggerType: 'scheduled' | 'manual'
): Promise<NextResponse> {
  const startTime = performance.now();
  
  try {
    console.log(`⏰ Payment sync triggered: ${triggerType}`);
    
    // 1. Validate authorization for manual triggers
    if (triggerType === 'manual') {
      const authResult = await validateSyncAuthorization(request);
      if (!authResult.valid) {
        return NextResponse.json({
          error: 'Unauthorized',
          message: authResult.error
        }, { status: 401 });
      }
    }

    // 2. Check if this is a Vercel cron job
    const isVercelCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
    const isLocalDev = process.env.NODE_ENV === 'development';
    
    if (triggerType === 'scheduled' && !isVercelCron && !isLocalDev) {
      console.warn('⚠️ Unauthorized cron request - missing or invalid CRON_SECRET');
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Invalid cron authorization'
      }, { status: 401 });
    }

    // 3. Execute scheduled payment sync
    const syncResult = await scheduledPaymentSync();
    
    // 4. Track metrics
    await trackMetric({
      type: 'webhook_processed',
      environment: 'production', // Combined sync covers both
      valid: syncResult.success,
      duration: syncResult.duration
    });

    // 5. Handle sync failure alerts
    if (!syncResult.success) {
      await sendWebhookAlert({
        severity: syncResult.paymentsFailed > syncResult.paymentsProcessed ? 'high' : 'medium',
        title: 'Scheduled Payment Sync Issues',
        message: `Payment sync completed with ${syncResult.paymentsFailed} failures`,
        details: {
          syncId: syncResult.syncId,
          triggerType,
          result: syncResult
        }
      });
    }

    // 6. Log completion
    const duration = performance.now() - startTime;
    console.log(`✅ Payment sync completed in ${Math.round(duration)}ms`, {
      triggerType,
      syncId: syncResult.syncId,
      success: syncResult.success,
      found: syncResult.paymentsFound,
      processed: syncResult.paymentsProcessed,
      failed: syncResult.paymentsFailed
    });

    // 7. Return comprehensive result
    return NextResponse.json({
      success: syncResult.success,
      syncId: syncResult.syncId,
      triggerType,
      timestamp: new Date().toISOString(),
      
      summary: {
        paymentsFound: syncResult.paymentsFound,
        paymentsProcessed: syncResult.paymentsProcessed,
        paymentsFailed: syncResult.paymentsFailed,
        duration: syncResult.duration,
        totalDuration: Math.round(duration)
      },
      
      details: {
        startTime: syncResult.startTime,
        endTime: syncResult.endTime,
        errors: syncResult.errors,
        metadata: syncResult.metadata
      }
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ Payment sync cron failed in ${Math.round(duration)}ms:`, error);
    
    // Send critical alert for cron failures
    await sendWebhookAlert({
      severity: 'critical',
      title: 'Payment Sync Cron Failed',
      message: 'Scheduled payment sync encountered a critical error',
      details: {
        triggerType,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Math.round(duration)
      }
    });

    return NextResponse.json({
      success: false,
      error: 'Payment sync failed',
      triggerType,
      timestamp: new Date().toISOString(),
      duration: Math.round(duration),
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Validate authorization for manual sync triggers
 */
async function validateSyncAuthorization(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');
    
    // Allow requests with valid API key
    if (apiKey === process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY) {
      return { valid: true };
    }
    
    // Allow requests with valid bearer token
    if (authHeader?.startsWith('Bearer ') && process.env.CRON_SECRET) {
      const token = authHeader.substring(7);
      if (token === process.env.CRON_SECRET) {
        return { valid: true };
      }
    }
    
    // Allow in development mode without auth
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Allowing manual sync in development mode without auth');
      return { valid: true };
    }
    
    return {
      valid: false,
      error: 'Missing or invalid API key. Use x-api-key header or Authorization: Bearer token'
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Authorization validation failed'
    };
  }
}
