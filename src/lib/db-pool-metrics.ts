/**
 * Database Connection Pool Metrics
 *
 * Tracks connection pool health and performance over time.
 * Used for monitoring, debugging, and health checks.
 */

export interface ConnectionAttempt {
  timestamp: number;
  success: boolean;
  latencyMs: number;
  error?: string;
  errorCode?: string;
  retryCount: number;
  isColdStart: boolean;
}

export interface PoolMetricsSummary {
  /** Total connection attempts in the current window */
  totalAttempts: number;
  /** Successful connections */
  successCount: number;
  /** Failed connections */
  failureCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average connection latency in ms */
  avgLatencyMs: number;
  /** P95 connection latency in ms */
  p95LatencyMs: number;
  /** Max connection latency in ms */
  maxLatencyMs: number;
  /** Number of cold start connections */
  coldStartCount: number;
  /** Total retries across all attempts */
  totalRetries: number;
  /** Error breakdown by code */
  errorsByCode: Record<string, number>;
  /** Time window in ms */
  windowMs: number;
  /** Oldest record timestamp */
  oldestRecord: number | null;
  /** Newest record timestamp */
  newestRecord: number | null;
}

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RECORDS = 1000;

class DatabasePoolMetrics {
  private attempts: ConnectionAttempt[] = [];
  private windowMs: number;

  constructor(windowMs: number = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Record a connection attempt
   */
  recordAttempt(attempt: Omit<ConnectionAttempt, 'timestamp'>): void {
    this.attempts.push({
      ...attempt,
      timestamp: Date.now(),
    });

    // Prune old records
    this.pruneOldRecords();

    // Limit total records
    if (this.attempts.length > MAX_RECORDS) {
      this.attempts = this.attempts.slice(-MAX_RECORDS);
    }
  }

  /**
   * Record a successful connection
   */
  recordSuccess(latencyMs: number, retryCount: number = 0, isColdStart: boolean = false): void {
    this.recordAttempt({
      success: true,
      latencyMs,
      retryCount,
      isColdStart,
    });
  }

  /**
   * Record a failed connection
   */
  recordFailure(
    latencyMs: number,
    error: Error,
    retryCount: number = 0,
    isColdStart: boolean = false
  ): void {
    this.recordAttempt({
      success: false,
      latencyMs,
      retryCount,
      isColdStart,
      error: error.message,
      errorCode: (error as any).code || 'UNKNOWN',
    });
  }

  /**
   * Get metrics summary
   */
  getSummary(): PoolMetricsSummary {
    this.pruneOldRecords();

    const total = this.attempts.length;
    const successes = this.attempts.filter(a => a.success);
    const failures = this.attempts.filter(a => !a.success);

    // Calculate latencies for successful attempts
    const latencies = successes.map(a => a.latencyMs).sort((a, b) => a - b);

    // Calculate error breakdown
    const errorsByCode: Record<string, number> = {};
    failures.forEach(f => {
      const code = f.errorCode || 'UNKNOWN';
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
    });

    return {
      totalAttempts: total,
      successCount: successes.length,
      failureCount: failures.length,
      successRate: total > 0 ? successes.length / total : 1,
      avgLatencyMs: latencies.length > 0 ? average(latencies) : 0,
      p95LatencyMs: latencies.length > 0 ? percentile(latencies, 95) : 0,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      coldStartCount: this.attempts.filter(a => a.isColdStart).length,
      totalRetries: this.attempts.reduce((sum, a) => sum + a.retryCount, 0),
      errorsByCode,
      windowMs: this.windowMs,
      oldestRecord: this.attempts.length > 0 ? this.attempts[0].timestamp : null,
      newestRecord: this.attempts.length > 0 ? this.attempts[this.attempts.length - 1].timestamp : null,
    };
  }

  /**
   * Get recent failures for debugging
   */
  getRecentFailures(limit: number = 10): ConnectionAttempt[] {
    this.pruneOldRecords();
    return this.attempts
      .filter(a => !a.success)
      .slice(-limit);
  }

  /**
   * Check if pool is healthy based on recent metrics
   */
  isHealthy(thresholds?: { minSuccessRate?: number; maxAvgLatencyMs?: number }): {
    healthy: boolean;
    issues: string[];
  } {
    const summary = this.getSummary();
    const issues: string[] = [];

    const minSuccessRate = thresholds?.minSuccessRate ?? 0.9;
    const maxAvgLatencyMs = thresholds?.maxAvgLatencyMs ?? 5000;

    if (summary.totalAttempts >= 5 && summary.successRate < minSuccessRate) {
      issues.push(
        `Low success rate: ${(summary.successRate * 100).toFixed(1)}% (threshold: ${minSuccessRate * 100}%)`
      );
    }

    if (summary.avgLatencyMs > maxAvgLatencyMs) {
      issues.push(
        `High average latency: ${summary.avgLatencyMs.toFixed(0)}ms (threshold: ${maxAvgLatencyMs}ms)`
      );
    }

    if (summary.failureCount > 0 && summary.errorsByCode['P1001']) {
      issues.push(`P1001 errors (can't reach server): ${summary.errorsByCode['P1001']}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.attempts = [];
  }

  /**
   * Set time window for metrics
   */
  setWindow(windowMs: number): void {
    this.windowMs = windowMs;
    this.pruneOldRecords();
  }

  private pruneOldRecords(): void {
    const cutoff = Date.now() - this.windowMs;
    this.attempts = this.attempts.filter(a => a.timestamp > cutoff);
  }
}

// Helper functions
function average(arr: number[]): number {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, index)];
}

// Singleton instance
export const dbPoolMetrics = new DatabasePoolMetrics();

/**
 * Get pool metrics for health checks
 */
export function getPoolMetrics(): PoolMetricsSummary {
  return dbPoolMetrics.getSummary();
}

/**
 * Check pool health
 */
export function checkPoolHealth(): { healthy: boolean; issues: string[] } {
  return dbPoolMetrics.isHealthy();
}
