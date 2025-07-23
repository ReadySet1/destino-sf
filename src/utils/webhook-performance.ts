export interface WebhookPerformanceMetrics {
  endpoint: string;
  method: string;
  startTime: number;
  processingTime?: number;
  status?: 'success' | 'error';
  error?: any;
}

/**
 * Create a performance monitor for webhook processing
 */
export class WebhookPerformanceMonitor {
  private metrics: WebhookPerformanceMetrics;

  constructor(endpoint: string, method: string = 'POST') {
    this.metrics = {
      endpoint,
      method,
      startTime: Date.now(),
    };
  }

  /**
   * Mark the webhook processing as complete
   */
  complete(status: 'success' | 'error' = 'success', error?: any): WebhookPerformanceMetrics {
    this.metrics.processingTime = Date.now() - this.metrics.startTime;
    this.metrics.status = status;

    if (error) {
      this.metrics.error = error;
    }

    // Log performance metrics
    this.logMetrics();

    return this.metrics;
  }

  /**
   * Log performance metrics with appropriate warnings
   */
  private logMetrics(): void {
    const { endpoint, processingTime, status, error } = this.metrics;

    if (processingTime! > 5000) {
      console.error(`⚠️  Extremely slow webhook processing: ${processingTime}ms for ${endpoint}`);
    } else if (processingTime! > 2000) {
      console.warn(`⚠️  Slow webhook processing: ${processingTime}ms for ${endpoint}`);
    } else if (processingTime! > 1000) {
      console.info(`ℹ️  Webhook processing took ${processingTime}ms for ${endpoint}`);
    }

    if (status === 'error') {
      console.error(`❌ Webhook failed after ${processingTime}ms:`, {
        endpoint,
        processingTime,
        error: error?.message || error,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`✅ Webhook processed successfully in ${processingTime}ms for ${endpoint}`);
    }
  }

  /**
   * Get current processing time without completing
   */
  getCurrentProcessingTime(): number {
    return Date.now() - this.metrics.startTime;
  }
}

/**
 * Helper function to wrap webhook handlers with performance monitoring
 */
export async function withWebhookPerformanceMonitoring<T>(
  endpoint: string,
  handler: () => Promise<T>,
  method: string = 'POST'
): Promise<T> {
  const monitor = new WebhookPerformanceMonitor(endpoint, method);

  try {
    const result = await handler();
    monitor.complete('success');
    return result;
  } catch (error) {
    monitor.complete('error', error);
    throw error;
  }
}

/**
 * Add performance monitoring headers to webhook responses
 */
export function addPerformanceHeaders(
  response: Response,
  metrics: WebhookPerformanceMetrics
): Response {
  const headers = new Headers(response.headers);

  headers.set('X-Processing-Time', `${metrics.processingTime}ms`);
  headers.set('X-Webhook-Status', metrics.status || 'unknown');
  headers.set('X-Timestamp', new Date().toISOString());

  if (metrics.processingTime! > 2000) {
    headers.set('X-Performance-Warning', 'slow-processing');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Log webhook request details for debugging
 */
export async function logWebhookRequest(request: Request, endpoint: string): Promise<void> {
  try {
    const headers = Object.fromEntries(request.headers.entries());
    const contentType = headers['content-type'] || '';

    console.log(`📥 Webhook received: ${endpoint}`, {
      method: request.method,
      url: request.url,
      contentType,
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString(),
      // Only log non-sensitive headers
      relevantHeaders: {
        'content-length': headers['content-length'],
        'x-forwarded-for': headers['x-forwarded-for'],
        'x-real-ip': headers['x-real-ip'],
      },
    });
  } catch (error) {
    console.warn('Failed to log webhook request details:', error);
  }
}
