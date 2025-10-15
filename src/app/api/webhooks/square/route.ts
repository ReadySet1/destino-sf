import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  validateWebhookSignature,
  quickSignatureValidation,
  validateWebhookSecurity,
  debugWebhookSignature,
} from '@/lib/square/webhook-validator';
import { logWebhook } from '@/lib/db/queries/webhooks';
import {
  trackMetric,
  sendWebhookAlert,
  checkAlertThresholds,
} from '@/lib/monitoring/webhook-metrics';
import { handleWebhookWithQueue } from '@/lib/webhook-queue';
import { type SquareWebhookPayload, type WebhookId } from '@/types/webhook';

/**
 * Enhanced Square Webhook Handler
 *
 * This implementation follows the master fix plan:
 * 1. Comprehensive signature validation with environment variable cleaning
 * 2. Complete webhook logging for monitoring and debugging
 * 3. Metrics tracking and alerting
 * 4. Fast acknowledgment to prevent Square retries
 * 5. Queue-based processing with fallback mechanisms
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  let validationResult: any = null;
  let webhookId: string | undefined;
  let webhookLog: any = null;

  try {
    console.log('🔔 Received Square webhook request');

    // Debug: Log all headers received from Square
    console.log('📋 Request headers received:', {
      'x-square-signature': request.headers.get('x-square-signature'),
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent'),
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'content-length': request.headers.get('content-length'),
      allHeaders: Object.fromEntries(request.headers.entries()),
    });

    // Step 1: Security validation (rate limiting, headers, etc.)
    const securityCheck = await validateWebhookSecurity(request);
    if (!securityCheck.valid) {
      console.warn('🔒 Security validation failed:', securityCheck.error);
      return NextResponse.json(
        {
          error: 'Security validation failed',
          details: securityCheck.error,
        },
        { status: 400 }
      );
    }

    // Step 2: Read body for signature validation
    const bodyText = await request.text();
    console.log('📄 Body read successfully - length:', bodyText?.length || 0);

    // CRITICAL: Check for empty body before processing
    if (!bodyText || bodyText.trim().length === 0) {
      console.warn(
        '⚠️ Received webhook with empty body - this may be a health check or test request'
      );

      // Return successful response for empty body (health checks, etc.)
      return NextResponse.json({
        received: true,
        message: 'Empty body received - treating as health check',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Comprehensive signature validation
    validationResult = await validateWebhookSignature(request, bodyText);
    webhookId = validationResult.metadata?.webhookId;

    console.log('🔐 Signature validation result:', {
      valid: validationResult.valid,
      environment: validationResult.environment,
      processingTime: validationResult.metadata?.processingTimeMs,
    });

    // Step 4: Parse payload for logging (even if validation fails)
    let payload: SquareWebhookPayload | null = null;
    try {
      payload = JSON.parse(bodyText);
      console.log('✅ Webhook payload parsed successfully:', {
        eventType: payload?.type,
        eventId: payload?.event_id,
        objectId: payload?.data?.id,
      });
    } catch (parseError) {
      console.error('❌ Failed to parse webhook payload:', parseError);
      console.error('📋 Raw body content:', bodyText.slice(0, 500)); // Log first 500 chars for debugging

      // Still log the attempt for debugging
      if (webhookId) {
        await logWebhook({
          payload: {
            event_id: 'parse_error',
            type: 'unknown',
            merchant_id: '',
            created_at: new Date().toISOString(),
            data: { type: '', id: '', object: {} },
          },
          headers: Object.fromEntries(request.headers.entries()),
          signatureValid: false,
          validationError: { type: 'MALFORMED_BODY', error: 'JSON parse failed' },
          environment: validationResult.environment,
          processingTimeMs: performance.now() - startTime,
          webhookId: webhookId as WebhookId,
        });
      }

      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Step 5: Log webhook attempt (success or failure)
    if (payload) {
      webhookLog = await logWebhook({
        payload,
        headers: Object.fromEntries(request.headers.entries()),
        signatureValid: validationResult.valid,
        validationError: validationResult.error,
        environment: validationResult.environment,
        processingTimeMs: performance.now() - startTime,
        webhookId: webhookId as WebhookId,
      });
    }

    // Step 6: Track metrics
    await trackMetric({
      type: 'webhook_received',
      environment: validationResult.environment,
      valid: validationResult.valid,
      eventType: payload?.type || 'unknown',
      duration: performance.now() - startTime,
    });

    // Step 7: Handle validation failure
    if (!validationResult.valid) {
      console.error('❌ Webhook signature validation failed');

      // Send alert for signature failures
      if (validationResult.error?.type === 'INVALID_SIGNATURE') {
        await sendWebhookAlert({
          severity: 'medium',
          title: 'Webhook Signature Validation Failed',
          message: `Signature validation failed for ${payload?.type || 'unknown'} event`,
          details: {
            environment: validationResult.environment,
            error: validationResult.error,
            eventId: payload?.event_id || 'unknown',
          },
          environment: validationResult.environment,
        });
      }

      // Track failure metric
      await trackMetric({
        type: 'signature_failed',
        environment: validationResult.environment,
        eventType: payload?.type || 'unknown',
        error: validationResult.error?.type,
      });

      return NextResponse.json(
        {
          error: 'Invalid signature',
          details: validationResult.error,
          webhookId: webhookLog?.webhookId,
        },
        { status: 401 }
      );
    }

    // Step 8: Check for duplicate events in webhook queue (not logs)
    // Fixed: Check webhook queue for actual processing status, not just logs
    let duplicateCheck: { isDuplicate: boolean; existingId: string | undefined } = {
      isDuplicate: false,
      existingId: undefined,
    };
    if (payload) {
      try {
        const { prisma } = await import('@/lib/db-unified');
        const existingQueueItem = await prisma.webhookQueue.findUnique({
          where: { eventId: payload.event_id },
          select: { id: true, status: true, createdAt: true },
        });

        if (existingQueueItem) {
          duplicateCheck = {
            isDuplicate: true,
            existingId: existingQueueItem.id,
          };
        }
      } catch (queueCheckError) {
        console.warn('⚠️ Error checking webhook queue for duplicates:', queueCheckError);
        // Continue processing if queue check fails
      }
    }

    if (duplicateCheck.isDuplicate) {
      console.warn(
        `⚠️ Duplicate webhook event detected in queue: ${payload?.event_id || 'unknown'}`
      );
      return NextResponse.json({
        received: true,
        duplicate: true,
        eventId: payload?.event_id || 'unknown',
        existingId: duplicateCheck.existingId,
      });
    }

    // Step 9: Queue for background processing with proper processing queue
    try {
      console.log('📥 Processing webhook with background queue:', payload?.type, payload?.event_id);
      await handleWebhookWithQueue(payload, payload?.type || 'unknown');
      console.log('✅ Webhook queued for processing');

      await trackMetric({
        type: 'webhook_processed',
        environment: validationResult.environment,
        valid: true,
        eventType: payload?.type || 'unknown',
      });
    } catch (queueError) {
      console.error('❌ Failed to queue webhook:', queueError);

      await sendWebhookAlert({
        severity: 'high',
        title: 'Webhook Queue Error',
        message: 'Failed to queue webhook for processing',
        details: {
          error: queueError,
          webhookId: webhookLog?.webhookId,
          eventId: payload?.event_id || 'unknown',
        },
        environment: validationResult.environment,
      });

      // Still acknowledge to prevent Square retries
    }

    // Step 10: Check for alert thresholds
    const alerts = checkAlertThresholds();
    if (alerts.length > 0) {
      console.warn(`🚨 ${alerts.length} webhook alerts triggered`);
      for (const alert of alerts) {
        await sendWebhookAlert({
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          details: alert.details,
        });
      }
    }

    // Step 11: Return immediate acknowledgment
    const duration = performance.now() - startTime;
    console.log(
      `✅ Webhook acknowledged successfully in ${duration}ms:`,
      payload?.type || 'unknown',
      payload?.event_id || 'unknown'
    );

    return NextResponse.json({
      received: true,
      eventId: payload?.event_id || 'unknown',
      type: payload?.type || 'unknown',
      environment: validationResult.environment,
      processingTimeMs: Math.round(duration * 100) / 100,
      webhookId: webhookLog?.webhookId,
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ Webhook processing failed in ${duration}ms:`, error);

    // Send critical alert for unexpected errors
    await sendWebhookAlert({
      severity: 'critical',
      title: 'Unexpected Webhook Error',
      message: 'Webhook processing encountered an unexpected error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        webhookId,
        environment: validationResult?.environment || 'unknown',
      },
    });

    // Always return 200 to prevent Square retries on our internal errors
    return NextResponse.json(
      {
        received: true,
        error: true,
        message: 'Internal processing error - webhook acknowledged',
        processingTimeMs: Math.round(duration * 100) / 100,
      },
      { status: 200 }
    );
  }
}

/**
 * GET endpoint for webhook validation and health check
 * Provides comprehensive status information for monitoring
 */
