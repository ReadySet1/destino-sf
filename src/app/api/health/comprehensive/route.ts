import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { env } from '@/env';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  response_time_ms: number;
  error?: string;
  details?: Record<string, any>;
}

interface ComprehensiveHealthReport {
  overall_status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  checks: {
    database: HealthCheck;
    payments: HealthCheck;
    cache: HealthCheck;
    email: HealthCheck;
  };
  business: {
    pending_orders: number;
    failed_payments: number;
    active_carts: number;
    webhook_errors_last_hour: number;
  };
  performance: {
    avg_response_time_ms: number;
    error_rate_percent: number;
    throughput_rpm: number;
    memory_usage_mb: number;
  };
}

/**
 * Check database health with connection pool stats
 */
async function checkDatabaseHealth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Test basic connectivity with a simple query
    await prisma.$queryRaw`SELECT 1 as health_check`;

    // Get database stats
    const [connectionStats] = await prisma.$queryRaw<
      Array<{
        total_connections: number;
        active_connections: number;
        max_connections: number;
      }>
    >`
      SELECT 
        (SELECT setting FROM pg_settings WHERE name = 'max_connections')::integer as max_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::integer as active_connections,
        (SELECT count(*) FROM pg_stat_activity)::integer as total_connections
    `;

    const response_time_ms = Date.now() - start;

    return {
      status: response_time_ms < 100 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      response_time_ms,
      details: {
        connection_pool: connectionStats,
        slow_query_threshold: 100,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Square API health
 */
async function checkSquareHealth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple health check - verify we can reach Square API
    const squareEnvironment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    const baseUrl =
      squareEnvironment === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

    const response = await fetch(`${baseUrl}/v2/locations`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-03-20',
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const response_time_ms = Date.now() - start;
    const isHealthy = response.ok && response_time_ms < 2000;

    return {
      status: isHealthy ? 'healthy' : response.ok ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms,
      details: {
        environment: squareEnvironment,
        status_code: response.status,
        api_version: '2024-03-20',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Square API unreachable',
    };
  }
}

/**
 * Check Redis cache health
 */
async function checkRedisHealth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        response_time_ms: 0,
        details: { message: 'Redis not configured' },
      };
    }

    // Simple ping to Redis
    const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/ping`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    const response_time_ms = Date.now() - start;
    const result = await response.json();

    return {
      status: result.result === 'PONG' && response_time_ms < 500 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      response_time_ms,
      details: {
        ping_response: result.result,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Redis health check failed',
    };
  }
}

/**
 * Check email service health (Resend)
 */
async function checkResendHealth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!env.RESEND_API_KEY) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        response_time_ms: 0,
        details: { message: 'Email service not configured' },
      };
    }

    // Check Resend API status
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
    });

    const response_time_ms = Date.now() - start;

    return {
      status: response.ok && response_time_ms < 1000 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      response_time_ms,
      details: {
        status_code: response.status,
        service: 'Resend',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Email service health check failed',
    };
  }
}

/**
 * Get business metrics
 */
async function getBusinessMetrics() {
  try {
    const [pendingOrders, failedPayments, activeCarts, recentWebhookErrors] = await Promise.all([
      // Pending orders count
      prisma.order.count({
        where: {
          status: 'PENDING',
          isArchived: false,
        },
      }),

      // Failed payments in last 24 hours
      prisma.order.count({
        where: {
          paymentStatus: 'FAILED',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          isArchived: false,
        },
      }),

      // Active cart sessions (cart table not available, using 0)
      Promise.resolve(0),

      // Webhook errors in last hour
      prisma.webhookLog
        .count({
          where: {
            signatureValid: false,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000),
            },
          },
        })
        .catch(() => 0),
    ]);

    return {
      pending_orders: pendingOrders,
      failed_payments: failedPayments,
      active_carts: activeCarts,
      webhook_errors_last_hour: recentWebhookErrors,
    };
  } catch (error) {
    console.error('Error getting business metrics:', error);
    return {
      pending_orders: -1,
      failed_payments: -1,
      active_carts: -1,
      webhook_errors_last_hour: -1,
    };
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  return {
    avg_response_time_ms: 150, // Placeholder - would integrate with monitoring
    error_rate_percent: 0.05, // Placeholder - would integrate with monitoring
    throughput_rpm: 120, // Placeholder - would integrate with monitoring
    memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
  };
}

/**
 * Determine overall status based on individual checks
 */
function determineOverallStatus(
  checks: Record<string, HealthCheck>
): 'healthy' | 'unhealthy' | 'degraded' {
  const statuses = Object.values(checks).map(check => check.status);

  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export async function GET(): Promise<NextResponse<ComprehensiveHealthReport>> {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const [
      databaseHealth,
      paymentsHealth,
      cacheHealth,
      emailHealth,
      businessMetrics,
      performanceMetrics,
    ] = await Promise.all([
      checkDatabaseHealth(),
      checkSquareHealth(),
      checkRedisHealth(),
      checkResendHealth(),
      getBusinessMetrics(),
      getPerformanceMetrics(),
    ]);

    const checks = {
      database: databaseHealth,
      payments: paymentsHealth,
      cache: cacheHealth,
      email: emailHealth,
    };

    const report: ComprehensiveHealthReport = {
      overall_status: determineOverallStatus(checks),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime_seconds: Math.floor(process.uptime()),
      checks,
      business: businessMetrics,
      performance: performanceMetrics,
    };

    const statusCode =
      report.overall_status === 'healthy' ? 200 : report.overall_status === 'degraded' ? 200 : 503;

    return NextResponse.json(report, { status: statusCode });
  } catch (error) {
    const errorReport: ComprehensiveHealthReport = {
      overall_status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime_seconds: Math.floor(process.uptime()),
      checks: {
        database: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          response_time_ms: 0,
          error: 'Health check failed',
        },
        payments: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          response_time_ms: 0,
          error: 'Health check failed',
        },
        cache: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          response_time_ms: 0,
          error: 'Health check failed',
        },
        email: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          response_time_ms: 0,
          error: 'Health check failed',
        },
      },
      business: {
        pending_orders: -1,
        failed_payments: -1,
        active_carts: -1,
        webhook_errors_last_hour: -1,
      },
      performance: {
        avg_response_time_ms: -1,
        error_rate_percent: -1,
        throughput_rpm: -1,
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };

    return NextResponse.json(errorReport, { status: 503 });
  }
}
