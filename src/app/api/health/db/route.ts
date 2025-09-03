import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, prisma } from '@/lib/db';
import type { ConnectionHealth } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    // Perform basic health check
    const basicHealth = await checkDatabaseHealth();
    
    // Get additional metrics
    const startTime = Date.now();
    
    // Test a simple query to measure response time
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    const queryTime = Date.now() - startTime;
    
    // Determine status based on performance
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!basicHealth.connected) {
      status = 'unhealthy';
    } else if (basicHealth.latency > 500 || queryTime > 500) {
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
    
    // Add performance metrics
    const response = {
      ...health,
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
    console.error('Health check failed:', error);
    
    const errorResponse: ConnectionHealth = {
      status: 'unhealthy',
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      errors: [{
        type: 'CONNECTION_TIMEOUT',
        timeoutMs: 0
      }],
      lastChecked: new Date()
    };
    
    return NextResponse.json(
      {
        ...errorResponse,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          connectionLatency: -1,
          queryLatency: -1,
          connected: false,
          timestamp: new Date().toISOString()
        }
      },
      { status: 503 }
    );
  }
}