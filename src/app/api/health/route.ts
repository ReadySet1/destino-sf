import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db-utils';

/**
 * Enhanced database health check endpoint
 * GET /api/health
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const healthCheck = await checkDatabaseHealth();
    const totalResponseTime = Date.now() - startTime;
    
    if (healthCheck.connected) {
      return NextResponse.json({
        status: 'healthy',
        database: {
          connected: true,
          responseTime: `${healthCheck.responseTime}ms`,
          totalResponseTime: `${totalResponseTime}ms`,
          connectionInfo: healthCheck.diagnostics,
          environment: process.env.NODE_ENV,
          poolConfig: {
            connectionLimit: 3,
            timeout: '20s',
            autoDisconnect: '30s'
          },
          optimizations: [
            'Transaction pooler with pgbouncer',
            'Reduced connection pool size',
            'Auto-disconnect on inactivity',
            'Exponential backoff retry logic'
          ]
        },
        timestamp: new Date().toISOString()
      }, { status: 200 });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        database: {
          connected: false,
          error: healthCheck.error,
          responseTime: `${healthCheck.responseTime}ms`,
          totalResponseTime: `${totalResponseTime}ms`,
          diagnostics: healthCheck.diagnostics,
          environment: process.env.NODE_ENV,
          troubleshooting: [
            'Check DATABASE_URL format and credentials',
            'Verify Supabase pooler connectivity',
            'Review connection pool parameters',
            'Check for network connectivity issues'
          ]
        },
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
    
  } catch (error: any) {
    const totalResponseTime = Date.now() - startTime;
    
    console.error('Health check endpoint failed:', error);
    
    return NextResponse.json({
      status: 'error',
      database: {
        connected: false,
        error: error.message,
        errorCode: error.code,
        responseTime: `${totalResponseTime}ms`,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
        directUrl: process.env.DIRECT_URL?.replace(/:[^:]*@/, ':****@'),
        lastError: {
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
