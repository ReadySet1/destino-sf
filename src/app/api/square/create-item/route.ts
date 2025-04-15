import { NextResponse } from 'next/server';
import { createTestItem } from '@/lib/square/quickstart';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    const result = await createTestItem();
    return NextResponse.json({ 
      success: true, 
      result 
    });
  } catch (error) {
    logger.error('Error in Square create item API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create Square item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 