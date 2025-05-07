// src/lib/square/client.ts

import { logger } from '../../utils/logger';
import https from 'https';

// Get access token from environment
const accessToken = process.env.SQUARE_ACCESS_TOKEN;

if (!accessToken) {
  logger.error("Square access token is not configured in environment variables.");
  throw new Error("Missing Square Access Token");
}

// Determine the API host based on environment
const apiHost = process.env.NODE_ENV === 'production'
  ? 'connect.squareup.com'
  : 'connect.squareupsandbox.com';

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

// Define the Square client with the necessary API services
const squareClient = {
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
    searchCatalogObjects: async (request: any) => {
      logger.info('Calling Square catalog API via HTTPS');
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
    
    listCatalog: async (options?: any, types?: string) => {
      logger.info('Calling Square catalog list API via HTTPS');
      let path = '/v2/catalog/list';
      if (types) {
        path += `?types=${types}`;
      }
      
      const requestOptions = {
        hostname: apiHost,
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2023-12-13',
          'Content-Type': 'application/json'
        }
      };
      const data = await httpsRequest(requestOptions);
      return { result: data };
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
    
    retrieveCatalogObject: async (objectId: string) => {
      logger.info(`Calling Square catalog retrieve API for object ${objectId}`);
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
      const data = await httpsRequest(options);
      return { result: data };
    }
  },
  
  // Orders API
  ordersApi: {
    retrieveOrder: async (orderId: string) => {
      logger.info(`Retrieving order ${orderId}`);
      const options = {
        hostname: apiHost,
        path: `/v2/orders/${orderId}`,
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
    
    searchOrders: async (request: any) => {
      logger.info('Searching orders');
      const options = {
        hostname: apiHost,
        path: '/v2/orders/search',
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
    
    createOrder: async (request: any) => {
      logger.info('Creating order');
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
    listPayments: async (params: any = {}) => {
      logger.info('Listing payments');
      let queryParams = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
      
      const path = `/v2/payments${queryParams ? `?${queryParams}` : ''}`;
      
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
    
    retrievePayment: async (paymentId: string) => {
      logger.info(`Retrieving payment ${paymentId}`);
      const options = {
        hostname: apiHost,
        path: `/v2/payments/${paymentId}`,
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
    
    getPayment: async (paymentId: string) => {
      logger.info(`Getting payment ${paymentId} (alias for retrievePayment)`);
      return squareClient.paymentsApi.retrievePayment(paymentId);
    },
    
    createPayment: async (request: any) => {
      logger.info('Creating payment');
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