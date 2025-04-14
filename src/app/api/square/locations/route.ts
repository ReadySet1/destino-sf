// src/app/api/square/locations/route.ts
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

// src/app/api/square/create-item/route.ts
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

// src/app/api/square/catalog-items/route.ts
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