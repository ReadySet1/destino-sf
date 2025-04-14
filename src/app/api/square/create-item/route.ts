import { NextResponse } from 'next/server';
import { createTestItem } from '@/lib/square/quickstart';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    logger.info('Creating test item in Square catalog...');
    const result = await createTestItem();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test item created successfully in Square',
      item: result.item,
      relatedObjects: result.relatedObjects
    });
  } catch (error) {
    logger.error('Error in Square create-item API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test item in Square',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 