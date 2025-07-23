import { NextResponse } from 'next/server';
import { testCatalogAccess } from '@/lib/square/test-catalog';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    logger.info('Running Square catalog API test...');
    const result = await testCatalogAccess();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully fetched ${result.itemCount} catalog items`
        : 'Failed to fetch catalog items',
      data: result,
    });
  } catch (error) {
    logger.error('Error in Square catalog test API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run Square catalog test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
