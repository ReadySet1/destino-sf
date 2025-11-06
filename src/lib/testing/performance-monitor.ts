/**
 * Performance Monitoring Utility
 *
 * Tracks and analyzes application performance metrics including
 * Web Vitals, API response times, and custom performance marks.
 */

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'score';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Web Vitals thresholds
 *
 * Note: FID was deprecated in web-vitals v4 and removed in v5.
 * INP (Interaction to Next Paint) is the successor to FID.
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 }, // First Input Delay (deprecated, kept for backward compatibility)
  CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  INP: { good: 200, needsImprovement: 500 }, // Interaction to Next Paint (replaces FID)
} as const;

/**
 * Performance metric rating
 */
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Get rating for a metric value
 */
export function getRating(
  metricName: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): MetricRating {
  const threshold = WEB_VITALS_THRESHOLDS[metricName];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Performance metrics collector
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    });
  }

  /**
   * Start a performance measurement
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End a performance measurement and record it
   */
  measure(name: string, startMark?: string): number | null {
    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name);

    if (startTime === undefined) {
      console.warn(`Performance mark "${startMark || name}" not found`);
      return null;
    }

    const duration = endTime - startTime;

    this.record({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
    });

    // Clean up mark
    if (!startMark) {
      this.marks.delete(name);
    }

    return duration;
  }

  /**
   * Record API response time
   */
  recordApiCall(endpoint: string, method: string, duration: number, statusCode: number): void {
    this.record({
      name: 'api_response_time',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: {
        endpoint,
        method,
        statusCode,
      },
    });
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average value for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get percentile value for a metric
   */
  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<
    string,
    {
      count: number;
      avg: number;
      p50: number;
      p95: number;
      p99: number;
      min: number;
      max: number;
    }
  > {
    const summary: Record<string, any> = {};
    const uniqueNames = new Set(this.metrics.map(m => m.name));

    uniqueNames.forEach(name => {
      const metrics = this.getMetricsByName(name);
      const values = metrics.map(m => m.value).sort((a, b) => a - b);

      summary[name] = {
        count: metrics.length,
        avg: this.getAverage(name),
        p50: this.getPercentile(name, 50),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summary: this.getSummary(),
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  performanceMonitor.mark(name);
  try {
    const result = await fn();
    performanceMonitor.measure(name);
    return result;
  } catch (error) {
    performanceMonitor.measure(name);
    throw error;
  }
}

/**
 * Measure sync function execution time
 */
export function measure<T>(name: string, fn: () => T): T {
  performanceMonitor.mark(name);
  try {
    const result = fn();
    performanceMonitor.measure(name);
    return result;
  } catch (error) {
    performanceMonitor.measure(name);
    throw error;
  }
}

/**
 * HOC to measure API route performance
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    const method = args[0]?.method || 'UNKNOWN';

    try {
      const response = await handler(...args);
      const duration = performance.now() - startTime;

      performanceMonitor.recordApiCall(routeName, method, duration, response.status);

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      performanceMonitor.recordApiCall(routeName, method, duration, 500);

      throw error;
    }
  }) as T;
}

/**
 * Get performance metrics for a specific time range
 */
export function getMetricsInRange(startTime: number, endTime: number): PerformanceMetric[] {
  return performanceMonitor
    .getMetrics()
    .filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
}

/**
 * Check if performance meets budget
 */
export function checkPerformanceBudget(
  metricName: string,
  budget: number
): { passing: boolean; actual: number; budget: number } {
  const avg = performanceMonitor.getAverage(metricName);
  return {
    passing: avg <= budget,
    actual: avg,
    budget,
  };
}
