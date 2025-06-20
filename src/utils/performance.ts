/**
 * Performance monitoring utilities for measuring and logging execution times
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

// Store performance metrics in memory (could be extended to send to analytics service)
let performanceMetrics: PerformanceMetric[] = [];

/**
 * Measure the performance of an async function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await fn();
      const end = performance.now();
      const duration = end - start;
      
      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp,
        success: true
      };
      
      performanceMetrics.push(metric);
      
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        if (duration > 1000) {
          console.warn(`⚠️ Slow operation: ${name}: ${duration.toFixed(2)}ms`);
        } else if (duration > 500) {
          console.log(`🐌 ${name}: ${duration.toFixed(2)}ms`);
        } else {
          console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
        }
      }
      
      // In production, log slow operations
      if (process.env.NODE_ENV === 'production' && duration > 2000) {
        console.warn(`Slow operation in production: ${name}: ${duration.toFixed(2)}ms`);
      }
      
      resolve(result);
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      
      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      performanceMetrics.push(metric);
      
      console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
      reject(error);
    }
  });
}

/**
 * Measure sync function performance
 */
export function measureSyncPerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const timestamp = Date.now();
  
  try {
    const result = fn();
    const end = performance.now();
    const duration = end - start;
    
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp,
      success: true
    };
    
    performanceMetrics.push(metric);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    performanceMetrics.push(metric);
    
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Create a performance timer for manual timing
 */
export class PerformanceTimer {
  private name: string;
  private startTime: number;
  private timestamp: number;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
    this.timestamp = Date.now();
  }

  end(success: boolean = true, error?: string): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    const metric: PerformanceMetric = {
      name: this.name,
      duration,
      timestamp: this.timestamp,
      success,
      error
    };
    
    performanceMetrics.push(metric);
    
    if (process.env.NODE_ENV === 'development') {
      if (success) {
        console.log(`⚡ ${this.name}: ${duration.toFixed(2)}ms`);
      } else {
        console.error(`❌ ${this.name} failed after ${duration.toFixed(2)}ms:`, error);
      }
    }
    
    return duration;
  }
}

/**
 * Get performance metrics for analysis
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

/**
 * Clear performance metrics (useful for testing)
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics = [];
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(): {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  slowestOperation: PerformanceMetric | null;
  fastestOperation: PerformanceMetric | null;
} {
  if (performanceMetrics.length === 0) {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      slowestOperation: null,
      fastestOperation: null
    };
  }

  const successful = performanceMetrics.filter(m => m.success);
  const failed = performanceMetrics.filter(m => !m.success);
  const averageDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;
  
  const slowest = performanceMetrics.reduce((prev, current) => 
    (prev.duration > current.duration) ? prev : current
  );
  
  const fastest = performanceMetrics.reduce((prev, current) => 
    (prev.duration < current.duration) ? prev : current
  );

  return {
    totalOperations: performanceMetrics.length,
    successfulOperations: successful.length,
    failedOperations: failed.length,
    averageDuration,
    slowestOperation: slowest,
    fastestOperation: fastest
  };
}

/**
 * Database query performance wrapper
 */
export function withDatabaseMetrics<T>(queryName: string, query: () => Promise<T>): Promise<T> {
  return measurePerformance(`DB: ${queryName}`, query);
}

/**
 * API call performance wrapper
 */
export function withApiMetrics<T>(apiName: string, apiCall: () => Promise<T>): Promise<T> {
  return measurePerformance(`API: ${apiName}`, apiCall);
}

/**
 * Component render performance (for debugging)
 */
export function logRenderTime(componentName: string): () => void {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.log(`🎨 ${componentName} render: ${duration.toFixed(2)}ms`);
    }
  };
} 