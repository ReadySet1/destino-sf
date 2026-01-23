/**
 * Comprehensive Monitoring API
 *
 * Aggregates metrics from all monitoring sources for the admin dashboard.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { externalAPITracker } from '@/lib/monitoring/external-api-tracker';
import { getConcurrencyHealth, concurrencyMetrics, ConcurrencyMetricType } from '@/lib/monitoring/concurrency-metrics';
import { errorMonitor } from '@/lib/error-monitoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MonitoringOverview {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  externalServices: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate: number;
    avgLatency: number;
    lastCallAt: string | null;
  }>;
  concurrency: {
    healthy: boolean;
    issues: string[];
    stats: {
      totalLockAcquisitions: number;
      lockConflicts: number;
      deduplicationsTriggered: number;
    };
  };
  recentErrors: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const timeWindow = 60 * 60 * 1000; // 1 hour

    // Get performance metrics
    const performanceMetrics = performanceMonitor.getPerformanceSummary(timeWindow);

    // Get external services health
    const externalServicesHealth = externalAPITracker.getAllServicesHealth(timeWindow);

    // Get concurrency health
    const concurrencyHealth = getConcurrencyHealth(timeWindow);
    const concurrencySummary = concurrencyMetrics.getSummary();

    // Calculate concurrency stats from summary
    const concurrencyStats = {
      totalLockAcquisitions: (concurrencySummary[ConcurrencyMetricType.PESSIMISTIC_LOCK_ACQUIRED]?.count || 0) +
        (concurrencySummary[ConcurrencyMetricType.OPTIMISTIC_LOCK_SUCCESS]?.count || 0),
      lockConflicts: (concurrencySummary[ConcurrencyMetricType.PESSIMISTIC_LOCK_TIMEOUT]?.count || 0) +
        (concurrencySummary[ConcurrencyMetricType.OPTIMISTIC_LOCK_CONFLICT]?.count || 0),
      deduplicationsTriggered: concurrencySummary[ConcurrencyMetricType.REQUEST_DEDUPLICATED]?.count || 0,
      optimisticLockConflicts: concurrencySummary[ConcurrencyMetricType.OPTIMISTIC_LOCK_CONFLICT]?.count || 0,
    };

    // Get error statistics
    const errorStats = errorMonitor.getCriticalErrorStats();

    // Calculate overall status
    const status = calculateOverallStatus(
      performanceMetrics.error_rate,
      externalServicesHealth,
      concurrencyHealth.healthy
    );

    // Build response
    const overview: MonitoringOverview = {
      timestamp: new Date().toISOString(),
      status,
      performance: {
        averageResponseTime: performanceMetrics.response_times.average,
        p95ResponseTime: performanceMetrics.response_times.p95,
        errorRate: performanceMetrics.error_rate,
        throughput: performanceMetrics.throughput,
      },
      externalServices: Object.fromEntries(
        Object.entries(externalServicesHealth).map(([service, health]) => [
          service,
          {
            status: getServiceStatus(health.errorRate, health.averageLatency),
            errorRate: health.errorRate,
            avgLatency: health.averageLatency,
            lastCallAt: health.lastCallAt?.toISOString() || null,
          },
        ])
      ),
      concurrency: {
        healthy: concurrencyHealth.healthy,
        issues: concurrencyHealth.issues,
        stats: {
          totalLockAcquisitions: concurrencyStats.totalLockAcquisitions,
          lockConflicts: concurrencyStats.lockConflicts,
          deduplicationsTriggered: concurrencyStats.deduplicationsTriggered,
        },
      },
      recentErrors: {
        critical: Object.values(errorStats).reduce((a, b) => a + b, 0),
        high: 0, // Would need to track these separately
        medium: 0,
        low: 0,
      },
    };

    // Also include detailed data
    const detailed = {
      overview,
      performance: {
        ...performanceMetrics,
        memory: performanceMetrics.memory_usage,
      },
      externalServices: {
        health: externalServicesHealth,
        errors: externalAPITracker.getErrorBreakdown(timeWindow),
        latencyByEndpoint: {
          square: externalAPITracker.getLatencyByEndpoint('square', timeWindow),
          shippo: externalAPITracker.getLatencyByEndpoint('shippo', timeWindow),
          resend: externalAPITracker.getLatencyByEndpoint('resend', timeWindow),
        },
      },
      concurrency: {
        health: concurrencyHealth,
        stats: concurrencyStats,
      },
      slowQueries: performanceMetrics.slow_queries,
    };

    return NextResponse.json(detailed, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[MonitoringAPI] Error fetching metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch monitoring data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function calculateOverallStatus(
  errorRate: number,
  externalServices: Record<string, { errorRate: number }>,
  concurrencyHealthy: boolean
): 'healthy' | 'degraded' | 'unhealthy' {
  // Check for critical issues
  if (errorRate > 10 || !concurrencyHealthy) {
    return 'unhealthy';
  }

  // Check external services
  const serviceErrorRates = Object.values(externalServices).map(s => s.errorRate);
  const hasHighServiceErrorRate = serviceErrorRates.some(r => r > 20);

  if (errorRate > 5 || hasHighServiceErrorRate) {
    return 'degraded';
  }

  return 'healthy';
}

function getServiceStatus(
  errorRate: number,
  avgLatency: number
): 'healthy' | 'degraded' | 'unhealthy' {
  if (errorRate > 20 || avgLatency > 5000) {
    return 'unhealthy';
  }
  if (errorRate > 5 || avgLatency > 2000) {
    return 'degraded';
  }
  return 'healthy';
}
