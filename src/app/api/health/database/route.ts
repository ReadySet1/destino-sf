import { webhookPrisma } from '@/lib/db/webhook-connection';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test database connection
    const startTime = Date.now();
    await webhookPrisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;
    
    // Get connection pool metrics (if available)
    const metrics = await webhookPrisma.$metrics?.json();
    
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