import { NextResponse } from 'next/server';
import { safeQuery, safeQueryRaw, checkDatabaseHealth } from '@/lib/db-utils';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Enhanced database health check
    const healthCheck = await checkDatabaseHealth();

    if (!healthCheck.connected) {
      return NextResponse.json(
        {
          success: false,
          error: healthCheck.error,
          diagnostics: healthCheck.diagnostics,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Test safe query operations
    const [databaseTest, profileCount, testQuery] = await Promise.all([
      safeQueryRaw`SELECT NOW() as server_time`,
      safeQuery(() => prisma.profile.count()),
      safeQueryRaw`SELECT current_database(), current_user, version()`,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful with enhanced safety',
      timestamp: new Date().toISOString(),
      healthCheck: {
        connected: healthCheck.connected,
        responseTime: healthCheck.responseTime,
      },
      databaseInfo: testQuery,
      profileCount,
      databaseTest,
      optimizations: [
        'Using safeQuery utilities',
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
