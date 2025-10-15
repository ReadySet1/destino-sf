import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/db-unified';
import { cacheService } from '@/lib/cache-service';
import { performanceMonitor } from '@/lib/performance-monitor';

export async function GET() {
  const startTime = Date.now();

  try {
    // Run health checks in parallel
    const [databaseHealth, cacheHealth, performanceHealth] = await Promise.allSettled([
      getHealthStatus(),
      cacheService.healthCheck(),
      checkPerformanceHealth(),
    ]);

    // Process results
    const databaseResult = databaseHealth.status === 'fulfilled' ? databaseHealth.value : null;

    const database = databaseResult
      ? {
          status: databaseResult.connected ? 'healthy' : 'unhealthy',
          connected: databaseResult.connected,
          latency: databaseResult.latency,
          version: databaseResult.version,
          error: databaseResult.error,
        }
      : {
          status: 'unhealthy',
          details: {
            error: databaseHealth.status === 'rejected' ? databaseHealth.reason : 'Unknown error',
          },
        };

    const cache =
      cacheHealth.status === 'fulfilled'
        ? cacheHealth.value
        : {
            status: 'unhealthy',
            details: {
              error: cacheHealth.status === 'rejected' ? cacheHealth.reason : 'Unknown error',
            },
          };

    const performance =
      performanceHealth.status === 'fulfilled'
        ? performanceHealth.value
        : {
            status: 'unhealthy',
            details: {
              error:
                performanceHealth.status === 'rejected'
                  ? performanceHealth.reason
                  : 'Unknown error',
            },
          };

    // Determine overall system health
    const allHealthy =
      database.status === 'healthy' &&
      cache.status === 'healthy' &&
      performance.status === 'healthy';

    const systemStatus = allHealthy
      ? 'healthy'
      : database.status === 'unhealthy' || cache.status === 'unhealthy'
        ? 'unhealthy'
        : 'degraded';

    const response = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),

      services: {
        database: {
          ...database,
          // Connection stats would be available in a full db manager implementation
        },
        cache: {
          ...cache,
        },
        performance: {
          ...performance,
        },
      },

      system: {
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024,
          total: process.memoryUsage().heapTotal / 1024 / 1024,
          external: process.memoryUsage().external / 1024 / 1024,
        },
        cpu: {
          uptime: process.uptime(),
          loadAverage: process.platform === 'linux' ? (process as any).loadavg?.() || null : null,
        },
      },
    };

    const statusCode = systemStatus === 'healthy' ? 200 : systemStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('Detailed health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        error: 'Health check system failure',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

/**
 * Check performance health based on recent metrics
 */
async function checkPerformanceHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
}> {
  try {
    const summary = performanceMonitor.getPerformanceSummary();

    // Define health thresholds
    const thresholds = {
      apiResponseTime: 1000, // 1 second
      databaseQueryTime: 500, // 500ms
      errorRate: 0.05, // 5%
      slowRequestCount: 10,
    };

    const issues = [];

    // Check API performance
    if (summary.apiPerformance.averageResponseTime > thresholds.apiResponseTime) {
      issues.push(`High API response time: ${summary.apiPerformance.averageResponseTime}ms`);
    }

    if (summary.apiPerformance.errorRate > thresholds.errorRate) {
      issues.push(`High API error rate: ${(summary.apiPerformance.errorRate * 100).toFixed(2)}%`);
    }

    if (summary.apiPerformance.slowRequestCount > thresholds.slowRequestCount) {
      issues.push(`High slow request count: ${summary.apiPerformance.slowRequestCount}`);
    }

    // Check database performance
    if (summary.databasePerformance.averageQueryTime > thresholds.databaseQueryTime) {
      issues.push(`High database query time: ${summary.databasePerformance.averageQueryTime}ms`);
    }

    const status = issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      details: {
        summary,
        issues,
        thresholds,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Performance check failed',
      },
    };
  }
}
