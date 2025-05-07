#!/usr/bin/env ts-node

import { squareClient } from '../../lib/square/client';
import { logger } from '../../utils/logger';

/**
 * Simple script to test the Square API connection
 * Run with: npm run script -- src/scripts/test-square-api.ts
 */
async function testSquareApiConnection(): Promise<void> {
  logger.info('Starting Square API connection test...');
  
  try {
    // Test the catalog search API
    logger.info('Testing catalog search API...');
    
    // Use snake_case for consistency with the Square API
    const requestBody = {
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false
    };
    
    const catalogResult = await squareClient.catalogApi.searchCatalogObjects(requestBody);
    
    // Check if we got a valid response
    if (catalogResult && catalogResult.result && catalogResult.result.objects) {
      const items = catalogResult.result.objects;
      logger.info(`Successfully retrieved ${items.length} catalog items`);
      
      // Log the first item if available
      if (items.length > 0) {
        logger.info('Sample item:', JSON.stringify(items[0], null, 2));
      }
    } else {
      logger.info('Received valid response but no catalog items were found');
    }
    
    logger.info('Square API connection test completed successfully');
  } catch (error) {
    logger.error('Error testing Square API connection:', error);
    process.exit(1);
  }
}

// Run the test function
testSquareApiConnection()
  .then(() => {
    logger.info('Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Unhandled error in test script:', error);
    process.exit(1);
  }); 