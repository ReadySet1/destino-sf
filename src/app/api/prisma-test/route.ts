import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple query to test Prisma connection
    // Replace with an actual model from your schema if needed
    const result = await db.$queryRaw`SELECT 1 as test`;
    
    return NextResponse.json({
      success: true,
      message: 'Prisma is working correctly',
      data: result
    });
  } catch (error) {
    console.error('Prisma test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute Prisma query',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 