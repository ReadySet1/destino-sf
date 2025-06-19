import { logger } from '@/utils/logger';
import https from 'https';

// Configuration interface for consistency
interface SquareConfig {
  useSandbox: boolean;
  accessToken: string;
  apiHost: string;
  tokenSource: string;
}

// Function to get the current access token and environment settings
// This now uses direct environment variable access to avoid circular dependencies
function getSquareConfig(): SquareConfig {
  // Check for hybrid configuration
  const forceCatalogProduction = process.env.SQUARE_CATALOG_USE_PRODUCTION === 'true';
  const forceTransactionSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';
  const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';

  // Determine catalog environment
  let catalogEnvironment: 'sandbox' | 'production';
  let accessToken: string | undefined;
  let tokenSource: string;

  if (forceCatalogProduction || (!useSandbox && !forceTransactionSandbox)) {
    // Use production for catalog
    catalogEnvironment = 'production';
    accessToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
    tokenSource = process.env.SQUARE_PRODUCTION_TOKEN ? 'SQUARE_PRODUCTION_TOKEN' : 'SQUARE_ACCESS_TOKEN';
  } else {
    // Use sandbox for catalog
    catalogEnvironment = 'sandbox';
    accessToken = process.env.SQUARE_SANDBOX_TOKEN;
    tokenSource = 'SQUARE_SANDBOX_TOKEN';
  }

  const apiHost = catalogEnvironment === 'sandbox' 
    ? 'connect.squareupsandbox.com' 
    : 'connect.squareup.com';
      
  return {
    useSandbox: catalogEnvironment === 'sandbox',
    accessToken: accessToken || '',
    apiHost,
    tokenSource
  };
}

// Get initial config
let squareConfig = getSquareConfig();

// Log the token configuration on startup
logger.info('Square API configuration:', {
  environment: squareConfig.useSandbox ? 'sandbox' : 'production',
  apiHost: squareConfig.apiHost,
  tokenSource: squareConfig.tokenSource,
  hasToken: !!squareConfig.accessToken
});

/**
 * Makes an HTTPS request to the Square API
 */
async function httpsRequest(options: any, requestBody?: any): Promise<any> {
  // Refresh config in case it was changed at runtime
  squareConfig = getSquareConfig();
  
  // Ensure we have a token
  if (!squareConfig.accessToken) {
    throw new Error(`Square access token not configured for ${squareConfig.tokenSource}`);
  }
  
  // Update Authorization header with current token
  if (options.headers) {
    options.headers['Authorization'] = `Bearer ${squareConfig.accessToken}`;
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        } else {
          // Add more context for authentication errors
          if (res.statusCode === 401) {
            logger.error(`Authentication error with token from ${squareConfig.tokenSource}. Please check your Square API token.`);
            logger.error(`Environment: ${squareConfig.useSandbox ? 'sandbox' : 'production'}`);
          }
          reject(new Error(`Request failed with status: ${res.statusCode}, body: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (requestBody) {
      req.write(JSON.stringify(requestBody));
    }
    
    req.end();
  });
}

/**
 * Direct implementation of Square's retrieveCatalogObject API
 * Works around issues with the Square SDK
 */
export async function retrieveCatalogObject(objectId: string) {
  // Refresh config for each request
  squareConfig = getSquareConfig();
  
  if (!squareConfig.accessToken) {
    throw new Error(`Square access token not configured for ${squareConfig.tokenSource}`);
  }
  
  logger.info(`Retrieving catalog object with ID: ${objectId} from ${squareConfig.apiHost}`);
  
  const options = {
    hostname: squareConfig.apiHost,
    path: `/v2/catalog/object/${objectId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    
    // Format the response to match Square SDK structure
    return {
      result: {
        object: response.object,
        related_objects: response.related_objects || []
      }
    };
  } catch (error) {
    logger.error(`Error retrieving catalog object ${objectId}:`, error);
    throw error;
  }
}

/**
 * Direct implementation of Square's searchCatalogObjects API
 */
export async function searchCatalogObjects(requestBody: any) {
  // Refresh config for each request to ensure we have the latest
  squareConfig = getSquareConfig();
  
  if (!squareConfig.accessToken) {
    throw new Error(`Square access token not configured for ${squareConfig.tokenSource}`);
  }
  
  logger.info(`Searching catalog objects on ${squareConfig.apiHost} using token from ${squareConfig.tokenSource} (sandbox: ${squareConfig.useSandbox})`);
  
  const options = {
    hostname: squareConfig.apiHost,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store'
    }
  };
  
  try {
    const response = await httpsRequest(options, requestBody);
    
    // Format the response to match Square SDK structure
    return {
      result: {
        objects: response.objects || [],
        related_objects: response.related_objects || [],
        cursor: response.cursor
      }
    };
  } catch (error) {
    logger.error('Error searching catalog objects:', error);
    throw error;
  }
}

/**
 * Direct implementation of Square's listCatalog API
 * This is needed for syncCateringItemsWithSquare function
 */
export async function listCatalog(cursor?: string, objectTypes?: string) {
  // Refresh config for each request
  squareConfig = getSquareConfig();
  
  if (!squareConfig.accessToken) {
    throw new Error(`Square access token not configured for ${squareConfig.tokenSource}`);
  }
  
  logger.info(`Listing catalog objects on ${squareConfig.apiHost} with objectTypes: ${objectTypes || 'all'}`);
  
  let path = '/v2/catalog/list';
  let params = [];
  
  if (cursor) {
    params.push(`cursor=${encodeURIComponent(cursor)}`);
  }
  
  if (objectTypes) {
    params.push(`types=${encodeURIComponent(objectTypes)}`);
  }
  
  if (params.length > 0) {
    path += `?${params.join('&')}`;
  }
  
  const options = {
    hostname: squareConfig.apiHost,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store'
    }
  };
  
  try {
    const response = await httpsRequest(options);
    
    // Format the response to match Square SDK structure
    return {
      result: {
        objects: response.objects || [],
        cursor: response.cursor
      }
    };
  } catch (error) {
    logger.error('Error listing catalog objects:', error);
    throw error;
  }
}

/**
 * Helper function to test API connectivity
 */
export async function testApiConnection() {
  try {
    // Refresh config
    squareConfig = getSquareConfig();
    
    logger.info(`Testing connection to ${squareConfig.apiHost} with token from ${squareConfig.tokenSource}`);
    
    const options = {
      hostname: squareConfig.apiHost,
      path: '/v2/catalog/list',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${squareConfig.accessToken}`,
        'Square-Version': '2025-05-21',
        'Content-Type': 'application/json'
      }
    };
    
    await httpsRequest(options);
    
    logger.info(`Connection successful to ${squareConfig.apiHost}`);
    return { 
      success: true, 
      environment: squareConfig.useSandbox ? 'sandbox' : 'production',
      apiHost: squareConfig.apiHost 
    };
  } catch (error) {
    logger.error(`Connection test failed:`, error);
    return { 
      success: false, 
      environment: squareConfig.useSandbox ? 'sandbox' : 'production',
      apiHost: squareConfig.apiHost,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Create a direct catalog API implementation to be used as a fallback
export const directCatalogApi = {
  retrieveCatalogObject,
  searchCatalogObjects,
  listCatalog,
  testConnection: testApiConnection
}; 