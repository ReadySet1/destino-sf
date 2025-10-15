import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { validateDatabaseEnvironment } from '@/lib/db-environment-validator';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Enhanced database health check endpoint for debugging connection issues
 */
export async function GET() {
  const start = Date.now();
  const result: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL === '1',
    region: process.env.VERCEL_REGION,
    checks: {},
  };

  try {
    // 1. Environment validation
    console.log('🔍 Running environment validation...');
    const envValidation = validateDatabaseEnvironment();
    result.checks.environment = {
      valid: envValidation.isValid,
      database: envValidation.currentDatabase?.name || 'unknown',
      warnings: envValidation.warnings,
      errors: envValidation.errors,
    };

    // 2. Basic connection test
    console.log('🔍 Testing basic connection...');
    const connectionStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1 as basic_test`;
      result.checks.basicConnection = {
        success: true,
        latency: Date.now() - connectionStart,
      };
    } catch (error) {
      result.checks.basicConnection = {
        success: false,
        error: (error as Error).message,
        latency: Date.now() - connectionStart,
      };
    }

    // 3. Database version and info
    console.log('🔍 Getting database info...');
    try {
      const dbInfo = await prisma.$queryRaw<
        Array<{ version: string }>
      >`SELECT version() as version`;
      result.checks.databaseInfo = {
        success: true,
        version: dbInfo[0]?.version || 'unknown',
      };
    } catch (error) {
      result.checks.databaseInfo = {
        success: false,
        error: (error as Error).message,
      };
    }

    // 4. Tables accessibility test
    console.log('🔍 Testing table access...');
    try {
      const tableCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      result.checks.tablesAccess = {
        success: true,
        publicTables: Number(tableCount[0]?.count || 0),
      };
    } catch (error) {
      result.checks.tablesAccess = {
        success: false,
        error: (error as Error).message,
      };
    }

    // 5. Simple data query test
    console.log('🔍 Testing data queries...');
    try {
      const categoryCount = await prisma.category.count();
      result.checks.dataQueries = {
        success: true,
        categoryCount,
      };
    } catch (error) {
      result.checks.dataQueries = {
        success: false,
        error: (error as Error).message,
      };
    }

    // 6. Connection pool info
    console.log('🔍 Getting connection pool info...');
    try {
      const poolInfo = await prisma.$queryRaw<
        Array<{
          total_conns: number;
          used_conns: number;
          res_conns: number;
        }>
      >`
        SELECT 
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as total_conns,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as used_conns,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as res_conns
      `;
      result.checks.connectionPool = {
        success: true,
        info: poolInfo[0] || {},
      };
    } catch (error) {
      result.checks.connectionPool = {
        success: false,
        error: (error as Error).message,
      };
    }

    result.overall = {
      healthy: Object.values(result.checks).every((check: any) => check.success !== false),
      totalTime: Date.now() - start,
    };

    return NextResponse.json(result, {
      status: result.overall.healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);

    result.overall = {
      healthy: false,
      error: (error as Error).message,
      totalTime: Date.now() - start,
    };

    return NextResponse.json(result, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
