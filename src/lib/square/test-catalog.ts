import { fetchCatalogItems } from './catalog';
import { logger } from '@/utils/logger';

/**
 * Test function to verify Square catalog API connectivity
 */
async function testCatalogAccess() {
  try {
    logger.info('Testing Square catalog API access...');
    
    const items = await fetchCatalogItems();
    
    logger.info(`Successfully retrieved ${items.length} catalog items`);
    logger.info('First few items:', items.slice(0, 3));
    
    return {
      success: true,
      itemCount: items.length,
      sample: items.slice(0, 3)
    };
  } catch (error) {
    logger.error('Error testing Square catalog access:', error);
    
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
      if ('body' in error) {
        logger.error('Square API error body:', (error as any).body);
      }
      if ('stack' in error) {
        logger.error('Stack trace:', error.stack);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export the test function for use in API routes
export { testCatalogAccess };

// Direct execution for CLI testing
if (require.main === module) {
  testCatalogAccess()
    .then(result => {
      console.log('Test result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
} 