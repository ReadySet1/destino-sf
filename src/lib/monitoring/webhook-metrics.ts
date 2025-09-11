/**
 * Webhook metrics collection and tracking
 * 
 * Provides real-time metrics for webhook processing performance,
 * success rates, and failure analysis.
 */

import { type SquareEnvironment, type WebhookId } from '@/types/webhook';

// In-memory metrics store for real-time tracking
// In production, this could be replaced with Redis or a dedicated metrics service
class MetricsStore {
  private metrics: Map<string, any> = new Map();
  
  increment(key: string, amount: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + amount);
  }
  
  timing(key: string, duration: number): void {
    const timings = this.metrics.get(`${key}_timings`) || [];
    timings.push(duration);
    
    // Keep only last 100 timings to prevent memory bloat
    if (timings.length > 100) {
      timings.shift();
    }
    
    this.metrics.set(`${key}_timings`, timings);
  }
  
  get(key: string): any {
    return this.metrics.get(key) || 0;
  }
  
  getAverage(key: string): number {
    const timings = this.metrics.get(`${key}_timings`) || [];
    if (timings.length === 0) return 0;
    
    const sum = timings.reduce((a: number, b: number) => a + b, 0);
    return Math.round((sum / timings.length) * 100) / 100;
  }
  
  clear(): void {
    this.metrics.clear();
  }
  
  getAllMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics.entries());
  }
}

const metricsStore = new MetricsStore();

/**
 * Track webhook metric event
 */
export async function trackMetric(params: {
  type: 'webhook_received' | 'webhook_processed' | 'signature_validated' | 'signature_failed';
  environment: SquareEnvironment;
  valid?: boolean;
  eventType?: string;
  duration?: number;
  error?: string;
}): Promise<void> {
  const { type, environment, valid, eventType, duration, error } = params;
  
  try {
    // Track basic counters
    metricsStore.increment(`webhooks.${environment}.${type}`);
    metricsStore.increment(`webhooks.total.${type}`);
    
    if (eventType) {
      metricsStore.increment(`webhooks.${environment}.events.${eventType}`);
    }
    
    // Track success/failure rates
    if (valid !== undefined) {
      if (valid) {
        metricsStore.increment(`webhooks.${environment}.success`);
      } else {
        metricsStore.increment(`webhooks.${environment}.failure`);
        if (error) {
          metricsStore.increment(`webhooks.${environment}.errors.${error}`);
        }
      }
    }
    
    // Track timing metrics
    if (duration !== undefined) {
      metricsStore.timing(`webhooks.${environment}.duration`, duration);
      metricsStore.timing(`webhooks.total.duration`, duration);
    }
    
    // Log metrics to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric tracked: ${type} (${environment})`, {
        valid,
        eventType,
        duration,
        error
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to track webhook metric:', error);
    // Don't throw - metrics failures shouldn't affect webhook processing
  }
}

/**
 * Get current webhook metrics summary
 */
