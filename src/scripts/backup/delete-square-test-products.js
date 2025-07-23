import { squareClient } from '../lib/square/client.ts';
import { logger } from '../utils/logger.ts';

// Add a new method for deleting catalog objects to our client if it doesn't exist
if (!squareClient.catalogApi.deleteCatalogObject) {
  squareClient.catalogApi.deleteCatalogObject = async objectId => {
    logger.info(`Calling Square catalog delete API via HTTPS for object ${objectId}`);

    const options = {
      hostname:
        squareClient._options.environment === 'production'
          ? 'connect.squareup.com'
          : 'connect.squareupsandbox.com',
      path: `/v2/catalog/object/${objectId}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2025-05-21',
        'Content-Type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = require('https').request(options, res => {
        let body = '';
        res.on('data', chunk => (body += chunk.toString()));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = body ? JSON.parse(body) : {};
              resolve({ result: data });
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error}`));
            }
          } else {
            reject(new Error(`HTTP Error: ${res.statusCode} - ${body}`));
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.end();
    });
  };
}

async function main() {
  try {
    logger.info('Starting to find and delete test products from Square...');

    // First, search for test products in the catalog
    const testProductsQuery = {
      object_types: ['ITEM'],
      query: {
        prefix_query: {
          attribute_name: 'name',
          attribute_prefix: 'Test',
        },
      },
    };

    const searchResponse = await squareClient.catalogApi.searchCatalogObjects(testProductsQuery);
    const testProducts = searchResponse.result?.objects || [];

    logger.info(`Found ${testProducts.length} test products in Square catalog`);

    // Delete each test product
    for (const product of testProducts) {
      try {
        logger.info(
          `Deleting test product: ${product.item_data?.name || 'Unknown'} (${product.id})`
        );

        await squareClient.catalogApi.deleteCatalogObject(product.id);

        logger.info(`Successfully deleted product ${product.id} from Square`);
      } catch (deleteError) {
        logger.error(`Error deleting product ${product.id}:`, deleteError);
      }
    }

    logger.info('Finished deleting test products from Square');
  } catch (error) {
    logger.error('Error in delete test products script:', error);
  }
}

main();
