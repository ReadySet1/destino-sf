import { NextResponse } from 'next/server';
import { prisma, withRetry, getHealthStatus } from '@/lib/db-unified';

export async function GET() {
  try {
    // Enhanced database health check
    const healthCheck = await getHealthStatus();

    if (!healthCheck.connected) {
      return NextResponse.json(
        {
          success: false,
          error: healthCheck.error,
          latency: healthCheck.latency,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Test safe query operations
    const [databaseTest, profileCount, testQuery] = await Promise.all([
      withRetry(() => prisma.$queryRaw`SELECT NOW() as server_time`, 3, 'db-time'),
      withRetry(() => prisma.profile.count(), 3, 'profile-count'),
      withRetry(
        () => prisma.$queryRaw`SELECT current_database(), current_user, version()`,
        3,
        'db-info'
      ),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful with enhanced safety',
      timestamp: new Date().toISOString(),
      healthCheck: {
        connected: healthCheck.connected,
        latency: healthCheck.latency,
      },
      databaseInfo: testQuery,
      profileCount,
      databaseTest,
      optimizations: [
        'Using unified database client with retry',
        'Connection pool management',
        'Auto-retry on failures',
        'Auto-disconnect on inactivity',
      ],
    });
  } catch (error) {
    console.error('Database test error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        errorCode: (error as any)?.code,
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Check DATABASE_URL configuration',
          'Verify connection pool settings',
          'Review Supabase pooler status',
          'Check network connectivity',
        ],
      },
      { status: 500 }
    );
  }
}
