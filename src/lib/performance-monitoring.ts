/**
 * Performance monitoring utilities
 * Placeholder implementation for test compatibility
 */

export class PerformanceMonitor {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    console.log(`Performance metric: ${name} = ${value}`, tags);
  }

  startTiming(name: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(name, duration);
    };
  }

  endTiming(name: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.recordMetric(name, duration);
  }

  getMetrics(): Record<string, any> {
    return {};
  }
}

export const performanceMonitor = new PerformanceMonitor();
