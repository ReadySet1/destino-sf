import { NextResponse } from 'next/server';
import { quickHealthCheck, getConnectionDiagnostics } from '@/lib/db-unified';

/**
 * Simple health check endpoint for load balancers and monitoring
 * Returns basic status with minimal overhead
 *
 * Uses quickHealthCheck with 5-second timeout and circuit breaker integration
 * to fail fast during database issues rather than waiting for long timeouts.
 */
export async function GET() {
  const healthResult = await quickHealthCheck(5000); // 5 second timeout for health checks

  // Discarded clients whose disconnect never settled leak engine pools even
  // while the app is otherwise healthy, so the counter is reported on both
  // branches.
  const diagnostics = getConnectionDiagnostics();

  if (healthResult.healthy) {
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        latencyMs: healthResult.latencyMs,
        pendingBackgroundDisconnects: diagnostics.pendingBackgroundDisconnects,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: healthResult.error || 'Database health check failed',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      latencyMs: healthResult.latencyMs,
      pendingBackgroundDisconnects: diagnostics.pendingBackgroundDisconnects,
      diagnostics: {
        circuitBreakerState: diagnostics.circuitBreakerState,
        consecutiveFailures: diagnostics.consecutiveFailures,
        isStale: diagnostics.isStale,
      },
    },
    { status: 503 }
  );
}