export function getMetricsSummary(): {
  sandbox: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgDuration: number;
  };
  production: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgDuration: number;
  };
  overall: {
    total: number;
    successRate: number;
    avgDuration: number;
  };
} {
  const sandboxTotal = metricsStore.get('webhooks.sandbox.webhook_received');
  const sandboxSuccess = metricsStore.get('webhooks.sandbox.success');
  const sandboxFailed = metricsStore.get('webhooks.sandbox.failure');
  const sandboxAvgDuration = metricsStore.getAverage('webhooks.sandbox.duration');
  
  const productionTotal = metricsStore.get('webhooks.production.webhook_received');
  const productionSuccess = metricsStore.get('webhooks.production.success');
  const productionFailed = metricsStore.get('webhooks.production.failure');
  const productionAvgDuration = metricsStore.getAverage('webhooks.production.duration');
  
  const overallTotal = sandboxTotal + productionTotal;
  const overallSuccess = sandboxSuccess + productionSuccess;
  const overallAvgDuration = metricsStore.getAverage('webhooks.total.duration');
  
  return {
    sandbox: {
      total: sandboxTotal,
      successful: sandboxSuccess,
      failed: sandboxFailed,
      successRate: sandboxTotal > 0 ? Math.round((sandboxSuccess / sandboxTotal) * 10000) / 100 : 100,
      avgDuration: sandboxAvgDuration
    },
    production: {
      total: productionTotal,
      successful: productionSuccess,
      failed: productionFailed,
      successRate: productionTotal > 0 ? Math.round((productionSuccess / productionTotal) * 10000) / 100 : 100,
      avgDuration: productionAvgDuration
    },
    overall: {
      total: overallTotal,
      successRate: overallTotal > 0 ? Math.round((overallSuccess / overallTotal) * 10000) / 100 : 100,
      avgDuration: overallAvgDuration
    }
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  metricsStore.clear();
}

/**
 * Get detailed metrics for admin dashboard
 */
export function getDetailedMetrics(): Record<string, any> {
  return metricsStore.getAllMetrics();
}

/**
 * Send alert for webhook failures
 * This would integrate with your alerting system (email, Slack, etc.)
 */
export async function sendWebhookAlert(params: {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  environment?: SquareEnvironment;
  webhookId?: WebhookId;
}): Promise<void> {
  const { severity, title, message, details, environment, webhookId } = params;
  
  try {
    // Log alert to console
    console.warn(`🚨 [${severity.toUpperCase()}] ${title}: ${message}`);
    
    if (details) {
      console.warn('Alert details:', details);
    }
    
    // TODO: Integrate with actual alerting system
    // Examples:
    // - Send to Slack webhook
    // - Send email notification
    // - Create PagerDuty incident
    // - Log to monitoring service (DataDog, etc.)
    
    // For now, track the alert in metrics
    metricsStore.increment(`alerts.${severity}`);
    if (environment) {
      metricsStore.increment(`alerts.${environment}.${severity}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to send webhook alert:', error);
    // Don't throw - alerting failures shouldn't affect webhook processing
  }
}

/**
 * Check if alert thresholds are breached
 * Returns alerts that should be sent based on current metrics
 */
export function checkAlertThresholds(): Array<{
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details: Record<string, unknown>;
}> {
  const alerts: Array<any> = [];
  const summary = getMetricsSummary();
  
  // Check success rate alerts
  if (summary.overall.successRate < 90 && summary.overall.total > 10) {
    alerts.push({
      severity: 'critical',
      title: 'Low Webhook Success Rate',
      message: `Overall webhook success rate is ${summary.overall.successRate}%`,
      details: { successRate: summary.overall.successRate, totalWebhooks: summary.overall.total }
    });
  } else if (summary.overall.successRate < 95 && summary.overall.total > 5) {
    alerts.push({
      severity: 'high',
      title: 'Declining Webhook Success Rate',
      message: `Webhook success rate is ${summary.overall.successRate}%`,
      details: { successRate: summary.overall.successRate, totalWebhooks: summary.overall.total }
    });
  }
  
  // Check latency alerts
  if (summary.overall.avgDuration > 500) {
    alerts.push({
      severity: 'medium',
      title: 'High Webhook Processing Latency',
      message: `Average processing time is ${summary.overall.avgDuration}ms`,
      details: { avgDuration: summary.overall.avgDuration }
    });
  }
  
  // Check for environment-specific issues
  ['sandbox', 'production'].forEach(env => {
    const envMetrics = summary[env as keyof typeof summary];
    if (envMetrics.total > 0 && envMetrics.successRate < 80) {
      alerts.push({
        severity: 'high',
        title: `${env} Environment Issues`,
        message: `${env} webhook success rate is ${envMetrics.successRate}%`,
        details: { environment: env, ...envMetrics }
      });
    }
  });
  
  return alerts;
}
