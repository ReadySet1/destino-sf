import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const databaseTest = await prisma.$queryRaw`SELECT NOW()`;
    
    // Count profiles
    const profileCount = await prisma.profile.count();
    
    // Test query
    const testQuery = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      databaseInfo: testQuery,
      profileCount,
      databaseTest
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 