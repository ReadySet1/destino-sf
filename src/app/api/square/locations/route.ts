import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getSquareService } from '@/lib/square/service';

/**
 * API route to fetch Square location data
 * Uses the optimized Square service layer to prevent build-time API calls
 */
export async function GET() {
  try {
    // Using the service layer instead of direct client access
    const squareService = getSquareService();
    const locations = await squareService.getLocations();
    
    logger.info(`Successfully fetched ${locations.length} Square location(s)`);
    
    return NextResponse.json({ 
      success: true, 
      locations 
    });
  } catch (error) {
    logger.error('Error in Square locations API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch Square locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 