export async function GET(): Promise<NextResponse> {
  try {
    const hasProductionSecret = !!process.env.SQUARE_WEBHOOK_SECRET;
    const hasSandboxSecret = !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;

    // Get recent metrics summary
    const { getMetricsSummary, getDetailedMetrics } = await import(
      '@/lib/monitoring/webhook-metrics'
    );
    const metricsSummary = getMetricsSummary();

    // Get recent webhook logs for health assessment
    const { getRecentWebhookLogs } = await import('@/lib/db/queries/webhooks');
    const recentLogs = await getRecentWebhookLogs({ limit: 5 });

    const healthStatus = {
      overall:
        metricsSummary.overall.successRate >= 95
          ? 'healthy'
          : metricsSummary.overall.successRate >= 90
            ? 'degraded'
            : 'unhealthy',
      lastWebhook: recentLogs[0]?.createdAt || null,
      avgLatency: metricsSummary.overall.avgDuration,
    };

    return NextResponse.json({
      status: 'ok',
      health: healthStatus,
      webhook_endpoint: 'square',
      timestamp: new Date().toISOString(),

      environment: {
        node_env: process.env.NODE_ENV,
        has_production_secret: hasProductionSecret,
        has_sandbox_secret: hasSandboxSecret,
        vercel: !!process.env.VERCEL,
        vercel_env: process.env.VERCEL_ENV,
      },

      configuration: {
        production_ready: hasProductionSecret,
        sandbox_ready: hasSandboxSecret,
        both_environments_ready: hasProductionSecret && hasSandboxSecret,
        recommendation:
          !hasProductionSecret && !hasSandboxSecret
            ? 'Configure both SQUARE_WEBHOOK_SECRET and SQUARE_WEBHOOK_SECRET_SANDBOX'
            : !hasSandboxSecret
              ? 'Add SQUARE_WEBHOOK_SECRET_SANDBOX for complete webhook support'
              : !hasProductionSecret
                ? 'Add SQUARE_WEBHOOK_SECRET for production webhook support'
                : 'All webhook secrets configured correctly',
      },

      metrics: metricsSummary,

      recent_activity: {
        last_5_webhooks: recentLogs.map(log => ({
          eventType: log.eventType,
          environment: log.environment,
          success: log.signatureValid,
          timestamp: log.createdAt,
          processingTime: log.processingTimeMs,
        })),
      },

      fixes_applied: [
        'comprehensive_signature_validation',
        'environment_variable_cleaning',
        'webhook_logging_system',
        'metrics_tracking',
        'duplicate_detection',
        'security_validation',
        'enhanced_error_handling',
        'performance_monitoring',
        'automatic_alerting',
      ],

      version: '2.0.0',
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
