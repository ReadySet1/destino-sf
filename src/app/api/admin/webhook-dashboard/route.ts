/**
 * Admin Webhook Dashboard API
 *
 * Provides comprehensive webhook monitoring data for the admin dashboard,
 * including real-time metrics, recent logs, alerts, and health status.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMetricsSummary,
  getDetailedMetrics,
  checkAlertThresholds,
} from '@/lib/monitoring/webhook-metrics';
import {
  getRecentWebhookLogs,
  getWebhookMetrics,
  getFailedWebhooks,
} from '@/lib/db/queries/webhooks';
import { getPaymentSyncHistory, getPaymentSyncMetrics } from '@/lib/db/queries/payments';
import { type SquareEnvironment } from '@/types/webhook';

/**
 * GET handler - Main dashboard data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📊 Admin webhook dashboard data requested');

    // 1. Validate admin authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: authResult.error,
        },
        { status: 401 }
      );
    }

    // 2. Get time range from query params
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const environment = searchParams.get('environment') as SquareEnvironment | undefined;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // 3. Fetch all monitoring data in parallel
    const [
      realtimeMetrics,
      detailedMetrics,
      webhookMetrics,
      recentLogs,
      failedWebhooks,
      paymentSyncHistory,
      paymentSyncMetrics,
      activeAlerts,
    ] = await Promise.all([
      getMetricsSummary(),
      getDetailedMetrics(),
      getWebhookMetrics({ since, environment }),
      getRecentWebhookLogs({ limit: 50, environment, since }),
      getFailedWebhooks({ limit: 20, environment, since }),
      getPaymentSyncHistory({ limit: 10, since }),
      getPaymentSyncMetrics(since),
      checkAlertThresholds(),
    ]);

    // 4. Calculate health score
    const healthScore = calculateHealthScore({
      webhookMetrics,
      realtimeMetrics,
      paymentSyncMetrics,
      activeAlerts,
    });

    // 5. Generate insights and recommendations
    const insights = generateInsights({
      webhookMetrics,
      recentLogs,
      failedWebhooks,
      paymentSyncMetrics,
    });

    // 6. Prepare dashboard response
    const dashboardData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      timeRange: { hours, since },

      health: {
        score: healthScore,
        status:
          healthScore >= 95
            ? 'excellent'
            : healthScore >= 90
              ? 'good'
              : healthScore >= 80
                ? 'fair'
                : 'poor',
        alerts: activeAlerts,
      },

      webhooks: {
        realtime: realtimeMetrics,
        detailed: webhookMetrics,
        recent_logs: recentLogs.slice(0, 20).map(log => ({
          id: log.webhookId,
          eventType: log.eventType,
          environment: log.environment,
          success: log.signatureValid,
          processingTime: log.processingTimeMs,
          timestamp: log.createdAt,
          error: log.validationError,
        })),
        failed_webhooks: failedWebhooks.map(log => ({
          id: log.webhookId,
          eventType: log.eventType,
          environment: log.environment,
          error: log.validationError,
          timestamp: log.createdAt,
        })),
      },

      payment_sync: {
        metrics: paymentSyncMetrics,
        recent_syncs: paymentSyncHistory.map(sync => ({
          syncId: sync.syncId,
          syncType: sync.syncType,
          success: sync.endTime && sync.paymentsFailed === 0,
          paymentsFound: sync.paymentsFound,
          paymentsProcessed: sync.paymentsProcessed,
          duration: sync.endTime ? sync.endTime.getTime() - sync.startTime.getTime() : null,
          timestamp: sync.createdAt,
        })),
      },

      insights,

      configuration: {
        environment_secrets: {
          production: !!process.env.SQUARE_WEBHOOK_SECRET,
          sandbox: !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX,
        },
        monitoring_enabled: true,
        alerting_enabled: true,
        payment_sync_enabled: true,
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('❌ Failed to generate webhook dashboard data:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate dashboard data',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Trigger actions (sync, cleanup, etc.)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('⚡ Admin webhook dashboard action requested');

    // 1. Validate admin authorization
    const authResult = await validateAdminAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: authResult.error,
        },
        { status: 401 }
      );
    }

    // 2. Parse action request
    const body = await request.json();
    const { action, parameters = {} } = body;

    // 3. Execute requested action
    let result: any;

    switch (action) {
      case 'trigger_payment_sync':
        const { syncRecentPayments } = await import('@/lib/square/payment-sync');
        result = await syncRecentPayments({
          lookbackMinutes: parameters.lookbackMinutes || 60,
          environment: parameters.environment || 'production',
          syncType: 'manual',
          forceSync: parameters.forceSync || false,
        });
        break;

      case 'cleanup_old_logs':
        const { cleanupOldWebhookLogs } = await import('@/lib/db/queries/webhooks');
        result = await cleanupOldWebhookLogs(parameters.olderThanDays || 30);
        break;

      case 'reset_metrics':
        const { resetMetrics } = await import('@/lib/monitoring/webhook-metrics');
        resetMetrics();
        result = { success: true, message: 'Metrics reset successfully' };
        break;

      default:
        return NextResponse.json(
          {
            error: 'Unknown action',
            availableActions: ['trigger_payment_sync', 'cleanup_old_logs', 'reset_metrics'],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ Admin action failed:`, error);

    return NextResponse.json(
      {
        error: 'Action failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall health score based on various metrics
 */
