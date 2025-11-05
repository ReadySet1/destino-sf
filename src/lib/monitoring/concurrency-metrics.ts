/**
 * Concurrency Metrics Monitoring
 *
 * Tracks and reports metrics related to concurrent operations,
 * database locks, and race condition prevention mechanisms.
 *
 * Part of DES-60 Phase 4: Concurrent Operations & Race Conditions
 *
 * Metrics tracked:
 * - Lock acquisition attempts and successes
 * - Lock wait times and timeouts
 * - Request deduplication hits
 * - Optimistic lock conflicts
 * - Concurrent operation counts
 *
 * @project DES-60 Phase 4
 */

import { logger } from '@/utils/logger';

/**
 * Metric types for concurrency monitoring
 */
export enum ConcurrencyMetricType {
  // Lock metrics
  PESSIMISTIC_LOCK_ACQUIRED = 'pessimistic_lock_acquired',
  PESSIMISTIC_LOCK_TIMEOUT = 'pessimistic_lock_timeout',
  PESSIMISTIC_LOCK_FAILED = 'pessimistic_lock_failed',
  OPTIMISTIC_LOCK_SUCCESS = 'optimistic_lock_success',
  OPTIMISTIC_LOCK_CONFLICT = 'optimistic_lock_conflict',

  // Request deduplication
  REQUEST_DEDUPLICATED = 'request_deduplicated',
  REQUEST_CACHE_HIT = 'request_cache_hit',
  REQUEST_CACHE_MISS = 'request_cache_miss',

  // Duplicate order prevention
  DUPLICATE_ORDER_DETECTED = 'duplicate_order_detected',
  DUPLICATE_ORDER_ALLOWED = 'duplicate_order_allowed',

  // Concurrent operations
  CONCURRENT_CHECKOUT = 'concurrent_checkout',
  CONCURRENT_PAYMENT = 'concurrent_payment',
  CONCURRENT_CART_UPDATE = 'concurrent_cart_update',

  // Performance
  LOCK_WAIT_TIME = 'lock_wait_time',
  TRANSACTION_DURATION = 'transaction_duration',
  DEDUPLICATION_LATENCY = 'deduplication_latency',
}

/**
 * Metric data structure
 */
export interface ConcurrencyMetric {
  type: ConcurrencyMetricType;
  timestamp: Date;
  duration?: number; // in milliseconds
  metadata?: Record<string, any>;
  success: boolean;
}

/**
 * In-memory metrics store (for development/testing)
 * In production, this would be sent to a monitoring service like Datadog, New Relic, etc.
 */
class ConcurrencyMetricsStore {
  private metrics: ConcurrencyMetric[] = [];
  private maxSize: number = 1000;

  /**
   * Record a metric
   */
  record(metric: ConcurrencyMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }

