/**
 * Validation Trends and Metrics Tracking
 *
 * Provides time-series tracking of validation statistics
 * to identify patterns and API drift over time.
 */

/**
 * Time-series data point for validation metrics
 */
export interface ValidationDataPoint {
  timestamp: Date;
  successCount: number;
  failureCount: number;
  totalValidations: number;
  successRate: number;
}

/**
 * Validation trends for an API
 */
export interface ValidationTrend {
  apiName: string;
  hourly: ValidationDataPoint[];
  daily: ValidationDataPoint[];
  currentSuccessRate: number;
  averageSuccessRate: number;
  trendDirection: 'improving' | 'declining' | 'stable';
}

/**
 * Alert for validation failures
 */
export interface ValidationAlert {
  apiName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics: {
    successRate: number;
    failureCount: number;
    threshold: number;
  };
}

/**
 * In-memory trends storage
 * In production, this should be persisted to a database or metrics service
 */
class ValidationTrendsTracker {
  private dataPoints: Map<string, ValidationDataPoint[]> = new Map();
  private readonly maxDataPoints = 1000; // Keep last 1000 data points per API
  private readonly alertThresholds = {
    successRateLow: 0.95, // Alert if success rate drops below 95%
    successRateCritical: 0.90, // Critical alert if below 90%
    failureSpike: 10, // Alert if failures spike by 10x
  };

  /**
   * Record a validation data point
   */
  record(apiName: string, successCount: number, failureCount: number): void {
    const totalValidations = successCount + failureCount;
    const successRate = totalValidations > 0 ? successCount / totalValidations : 1.0;

    const dataPoint: ValidationDataPoint = {
      timestamp: new Date(),
      successCount,
      failureCount,
      totalValidations,
      successRate,
    };

    // Get or create array for this API
    const points = this.dataPoints.get(apiName) || [];
    points.push(dataPoint);

    // Keep only last N data points
    if (points.length > this.maxDataPoints) {
      points.shift();
    }

    this.dataPoints.set(apiName, points);
  }

  /**
   * Get trends for a specific API
   */
  getTrends(apiName: string): ValidationTrend | null {
    const points = this.dataPoints.get(apiName);
    if (!points || points.length === 0) return null;

    const hourly = this.aggregateByHour(points);
    const daily = this.aggregateByDay(points);

    const currentRate = points[points.length - 1].successRate;
    const avgRate =
      points.reduce((sum, p) => sum + p.successRate, 0) / points.length;

    const trend = this.calculateTrend(points);

    return {
      apiName,
      hourly,
      daily,
      currentSuccessRate: currentRate,
      averageSuccessRate: avgRate,
      trendDirection: trend,
    };
  }

  /**
   * Get all trends
   */
  getAllTrends(): ValidationTrend[] {
    const trends: ValidationTrend[] = [];
    this.dataPoints.forEach((_, apiName) => {
      const trend = this.getTrends(apiName);
      if (trend) trends.push(trend);
    });
    return trends;
  }

  /**
   * Check for alerts
   */
  checkAlerts(): ValidationAlert[] {
    const alerts: ValidationAlert[] = [];

    this.dataPoints.forEach((points, apiName) => {
      if (points.length === 0) return;

      const latestPoint = points[points.length - 1];
      const previousPoint = points.length > 1 ? points[points.length - 2] : null;

      // Check success rate threshold
      if (latestPoint.successRate < this.alertThresholds.successRateCritical) {
        alerts.push({
          apiName,
          severity: 'critical',
          message: `Success rate critically low: ${(latestPoint.successRate * 100).toFixed(1)}%`,
          timestamp: latestPoint.timestamp,
          metrics: {
            successRate: latestPoint.successRate,
            failureCount: latestPoint.failureCount,
            threshold: this.alertThresholds.successRateCritical,
          },
        });
      } else if (latestPoint.successRate < this.alertThresholds.successRateLow) {
        alerts.push({
          apiName,
          severity: 'high',
          message: `Success rate below threshold: ${(latestPoint.successRate * 100).toFixed(1)}%`,
          timestamp: latestPoint.timestamp,
          metrics: {
            successRate: latestPoint.successRate,
            failureCount: latestPoint.failureCount,
            threshold: this.alertThresholds.successRateLow,
          },
        });
      }

      // Check for failure spike
      if (previousPoint && latestPoint.failureCount > previousPoint.failureCount * this.alertThresholds.failureSpike) {
        alerts.push({
          apiName,
          severity: 'high',
          message: `Sudden spike in failures: ${latestPoint.failureCount} failures (was ${previousPoint.failureCount})`,
          timestamp: latestPoint.timestamp,
          metrics: {
            successRate: latestPoint.successRate,
            failureCount: latestPoint.failureCount,
            threshold: previousPoint.failureCount * this.alertThresholds.failureSpike,
          },
        });
      }
    });

    return alerts;
  }

