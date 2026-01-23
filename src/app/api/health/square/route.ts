/**
 * Square Health Check Endpoint
 *
 * Provides quick health check for Square integration
 * Suitable for uptime monitoring services and load balancers
 *
 * GET /api/health/square - Quick health check
 */

import { NextResponse } from 'next/server';
import { getSquareService } from '@/lib/square/service';
import { quickHealthCheck } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
    };
    square_api: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
  };
  version: string;
  uptime: number;
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'healthy', responseTime: 0 },
        square_api: { status: 'healthy', responseTime: 0 },
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };

    // Test database connection using unified client with built-in retry logic
    // Fixes DESTINO-SF-5: PrismaClientInitializationError on cold starts
    try {
      const dbHealth = await quickHealthCheck(5000);
      healthCheck.services.database.responseTime = dbHealth.latencyMs;

      if (!dbHealth.healthy) {
        healthCheck.services.database.status = 'unhealthy';
        healthCheck.status = 'unhealthy';
        logger.error('Database health check failed:', dbHealth.error);
      }
    } catch (error: any) {
      healthCheck.services.database.status = 'unhealthy';
      healthCheck.services.database.responseTime = 0;
      healthCheck.status = 'unhealthy';
      logger.error('Database health check failed:', error);
    }

    // Test Square API connection
    const squareStartTime = Date.now();
    try {
      const squareService = getSquareService();
      await squareService.getLocations();

      const responseTime = Date.now() - squareStartTime;
      healthCheck.services.square_api.responseTime = responseTime;

      if (responseTime > 5000) {
        healthCheck.services.square_api.status = 'degraded';
        if (healthCheck.status === 'healthy') {
          healthCheck.status = 'degraded';
        }
      }
    } catch (error: any) {
      healthCheck.services.square_api.status = 'unhealthy';
      healthCheck.services.square_api.responseTime = Date.now() - squareStartTime;
      healthCheck.services.square_api.error = error.message;
      healthCheck.status = 'unhealthy';
      logger.error('Square API health check failed:', error);
    }

    // Return appropriate status code based on health
    const statusCode =
      healthCheck.status === 'healthy' ? 200 : healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error: any) {
    logger.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
