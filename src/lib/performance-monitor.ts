import * as Sentry from '@sentry/nextjs';

export interface PerformanceMetrics {
  // API Performance
  apiCalls: {
    endpoint: string;
    duration: number;
    status: number;
    method: string;
    timestamp: number;
  }[];
  
  // Database Performance
  databaseQueries: {
    query: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }[];
  
  // Business Metrics
  business: {
    ordersPerHour: number;
    conversionRate: number;
    averageOrderValue: number;
    failedPayments: number;
    cartAbandonmentRate: number;
  };
  
  // System Health
  system: {
    memoryUsage: number;
    uptime: number;
    errorRate: number;
    activeConnections: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private readonly maxMetricsAge = 3600000; // 1 hour in milliseconds
  
  private constructor() {
    this.metrics = {
      apiCalls: [],
      databaseQueries: [],
      business: {
        ordersPerHour: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        failedPayments: 0,
        cartAbandonmentRate: 0,
      },
      system: {
        memoryUsage: 0,
        uptime: 0,
        errorRate: 0,
        activeConnections: 0,
      },
    };
    
    // Clean up old metrics every 10 minutes
    setInterval(() => this.cleanupOldMetrics(), 600000);
  }
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  /**
   * Track API call performance
   */
  trackApiCall(endpoint: string, duration: number, status: number, method: string = 'GET'): void {
    const metric = {
      endpoint,
      duration,
      status,
      method,
      timestamp: Date.now(),
    };
    
    this.metrics.apiCalls.push(metric);
    
    // Log slow API calls
    if (duration > 1000) {
      console.warn(`🐌 Slow API call: ${method} ${endpoint} took ${duration}ms`);
      
      // Track in Sentry
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Slow API call: ${method} ${endpoint}`,
        level: 'warning',
        data: { endpoint, duration, status, method },
      });
      
      // Create performance span in Sentry
      Sentry.withScope((scope) => {
        scope.setTag('performance.type', 'api_call');
        scope.setTag('performance.endpoint', endpoint);
        scope.setTag('performance.method', method);
        scope.setContext('performance', {
          endpoint,
          duration,
          status,
          method,
          threshold: 1000,
        });
        
        Sentry.captureMessage(
          `Slow API call: ${method} ${endpoint} (${duration}ms)`,
          'warning'
        );
      });
    }
    
    // Track very slow calls as errors
    if (duration > 5000) {
      console.error(`🚨 Very slow API call: ${method} ${endpoint} took ${duration}ms`);
      
      Sentry.withScope((scope) => {
        scope.setTag('performance.type', 'api_call');
        scope.setTag('performance.endpoint', endpoint);
        scope.setTag('performance.method', method);
        scope.setContext('performance', {
          endpoint,
          duration,
          status,
          method,
          threshold: 5000,
        });
        
        Sentry.captureException(
          new Error(`Very slow API call: ${method} ${endpoint} (${duration}ms)`)
        );
      });
    }
  }
  
  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number, success: boolean = true): void {
    const metric = {
      query: query.substring(0, 100), // Limit query length for storage
      duration,
      success,
      timestamp: Date.now(),
    };
    
    this.metrics.databaseQueries.push(metric);
    
    // Log slow queries
    if (duration > 500) {
      console.warn(`🐌 Slow database query: ${query.substring(0, 100)}... took ${duration}ms`);
      
      // Track in Sentry
      Sentry.addBreadcrumb({
        category: 'database',
        message: `Slow database query (${duration}ms)`,
        level: 'warning',
        data: { query: query.substring(0, 100), duration, success },
      });
      
      if (duration > 2000) {
        Sentry.withScope((scope) => {
          scope.setTag('performance.type', 'database_query');
          scope.setTag('performance.success', success);
          scope.setContext('database_performance', {
            query: query.substring(0, 100),
            duration,
            success,
            threshold: 2000,
          });
          
          Sentry.captureException(
            new Error(`Very slow database query (${duration}ms)`)
          );
        });
      }
    }
    
    // Track failed queries
    if (!success) {
      console.error(`❌ Failed database query: ${query.substring(0, 100)}...`);
      
      Sentry.withScope((scope) => {
        scope.setTag('performance.type', 'database_query');
        scope.setTag('performance.success', false);
        scope.setContext('database_performance', {
          query: query.substring(0, 100),
          duration,
          success,
        });
        
        Sentry.captureException(
          new Error(`Failed database query: ${query.substring(0, 100)}`)
        );
      });
    }
  }
  
  /**
   * Update business metrics
   */
  updateBusinessMetrics(metrics: Partial<PerformanceMetrics['business']>): void {
    this.metrics.business = { ...this.metrics.business, ...metrics };
    
    // Track concerning business metrics
    if (metrics.failedPayments && metrics.failedPayments > 5) {
      Sentry.withScope((scope) => {
        scope.setTag('business.metric', 'failed_payments');
        scope.setContext('business_metrics', {
          failedPayments: metrics.failedPayments,
          threshold: 5,
        });
        
        Sentry.captureMessage(
          `High number of failed payments: ${metrics.failedPayments}`,
          'warning'
        );
      });
    }
    
    if (typeof metrics.conversionRate === 'number' && metrics.conversionRate < 0.1) {
      Sentry.withScope((scope) => {
        scope.setTag('business.metric', 'conversion_rate');
        scope.setContext('business_metrics', {
          conversionRate: metrics.conversionRate,
          threshold: 0.1,
        });
        
        Sentry.captureMessage(
          `Low conversion rate: ${((metrics.conversionRate || 0) * 100).toFixed(2)}%`,
          'warning'
        );
      });
    }
  }
  
  /**
   * Update system metrics
   */
  updateSystemMetrics(metrics: Partial<PerformanceMetrics['system']>): void {
    this.metrics.system = { ...this.metrics.system, ...metrics };
    
    // Track high error rates
    if (metrics.errorRate !== undefined && metrics.errorRate > 0.05) {
      Sentry.withScope((scope) => {
        scope.setTag('system.metric', 'error_rate');
        scope.setContext('system_metrics', {
          errorRate: metrics.errorRate,
          threshold: 0.05,
        });
        
        Sentry.captureMessage(
          `High error rate: ${((metrics.errorRate || 0) * 100).toFixed(2)}%`,
          'error'
        );
      });
    }
    
    // Track high memory usage
    if (metrics.memoryUsage !== undefined && metrics.memoryUsage > 0.8) {
      Sentry.withScope((scope) => {
        scope.setTag('system.metric', 'memory_usage');
        scope.setContext('system_metrics', {
          memoryUsage: metrics.memoryUsage,
          threshold: 0.8,
        });
        
        Sentry.captureMessage(
          `High memory usage: ${((metrics.memoryUsage || 0) * 100).toFixed(2)}%`,
          'warning'
        );
      });
    }
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    apiPerformance: {
      averageResponseTime: number;
      p95ResponseTime: number;
      errorRate: number;
      slowRequestCount: number;
    };
    databasePerformance: {
      averageQueryTime: number;
      p95QueryTime: number;
      failedQueryCount: number;
      slowQueryCount: number;
    };
    businessMetrics: PerformanceMetrics['business'];
    systemMetrics: PerformanceMetrics['system'];
  } {
    // Calculate API performance metrics
    const apiCalls = this.metrics.apiCalls;
    const apiDurations = apiCalls.map(call => call.duration);
    const apiErrors = apiCalls.filter(call => call.status >= 400);
    const slowApiCalls = apiCalls.filter(call => call.duration > 1000);
    
    // Calculate database performance metrics
    const dbQueries = this.metrics.databaseQueries;
    const dbDurations = dbQueries.map(query => query.duration);
    const failedQueries = dbQueries.filter(query => !query.success);
    const slowQueries = dbQueries.filter(query => query.duration > 500);
    
    return {
      apiPerformance: {
        averageResponseTime: this.calculateAverage(apiDurations),
        p95ResponseTime: this.calculatePercentile(apiDurations, 95),
        errorRate: apiCalls.length > 0 ? apiErrors.length / apiCalls.length : 0,
        slowRequestCount: slowApiCalls.length,
      },
      databasePerformance: {
        averageQueryTime: this.calculateAverage(dbDurations),
        p95QueryTime: this.calculatePercentile(dbDurations, 95),
        failedQueryCount: failedQueries.length,
        slowQueryCount: slowQueries.length,
      },
      businessMetrics: this.metrics.business,
      systemMetrics: this.metrics.system,
    };
  }
  
  /**
   * Middleware for tracking API performance
   */
  trackApiPerformance(handler: (req: Request) => Promise<Response>) {
    return async (req: Request) => {
      const start = Date.now();
      const url = new URL(req.url);
      
      try {
        const response = await handler(req);
        const duration = Date.now() - start;
        
        this.trackApiCall(
          url.pathname,
          duration,
          response.status,
          req.method
        );
        
        return response;
      } catch (error) {
        const duration = Date.now() - start;
        
        this.trackApiCall(
          url.pathname,
          duration,
          500,
          req.method
        );
        
        throw error;
      }
    };
  }
  
  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - this.maxMetricsAge;
    
    this.metrics.apiCalls = this.metrics.apiCalls.filter(
      metric => metric.timestamp > cutoff
    );
    
    this.metrics.databaseQueries = this.metrics.databaseQueries.filter(
      metric => metric.timestamp > cutoff
    );
  }
  
  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
  
  /**
   * Calculate percentile of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[index] || 0;
  }
}

/**
 * Wrapper function for performance monitoring
 */
export function withPerformanceTracking(
  handler: (req: Request) => Promise<Response>
) {
  const monitor = PerformanceMonitor.getInstance();
  return monitor.trackApiPerformance(handler);
}

/**
 * Export singleton instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance(); 