// src/lib/square/index.ts
// This file bridges between ESM and CommonJS for Square SDK

import { logger } from '@/utils/logger';
import { config } from '../config';

let squareClient: any;
let initializationPromise: Promise<any> | null = null;

/**
 * Initialize Square client with proper async handling
 * This avoids top-level await which causes build issues
 */
async function initializeSquareClient(): Promise<any> {
  // Skip initialization during build time
  if (config.app.isBuildTime) {
    logger.warn('Square client - Skipping initialization during build time');
    return null;
  }

  if (squareClient) {
    return squareClient;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      logger.info('Initializing Square client via adapter...');

      // Use a dynamic import to handle the CommonJS adapter
      // @ts-ignore - Using dynamic import for CommonJS module
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const adapter = require('./client-adapter.js');

      squareClient = adapter.squareClient;

      logger.info('Square client initialized via adapter');
      logger.info('Square client properties:', {
        hasLocationsApi: !!squareClient.locationsApi,
        hasCatalogApi: !!squareClient.catalogApi,
        properties: Object.keys(squareClient),
      });

      return squareClient;
    } catch (error) {
      logger.error('Failed to initialize Square client:', error);
      initializationPromise = null; // Reset to allow retry
      throw new Error('Failed to initialize Square client. Check server logs for details.');
    }
  })();

  return initializationPromise;
}

/**
 * Get the Square client instance
 * This function handles lazy initialization
 */
export async function getSquareClient(): Promise<any> {
  if (config.app.isBuildTime) {
    return null;
  }
  
  return await initializeSquareClient();
}

/**
 * Legacy export for backward compatibility
 * Note: This will be null during build time
 */
export { squareClient };
