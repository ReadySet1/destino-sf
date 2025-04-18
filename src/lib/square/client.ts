// src/lib/square/client.ts

import { logger } from '@/utils/logger';
import https from 'https';

// Get access token from environment
const accessToken = process.env.SQUARE_ACCESS_TOKEN;

if (!accessToken) {
  logger.error("Square access token is not configured in environment variables.");
  throw new Error("Missing Square Access Token");
}

// Create a helper function for HTTPS requests
function httpsRequest(options: any, data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk.toString());
      res.on('end', () => {
        if (res.statusCode! >= 200 && res.statusCode! < 300) {
          try {
            resolve(JSON.parse(body));
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
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Create a simpler direct API client instead of using the SDK
// This approach avoids the issues with the Square SDK v42.0.1
// Use the correct domain name for Square API
const apiHost = process.env.NODE_ENV === 'production' 
  ? 'connect.squareup.com' 
  : 'connect.squareupsandbox.com';

const squareClient = {
  // Available client properties for compatibility with existing code
  _options: {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    userAgentDetail: 'destino-sf'
  },
  
  // Locations API
  locationsApi: {
    listLocations: async () => {
      logger.info('Calling Square locations API via HTTPS');
      
      const options = {
        hostname: apiHost,
        path: '/v2/locations',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      
      const data = await httpsRequest(options);
      return { result: data };
    }
  },
  
  // Catalog API
  catalogApi: {
    listCatalog: async (cursor?: string, types?: string) => {
      logger.info('Calling Square catalog list API via HTTPS');
      
      let path = '/v2/catalog/list';
      const params = [];
      if (cursor) params.push(`cursor=${encodeURIComponent(cursor)}`);
      if (types) params.push(`types=${encodeURIComponent(types)}`);
      if (params.length > 0) {
        path += `?${params.join('&')}`;
      }
      
      const options = {
        hostname: apiHost,
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      
      const data = await httpsRequest(options);
      return { result: data };
    },
    
    listAllCatalogItems: async () => {
      logger.info('Fetching all Square catalog items with pagination');
      
      interface CatalogObject {
        type: string;
        id: string;
        [key: string]: any;
      }
      
      let allItems: CatalogObject[] = [];
      let cursor = undefined;
      let pageNum = 1;
      
      try {
        do {
          logger.info(`Fetching catalog items page ${pageNum} with cursor: ${cursor || 'Initial page'}`);
          
          let path = '/v2/catalog/list?types=ITEM';
          if (cursor) {
            path += `&cursor=${encodeURIComponent(cursor)}`;
          }
          
          const options = {
            hostname: apiHost,
            path,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Square-Version': '2023-12-13',
              'Content-Type': 'application/json'
            }
          };
          
          logger.info(`Making request to: ${apiHost}${path}`);
          const data = await httpsRequest(options);
          
          // Log the full response for debugging
          logger.info(`Raw catalog response:`, JSON.stringify(data));
          
          // Check if the response has the expected structure
          if (!data || typeof data !== 'object') {
            logger.error('Invalid catalog response:', data);
            throw new Error('Invalid catalog response from Square API');
          }
          
          const pageItems = data.objects || [];
          logger.info(`Fetched ${pageItems.length} items from page ${pageNum}`);
          
          if (pageItems.length > 0) {
            allItems = [...allItems, ...pageItems];
          }
          
          // Look for cursor in the response
          cursor = data.cursor || undefined;
          
          // Log whether we'll continue or not
          if (cursor) {
            logger.info(`Found cursor, will fetch next page ${pageNum + 1}`);
          } else {
            logger.info('No cursor found, this is the last page');
          }
          
          pageNum++;
          
          // Safety check to prevent infinite loops in case of API issues
          if (pageNum > 10) {
            logger.warn('Reached max page limit (10 pages), stopping pagination');
            break;
          }
        } while (cursor);
        
        logger.info(`Finished fetching all catalog items. Total: ${allItems.length}`);
        
        // Check if we got any items at all
        if (allItems.length === 0) {
          logger.warn('No catalog items found in Square. This is unusual and might indicate a problem.');
        }
        
        return { result: { objects: allItems } };
      } catch (error) {
        logger.error('Error in listAllCatalogItems:', error);
        throw error;
      }
    },
    
    searchCatalogObjects: async (request: any) => {
      logger.info('Calling Square catalog search API via HTTPS');
      
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
      
      const data = await httpsRequest(options, request);
      return { result: data };
    },
    
    // Add method to retrieve a catalog object by ID
    retrieveCatalogObject: async (objectId: string) => {
      logger.info(`Retrieving catalog object with ID: ${objectId}`);
      
      const options = {
        hostname: apiHost,
        path: `/v2/catalog/object/${objectId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      
      try {
        const data = await httpsRequest(options);
        return { result: data };
      } catch (error) {
        logger.error(`Error retrieving catalog object ${objectId}:`, error);
        throw error;
      }
    },
    
    upsertCatalogObject: async (request: any) => {
      logger.info('Calling Square catalog upsert API via HTTPS');
      
      const options = {
        hostname: apiHost,
        path: '/v2/catalog/object',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      
      const data = await httpsRequest(options, request);
      return { result: data };
    },
    
    // Add a new method to test direct API call
    searchCatalogItems: async () => {
      logger.info('Making direct request to search catalog items');
      
      try {
        const path = '/v2/catalog/search';
        const body = JSON.stringify({
          object_types: ["ITEM"]
        });
        
        const options = {
          hostname: apiHost,
          path: path,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Square-Version': '2023-12-13',
            'Content-Type': 'application/json'
          }
        };
        
        logger.info(`Making request to: ${apiHost}${path}`);
        const data = await httpsRequest(options, body);
        
        // Log the full response for debugging
        logger.info(`Raw search catalog response:`, JSON.stringify(data));
        
        return data;
      } catch (error) {
        logger.error('Error in searchCatalogItems:', error);
        throw error;
      }
    }
  },

  // Orders API
  ordersApi: {
    createOrder: async (request: any) => {
      logger.info('Calling Square orders API via HTTPS');
      
      const options = {
        hostname: apiHost,
        path: '/v2/orders',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      
      const data = await httpsRequest(options, request);
      return { result: data };
    }
  },

  // Payments API
  paymentsApi: {
    createPayment: async (request: any) => {
      logger.info('Calling Square payments API via HTTPS');
      
      const options = {
        hostname: apiHost,
        path: '/v2/payments',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      
      const data = await httpsRequest(options, request);
      return { result: data };
    }
  }
};

// Log available Square client information
logger.info('Direct Square client initialized with HTTPS');
logger.info('Square client domain:', apiHost);
logger.info('Square client properties:', Object.keys(squareClient));

// Export the Square client
export { squareClient };
export const client = squareClient;
export const { locationsApi, catalogApi, ordersApi, paymentsApi } = squareClient;