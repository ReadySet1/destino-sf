import { NextRequest, NextResponse } from 'next/server';
import { withConnection, webhookQueries } from '@/lib/db-optimized';
import { WebhookMonitor } from '@/lib/webhook-monitoring';

/**
 * Webhook metrics dashboard endpoint
 * Provides comprehensive webhook performance data
 */
export async function GET(request: NextRequest) {
  try {
    // Get queue metrics from database
    const queueMetrics = await withConnection(async prisma => {
      const [totalWebhooks, byStatus, recentActivity] = await Promise.all([
        // Total webhooks in last 24 hours
        prisma.webhookQueue.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        }),

        // Status breakdown
        prisma.webhookQueue.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: {
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        }),

        // Recent activity (last hour)
        prisma.webhookQueue.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 3600000) },
          },
          select: {
            eventType: true,
            status: true,
            attempts: true,
            createdAt: true,
            processedAt: true,
            errorMessage: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);

      return {
        totalWebhooks,
        statusBreakdown: byStatus,
        recentActivity,
      };
    });

    // Get in-memory performance metrics
    const performanceMetrics = WebhookMonitor.getMetrics();

    // Calculate processing times for completed webhooks
    const processingTimes = await withConnection(async prisma => {
      const completed = await prisma.webhookQueue.findMany({
        where: {
          status: 'COMPLETED',
          processedAt: { not: null },
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
        select: {
          eventType: true,
          createdAt: true,
          processedAt: true,
        },
      });

      return completed.map(w => ({
        eventType: w.eventType,
        processingTime: w.processedAt!.getTime() - w.createdAt.getTime(),
      }));
    });

    // Calculate average processing times by event type
    const avgProcessingTimes = processingTimes.reduce(
      (acc, curr) => {
        if (!acc[curr.eventType]) {
          acc[curr.eventType] = { total: 0, count: 0 };
        }
        acc[curr.eventType].total += curr.processingTime;
        acc[curr.eventType].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    );

    const processingStats = Object.entries(avgProcessingTimes).map(([type, data]) => ({
      eventType: type,
      avgProcessingTime: Math.round(data.total / data.count),
      count: data.count,
    }));

    // Get error analysis
    const errorAnalysis = await withConnection(async prisma => {
      const errors = await prisma.webhookQueue.findMany({
        where: {
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
        select: {
          eventType: true,
          errorMessage: true,
          attempts: true,
        },
      });

      const errorsByType = errors.reduce(
        (acc, error) => {
          if (!acc[error.eventType]) {
            acc[error.eventType] = [];
          }
          acc[error.eventType].push({
            error: error.errorMessage,
            attempts: error.attempts,
          });
          return acc;
        },
        {} as Record<string, Array<{ error: string | null; attempts: number }>>
      );

      return errorsByType;
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      queue: queueMetrics,
      performance: performanceMetrics,
      processingStats,
      errorAnalysis,
      health: {
        queueSize: queueMetrics.statusBreakdown.find(s => s.status === 'PENDING')?._count._all || 0,
        failedCount:
          queueMetrics.statusBreakdown.find(s => s.status === 'FAILED')?._count._all || 0,
        successRate: calculateSuccessRate(queueMetrics.statusBreakdown),
      },
    });
  } catch (error) {
    console.error('Failed to get webhook metrics:', error);
    return NextResponse.json({ error: 'Failed to get webhook metrics' }, { status: 500 });
  }
}

function calculateSuccessRate(
  statusBreakdown: Array<{ status: string; _count: { _all: number } }>
): string {
  const total = statusBreakdown.reduce((sum, s) => sum + s._count._all, 0);
  const completed = statusBreakdown.find(s => s.status === 'COMPLETED')?._count._all || 0;

  if (total === 0) return '0%';
  return ((completed / total) * 100).toFixed(2) + '%';
}