  /**
   * Aggregate data points by hour
   */
  private aggregateByHour(points: ValidationDataPoint[]): ValidationDataPoint[] {
    const hourlyMap = new Map<string, ValidationDataPoint[]>();

    // Group by hour
    points.forEach((point) => {
      const hourKey = new Date(point.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const existing = hourlyMap.get(hourKey) || [];
      existing.push(point);
      hourlyMap.set(hourKey, existing);
    });

    // Aggregate each hour
    const aggregated: ValidationDataPoint[] = [];
    hourlyMap.forEach((hourPoints, hourKey) => {
      const successCount = hourPoints.reduce((sum, p) => sum + p.successCount, 0);
      const failureCount = hourPoints.reduce((sum, p) => sum + p.failureCount, 0);
      const totalValidations = successCount + failureCount;
      const successRate = totalValidations > 0 ? successCount / totalValidations : 1.0;

      aggregated.push({
        timestamp: new Date(hourKey + ':00:00Z'),
        successCount,
        failureCount,
        totalValidations,
        successRate,
      });
    });

    return aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Aggregate data points by day
   */
  private aggregateByDay(points: ValidationDataPoint[]): ValidationDataPoint[] {
    const dailyMap = new Map<string, ValidationDataPoint[]>();

    // Group by day
    points.forEach((point) => {
      const dayKey = new Date(point.timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
      const existing = dailyMap.get(dayKey) || [];
      existing.push(point);
      dailyMap.set(dayKey, existing);
    });

    // Aggregate each day
    const aggregated: ValidationDataPoint[] = [];
    dailyMap.forEach((dayPoints, dayKey) => {
      const successCount = dayPoints.reduce((sum, p) => sum + p.successCount, 0);
      const failureCount = dayPoints.reduce((sum, p) => sum + p.failureCount, 0);
      const totalValidations = successCount + failureCount;
      const successRate = totalValidations > 0 ? successCount / totalValidations : 1.0;

      aggregated.push({
        timestamp: new Date(dayKey + 'T00:00:00Z'),
        successCount,
        failureCount,
        totalValidations,
        successRate,
      });
    });

    return aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(points: ValidationDataPoint[]): 'improving' | 'declining' | 'stable' {
    if (points.length < 2) return 'stable';

    // Compare recent average to older average
    const mid = Math.floor(points.length / 2);
    const recentPoints = points.slice(mid);
    const olderPoints = points.slice(0, mid);

    const recentAvg =
      recentPoints.reduce((sum, p) => sum + p.successRate, 0) / recentPoints.length;
    const olderAvg =
      olderPoints.reduce((sum, p) => sum + p.successRate, 0) / olderPoints.length;

    const diff = recentAvg - olderAvg;
    const threshold = 0.01; // 1% change threshold

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }

  /**
   * Reset all trends (useful for testing)
   */
  reset(): void {
    this.dataPoints.clear();
  }
}

/**
 * Global trends tracker instance
 */
export const validationTrendsTracker = new ValidationTrendsTracker();
