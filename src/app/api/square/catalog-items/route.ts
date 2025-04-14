import { NextResponse } from 'next/server';
import { searchCatalogItems } from '@/lib/square/quickstart';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const items = await searchCatalogItems();
    
    return NextResponse.json({ 
      success: true, 
      items,
      count: items.length
    });
  } catch (error) {
    logger.error('Error in Square catalog items API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch Square catalog items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}