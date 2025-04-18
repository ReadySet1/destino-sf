import { NextResponse } from 'next/server';
import { getLocations } from '@/lib/square/quickstart';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const locations = await getLocations();
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