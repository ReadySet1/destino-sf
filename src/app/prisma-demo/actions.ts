'use server';

import { db } from '@/lib/db';

interface TestResult {
  test: number;
}

export async function testPrismaServerAction() {
  try {
    // This runs on the server side only
    const result = await db.$queryRaw<TestResult[]>`SELECT 1 as test`;
    
    return {
      success: true,
      message: 'Server action executed successfully',
      data: result[0]?.test || 0
    };
  } catch (error) {
    console.error('Server action error:', error);
    return {
      success: false,
      message: 'Server action failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 