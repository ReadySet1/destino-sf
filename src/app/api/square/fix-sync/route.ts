import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { syncSquareProducts } from '@/lib/square/sync';

export async function GET(request: NextRequest) {
  try {
    // Get the cleanup mode from query params
    const mode = request.nextUrl.searchParams.get('mode') || 'full';
    const threshold = request.nextUrl.searchParams.get('threshold') || '0.7';
    
    logger.info(`Starting fix-sync process with mode: ${mode}`);
    
    // Step 1: Run the cleanup process
    logger.info('Running cleanup process to fix invalid Square IDs...');
    
    const cleanupUrl = new URL('/api/square/bulk-cleanup', request.url);
    cleanupUrl.searchParams.set('mode', mode);
    cleanupUrl.searchParams.set('threshold', threshold);
    
    const cleanupResponse = await fetch(cleanupUrl.toString());
    const cleanupResult = await cleanupResponse.json();
    
    if (!cleanupResponse.ok) {
      logger.error('Cleanup process failed:', cleanupResult);
      return NextResponse.json({
        success: false,
        error: 'Cleanup process failed',
        details: cleanupResult
      }, { status: 500 });
    }
    
    logger.info(`Cleanup completed: ${cleanupResult.invalid} invalid products found, ${cleanupResult.cleared} cleared, ${cleanupResult.matched} matched`);
    
    // Step 2: Run the sync process to update images and product data
    logger.info('Running Square sync to update products with latest data...');
    
    const syncResult = await syncSquareProducts();
    
    // Step 3: Return combined results
    return NextResponse.json({
      success: true,
      cleanup: cleanupResult,
      sync: syncResult
    });
  } catch (error) {
    logger.error('Error in fix-sync process:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fix-sync process failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST method to support both GET and POST requests
export const POST = GET; 