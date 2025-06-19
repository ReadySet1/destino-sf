// src/lib/square/client.ts

import { logger } from '../../utils/logger';
import * as Square from 'square';
import { directCatalogApi } from './catalog-api';
import { directLaborApi } from './labor-api';
import { directPaymentsApi } from './payments-api';
import type { SquareClient } from '../../types/square';

// Define operation types for different Square API usage
export type SquareOperationType = 'catalog' | 'transactions' | 'default';

export interface SquareConfig {
  catalogEnvironment: 'sandbox' | 'production';
  transactionEnvironment: 'sandbox' | 'production';
  tokens: {
    catalogToken?: string;
    transactionToken?: string;
    catalogTokenSource?: string;
    transactionTokenSource?: string;
  };
}

/**
 * Singleton class to manage Square API client instances
 * Supports hybrid approach: production catalog + sandbox transactions
 */
class SquareClientSingleton {
  private static catalogClient: any = null;
  private static transactionClient: any = null;
  private static config: SquareConfig | null = null;

  static getConfig(): SquareConfig {
    if (!this.config) {
      this.initializeConfig();
    }
    return this.config!;
  }

  private static initializeConfig(): void {
    // Check for hybrid configuration
    const forceCatalogProduction = process.env.SQUARE_CATALOG_USE_PRODUCTION === 'true';
    const forceTransactionSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';
    const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';

    // Determine catalog environment
    let catalogEnvironment: 'sandbox' | 'production';
    let catalogToken: string | undefined;
    let catalogTokenSource: string;

    if (forceCatalogProduction || (!useSandbox && !forceTransactionSandbox)) {
      // Use production for catalog
      catalogEnvironment = 'production';
      catalogToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
      catalogTokenSource = process.env.SQUARE_PRODUCTION_TOKEN ? 'SQUARE_PRODUCTION_TOKEN' : 'SQUARE_ACCESS_TOKEN';
    } else {
      // Use sandbox for catalog
      catalogEnvironment = 'sandbox';
      catalogToken = process.env.SQUARE_SANDBOX_TOKEN;
      catalogTokenSource = 'SQUARE_SANDBOX_TOKEN';
    }

    // Determine transaction environment
    let transactionEnvironment: 'sandbox' | 'production';
    let transactionToken: string | undefined;
    let transactionTokenSource: string;

    if (forceTransactionSandbox || useSandbox) {
      // Use sandbox for transactions
      transactionEnvironment = 'sandbox';
      transactionToken = process.env.SQUARE_SANDBOX_TOKEN;
      transactionTokenSource = 'SQUARE_SANDBOX_TOKEN';
    } else {
      // Use production for transactions
      transactionEnvironment = 'production';
      transactionToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
      transactionTokenSource = process.env.SQUARE_PRODUCTION_TOKEN ? 'SQUARE_PRODUCTION_TOKEN' : 'SQUARE_ACCESS_TOKEN';
    }

    this.config = {
      catalogEnvironment,
      transactionEnvironment,
      tokens: {
        catalogToken,
        transactionToken,
        catalogTokenSource,
        transactionTokenSource
      }
    };

    logger.info('Square configuration initialized:', {
      catalogEnvironment,
      transactionEnvironment,
      catalogTokenSource,
      transactionTokenSource,
      hasCatalogToken: !!catalogToken,
      hasTransactionToken: !!transactionToken
    });
  }

  static getInstance(operationType: SquareOperationType = 'default'): any {
    // If we're in a build context, return null
    if (typeof process !== 'undefined' && 
        process.env.NODE_ENV === 'production' && 
        process.env.NEXT_PHASE === 'phase-production-build') {
      logger.warn('Attempted to initialize Square client during build phase - deferring initialization');
      return null;
    }

    const config = this.getConfig();

    // Determine which client to use based on operation type
    let targetClient: any;
    let environment: 'sandbox' | 'production';
    let token: string | undefined;
    let tokenSource: string;

    if (operationType === 'catalog') {
      if (!this.catalogClient) {
        environment = config.catalogEnvironment;
        token = config.tokens.catalogToken;
        tokenSource = config.tokens.catalogTokenSource || 'unknown';
        this.catalogClient = this.createClient(environment, token, tokenSource, 'catalog');
      }
      targetClient = this.catalogClient;
    } else if (operationType === 'transactions') {
      if (!this.transactionClient) {
        environment = config.transactionEnvironment;
        token = config.tokens.transactionToken;
        tokenSource = config.tokens.transactionTokenSource || 'unknown';
        this.transactionClient = this.createClient(environment, token, tokenSource, 'transactions');
      }
      targetClient = this.transactionClient;
    } else {
      // Default behavior: use catalog client
      if (!this.catalogClient) {
        environment = config.catalogEnvironment;
        token = config.tokens.catalogToken;
        tokenSource = config.tokens.catalogTokenSource || 'unknown';
        this.catalogClient = this.createClient(environment, token, tokenSource, 'default');
      }
      targetClient = this.catalogClient;
    }

    return targetClient;
  }

