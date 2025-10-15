interface WebhookMetrics {
  eventType: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Webhook performance monitoring and alerting system
 */
export class WebhookMonitor {
  private static metrics: WebhookMetrics[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory

  /**
   * Track webhook processing performance
   */
  static async track<T>(eventType: string, operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await operation();
      success = true;
      return result;
    } catch (err) {
      error = (err as Error).message;
      throw err;
    } finally {
      const duration = Date.now() - start;

      this.recordMetric({
        eventType,
        duration,
        success,
        error,
        timestamp: new Date(),
      });

      // Alert if processing takes too long
      if (duration > 10000) {
        console.error(`⚠️ SLOW WEBHOOK: ${eventType} took ${duration}ms`);
        await this.sendSlowWebhookAlert(eventType, duration);
      }

      // Check error rate
      await this.checkErrorRate(eventType);
    }
  }

  /**
   * Record metric and manage memory
   */
  private static recordMetric(metric: WebhookMetrics): void {
    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Check error rate and alert if too high
   */
  private static async checkErrorRate(eventType: string): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    const recentMetrics = this.metrics
      .filter(m => m.eventType === eventType)
      .filter(m => m.timestamp >= fiveMinutesAgo);

    if (recentMetrics.length >= 5) {
      const errorCount = recentMetrics.filter(m => !m.success).length;
      const errorRate = (errorCount / recentMetrics.length) * 100;

      if (errorRate > 50) {
        console.error(`🚨 HIGH ERROR RATE: ${eventType} has ${errorRate.toFixed(1)}% error rate`);
        await this.sendErrorRateAlert(eventType, errorRate, errorCount, recentMetrics.length);
      }
    }
  }

  /**
   * Send slow webhook alert
   */
  private static async sendSlowWebhookAlert(eventType: string, duration: number): Promise<void> {
    try {
      // Import alert service to avoid circular dependencies
      const { resilientAlertService } = await import('./alerts-resilient');

      const error = new Error(`Slow webhook processing: ${eventType} took ${duration}ms`);
      await resilientAlertService.sendSystemErrorAlert(error, {
        type: 'webhook_performance',
        eventType,
        duration,
        threshold: 10000,
      });
    } catch (error) {
      console.error('Failed to send slow webhook alert:', error);
    }
  }

  /**
   * Send error rate alert
   */
  private static async sendErrorRateAlert(
    eventType: string,
    errorRate: number,
    errorCount: number,
    totalCount: number
  ): Promise<void> {
    try {
      const { resilientAlertService } = await import('./alerts-resilient');

      const error = new Error(
        `High webhook error rate: ${eventType} has ${errorRate.toFixed(1)}% error rate`
      );
      await resilientAlertService.sendSystemErrorAlert(error, {
        type: 'webhook_error_rate',
        eventType,
        errorRate,
        errorCount,
        totalCount,
        threshold: 50,
      });
    } catch (error) {
      console.error('Failed to send error rate alert:', error);
    }
  }

  /**
   * Get current metrics summary
   */
  static getMetrics() {
    return {
      byType: this.groupByEventType(),
      slowest: this.getSlowestWebhooks(),
      errorRate: this.getOverallErrorRate(),
      totalProcessed: this.metrics.length,
    };
  }

  /**
   * Group metrics by event type
   */
  private static groupByEventType() {
    const grouped = new Map<string, { count: number; totalDuration: number; errors: number }>();

    for (const metric of this.metrics) {
      const existing = grouped.get(metric.eventType) || { count: 0, totalDuration: 0, errors: 0 };
      existing.count++;
      existing.totalDuration += metric.duration;
      if (!metric.success) existing.errors++;
      grouped.set(metric.eventType, existing);
    }

    return Array.from(grouped.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgDuration: Math.round(data.totalDuration / data.count),
      errorRate: ((data.errors / data.count) * 100).toFixed(2) + '%',
    }));
  }

  /**
   * Get slowest webhooks
   */
  private static getSlowestWebhooks() {
    return this.metrics.sort((a, b) => b.duration - a.duration).slice(0, 10);
  }

  /**
   * Get overall error rate
   */
  private static getOverallErrorRate() {
    const total = this.metrics.length;
    const errors = this.metrics.filter(m => !m.success).length;
    return total > 0 ? ((errors / total) * 100).toFixed(2) + '%' : '0%';
  }

  /**
   * Clear old metrics (for memory management)
   */
  static clearOldMetrics(hoursOld: number = 24): void {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }
}
