/**
 * Performance Monitoring System
 * Tracks application performance metrics and identifies bottlenecks
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: Date;
  stack?: string;
  params?: any[];
}

interface ApiCallMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: Date;
  user_id?: string;
}

export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private slowQueries: SlowQueryLog[] = [];
  private apiCalls: ApiCallMetric[] = [];
  private readonly maxStoredMetrics = 1000;
  private readonly slowQueryThreshold = 100; // ms
  private readonly slowApiThreshold = 500; // ms

  /**
   * Track database query performance
   */
  async trackDatabaseQuery(query: string, duration: number, params?: any[]): Promise<void> {
    // Record the metric
    this.recordMetric('database_query', {
      name: 'database_query',
      value: duration,
      timestamp: new Date(),
      tags: {
        slow: duration > this.slowQueryThreshold ? 'true' : 'false',
      },
      metadata: {
        query_type: this.getQueryType(query),
        table: this.extractTableName(query),
      },
    });

    // Log slow queries for investigation
    if (duration > this.slowQueryThreshold) {
      await this.logSlowQuery(query, duration, params);
    }
  }

  /**
   * Track API endpoint performance
   */
  async trackAPICall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    userId?: string
  ): Promise<void> {
    const apiCall: ApiCallMetric = {
      endpoint,
      method,
      duration,
      status,
      timestamp: new Date(),
      user_id: userId,
    };

    this.apiCalls.push(apiCall);
    this.maintainApiCallsSize();

    // Record performance metric
    this.recordMetric('api_call', {
      name: 'api_call',
      value: duration,
      timestamp: new Date(),
      tags: {
        endpoint: this.sanitizeEndpoint(endpoint),
        method,
        status: status.toString(),
        slow: duration > this.slowApiThreshold ? 'true' : 'false',
      },
    });

    // Alert on consistently slow endpoints
    if (duration > this.slowApiThreshold) {
      await this.checkForSlowEndpointPattern(endpoint, method);
    }
  }

  /**
   * Track custom business metrics
   */
  trackBusinessMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric('business', {
      name,
      value,
      timestamp: new Date(),
      tags,
      metadata,
    });
  }

  /**
   * Get P95 response time for API endpoints
   */
  getP95ResponseTime(endpoint?: string, timeWindow?: number): number {
    const windowMs = timeWindow || 60 * 60 * 1000; // Default 1 hour
    const cutoff = new Date(Date.now() - windowMs);

    let relevantCalls = this.apiCalls.filter(
      call => call.timestamp >= cutoff && (endpoint ? call.endpoint === endpoint : true)
    );

    if (relevantCalls.length === 0) return 0;

    const durations = relevantCalls.map(call => call.duration).sort((a, b) => a - b);

    const p95Index = Math.floor(durations.length * 0.95);
    return durations[p95Index] || 0;
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(endpoint?: string, timeWindow?: number): number {
    const windowMs = timeWindow || 60 * 60 * 1000; // Default 1 hour
    const cutoff = new Date(Date.now() - windowMs);

    let relevantCalls = this.apiCalls.filter(
      call => call.timestamp >= cutoff && (endpoint ? call.endpoint === endpoint : true)
    );

    if (relevantCalls.length === 0) return 0;

    const totalDuration = relevantCalls.reduce((sum, call) => sum + call.duration, 0);
    return Math.round(totalDuration / relevantCalls.length);
  }

  /**
   * Get error rate percentage
   */
  getErrorRate(timeWindow?: number): number {
    const windowMs = timeWindow || 60 * 60 * 1000; // Default 1 hour
    const cutoff = new Date(Date.now() - windowMs);

    const relevantCalls = this.apiCalls.filter(call => call.timestamp >= cutoff);

    if (relevantCalls.length === 0) return 0;

    const errorCalls = relevantCalls.filter(call => call.status >= 400);
    return Math.round((errorCalls.length / relevantCalls.length) * 100 * 100) / 100; // Two decimal places
  }

  /**
   * Get throughput (requests per minute)
   */
  getThroughput(timeWindow?: number): number {
    const windowMs = timeWindow || 60 * 60 * 1000; // Default 1 hour
    const cutoff = new Date(Date.now() - windowMs);

    const relevantCalls = this.apiCalls.filter(call => call.timestamp >= cutoff);
    const windowMinutes = windowMs / (60 * 1000);

    return Math.round(relevantCalls.length / windowMinutes);
  }

  /**
   * Get slow queries for investigation
   */
  getSlowQueries(limit = 10): SlowQueryLog[] {
    return this.slowQueries.sort((a, b) => b.duration - a.duration).slice(0, limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindow?: number) {
    return {
      response_times: {
        average: this.getAverageResponseTime(undefined, timeWindow),
        p95: this.getP95ResponseTime(undefined, timeWindow),
      },
      error_rate: this.getErrorRate(timeWindow),
      throughput: this.getThroughput(timeWindow),
      slow_queries: this.getSlowQueries(5),
      memory_usage: this.getMemoryUsage(),
      top_endpoints: this.getTopEndpoints(timeWindow),
    };
  }

  /**
   * Private helper methods
   */
  private recordMetric(category: string, metric: PerformanceMetric): void {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }

    const categoryMetrics = this.metrics.get(category)!;
    categoryMetrics.push(metric);

    // Maintain size limit
    if (categoryMetrics.length > this.maxStoredMetrics) {
      categoryMetrics.splice(0, categoryMetrics.length - this.maxStoredMetrics);
    }
  }

  private async logSlowQuery(query: string, duration: number, params?: any[]): Promise<void> {
    const slowQuery: SlowQueryLog = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      stack: new Error().stack,
      params: params ? this.sanitizeParams(params) : undefined,
    };

    this.slowQueries.push(slowQuery);
    this.maintainSlowQueriesSize();

    // Log to console in development, or to monitoring service in production
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🐌 Slow Query (${duration}ms):`, query.substring(0, 100));
    }

    // In production, you might want to send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Could integrate with Sentry, DataDog, etc.
      console.warn(`Slow query detected: ${duration}ms`);
    }
  }

  private async checkForSlowEndpointPattern(endpoint: string, method: string): Promise<void> {
    const recentCalls = this.apiCalls
      .filter(
        call =>
          call.endpoint === endpoint &&
          call.method === method &&
          call.timestamp >= new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      )
      .slice(-10); // Last 10 calls

    if (recentCalls.length >= 5) {
      const avgDuration =
        recentCalls.reduce((sum, call) => sum + call.duration, 0) / recentCalls.length;

      if (avgDuration > this.slowApiThreshold) {
        console.warn(
          `⚠️ Consistently slow endpoint detected: ${method} ${endpoint} (avg: ${Math.round(avgDuration)}ms)`
        );

        // In production, trigger alert
        if (process.env.NODE_ENV === 'production') {
          // Could integrate with alerting system
        }
      }
    }
  }

  private getQueryType(query: string): string {
    const normalized = query.trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  private extractTableName(query: string): string {
    const match = query.match(/(?:FROM|INTO|UPDATE|DELETE FROM)\s+["`]?(\w+)["`]?/i);
    return match ? match[1] : 'unknown';
  }

  private sanitizeEndpoint(endpoint: string): string {
    // Replace dynamic segments with placeholders for better grouping
    return endpoint
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-zA-Z0-9]{10,}/g, '/:token');
  }

  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from queries
    return query
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .substring(0, 500); // Limit length
  }

  private sanitizeParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string') {
        // Check for sensitive patterns
        if (param.includes('@')) return '[EMAIL]';
        if (/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/.test(param)) return '[CARD]';
      }
      return param;
    });
  }

  private maintainSlowQueriesSize(): void {
    if (this.slowQueries.length > 100) {
      this.slowQueries.splice(0, this.slowQueries.length - 100);
    }
  }

  private maintainApiCallsSize(): void {
    if (this.apiCalls.length > this.maxStoredMetrics) {
      this.apiCalls.splice(0, this.apiCalls.length - this.maxStoredMetrics);
    }
  }

  private getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      external_mb: Math.round(memUsage.external / 1024 / 1024),
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
    };
  }

  private getTopEndpoints(timeWindow?: number) {
    const windowMs = timeWindow || 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - windowMs);

    const relevantCalls = this.apiCalls.filter(call => call.timestamp >= cutoff);

    const endpointStats = new Map<
      string,
      { count: number; totalDuration: number; errors: number }
    >();

    relevantCalls.forEach(call => {
      const key = `${call.method} ${call.endpoint}`;
      const existing = endpointStats.get(key) || { count: 0, totalDuration: 0, errors: 0 };

      existing.count++;
      existing.totalDuration += call.duration;
      if (call.status >= 400) existing.errors++;

      endpointStats.set(key, existing);
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avg_duration: Math.round(stats.totalDuration / stats.count),
        error_rate: Math.round((stats.errors / stats.count) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
