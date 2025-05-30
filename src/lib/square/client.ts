// src/lib/square/client.ts

import { logger } from '../../utils/logger';
import * as Square from 'square';
import { directCatalogApi } from './catalog-api';

/**
 * Singleton class to manage Square API client instance
 * This prevents multiple initializations during build time
 */
class SquareClientSingleton {
  private static instance: any = null;
  private static config: {
    environment: 'sandbox' | 'production';
    apiHost: string;
    tokenSource: string;
    hasToken: boolean;
  } | null = null;

  static getInstance(): any {
    // If we're in a build context and not explicitly requiring the client, return null
    if (typeof process !== 'undefined' && 
        process.env.NODE_ENV === 'production' && 
        process.env.NEXT_PHASE === 'phase-production-build') {
      logger.warn('Attempted to initialize Square client during build phase - deferring initialization');
      return null;
    }

    if (!this.instance) {
      logger.info('Initializing Square client singleton instance');
      
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

      // Save configuration
      this.config = {
        environment: useSandbox ? 'sandbox' : 'production',
        apiHost,
        tokenSource,
        hasToken: !!accessToken
      };

      logger.info(`Using Square API at ${apiHost} in ${useSandbox ? 'SANDBOX' : process.env.NODE_ENV} mode`);

      try {
        // Initialize using the SDK's preferred format
        this.instance = new Square.SquareClient({
          // Use 'token' not 'accessToken' as it seems that's what our SDK version expects
          token: accessToken,
          environment: useSandbox ? 'sandbox' : 'production'
        });
        
        // Validate client was created properly
        if (!this.instance) {
          throw new Error("Square client initialization failed");
        }
      } catch (error) {
        logger.error("Error initializing Square client:", error);
        throw new Error("Failed to initialize Square client");
      }

      // Inject our direct API implementations if SDK properties are missing
      if (!this.instance.catalogApi) {
        logger.info("Adding direct catalog API implementation to Square client");
        this.instance.catalogApi = directCatalogApi;
      }

      // Check for locations API
      if (!this.instance.locationsApi || !this.instance.locationsApi.listLocations) {
        logger.warn("Square locations API not available or listLocations method not found");
        // If needed, could add implementation here similar to catalogApi
      }

      logger.info("Square client initialized with:", {
        hasDirectCatalogApi: !!this.instance.catalogApi,
        hasLocationsApi: !!this.instance.locationsApi,
        squareClientKeys: Object.keys(this.instance)
      });
    }

    return this.instance;
  }

  static reset(): void {
    logger.info('Resetting Square client singleton instance');
    this.instance = null;
    this.config = null;
  }

  static getConfig() {
    return this.config;
  }
}

// Export getter function for the singleton instance
export const getSquareClient = () => SquareClientSingleton.getInstance();

// For backwards compatibility, maintain the previous export pattern but make them lazy
export const squareClient = new Proxy({}, {
  get(target, prop) {
    const client = SquareClientSingleton.getInstance();
    return client ? client[prop] : undefined;
  }
});

export const client = squareClient;

// Lazy getters for API endpoints
export const ordersApi = new Proxy({}, {
  get(target, prop) {
    const client = SquareClientSingleton.getInstance();
    return client?.ordersApi ? client.ordersApi[prop] : undefined;
  }
});

export const paymentsApi = new Proxy({}, {
  get(target, prop) {
    const client = SquareClientSingleton.getInstance();
    return client?.paymentsApi ? client.paymentsApi[prop] : undefined;
  }
});

// Export reset function for testing purposes
export const resetSquareClient = () => SquareClientSingleton.reset();