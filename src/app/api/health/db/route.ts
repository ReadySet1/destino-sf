import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus, prisma, withRetry } from '@/lib/db-unified';
import type { ConnectionHealth } from '@/types/database';
import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';

export async function GET(request: NextRequest) {
  try {
    // Perform basic health check
    const basicHealth = await getHealthStatus();
    
    // Get additional metrics
    const startTime = Date.now();
    
    // Test a simple query to measure response time
    const result = await prisma.$queryRaw`SELECT 1 as status`;
    
    const queryTime = Date.now() - startTime;
    
    // Check for prepared statement errors in recent logs (enhanced check)
    let preparedStatementErrors = 0;
    try {
      const recentErrors = await prisma.$queryRaw`
        SELECT COUNT(*) as error_count 
        FROM pg_stat_activity 
        WHERE state = 'idle in transaction' 
        AND query LIKE '%prepared statement%'
      ` as any[];
      preparedStatementErrors = recentErrors[0]?.error_count || 0;
    } catch (error) {
      // This query might fail in some PostgreSQL configurations, that's okay
      console.debug('Could not check prepared statement errors:', error);
    }
    
    // Determine status based on performance and prepared statement errors
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!basicHealth.connected) {
      status = 'unhealthy';
    } else if (basicHealth.latency > 500 || queryTime > 500 || preparedStatementErrors > 0) {
      status = 'degraded';
    }
    
    const health: ConnectionHealth = {
      status,
      activeConnections: 0, // Not available with Prisma client
      idleConnections: 0,   // Not available with Prisma client
      waitingRequests: 0,   // Not available with Prisma client
      errors: basicHealth.error ? [{
        type: 'CONNECTION_TIMEOUT',
        timeoutMs: basicHealth.latency
      }] : [],
      lastChecked: new Date()
    };
    
    // Enhanced response with Vercel-specific information
    const response = {
      ...health,
      status,
      timestamp: new Date().toISOString(),
      connection: 'active',
      prepared_statement_errors: preparedStatementErrors,
      environment: {
        isVercel: process.env.VERCEL === '1',
        nodeEnv: process.env.NODE_ENV,
        pgBouncer: process.env.DATABASE_URL?.includes('pgbouncer=true'),
        preparedStatementsDisabled: process.env.DATABASE_URL?.includes('statement_cache_size=0'),
      },
      metrics: {
        connectionLatency: basicHealth.latency,
        queryLatency: queryTime,
        connected: basicHealth.connected,
        timestamp: new Date().toISOString()
      }
    };
    
    // Return appropriate HTTP status
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: httpStatus });
    
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        timestamp: new Date().toISOString(),
        environment: {
          isVercel: process.env.VERCEL === '1',
          nodeEnv: process.env.NODE_ENV,
          pgBouncer: process.env.DATABASE_URL?.includes('pgbouncer=true'),
          preparedStatementsDisabled: process.env.DATABASE_URL?.includes('statement_cache_size=0'),
        }
      },
      { status: 503 }
    );
  }
}