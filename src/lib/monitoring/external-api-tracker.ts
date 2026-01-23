/**
 * External API Tracker
 *
 * Monitors external API calls (Square, Shippo, Resend) for:
 * - Latency tracking
 * - Error rates by service
 * - Rate limit proximity alerts
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import * as Sentry from '@sentry/nextjs';
import { performanceMonitor } from './performance';

export type ExternalService = 'square' | 'shippo' | 'resend' | 'supabase' | 'other';

export interface APICallMetrics {
  service: ExternalService;
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: Date;
  success: boolean;
  errorType?: string;
  rateLimitRemaining?: number;
  rateLimitTotal?: number;
}

export interface ServiceHealth {
  service: ExternalService;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageLatency: number;
  p95Latency: number;
  errorRate: number;
  lastCallAt: Date | null;
  rateLimitStatus?: {
    remaining: number;
    total: number;
    percentUsed: number;
  };
}

const METRICS_RETENTION_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const RATE_LIMIT_ALERT_THRESHOLD = 0.8; // Alert when 80% of rate limit used

/**
 * External API Tracker
 * Monitors and tracks all external API calls
 */
class ExternalAPITracker {
  private metrics: APICallMetrics[] = [];
  private maxMetrics = 1000;
  private rateLimitCache = new Map<ExternalService, { remaining: number; total: number; updatedAt: Date }>();

  /**
   * Track an external API call
   */
  async trackCall(metrics: Omit<APICallMetrics, 'timestamp'>): Promise<void> {
    const fullMetrics: APICallMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetrics);
    this.maintainMetricsSize();