function calculateHealthScore(data: {
  webhookMetrics: any;
  realtimeMetrics: any;
  paymentSyncMetrics: any;
  activeAlerts: any[];
}): number {
  let score = 100;

  // Deduct for low webhook success rate
  if (data.webhookMetrics.successRate < 95) {
    score -= (95 - data.webhookMetrics.successRate) * 2;
  }

  // Deduct for high latency
  if (data.webhookMetrics.averageProcessingTime > 200) {
    score -= Math.min(20, (data.webhookMetrics.averageProcessingTime - 200) / 10);
  }

  // Deduct for payment sync failures
  if (data.paymentSyncMetrics.failedSyncs > 0) {
    const failureRate = data.paymentSyncMetrics.failedSyncs / data.paymentSyncMetrics.totalSyncs;
    score -= failureRate * 30;
  }

  // Deduct for active alerts
  data.activeAlerts.forEach(alert => {
    switch (alert.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  });

  return Math.max(0, Math.round(score));
}

/**
 * Generate insights and recommendations based on monitoring data
 */
function generateInsights(data: {
  webhookMetrics: any;
  recentLogs: any[];
  failedWebhooks: any[];
  paymentSyncMetrics: any;
}): {
  insights: string[];
  recommendations: string[];
  warnings: string[];
} {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const warnings: string[] = [];

  // Webhook performance insights
  if (data.webhookMetrics.successRate > 98) {
    insights.push('Webhook validation is performing excellently');
  } else if (data.webhookMetrics.successRate < 90) {
    warnings.push(`Webhook success rate is low at ${data.webhookMetrics.successRate}%`);
    recommendations.push('Check webhook secret configuration and Square environment setup');
  }

  // Payment sync insights
  if (data.paymentSyncMetrics.totalSyncs > 0) {
    const syncSuccessRate =
      (data.paymentSyncMetrics.successfulSyncs / data.paymentSyncMetrics.totalSyncs) * 100;
    if (syncSuccessRate > 95) {
      insights.push('Payment sync fallback system is working well');
    } else {
      warnings.push(`Payment sync success rate is ${Math.round(syncSuccessRate)}%`);
      recommendations.push('Investigate Square API connectivity issues');
    }
  }

  // Failed webhook analysis
  if (data.failedWebhooks.length > 0) {
    const errorTypes = data.failedWebhooks.reduce((acc: Record<string, number>, webhook) => {
      const errorType = webhook.validationError?.type || 'UNKNOWN';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {});

    const mostCommonError = Object.entries(errorTypes).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0];

    if (mostCommonError) {
      warnings.push(
        `Most common webhook error: ${mostCommonError[0]} (${mostCommonError[1]} occurrences)`
      );

      switch (mostCommonError[0]) {
        case 'INVALID_SIGNATURE':
          recommendations.push(
            'Verify webhook secrets are correctly configured without trailing newlines'
          );
          break;
        case 'MISSING_SECRET':
          recommendations.push('Ensure both sandbox and production webhook secrets are configured');
          break;
        case 'EVENT_TOO_OLD':
          recommendations.push('Check system clock synchronization and webhook delivery latency');
          break;
      }
    }
  }

  // Performance insights
  if (data.webhookMetrics.averageProcessingTime > 500) {
    warnings.push(
      `High webhook processing latency: ${data.webhookMetrics.averageProcessingTime}ms`
    );
    recommendations.push('Optimize database queries and consider increasing server resources');
  }

  return { insights, recommendations, warnings };
}

/**
 * Validate admin authentication
 */
async function validateAdminAuth(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
  userId?: string;
}> {
  // Check for API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey === process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY) {
    return { valid: true, userId: 'api_admin' };
  }

  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return { valid: true, userId: 'dev_admin' };
  }

  return {
    valid: false,
    error: 'Admin access required. Use x-api-key header.',
  };
}
