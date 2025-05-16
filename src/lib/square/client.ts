// src/lib/square/client.ts

import { logger } from '../../utils/logger';
import * as Square from 'square';
import { directCatalogApi } from './catalog-api';

// Determine the token to use based on environment variables
const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';

// Select the appropriate token with better fallback logic
let accessToken: string | undefined;
let tokenSource: string;

if (useSandbox) {
  accessToken = process.env.SQUARE_SANDBOX_TOKEN;
  tokenSource = 'SQUARE_SANDBOX_TOKEN';
} else if (process.env.NODE_ENV === 'production') {
  // In production, prioritize SQUARE_PRODUCTION_TOKEN then fall back to SQUARE_ACCESS_TOKEN
  accessToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
  tokenSource = process.env.SQUARE_PRODUCTION_TOKEN ? 'SQUARE_PRODUCTION_TOKEN' : 'SQUARE_ACCESS_TOKEN';
} else {
  // In development (but not sandbox), use SQUARE_ACCESS_TOKEN
  accessToken = process.env.SQUARE_ACCESS_TOKEN;
  tokenSource = 'SQUARE_ACCESS_TOKEN';
}

// Validate token is available
if (!accessToken) {
  logger.error(`Square access token not configured for ${tokenSource}.`);
  logger.error('Available tokens:', {
    SQUARE_SANDBOX_TOKEN: !!process.env.SQUARE_SANDBOX_TOKEN,
    SQUARE_PRODUCTION_TOKEN: !!process.env.SQUARE_PRODUCTION_TOKEN,
    SQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN,
  });
  throw new Error(`Missing Square Access Token for ${tokenSource}`);
}

// Determine the API host based on environment
const apiHost = useSandbox
  ? 'sandbox.squareup.com'
  : 'connect.squareup.com';

logger.info(`Using Square API at ${apiHost} in ${useSandbox ? 'SANDBOX' : process.env.NODE_ENV} mode`);

// Initialize the Square client based on Square SDK v42.1.0
let squareClient: any;

try {
  // Initialize using the SDK's preferred format
  squareClient = new Square.SquareClient({
    // Use 'token' not 'accessToken' as it seems that's what our SDK version expects
    token: accessToken,
    environment: useSandbox ? 'sandbox' : 'production'
  });
  
  // Validate client was created properly
  if (!squareClient) {
    throw new Error("Square client initialization failed");
  }
} catch (error) {
  logger.error("Error initializing Square client:", error);
  throw new Error("Failed to initialize Square client");
}

// Inject our direct API implementations if SDK properties are missing
if (!squareClient.catalogApi) {
  logger.info("Adding direct catalog API implementation to Square client");
  squareClient.catalogApi = directCatalogApi;
}

// Check for locations API
if (!squareClient.locationsApi || !squareClient.locationsApi.listLocations) {
  logger.warn("Square locations API not available or listLocations method not found");
  // If needed, could add implementation here similar to catalogApi
}

logger.info("Square client initialized with:", {
  hasDirectCatalogApi: !!squareClient.catalogApi,
  hasLocationsApi: !!squareClient.locationsApi,
  squareClientKeys: Object.keys(squareClient)
});

// Export the Square client and specific API clients
export const client = squareClient;
export const ordersApi = squareClient.ordersApi;
export const paymentsApi = squareClient.paymentsApi;
export { squareClient };