import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

export async function GET() {
  try {
    const health = await checkDatabaseHealth();
    
    const status = health.connected ? 'healthy' : 'unhealthy';
    const httpStatus = health.connected ? 200 : 503;
    
    return NextResponse.json({
      status,
      database: {
        connected: health.connected,
        latency: `${health.latency}ms`,
        error: health.error,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
        has_database_url: !!process.env.DATABASE_URL,
        has_direct_url: !!process.env.DIRECT_URL,
        database_host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'unknown',
      },
      timestamp: new Date().toISOString(),
    }, { status: httpStatus });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}