#!/usr/bin/env ts-node

import { directCatalogApi } from '../lib/square/catalog-api';
import { logger } from '../utils/logger';

/**
 * Script to test Square API connectivity for both production and sandbox environments
 * Run with: npm run script -- src/scripts/test-square-connection.ts
 */
async function testSquareConnections(): Promise<void> {
  logger.info('Starting Square API connection test...');

  // First check current environment settings
  const originalSandboxSetting = process.env.USE_SQUARE_SANDBOX;

  try {
    // Test production environment
    process.env.USE_SQUARE_SANDBOX = 'false';
    logger.info('TESTING PRODUCTION ENVIRONMENT:');

    const productionResult = await directCatalogApi.testConnection();

    if (productionResult.success) {
      logger.info('✅ Production connection successful');
    } else {
      logger.error('❌ Production connection failed:', productionResult.error);
    }

    // Test sandbox environment
    process.env.USE_SQUARE_SANDBOX = 'true';
    logger.info('\nTESTING SANDBOX ENVIRONMENT:');

    const sandboxResult = await directCatalogApi.testConnection();

    if (sandboxResult.success) {
      logger.info('✅ Sandbox connection successful');
    } else {
      logger.error('❌ Sandbox connection failed:', sandboxResult.error);
    }

    // Output token info
    logger.info('\nToken Configuration:');
    logger.info('- SQUARE_PRODUCTION_TOKEN:', !!process.env.SQUARE_PRODUCTION_TOKEN);
    logger.info('- SQUARE_ACCESS_TOKEN:', !!process.env.SQUARE_ACCESS_TOKEN);
    logger.info('- SQUARE_SANDBOX_TOKEN:', !!process.env.SQUARE_SANDBOX_TOKEN);
  } catch (error) {
    logger.error('Error during test:', error);
  } finally {
    // Restore original setting
    process.env.USE_SQUARE_SANDBOX = originalSandboxSetting;
  }
}

// Run the test function
testSquareConnections()
  .then(() => {
    logger.info('Test script completed');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Unhandled error in test script:', error);
    process.exit(1);
  });
