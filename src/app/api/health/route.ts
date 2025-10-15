import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';

/**
 * Simple health check endpoint for load balancers and monitoring
 * Returns basic status with minimal overhead
 */
export async function GET() {
  try {
    // Quick database connectivity test
    await prisma.$queryRaw`SELECT 1 as health`;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 503 }
    );
  }
}
