/**
 * Manual Payment Sync API Endpoint
 *
 * Allows administrators to manually trigger payment synchronization
 * from Square API. Useful for:
 * - Immediate recovery after webhook issues
 * - Testing the sync mechanism
 * - One-off sync operations with custom parameters
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncRecentPayments } from '@/lib/square/payment-sync';
import { trackMetric, sendWebhookAlert } from '@/lib/monitoring/webhook-metrics';
import { type SquareEnvironment, type SyncType } from '@/types/webhook';

/**
 * POST handler for manual payment sync
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    console.log('🔧 Manual payment sync requested');

    // 1. Validate admin authorization
    const authResult = await validateAdminAuthorization(request);
    if (!authResult.valid) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: authResult.error,
        },
        { status: 401 }
      );
    }

    // 2. Parse request parameters
    const body = await request.json();
    const {
      lookbackMinutes = 60,
      environment = 'production',
      forceSync = false,
      batchSize = 20,
    } = body;

    // Validate parameters
    if (lookbackMinutes < 1 || lookbackMinutes > 1440) {
      // Max 24 hours
      return NextResponse.json(
        {
          error: 'Invalid lookback minutes',
          message: 'lookbackMinutes must be between 1 and 1440 (24 hours)',
        },
        { status: 400 }
      );
    }

    if (!['sandbox', 'production'].includes(environment)) {
      return NextResponse.json(
        {
          error: 'Invalid environment',
          message: 'environment must be "sandbox" or "production"',
        },
        { status: 400 }
      );
    }

    // 3. Execute payment sync
    console.log(`🚀 Starting manual sync for ${environment} environment`, {
      lookbackMinutes,
      forceSync,
      batchSize,
    });

    const syncResult = await syncRecentPayments({
      lookbackMinutes,
      environment: environment as SquareEnvironment,
      syncType: 'manual' as SyncType,
      forceSync,
    });

    // 4. Track metrics
    await trackMetric({
      type: 'webhook_processed',
      environment: environment as SquareEnvironment,
      valid: syncResult.success,
      duration: syncResult.duration,
    });

    // 5. Send alert if sync failed
    if (!syncResult.success && syncResult.paymentsFailed > 0) {
      await sendWebhookAlert({
        severity: 'medium',
        title: 'Manual Payment Sync Failed',
        message: `Manual payment sync failed with ${syncResult.paymentsFailed} failures`,
        details: {
          syncId: syncResult.syncId,
          environment,
          result: syncResult,
          triggeredBy: authResult.userId || 'unknown',
        },
      });
    }

    // 6. Log completion
    const totalDuration = performance.now() - startTime;
    console.log(`✅ Manual payment sync completed in ${Math.round(totalDuration)}ms`, {
      syncId: syncResult.syncId,
      success: syncResult.success,
      environment,
      stats: {
        found: syncResult.paymentsFound,
        processed: syncResult.paymentsProcessed,
        failed: syncResult.paymentsFailed,
      },
    });

    // 7. Return detailed result
    return NextResponse.json({
      success: syncResult.success,
      syncId: syncResult.syncId,
      environment,
      timestamp: new Date().toISOString(),

      summary: {
        paymentsFound: syncResult.paymentsFound,
        paymentsProcessed: syncResult.paymentsProcessed,
        paymentsFailed: syncResult.paymentsFailed,
        successRate:
          syncResult.paymentsFound > 0
            ? Math.round((syncResult.paymentsProcessed / syncResult.paymentsFound) * 10000) / 100
            : 100,
        duration: syncResult.duration,
        totalDuration: Math.round(totalDuration),
      },

      details: {
        startTime: syncResult.startTime,
        endTime: syncResult.endTime,
        errors: syncResult.errors,
        metadata: syncResult.metadata,
      },

      recommendations: generateSyncRecommendations(syncResult),
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ Manual payment sync failed in ${Math.round(duration)}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Manual payment sync failed',
        timestamp: new Date().toISOString(),
        duration: Math.round(duration),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for sync status and capabilities
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get recent sync history
    const { getPaymentSyncHistory, getPaymentSyncMetrics } = await import(
      '@/lib/db/queries/payments'
    );
    const [recentSyncs, metrics] = await Promise.all([
      getPaymentSyncHistory({ limit: 10 }),
      getPaymentSyncMetrics(),
    ]);

    return NextResponse.json({
      status: 'available',
      capabilities: {
        environments: ['sandbox', 'production'],
        maxLookbackMinutes: 1440, // 24 hours
        supportedSyncTypes: ['manual', 'scheduled', 'webhook_fallback'],
        batchSizeRange: { min: 1, max: 100 },
      },

      recent_activity: {
        syncs: recentSyncs.map(sync => ({
          syncId: sync.syncId,
          syncType: sync.syncType,
          success: sync.endTime && sync.paymentsFailed === 0,
          paymentsProcessed: sync.paymentsProcessed,
          duration: sync.endTime ? sync.endTime.getTime() - sync.startTime.getTime() : null,
          timestamp: sync.createdAt,
        })),
      },

      metrics,

      usage: {
        description: 'POST to trigger manual sync with parameters',
        required_headers: ['x-api-key OR Authorization: Bearer <token>'],
        parameters: {
          lookbackMinutes: 'Number (1-1440, default: 60)',
          environment: 'String ("sandbox" | "production", default: "production")',
          forceSync: 'Boolean (update existing payments, default: false)',
          batchSize: 'Number (1-100, default: 20)',
        },
        example: {
          lookbackMinutes: 60,
          environment: 'production',
          forceSync: false,
          batchSize: 20,
        },
      },
    });
  } catch (error) {
    console.error('❌ Failed to get sync status:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate admin authorization for manual sync operations
 */
async function validateAdminAuthorization(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  userId?: string;
}> {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('x-api-key');
    if (apiKey === process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY) {
      return { valid: true, userId: 'api_key_user' };
    }

    // Check for bearer token (could be used for user-based auth)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Validate token (you might want to implement JWT validation here)
      if (token === process.env.ADMIN_API_TOKEN && process.env.ADMIN_API_TOKEN) {
        return { valid: true, userId: 'admin_token_user' };
      }
    }

    // Allow in development mode
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Allowing manual sync in development mode without auth');
      return { valid: true, userId: 'dev_user' };
    }

    return {
      valid: false,
      error:
        'Missing or invalid authentication. Use x-api-key header or Authorization: Bearer token',
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Authorization validation failed',
    };
  }
}

/**
 * Generate recommendations based on sync results
 */
function generateSyncRecommendations(result: any): string[] {
  const recommendations: string[] = [];

  if (result.paymentsFailed > 0) {
    recommendations.push('Check Square API connectivity and credentials');
    recommendations.push('Review error details for specific payment failures');
  }

  if (result.paymentsFound === 0) {
    recommendations.push('No payments found - verify the lookback window');
    recommendations.push('Check if Square orders are being created properly');
  }

  if (result.duration > 30000) {
    // > 30 seconds
    recommendations.push('Sync took longer than expected - consider reducing batch size');
    recommendations.push('Check database performance and connection pool');
  }

  if (result.errors.length > result.paymentsProcessed / 2) {
    recommendations.push('High error rate detected - investigate Square API issues');
    recommendations.push('Consider enabling forceSync to re-process existing payments');
  }

  if (recommendations.length === 0) {
    recommendations.push('Sync completed successfully - no issues detected');
  }

  return recommendations;
}
