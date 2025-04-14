import { NextResponse } from 'next/server';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    logger.info('Running Square catalog debug API...');
    
    // Test locations API first
    logger.info('Testing locations API...');
    const locationsResponse = await squareClient.locationsApi.listLocations();
    
    // Test searchCatalogObjects method
    logger.info('Testing searchCatalogObjects method...');
    const searchRequestBody = {
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false
    };
    
    // Pass the request object directly, not as a string
    const searchResponse = await squareClient.catalogApi.searchCatalogObjects(searchRequestBody);
    
    // Test listCatalog method
    logger.info('Testing listCatalog method...');
    const listResponse = await squareClient.catalogApi.listCatalog(undefined, 'ITEM');
    
    // Compile all results for analysis
    const results = {
      locations: locationsResponse.result?.locations || [],
      search: {
        objectCount: searchResponse.result?.objects?.length || 0,
        objects: searchResponse.result?.objects || []
      },
      list: {
        objectCount: listResponse.result?.objects?.length || 0,
        objects: listResponse.result?.objects || []
      }
    };
    
    logger.info('Debug results summary:', {
      locationsCount: results.locations.length,
      searchCount: results.search.objectCount,
      listCount: results.list.objectCount
    });
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error in Square debug catalog API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to debug Square catalog API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 