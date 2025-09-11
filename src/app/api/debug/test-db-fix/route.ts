import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';

/**
 * API endpoint to test the db-unified proxy fix
 * GET /api/debug/test-db-fix
 */
export async function GET(request: NextRequest) {
  console.log('🧪 [DB-FIX-TEST] Testing database operations...');
  
  try {
    const startTime = Date.now();
    
    // Test 1: Basic connection test
    console.log('🔍 [DB-FIX-TEST] Testing basic connection...');
    const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ [DB-FIX-TEST] Connection test passed:', connectionTest);
    
    // Test 2: Test profile model access (the one that was failing)
    console.log('🔍 [DB-FIX-TEST] Testing profile model access...');
    const profileCount = await prisma.profile.count();
    console.log('✅ [DB-FIX-TEST] Profile count query passed:', profileCount);
    
    // Test 3: Test profile.findFirst (similar to findUnique that was failing)
    console.log('🔍 [DB-FIX-TEST] Testing profile.findFirst...');
    const firstProfile = await prisma.profile.findFirst({
      take: 1,
      select: { id: true, name: true }
    });
    console.log('✅ [DB-FIX-TEST] Profile findFirst passed:', firstProfile ? 'Found profile' : 'No profiles found');
    
    // Test 4: Test other model access
    console.log('🔍 [DB-FIX-TEST] Testing order model access...');
    const orderCount = await prisma.order.count();
    console.log('✅ [DB-FIX-TEST] Order count query passed:', orderCount);
    
    // Test 5: Test the specific operation that was failing
    console.log('🔍 [DB-FIX-TEST] Testing specific failing operation...');
    const testProfile = await prisma.profile.findFirst({
      where: { id: { not: 'non-existent-id' } },
      select: { id: true }
    });
    console.log('✅ [DB-FIX-TEST] Specific failing operation passed');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('🎉 [DB-FIX-TEST] All database operations completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Database operations completed successfully',
      tests: {
        connectionTest: 'passed',
        profileCount: profileCount,
        profileFindFirst: firstProfile ? 'found' : 'no profiles',
        orderCount: orderCount,
        specificOperation: 'passed'
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [DB-FIX-TEST] Database operation failed:', error);
    
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    console.error('🔍 [DB-FIX-TEST] Error details:', errorDetails);
    
    return NextResponse.json({
      success: false,
      error: errorDetails,
      message: 'Database operation failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
