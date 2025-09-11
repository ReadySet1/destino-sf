/**
 * Database queries for webhook logging and monitoring
 * 
 * These queries handle webhook_logs and related operations with optimized
 * performance and proper error handling.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { 
  type WebhookLogEntry,
  type WebhookValidationResult,
  type SquareWebhookPayload,
  type SquareEnvironment,
  type WebhookId
} from '@/types/webhook';
import { prisma, withRetry } from '@/lib/db-unified';

/**
 * Log webhook validation attempt to database
 * Critical for monitoring and debugging webhook issues
 */
export async function logWebhook(params: {
  payload: SquareWebhookPayload;
  headers: Record<string, string>;
  signatureValid: boolean;
  validationError?: any;
  environment: SquareEnvironment;
  processingTimeMs: number;
  webhookId?: WebhookId;
}): Promise<WebhookLogEntry> {
  return withRetry(async () => {
    const webhookId = params.webhookId || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const logEntry = await prisma.webhookLog.create({
      data: {
        webhookId: webhookId,
        eventType: params.payload.type,
        merchantId: params.payload.merchant_id,
        environment: params.environment,
        signatureValid: params.signatureValid,
        validationError: params.validationError || null,
        payload: params.payload as any,
        headers: params.headers as any,
        processingTimeMs: params.processingTimeMs,
        processedAt: new Date(),
      }
    });

    return {
      id: logEntry.id,
      webhookId: logEntry.webhookId,
      eventType: logEntry.eventType,
      merchantId: logEntry.merchantId || undefined,
      environment: logEntry.environment as SquareEnvironment,
      signatureValid: logEntry.signatureValid,
      validationError: logEntry.validationError as any,
      payload: logEntry.payload as SquareWebhookPayload,
      headers: logEntry.headers as Record<string, string>,
      processingTimeMs: logEntry.processingTimeMs || undefined,
      processedAt: logEntry.processedAt || undefined,
      createdAt: logEntry.createdAt,
      updatedAt: logEntry.updatedAt,
    };
  }, 2, 'log-webhook');
}

/**
 * Check if webhook event has already been processed (duplicate detection)
 */
export async function checkDuplicateWebhook(eventId: string): Promise<{
  isDuplicate: boolean;
  existingId?: string;
}> {
  return withRetry(async () => {
    const existing = await prisma.webhookLog.findFirst({
      where: {
        payload: {
          path: ['event_id'],
          equals: eventId
        }
      },
      select: {
        id: true,
        webhookId: true,
        createdAt: true
      }
    });

    return {
      isDuplicate: !!existing,
      existingId: existing?.webhookId
    };
  }, 2, 'check-duplicate-webhook');
}

/**
 * Get recent webhook logs for monitoring dashboard
 */
export async function getRecentWebhookLogs(params: {
  limit?: number;
  environment?: SquareEnvironment;
  onlyFailures?: boolean;
  since?: Date;
}): Promise<WebhookLogEntry[]> {
  const { limit = 50, environment, onlyFailures = false, since } = params;
  
  return withRetry(async () => {
    const logs = await prisma.webhookLog.findMany({
      where: {
        ...(environment && { environment }),
        ...(onlyFailures && { signatureValid: false }),
        ...(since && { createdAt: { gte: since } })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return logs.map(log => ({
      id: log.id,
      webhookId: log.webhookId,
      eventType: log.eventType,
      merchantId: log.merchantId || undefined,
      environment: log.environment as SquareEnvironment,
      signatureValid: log.signatureValid,
      validationError: log.validationError as any,
      payload: log.payload as SquareWebhookPayload,
      headers: log.headers as Record<string, string>,
      processingTimeMs: log.processingTimeMs || undefined,
      processedAt: log.processedAt || undefined,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    }));
  }, 2, 'get-recent-webhook-logs');
}

/**
 * Get webhook validation metrics for monitoring
 */
export async function getWebhookMetrics(params: {
  since?: Date;
  environment?: SquareEnvironment;
}): Promise<{
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  successRate: number;
  averageProcessingTime: number;
  failuresByType: Record<string, number>;
}> {
  const { since = new Date(Date.now() - 24 * 60 * 60 * 1000), environment } = params;
  
  return withRetry(async () => {
    // Get basic counts
    const [totalCount, successCount, failedLogs] = await Promise.all([
      prisma.webhookLog.count({
        where: {
          createdAt: { gte: since },
          ...(environment && { environment })
        }
      }),
      prisma.webhookLog.count({
        where: {
          createdAt: { gte: since },
          signatureValid: true,
          ...(environment && { environment })
        }
      }),
      prisma.webhookLog.findMany({
        where: {
          createdAt: { gte: since },
          signatureValid: false,
          ...(environment && { environment })
        },
        select: {
          validationError: true,
          processingTimeMs: true
        }
      })
    ]);

    // Calculate average processing time
    const processingTimes = await prisma.webhookLog.findMany({
      where: {
        createdAt: { gte: since },
        processingTimeMs: { not: null },
        ...(environment && { environment })
      },
      select: { processingTimeMs: true }
    });

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, log) => sum + (log.processingTimeMs || 0), 0) / processingTimes.length
      : 0;

    // Group failures by type
    const failuresByType: Record<string, number> = {};
    failedLogs.forEach(log => {
      if (log.validationError && typeof log.validationError === 'object') {
        const error = log.validationError as any;
        const errorType = error.type || 'UNKNOWN';
        failuresByType[errorType] = (failuresByType[errorType] || 0) + 1;
      }
    });

    const failedCount = totalCount - successCount;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100;

    return {
      totalWebhooks: totalCount,
      successfulWebhooks: successCount,
      failedWebhooks: failedCount,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      averageProcessingTime: Math.round(avgProcessingTime * 100) / 100,
      failuresByType
    };
  }, 2, 'get-webhook-metrics');
}

/**
 * Get failed webhooks for debugging and retry
 */
export async function getFailedWebhooks(params: {
  limit?: number;
  since?: Date;
  environment?: SquareEnvironment;
}): Promise<WebhookLogEntry[]> {
  const { limit = 20, since = new Date(Date.now() - 24 * 60 * 60 * 1000), environment } = params;
  
  return getRecentWebhookLogs({
    limit,
    environment,
    onlyFailures: true,
    since
  });
}

/**
 * Cleanup old webhook logs to prevent database bloat
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupOldWebhookLogs(olderThanDays: number = 30): Promise<{
  deletedCount: number;
}> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  return withRetry(async () => {
    const result = await prisma.webhookLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return { deletedCount: result.count };
  }, 2, 'cleanup-old-webhook-logs');
}

/**
 * Get webhook log by webhook ID for debugging
 */
export async function getWebhookLogById(webhookId: WebhookId): Promise<WebhookLogEntry | null> {
  return withRetry(async () => {
    const log = await prisma.webhookLog.findUnique({
      where: { webhookId }
    });

    if (!log) return null;

    return {
      id: log.id,
      webhookId: log.webhookId,
      eventType: log.eventType,
      merchantId: log.merchantId || undefined,
      environment: log.environment as SquareEnvironment,
      signatureValid: log.signatureValid,
      validationError: log.validationError as any,
      payload: log.payload as SquareWebhookPayload,
      headers: log.headers as Record<string, string>,
      processingTimeMs: log.processingTimeMs || undefined,
      processedAt: log.processedAt || undefined,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }, 2, 'get-webhook-log-by-id');
}
