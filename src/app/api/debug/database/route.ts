import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

/**
 * Database Connection Debug API
 * 
 * This endpoint helps diagnose database connection issues in production.
 * It should be removed or secured before going live.
 */
export async function GET(request: NextRequest) {
  // Security check - only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    console.log('🔍 Running database connection diagnostics...');

    // Check if DATABASE_URL is defined
    const databaseUrl = process.env.DATABASE_URL;
    const hasDirectUrl = !!process.env.DIRECT_URL;
    
    let hostInfo = 'Not available';
    let isPooler = false;
    
    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        hostInfo = url.hostname;
        isPooler = hostInfo.includes('pooler.supabase.com');
      } catch (urlError) {
        hostInfo = 'Invalid URL format';
      }
    }

    // Test database connection
    const healthCheck = await checkDatabaseHealth();

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      database: {
        hasDatabaseUrl: !!databaseUrl,
        hasDirectUrl,
        hostInfo,
        isPoolerConnection: isPooler,
        connectionMasked: databaseUrl ? databaseUrl.replace(/:[^:@]*@/, ':***@') : 'Not set',
      },
      connection: {
        connected: healthCheck.connected,
        latency: healthCheck.latency,
        error: healthCheck.error || null,
      },
    };

    console.log('📊 Database diagnostics:', diagnostics);

    return NextResponse.json({
      success: true,
      diagnostics,
      message: healthCheck.connected 
        ? '✅ Database connection successful' 
        : '❌ Database connection failed',
    });

  } catch (error) {
    console.error('❌ Database diagnostics failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics: {
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
        },
        database: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
        },
      },
    }, { status: 500 });
  }
}
