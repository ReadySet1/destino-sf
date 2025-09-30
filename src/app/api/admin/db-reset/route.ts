import { NextRequest, NextResponse } from 'next/server';
import { forceResetConnection, getHealthStatus } from '@/lib/db-unified';

/**
 * POST /api/admin/db-reset
 *
 * Force reset database connection to clear cached query plans.
 * This resolves PostgreSQL "cached plan must not change result type" errors
 * that can occur after schema changes.
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with admin authentication
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      if (token !== process.env.ADMIN_RESET_TOKEN) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
    }

    console.log('🔄 Resetting database connection via API...');

    // Reset the database connection
    await forceResetConnection();

    // Test the connection
    const health = await getHealthStatus();

    return NextResponse.json({
      success: true,
      message: 'Database connection reset successful',
      latency: health.latency,
      connected: health.connected,
      error: health.error
    });

  } catch (error) {
    console.error('Error resetting database connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