    // Log metric (can be disabled in production)
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[Concurrency Metric] ${metric.type}`, {
        success: metric.success,
        duration: metric.duration,
        ...metric.metadata,
      });
    }
  }

  /**
   * Get metrics by type
   */
  getMetrics(type?: ConcurrencyMetricType): ConcurrencyMetric[] {
    if (type) {
      return this.metrics.filter(m => m.type === type);
    }
    return this.metrics;
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<ConcurrencyMetricType, { count: number; successRate: number; avgDuration?: number }> {
    const summary: any = {};

    Object.values(ConcurrencyMetricType).forEach(type => {
      const typeMetrics = this.getMetrics(type as ConcurrencyMetricType);

      if (typeMetrics.length === 0) {
        return;
      }

      const successCount = typeMetrics.filter(m => m.success).length;
      const successRate = (successCount / typeMetrics.length) * 100;

      const durationsWithValues = typeMetrics.filter(m => m.duration !== undefined);
      const avgDuration =
        durationsWithValues.length > 0
          ? durationsWithValues.reduce((sum, m) => sum + (m.duration || 0), 0) / durationsWithValues.length
          : undefined;

      summary[type] = {
        count: typeMetrics.length,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: avgDuration !== undefined ? Math.round(avgDuration * 100) / 100 : undefined,
      };
    });

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get metrics count
   */
  get size(): number {
    return this.metrics.length;
  }
}

/**
 * Global metrics store instance
 */
export const concurrencyMetrics = new ConcurrencyMetricsStore();

/**
 * Record a pessimistic lock acquisition
 */
export function recordPessimisticLock(
  success: boolean,
  duration: number,
  metadata?: { table?: string; id?: string; reason?: string }
): void {
  const type = success
    ? ConcurrencyMetricType.PESSIMISTIC_LOCK_ACQUIRED
    : metadata?.reason === 'timeout'
      ? ConcurrencyMetricType.PESSIMISTIC_LOCK_TIMEOUT
      : ConcurrencyMetricType.PESSIMISTIC_LOCK_FAILED;

  concurrencyMetrics.record({
    type,
    timestamp: new Date(),
    duration,
    success,
    metadata,
  });
}

/**
 * Record an optimistic lock attempt
 */
export function recordOptimisticLock(
  success: boolean,
  metadata?: { modelName?: string; id?: string; expectedVersion?: number; actualVersion?: number }
): void {
  const type = success
    ? ConcurrencyMetricType.OPTIMISTIC_LOCK_SUCCESS
    : ConcurrencyMetricType.OPTIMISTIC_LOCK_CONFLICT;

  concurrencyMetrics.record({
    type,
    timestamp: new Date(),
    success,
    metadata,
  });
}

/**
 * Record a request deduplication event
 */
export function recordRequestDeduplication(
  hit: boolean,
  metadata?: { key?: string; cacheSize?: number }
): void {
  const type = hit ? ConcurrencyMetricType.REQUEST_CACHE_HIT : ConcurrencyMetricType.REQUEST_CACHE_MISS;

  concurrencyMetrics.record({
    type,
    timestamp: new Date(),
    success: true,
    metadata,
  });

  if (hit) {
    concurrencyMetrics.record({
      type: ConcurrencyMetricType.REQUEST_DEDUPLICATED,
      timestamp: new Date(),
      success: true,
      metadata,
    });
  }
}

/**
 * Record duplicate order detection
 */
export function recordDuplicateOrderCheck(
  isDuplicate: boolean,
  metadata?: { userId?: string; email?: string; orderId?: string }
): void {
  const type = isDuplicate
    ? ConcurrencyMetricType.DUPLICATE_ORDER_DETECTED
    : ConcurrencyMetricType.DUPLICATE_ORDER_ALLOWED;

  concurrencyMetrics.record({
    type,
    timestamp: new Date(),
    success: true,
    metadata,
  });
}

/**
 * Record concurrent operation
 */
export function recordConcurrentOperation(
  operationType: 'checkout' | 'payment' | 'cart_update',
  success: boolean,
  duration: number,
  metadata?: Record<string, any>
): void {
  const typeMap = {
    checkout: ConcurrencyMetricType.CONCURRENT_CHECKOUT,
    payment: ConcurrencyMetricType.CONCURRENT_PAYMENT,
    cart_update: ConcurrencyMetricType.CONCURRENT_CART_UPDATE,
  };

  concurrencyMetrics.record({
    type: typeMap[operationType],
    timestamp: new Date(),
    duration,
    success,
    metadata,
  });
}

/**
 * Record performance metric
 */
export function recordPerformanceMetric(
  metricType: 'lock_wait' | 'transaction' | 'deduplication',
  duration: number,
  metadata?: Record<string, any>
): void {
  const typeMap = {
    lock_wait: ConcurrencyMetricType.LOCK_WAIT_TIME,
    transaction: ConcurrencyMetricType.TRANSACTION_DURATION,
    deduplication: ConcurrencyMetricType.DEDUPLICATION_LATENCY,
  };

  concurrencyMetrics.record({
    type: typeMap[metricType],
    timestamp: new Date(),
    duration,
    success: true,
    metadata,
  });
}

/**
 * Metrics reporter - can be called periodically to log summary
 */
export function reportMetricsSummary(): void {
  const summary = concurrencyMetrics.getSummary();

  logger.info('Concurrency Metrics Summary', {
    summary,
    totalMetrics: concurrencyMetrics.size,
  });

  // In production, this would send metrics to monitoring service
  // Example: sendToDatadog(summary)
  // Example: sendToNewRelic(summary)
}

/**
 * Health check for concurrency system
 */
export interface ConcurrencyHealthCheck {
  healthy: boolean;
  issues: string[];
  stats: {
    lockTimeouts: number;
    optimisticConflicts: number;
    deduplicationHitRate: number;
    duplicateOrderRate: number;
  };
}

/**
 * Check concurrency system health
 */
export function getConcurrencyHealth(timeWindow: number = 3600000): ConcurrencyHealthCheck {
  const now = Date.now();
  const windowStart = new Date(now - timeWindow);

  const recentMetrics = concurrencyMetrics
    .getMetrics()
    .filter(m => m.timestamp >= windowStart);

  const issues: string[] = [];

  // Calculate stats
  const lockTimeouts = recentMetrics.filter(
    m => m.type === ConcurrencyMetricType.PESSIMISTIC_LOCK_TIMEOUT
  ).length;

  const optimisticConflicts = recentMetrics.filter(
    m => m.type === ConcurrencyMetricType.OPTIMISTIC_LOCK_CONFLICT
  ).length;

  const deduplicationHits = recentMetrics.filter(
    m => m.type === ConcurrencyMetricType.REQUEST_CACHE_HIT
  ).length;

  const deduplicationMisses = recentMetrics.filter(
    m => m.type === ConcurrencyMetricType.REQUEST_CACHE_MISS
  ).length;

  const deduplicationHitRate =
    deduplicationHits + deduplicationMisses > 0
      ? (deduplicationHits / (deduplicationHits + deduplicationMisses)) * 100
      : 0;

  const duplicatesDetected = recentMetrics.filter(
    m => m.type === ConcurrencyMetricType.DUPLICATE_ORDER_DETECTED
  ).length;

  const duplicatesAllowed = recentMetrics.filter(
    m => m.type === ConcurrencyMetricType.DUPLICATE_ORDER_ALLOWED
  ).length;

  const duplicateOrderRate =
    duplicatesDetected + duplicatesAllowed > 0
      ? (duplicatesDetected / (duplicatesDetected + duplicatesAllowed)) * 100
      : 0;

  // Check for issues
  if (lockTimeouts > 10) {
    issues.push(`High lock timeout rate: ${lockTimeouts} timeouts in last hour`);
  }

  if (optimisticConflicts > 50) {
    issues.push(`High optimistic lock conflict rate: ${optimisticConflicts} conflicts in last hour`);
  }

  if (deduplicationHitRate > 50) {
    issues.push(
      `High request deduplication rate: ${deduplicationHitRate.toFixed(1)}% - possible double-submit issues`
    );
  }

  if (duplicateOrderRate > 5) {
    issues.push(
      `High duplicate order rate: ${duplicateOrderRate.toFixed(1)}% - possible race conditions`
    );
  }

  return {
    healthy: issues.length === 0,
    issues,
    stats: {
      lockTimeouts,
      optimisticConflicts,
      deduplicationHitRate: Math.round(deduplicationHitRate * 100) / 100,
      duplicateOrderRate: Math.round(duplicateOrderRate * 100) / 100,
    },
  };
}

/**
 * Export metrics for external monitoring
 * Can be used with Prometheus, Datadog, etc.
 */
export function exportMetricsForMonitoring(): {
  metrics: ConcurrencyMetric[];
  summary: ReturnType<typeof concurrencyMetrics.getSummary>;
  health: ConcurrencyHealthCheck;
} {
  return {
    metrics: concurrencyMetrics.getMetrics(),
    summary: concurrencyMetrics.getSummary(),
    health: getConcurrencyHealth(),
  };
}

// Auto-report metrics every 5 minutes in production
if (process.env.NODE_ENV === 'production') {
  setInterval(
    () => {
      reportMetricsSummary();
    },
    5 * 60 * 1000
  ); // 5 minutes
}
