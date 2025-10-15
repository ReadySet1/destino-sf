import { webhookPrisma } from '@/lib/db/webhook-connection';
import { NextResponse } from 'next/server';
import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';

export async function GET() {
  try {
    // Test database connection
    const startTime = Date.now();
    await webhookPrisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;

    // Get connection pool metrics (if available)
    let metrics = null;
    try {
      // Check if $metrics is available (requires metrics preview feature)
      if (
        '$metrics' in webhookPrisma &&
        typeof (webhookPrisma as any).$metrics?.json === 'function'
      ) {
        metrics = await (webhookPrisma as any).$metrics.json();
      }
    } catch (error) {
      // Metrics not available, continue without them
      console.warn('Metrics not available:', error);
    }

    return NextResponse.json({
      status: 'healthy',
      queryTime: `${queryTime}ms`,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
