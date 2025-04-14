// src/app/api/square/sync/route.ts

import { NextResponse } from 'next/server';
import { syncSquareProducts } from '@/lib/square/sync';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    logger.info('Square sync API triggered');
    
    // Start the sync process
    const result = await syncSquareProducts();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        syncedProducts: result.syncedProducts,
        errors: result.errors
      }
    });
  } catch (error) {
    logger.error('Error in Square sync API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync Square products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export const GET = async () => {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
};