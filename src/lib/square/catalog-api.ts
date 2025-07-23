import { logger } from '@/utils/logger';
import https from 'https';

// Configuration interface for consistency
interface SquareConfig {
  useSandbox: boolean;
  accessToken: string;
  apiHost: string;
  tokenSource: string;
}

/**
 * Sanitizes a Square API token by removing whitespace and invalid characters
 */
function sanitizeToken(token: string): string {
  if (!token) return '';

  // Remove any whitespace, newlines, or invisible characters
  return token.trim().replace(/[\r\n\t\s]/g, '');
}

/**
 * Validates that a token has the correct format for Square API
 */
function validateToken(token: string): boolean {
  if (!token) return false;

  // Square tokens should be alphanumeric with hyphens and underscores
  const tokenPattern = /^[A-Za-z0-9_-]+$/;
  return tokenPattern.test(token);
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
    tokenSource = process.env.SQUARE_PRODUCTION_TOKEN
      ? 'SQUARE_PRODUCTION_TOKEN'
      : 'SQUARE_ACCESS_TOKEN';
  } else {
    // Use sandbox for catalog
    catalogEnvironment = 'sandbox';
    accessToken = process.env.SQUARE_SANDBOX_TOKEN;
    tokenSource = 'SQUARE_SANDBOX_TOKEN';
  }

  // Validate and sanitize the token
  if (accessToken) {
    const sanitizedToken = sanitizeToken(accessToken);

    if (!validateToken(sanitizedToken)) {
      logger.error(`Invalid token format from ${tokenSource}. Token length: ${accessToken.length}`);
      logger.error(`Token preview: ${accessToken.substring(0, 10)}...`);
      throw new Error(
        `Invalid Square token format from ${tokenSource}. Please check your environment variables.`
      );
    }

    accessToken = sanitizedToken;

    // Log token validation success (without exposing the token)
    logger.info(`Square token validated successfully from ${tokenSource}`);
  }

  const apiHost =
    catalogEnvironment === 'sandbox' ? 'connect.squareupsandbox.com' : 'connect.squareup.com';

  return {
    useSandbox: catalogEnvironment === 'sandbox',
    accessToken: accessToken || '',
    apiHost,
    tokenSource,
  };
}

// Initialize config as null - will be loaded on first use
let squareConfig: SquareConfig | null = null;

// Function to ensure config is loaded
function ensureConfig(): SquareConfig {
  if (!squareConfig) {
    squareConfig = getSquareConfig();

    // Log the token configuration when first loaded
    logger.info('Square API configuration:', {
      environment: squareConfig.useSandbox ? 'sandbox' : 'production',
      apiHost: squareConfig.apiHost,
      tokenSource: squareConfig.tokenSource,
      hasToken: !!squareConfig.accessToken,
    });
  }
  return squareConfig;
}

/**
 * Makes an HTTPS request to the Square API
 */
async function httpsRequest(options: any, requestBody?: any): Promise<any> {
  // Ensure config is loaded and get fresh config
  const config = ensureConfig();

  // Ensure we have a token
  if (!config.accessToken) {
    throw new Error(`Square access token not configured for ${config.tokenSource}`);
  }

  // Additional token validation before making the request
  const sanitizedToken = sanitizeToken(config.accessToken);
  if (!validateToken(sanitizedToken)) {
    throw new Error(
      `Invalid token format detected in ${config.tokenSource}. Please regenerate your Square API token.`
    );
  }

  // Update Authorization header with sanitized token
  if (options.headers) {
    try {
      options.headers['Authorization'] = `Bearer ${sanitizedToken}`;
    } catch (error) {
      logger.error(
        `Failed to set Authorization header with token from ${config.tokenSource}:`,
        error
      );
      throw new Error(
        `Authorization header error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
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
            logger.error(
              `Authentication error with token from ${config.tokenSource}. Please check your Square API token.`
            );
            logger.error(`Environment: ${config.useSandbox ? 'sandbox' : 'production'}`);
          }
          reject(new Error(`Request failed with status: ${res.statusCode}, body: ${data}`));
        }
      });
    });

    req.on('error', error => {
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
  // Ensure config is loaded
  const config = ensureConfig();

  if (!config.accessToken) {
    throw new Error(`Square access token not configured for ${config.tokenSource}`);
  }

  logger.info(`Retrieving catalog object with ID: ${objectId} from ${config.apiHost}`);

  const options = {
    hostname: config.apiHost,
    path: `/v2/catalog/object/${objectId}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Square-Version': '2024-10-17',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
  };

  try {
    const response = await httpsRequest(options);

    // Format the response to match Square SDK structure
    return {
      result: {
        object: response.object,
        related_objects: response.related_objects || [],
      },
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
  // Ensure config is loaded
  const config = ensureConfig();

  if (!config.accessToken) {
    throw new Error(`Square access token not configured for ${config.tokenSource}`);
  }

  logger.info(
    `Searching catalog objects on ${config.apiHost} using token from ${config.tokenSource} (sandbox: ${config.useSandbox})`
  );

  const options = {
    hostname: config.apiHost,
    path: '/v2/catalog/search',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Square-Version': '2024-10-17',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
  };

  try {
    const response = await httpsRequest(options, requestBody);

    // Format the response to match Square SDK structure
    return {
      result: {
        objects: response.objects || [],
        related_objects: response.related_objects || [],
        cursor: response.cursor,
      },
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
  const config = getSquareConfig();

  if (!config.accessToken) {
    throw new Error(`Square access token not configured for ${config.tokenSource}`);
  }

  logger.info(
    `Listing catalog objects on ${config.apiHost} with objectTypes: ${objectTypes || 'all'}`
  );

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
    hostname: config.apiHost,
    path,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Square-Version': '2024-10-17',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
  };

  try {
    const response = await httpsRequest(options);

    // Format the response to match Square SDK structure
    return {
      result: {
        objects: response.objects || [],
        cursor: response.cursor,
      },
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
  // Refresh config
  const config = getSquareConfig();

  try {
    logger.info(`Testing connection to ${config.apiHost} with token from ${config.tokenSource}`);

    const options = {
      hostname: config.apiHost,
      path: '/v2/catalog/list',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Square-Version': '2024-10-17',
        'Content-Type': 'application/json',
      },
    };

    await httpsRequest(options);

    logger.info(`Connection successful to ${config.apiHost}`);
    return {
      success: true,
      environment: config.useSandbox ? 'sandbox' : 'production',
      apiHost: config.apiHost,
    };
  } catch (error) {
    logger.error(`Connection test failed:`, error);
    return {
      success: false,
      environment: config.useSandbox ? 'sandbox' : 'production',
      apiHost: config.apiHost,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Create a direct catalog API implementation to be used as a fallback
export const directCatalogApi = {
  retrieveCatalogObject,
  searchCatalogObjects,
  listCatalog,
  testConnection: testApiConnection,
};