    // Update rate limit cache if provided
    if (metrics.rateLimitRemaining !== undefined && metrics.rateLimitTotal !== undefined) {
      this.rateLimitCache.set(metrics.service, {
        remaining: metrics.rateLimitRemaining,
        total: metrics.rateLimitTotal,
        updatedAt: new Date(),
      });

      // Check for rate limit proximity alert
      await this.checkRateLimitAlert(metrics.service);
    }

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      type: 'http',
      category: `external.${metrics.service}`,
      message: `${metrics.method} ${metrics.endpoint} -> ${metrics.status}`,
      level: metrics.success ? 'info' : 'warning',
      data: {
        service: metrics.service,
        duration: metrics.duration,
        status: metrics.status,
        errorType: metrics.errorType,
      },
    });

    // Track in performance monitor
    await performanceMonitor.trackAPICall(
      `external.${metrics.service}.${metrics.endpoint}`,
      metrics.method,
      metrics.duration,
      metrics.status
    );

    // Log slow calls
    if (metrics.duration > 2000) {
      console.warn(
        `[ExternalAPI] Slow call to ${metrics.service}: ${metrics.endpoint} took ${metrics.duration}ms`
      );

      Sentry.addBreadcrumb({
        type: 'info',
        category: 'performance',
        message: `Slow external API call: ${metrics.service}`,
        level: 'warning',
        data: {
          endpoint: metrics.endpoint,
          duration: metrics.duration,
        },
      });
    }

    // Track errors in Sentry
    if (!metrics.success) {
      Sentry.setTag(`external.${metrics.service}.error`, metrics.errorType || 'unknown');
    }
  }

  /**
   * Create a wrapper function for tracking external API calls
   */
  wrapAPICall<T>(
    service: ExternalService,
    endpoint: string,
    method: string = 'GET'
  ): (fn: () => Promise<T>) => Promise<T> {
    return async (fn: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      let success = true;
      let status = 200;
      let errorType: string | undefined;

      // Create Sentry span for the external call
      return Sentry.startSpan(
        {
          name: `${service}.${endpoint}`,
          op: 'http.client',
          attributes: {
            'http.method': method,
            'external.service': service,
            'external.endpoint': endpoint,
          },
        },
        async span => {
          try {
            const result = await fn();
            return result;
          } catch (error) {
            success = false;
            status = this.extractStatusFromError(error);
            errorType = this.extractErrorType(error);

            // Set span status to error
            if (span) {
              span.setStatus({
                code: 2,
                message: errorType || 'Error',
              });
            }

            throw error;
          } finally {
            const duration = Date.now() - startTime;

            await this.trackCall({
              service,
              endpoint,
              method,
              duration,
              status,
              success,
              errorType,
            });
          }
        }
      );
    };
  }

  /**
   * Get health metrics for a specific service
   */
  getServiceHealth(service: ExternalService, timeWindow?: number): ServiceHealth {
    const windowMs = timeWindow || METRICS_RETENTION_WINDOW;
    const cutoff = new Date(Date.now() - windowMs);

    const relevantMetrics = this.metrics.filter(
      m => m.service === service && m.timestamp >= cutoff
    );

    if (relevantMetrics.length === 0) {
      return {
        service,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageLatency: 0,
        p95Latency: 0,
        errorRate: 0,
        lastCallAt: null,
      };
    }

    const successfulCalls = relevantMetrics.filter(m => m.success);
    const failedCalls = relevantMetrics.filter(m => !m.success);
    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageLatency = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Latency = durations[p95Index] || durations[durations.length - 1];

    const rateLimitInfo = this.rateLimitCache.get(service);

    return {
      service,
      totalCalls: relevantMetrics.length,
      successfulCalls: successfulCalls.length,
      failedCalls: failedCalls.length,
      averageLatency: Math.round(averageLatency),
      p95Latency: Math.round(p95Latency),
      errorRate: Math.round((failedCalls.length / relevantMetrics.length) * 100 * 100) / 100,
      lastCallAt: relevantMetrics[relevantMetrics.length - 1]?.timestamp || null,
      rateLimitStatus: rateLimitInfo
        ? {
            remaining: rateLimitInfo.remaining,
            total: rateLimitInfo.total,
            percentUsed: Math.round(
              ((rateLimitInfo.total - rateLimitInfo.remaining) / rateLimitInfo.total) * 100
            ),
          }
        : undefined,
    };
  }

  /**
   * Get health metrics for all services
   */
  getAllServicesHealth(timeWindow?: number): Record<ExternalService, ServiceHealth> {
    const services: ExternalService[] = ['square', 'shippo', 'resend', 'supabase', 'other'];

    return services.reduce(
      (acc, service) => {
        acc[service] = this.getServiceHealth(service, timeWindow);
        return acc;
      },
      {} as Record<ExternalService, ServiceHealth>
    );
  }

  /**
   * Get error breakdown by service
   */
  getErrorBreakdown(timeWindow?: number): Record<string, { count: number; types: Record<string, number> }> {
    const windowMs = timeWindow || METRICS_RETENTION_WINDOW;
    const cutoff = new Date(Date.now() - windowMs);

    const relevantMetrics = this.metrics.filter(
      m => !m.success && m.timestamp >= cutoff
    );

    const breakdown: Record<string, { count: number; types: Record<string, number> }> = {};

    for (const metric of relevantMetrics) {
      if (!breakdown[metric.service]) {
        breakdown[metric.service] = { count: 0, types: {} };
      }

      breakdown[metric.service].count++;

      const errorType = metric.errorType || 'unknown';
      breakdown[metric.service].types[errorType] =
        (breakdown[metric.service].types[errorType] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Get latency breakdown by endpoint
   */
  getLatencyByEndpoint(
    service: ExternalService,
    timeWindow?: number
  ): Array<{ endpoint: string; avgLatency: number; p95Latency: number; calls: number }> {
    const windowMs = timeWindow || METRICS_RETENTION_WINDOW;
    const cutoff = new Date(Date.now() - windowMs);

    const relevantMetrics = this.metrics.filter(
      m => m.service === service && m.timestamp >= cutoff
    );

    const endpointMetrics = new Map<string, number[]>();

    for (const metric of relevantMetrics) {
      const existing = endpointMetrics.get(metric.endpoint) || [];
      existing.push(metric.duration);
      endpointMetrics.set(metric.endpoint, existing);
    }

    return Array.from(endpointMetrics.entries())
      .map(([endpoint, durations]) => {
        const sorted = durations.sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);

        return {
          endpoint,
          avgLatency: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
          p95Latency: Math.round(sorted[p95Index] || sorted[sorted.length - 1]),
          calls: sorted.length,
        };
      })
      .sort((a, b) => b.calls - a.calls);
  }

  /**
   * Check and alert on rate limit proximity
   */
  private async checkRateLimitAlert(service: ExternalService): Promise<void> {
    const rateLimitInfo = this.rateLimitCache.get(service);

    if (!rateLimitInfo) return;

    const percentUsed = (rateLimitInfo.total - rateLimitInfo.remaining) / rateLimitInfo.total;

    if (percentUsed >= RATE_LIMIT_ALERT_THRESHOLD) {
      console.warn(
        `[ExternalAPI] Rate limit alert for ${service}: ${Math.round(percentUsed * 100)}% used`
      );

      Sentry.captureMessage(`Rate limit approaching for ${service}`, {
        level: 'warning',
        tags: {
          service,
          alert_type: 'rate_limit',
        },
        extra: {
          remaining: rateLimitInfo.remaining,
          total: rateLimitInfo.total,
          percentUsed: Math.round(percentUsed * 100),
        },
      });
    }
  }

  /**
   * Extract HTTP status from error
   */
  private extractStatusFromError(error: unknown): number {
    if (error instanceof Error) {
      // Check for common patterns
      const statusMatch = error.message.match(/status[:\s]+(\d{3})/i);
      if (statusMatch) {
        return parseInt(statusMatch[1], 10);
      }
    }

    // Check if error has a status property
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as { status: number }).status;
    }

    return 500;
  }

  /**
   * Extract error type from error
   */
  private extractErrorType(error: unknown): string {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('timeout')) return 'TIMEOUT';
      if (error.message.includes('rate limit')) return 'RATE_LIMIT';
      if (error.message.includes('unauthorized') || error.message.includes('401'))
        return 'UNAUTHORIZED';
      if (error.message.includes('forbidden') || error.message.includes('403'))
        return 'FORBIDDEN';
      if (error.message.includes('not found') || error.message.includes('404'))
        return 'NOT_FOUND';
      if (error.message.includes('network')) return 'NETWORK';

      return error.name || 'UNKNOWN';
    }

    return 'UNKNOWN';
  }

  /**
   * Maintain metrics array size
   */
  private maintainMetricsSize(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Clear old metrics (call periodically)
   */
  pruneOldMetrics(): void {
    const cutoff = new Date(Date.now() - METRICS_RETENTION_WINDOW);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Reset tracker (for testing)
   */
  reset(): void {
    this.metrics = [];
    this.rateLimitCache.clear();
  }
}

// Export singleton instance
export const externalAPITracker = new ExternalAPITracker();

/**
 * Helper functions for specific services
 */

/**
 * Wrap a Square API call with monitoring
 */
export function trackSquareAPI<T>(
  endpoint: string,
  fn: () => Promise<T>,
  method: string = 'POST'
): Promise<T> {
  return externalAPITracker.wrapAPICall<T>('square', endpoint, method)(fn);
}

/**
 * Wrap a Shippo API call with monitoring
 */
export function trackShippoAPI<T>(
  endpoint: string,
  fn: () => Promise<T>,
  method: string = 'POST'
): Promise<T> {
  return externalAPITracker.wrapAPICall<T>('shippo', endpoint, method)(fn);
}

/**
 * Wrap a Resend API call with monitoring
 */
export function trackResendAPI<T>(
  endpoint: string,
  fn: () => Promise<T>,
  method: string = 'POST'
): Promise<T> {
  return externalAPITracker.wrapAPICall<T>('resend', endpoint, method)(fn);
}

/**
 * Wrap a Supabase API call with monitoring
 */
export function trackSupabaseAPI<T>(
  endpoint: string,
  fn: () => Promise<T>,
  method: string = 'GET'
): Promise<T> {
  return externalAPITracker.wrapAPICall<T>('supabase', endpoint, method)(fn);
}

/**
 * Manual tracking for when you can't use the wrapper
 */
export function reportExternalAPICall(
  service: ExternalService,
  endpoint: string,
  method: string,
  duration: number,
  success: boolean,
  status: number = 200,
  errorType?: string
): void {
  externalAPITracker.trackCall({
    service,
    endpoint,
    method,
    duration,
    status,
    success,
    errorType,
  });
}
