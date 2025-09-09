import { NextRequest, NextResponse } from 'next/server';
import { getHealthStatus, checkConnection, ensureConnection } from '@/lib/db-unified';

/**
 * Enhanced database health check endpoint
 * Provides detailed connection status and performance metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  
  try {
    // Get basic health status
    const healthStatus = await getHealthStatus();
    
    // Additional connection tests
    const connectionTests = {
      basicConnection: false,
      ensuredConnection: false,
      writeTest: false,
    };
    
    // Test 1: Basic connection check
    try {
      connectionTests.basicConnection = await checkConnection();
    } catch (error) {
      console.warn('Basic connection test failed:', (error as Error).message);
    }
    
    // Test 2: Ensured connection with retry
    try {
      await ensureConnection(2); // 2 retries max for health check
      connectionTests.ensuredConnection = true;
    } catch (error) {
      console.warn('Ensured connection test failed:', (error as Error).message);
    }
    
    // Test 3: Write test (if connection is good)
    if (connectionTests.ensuredConnection) {
      try {
        // Test that we can perform a write operation
        const testResult = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/debug/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true }),
        });
        connectionTests.writeTest = testResult.ok;
      } catch (error) {
        console.warn('Write test failed:', (error as Error).message);
      }
    }
    
    const totalLatency = Date.now() - start;
    
    // Determine overall health status
    const isHealthy = healthStatus.connected && 
                     connectionTests.basicConnection && 
                     connectionTests.ensuredConnection;
    
    const isDegraded = healthStatus.connected && 
                      connectionTests.basicConnection && 
                      !connectionTests.ensuredConnection;
    
    const overallStatus = isHealthy ? 'healthy' : 
                         isDegraded ? 'degraded' : 'unhealthy';
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: {
        connected: healthStatus.connected,
        latency: healthStatus.latency,
        version: healthStatus.version,
        error: healthStatus.error,
      },
      connectionTests,
      performance: {
        totalLatency,
        checkDuration: totalLatency,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        isSupabase: process.env.DATABASE_URL?.includes('supabase.com') || false,
      },
      recommendations: getRecommendations(healthStatus, connectionTests, totalLatency),
    };
    
    // Return appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: httpStatus });
    
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        latency: Date.now() - start,
      },
      { status: 503 }
    );
  }
}

/**
 * Generate health recommendations based on test results
 */
function getRecommendations(
  healthStatus: any, 
  connectionTests: any, 
  latency: number
): string[] {
  const recommendations: string[] = [];
  
  if (!healthStatus.connected) {
    recommendations.push('Database connection is down - check DATABASE_URL and network connectivity');
  }
  
  if (!connectionTests.basicConnection) {
    recommendations.push('Basic connection test failed - database may be overloaded');
  }
  
  if (!connectionTests.ensuredConnection) {
    recommendations.push('Connection retry mechanism failed - check connection pool settings');
  }
  
  if (!connectionTests.writeTest) {
    recommendations.push('Write operations may be failing - check database permissions');
  }
  
  if (latency > 5000) {
    recommendations.push('High latency detected - consider connection pool optimization');
  } else if (latency > 2000) {
    recommendations.push('Elevated latency - monitor database performance');
  }
  
  if (healthStatus.error?.includes('Connection pool timeout')) {
    recommendations.push('Connection pool timeout - increase pool_timeout or reduce concurrent connections');
  }
  
  if (healthStatus.error?.includes('Socket timeout')) {
    recommendations.push('Socket timeout - check network connectivity and socket_timeout settings');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Database health is optimal');
  }
  
  return recommendations;
}

/**
 * POST endpoint for more intensive health checks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    if (body.test === true) {
      // This is a write test from the GET endpoint
      return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    }
    
    // Perform a more comprehensive health check
    const results = await performComprehensiveHealthCheck();
    
    return NextResponse.json(results);
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Comprehensive health check with detailed metrics
 */
async function performComprehensiveHealthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    connectionPool: {
      status: 'unknown',
      activeConnections: 0,
      poolSize: 0,
    },
    performance: {
      queryLatencies: [] as number[],
      averageLatency: 0,
      maxLatency: 0,
    },
    databaseInfo: {
      version: '',
      size: 0,
      connections: 0,
    },
  };
  
  try {
    // Test multiple concurrent queries to check pool behavior
    const queryPromises = Array.from({ length: 5 }, async (_, i) => {
      const start = Date.now();
      try {
        await ensureConnection(1);
        const latency = Date.now() - start;
        return { success: true, latency, index: i };
      } catch (error) {
        return { success: false, latency: Date.now() - start, index: i, error: (error as Error).message };
      }
    });
    
    const queryResults = await Promise.allSettled(queryPromises);
    
    // Process results
    const successfulQueries = queryResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(value => value.success);
    
    results.performance.queryLatencies = successfulQueries.map(q => q.latency);
    results.performance.averageLatency = successfulQueries.length > 0 
      ? results.performance.queryLatencies.reduce((a, b) => a + b, 0) / results.performance.queryLatencies.length 
      : 0;
    results.performance.maxLatency = Math.max(...results.performance.queryLatencies, 0);
    
    results.connectionPool.status = successfulQueries.length === 5 ? 'healthy' : 
                                   successfulQueries.length > 0 ? 'degraded' : 'failing';
    
    return results;
    
  } catch (error) {
    return {
      ...results,
      error: (error as Error).message,
      connectionPool: { ...results.connectionPool, status: 'error' },
    };
  }
}
