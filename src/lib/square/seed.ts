// src/lib/square/seed.ts

import { squareClient } from './client';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid'; // Make sure to install this package: npm install uuid

export async function createTestProducts() {
  try {
    logger.info('Creating test products in Square Sandbox');
    
    // Log available properties/methods to help with debugging
    logger.info('Square client properties:', Object.keys(squareClient));
    
    if (squareClient.catalogApi) {
      logger.info('Catalog methods:', [
        'listCatalog',
        'listAllCatalogItems',
        'searchCatalogObjects',
        'retrieveCatalogObject',
        'upsertCatalogObject'
      ].filter(method => typeof squareClient.catalogApi[method as keyof typeof squareClient.catalogApi] === 'function'));
    } else {
      logger.warn('No catalogApi property found on Square client');
    }
    
    // Create a unique idempotency key to avoid duplicate items
    const idempotencyKey = uuidv4();
    
    // Get the catalog API
    const catalogApi = squareClient.catalogApi;
    
    if (!catalogApi) {
      throw new Error('Square catalog API not available');
    }
    
    // Create test product using upsertCatalogObject (we know this exists)
    const response = await catalogApi.upsertCatalogObject({
      idempotencyKey,
      object: {
        type: 'ITEM',
        id: '#test-product',
        presentAtAllLocations: true,
        itemData: {
          name: 'Test Product',
          description: 'This is a test product created for development',
          variations: [
            {
              type: 'ITEM_VARIATION',
              id: '#test-product-variation',
              presentAtAllLocations: true,
              itemVariationData: {
                name: 'Regular',
                pricingType: 'FIXED_PRICING',
                priceMoney: {
                  amount: 1500, // $15.00
                  currency: 'USD'
                },
                inventoryAlertType: 'NONE'
              }
            }
          ]
        }
      }
    });
    
    logger.info('Created test product response:', response);
    
    return response;
  } catch (error) {
    logger.error('Error creating test product:', error);
    throw error;
  }
}