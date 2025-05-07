import https from 'https';
import { config } from 'dotenv';

// Load environment variables
config();

// Get Square access token from environment
const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const apiHost = process.env.NODE_ENV === 'production' 
  ? 'connect.squareup.com' 
  : 'connect.squareupsandbox.com';

// Basic logger
const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO:', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR:', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN:', ...args)
};

// Helper function for making HTTPS requests
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk.toString());
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        } else {
          reject(new Error(`HTTP Error: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Search for catalog objects with prefix "Test"
async function searchTestProducts() {
  logger.info('Searching for test products in Square catalog...');
  
  const options = {
    hostname: apiHost,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  const requestBody = {
    object_types: ['ITEM'],
    query: {
      prefix_query: {
        attribute_name: 'name',
        attribute_prefix: 'Test'
      }
    }
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    const objects = response.objects || [];
    logger.info(`Found ${objects.length} test products in Square catalog`);
    return objects;
  } catch (error) {
    logger.error('Error searching for test products:', error);
    throw error;
  }
}

// Delete a catalog object by ID
async function deleteCatalogObject(objectId) {
  logger.info(`Deleting catalog object ${objectId}...`);
  
  const options = {
    hostname: apiHost,
    path: `/v2/catalog/object/${objectId}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2023-12-13',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    await httpsRequest(options);
    logger.info(`Successfully deleted object ${objectId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting object ${objectId}:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    if (!accessToken) {
      throw new Error("Square access token not found in environment variables");
    }
    
    logger.info('Starting Square test products cleanup');
    logger.info(`Using API host: ${apiHost}`);
    
    // Find all test products
    const testProducts = await searchTestProducts();
    
    if (testProducts.length === 0) {
      logger.info('No test products found in Square catalog.');
      return;
    }
    
    // Delete each test product
    let successCount = 0;
    let failureCount = 0;
    
    for (const product of testProducts) {
      try {
        const name = product.item_data?.name || 'Unknown';
        logger.info(`Processing test product: ${name} (${product.id})`);
        
        const success = await deleteCatalogObject(product.id);
        
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`Error processing product ${product.id}:`, error);
        failureCount++;
      }
    }
    
    logger.info(`
      Square test products cleanup completed!
      * Products found: ${testProducts.length}
      * Successfully deleted: ${successCount}
      * Failed to delete: ${failureCount}
    `);
    
  } catch (error) {
    logger.error('Error in Square test products cleanup:', error);
    process.exit(1);
  }
}

// Run the script
main(); 