  private static createClient(environment: 'sandbox' | 'production', token: string | undefined, tokenSource: string, clientType: string): any {
    if (!token) {
      const error = `Square access token not configured for ${tokenSource} (${clientType} client).`;
      logger.error(error);
      logger.error('Available tokens:', {
        SQUARE_SANDBOX_TOKEN: !!process.env.SQUARE_SANDBOX_TOKEN,
        SQUARE_PRODUCTION_TOKEN: !!process.env.SQUARE_PRODUCTION_TOKEN,
        SQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN,
      });
      throw new Error(error);
    }

    const apiHost = environment === 'sandbox' ? 'connect.squareupsandbox.com' : 'connect.squareup.com';
    
    logger.info(`Initializing Square ${clientType} client`);
    logger.info(`Using Square API at ${apiHost} with ${tokenSource}`);

    try {
      const client = new Square.SquareClient({
        token: token,
        environment: environment
      });
      
      if (!client) {
        throw new Error("Square client initialization failed");
      }

      // Always use our direct catalog API implementation for reliability
      logger.info("Adding direct catalog API implementation to Square client");
      (client as any).catalogApi = directCatalogApi;

      // Always use our direct implementations for consistency
      logger.info("Adding direct labor API implementation to Square client");
      (client as any).laborApi = directLaborApi;

      logger.info("Adding direct payments API implementation to Square client");
      (client as any).paymentsApi = directPaymentsApi;

      // Check for locations API
      if (client.locations) {
        (client as any).locationsApi = client.locations;
        logger.info("Square locations API initialized");
      } else {
        logger.warn("Square locations API not available");
      }

      logger.info(`Square ${clientType} client initialized successfully`);
      return client;

    } catch (error) {
      logger.error(`Error initializing Square ${clientType} client:`, error);
      
      // Check if this might be a token expiration issue
      if (error instanceof Error && error.message.includes('401')) {
        logger.error(`Authentication failed - ${tokenSource} token may be expired or invalid`);
        logger.error('Please check and update your Square API tokens in your environment configuration');
      }
      
      throw new Error(`Failed to initialize Square ${clientType} client: ${error}`);
    }
  }

  static reset(): void {
    logger.info('Resetting Square client singleton instances');
    this.catalogClient = null;
    this.transactionClient = null;
    this.config = null;
  }

  static async testTokens(): Promise<{ catalog: boolean; transactions: boolean; errors: string[] }> {
    const errors: string[] = [];
    let catalogValid = false;
    let transactionsValid = false;

    try {
      const catalogClient = this.getInstance('catalog');
      if (catalogClient?.catalogApi?.testConnection) {
        await catalogClient.catalogApi.testConnection();
        catalogValid = true;
        logger.info('Catalog token test: PASSED');
      }
    } catch (error) {
      const message = `Catalog token test: FAILED - ${error}`;
      logger.error(message);
      errors.push(message);
    }

    try {
      const transactionClient = this.getInstance('transactions');
      if (transactionClient?.paymentsApi?.testConnection) {
        await transactionClient.paymentsApi.testConnection();
        transactionsValid = true;
        logger.info('Transaction token test: PASSED');
      }
    } catch (error) {
      const message = `Transaction token test: FAILED - ${error}`;
      logger.error(message);
      errors.push(message);
    }

    return { catalog: catalogValid, transactions: transactionsValid, errors };
  }
}

// Export getter functions for different operation types
export const getSquareClient = (operationType: SquareOperationType = 'default') => 
  SquareClientSingleton.getInstance(operationType);

export const getCatalogClient = () => SquareClientSingleton.getInstance('catalog');
export const getTransactionClient = () => SquareClientSingleton.getInstance('transactions');

// For backwards compatibility
export const squareClient = new Proxy({} as SquareClient, {
  get(target, prop) {
    const client = SquareClientSingleton.getInstance();
    return client ? client[prop] : undefined;
  }
});

export const client = squareClient;

// API endpoint getters that use appropriate client types
export const catalogApi = new Proxy({}, {
  get(target, prop) {
    const client = getCatalogClient();
    return client?.catalogApi ? client.catalogApi[prop] : undefined;
  }
});

export const ordersApi = new Proxy({}, {
  get(target, prop) {
    const client = getTransactionClient();
    return client?.ordersApi ? client.ordersApi[prop] : undefined;
  }
});

export const paymentsApi = new Proxy({}, {
  get(target, prop) {
    const client = getTransactionClient();
    return client?.paymentsApi ? client.paymentsApi[prop] : undefined;
  }
});

export const laborApi = new Proxy({}, {
  get(target, prop) {
    const client = SquareClientSingleton.getInstance();
    return client?.laborApi ? client.laborApi[prop] : undefined;
  }
});

// Export utility functions
export const resetSquareClient = () => SquareClientSingleton.reset();
export const testSquareTokens = () => SquareClientSingleton.testTokens();
export const getSquareConfig = () => SquareClientSingleton.getConfig();