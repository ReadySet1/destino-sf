import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Database health check endpoint
 * GET /api/health
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Test database connectivity
    const result = await prisma.$queryRaw`SELECT 
      version() as database_version,
      current_database() as database_name,
      current_user as database_user,
      inet_server_addr() as server_address,
      inet_server_port() as server_port,
      now() as current_time`;
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        responseTime: `${responseTime}ms`,
        connectionInfo: result,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
        directUrl: process.env.DIRECT_URL?.replace(/:[^:]*@/, ':****@')
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error.message,
        errorCode: error.code,
        responseTime: `${responseTime}ms`,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
        directUrl: process.env.DIRECT_URL?.replace(/:[^:]*@/, ':****@')
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
