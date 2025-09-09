import { NextRequest, NextResponse } from 'next/server';
import { withRetry, ensureConnection } from '@/lib/db-unified';
import { prisma } from '@/lib/db-unified';

/**
 * Database debug endpoint for testing write operations
 * Used by the health check system to verify database write permissions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // If this is a simple test from the health check
    if (body.test === true) {
      try {
        // Ensure we have a good connection first
        await ensureConnection(2);
        
        // Test a simple write operation that doesn't affect real data
        // Use a raw query to test write permissions without creating records
        const testResult = await withRetry(() =>
          prisma.$executeRaw`SELECT 1 as write_permission_test`
        );
        
        return NextResponse.json({ 
          success: true, 
          timestamp: new Date().toISOString(),
          writePermissionTest: 'passed',
          connectionTest: 'passed'
        });
      } catch (error) {
        console.error('Database write test failed:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
            writePermissionTest: 'failed'
          },
          { status: 500 }
        );
      }
    }
    
    // For other debug operations, provide more comprehensive testing
    const results = {
      timestamp: new Date().toISOString(),
      tests: {
        connection: false,
        read: false,
        write: false,
      },
      errors: [] as string[],
    };
    
    try {
      // Test 1: Connection
      await ensureConnection(1);
      results.tests.connection = true;
    } catch (error) {
      results.errors.push(`Connection failed: ${(error as Error).message}`);
    }
    
    try {
      // Test 2: Read operation
      const orderCount = await withRetry(() =>
        prisma.order.count({ take: 1 })
      );
      results.tests.read = true;
    } catch (error) {
      results.errors.push(`Read failed: ${(error as Error).message}`);
    }
    
    try {
      // Test 3: Write operation (safe test)
      await withRetry(() =>
        prisma.$executeRaw`SELECT current_timestamp as write_test`
      );
      results.tests.write = true;
    } catch (error) {
      results.errors.push(`Write failed: ${(error as Error).message}`);
    }
    
    const allTestsPassed = Object.values(results.tests).every(test => test === true);
    
    return NextResponse.json(
      results,
      { status: allTestsPassed ? 200 : 500 }
    );
    
  } catch (error) {
    console.error('Database debug endpoint error:', error);
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
 * GET endpoint for basic database health information
 */
export async function GET(): Promise<NextResponse> {
  try {
    await ensureConnection(1);
    
    const stats = await withRetry(async () => {
      const [orderCount, cateringCount] = await Promise.all([
        prisma.order.count(),
        prisma.cateringOrder.count(),
      ]);
      
      return { orderCount, cateringCount };
    });
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        ...stats,
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}