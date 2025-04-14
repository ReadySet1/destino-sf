// src/lib/square/index.ts
// This file bridges between ESM and CommonJS for Square SDK

import { logger } from '@/utils/logger';

let squareClient: any;

// Dynamic import of the CommonJS adapter
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
    properties: Object.keys(squareClient)
  });
} catch (error) {
  logger.error('Failed to initialize Square client:', error);
  throw new Error('Failed to initialize Square client. Check server logs for details.');
}

export { squareClient }; 