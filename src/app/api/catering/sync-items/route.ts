import { NextRequest, NextResponse } from 'next/server';
import { syncCateringItemsWithSquare } from '@/lib/square/sync';
import { logger } from '@/utils/logger';

export async function POST(req: NextRequest) {
  try {
    logger.info('Manual catering items sync with Square triggered via API');

    const result = await syncCateringItemsWithSquare();

    return NextResponse.json({
      success: true,
      message: 'Catering items sync completed successfully',
      result,
    });
  } catch (error) {
    logger.error('Error in catering sync API route:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error synchronizing catering items with Square',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
