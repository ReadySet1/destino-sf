// src/lib/square/seed.ts

import { squareClient } from './client';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid'; // Make sure to install this package: npm install uuid

export async function createTestProducts() {
  try {
    logger.info('Creating test products in Square Sandbox');
    
    // Log available properties/methods to help with debugging
    logger.info('Square client properties:', Object.keys(squareClient));
    
    if (squareClient.catalog) {
      logger.info('Catalog methods:', 
        Object.keys(squareClient.catalog).filter(key => typeof squareClient.catalog[key] === 'function')
      );
    } else {
      logger.warn('No catalog property found on Square client');
    }
    
    // Create a unique idempotency key to avoid duplicate items
    const idempotencyKey = uuidv4();
    
    // Determine the correct method to use
    const catalogApi = squareClient.catalog;
    
    if (!catalogApi) {
      throw new Error('Square catalog API not available');
    }
    
    // Create test product
    // Try to find the right method to use
    let response;
    
    if (typeof catalogApi.upsertCatalogObject === 'function') {
      response = await catalogApi.upsertCatalogObject({
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
    } else if (typeof catalogApi.createCatalogObject === 'function') {
      response = await catalogApi.createCatalogObject({
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
    } else {
      throw new Error('No suitable catalog API method found for creating items. Available methods: ' + 
        Object.keys(catalogApi).filter(key => typeof catalogApi[key] === 'function').join(', '));
    }
    
    logger.info('Created test product response:', response);
    
    return response;
  } catch (error) {
    logger.error('Error creating test product:', error);
    throw error;
  }
}