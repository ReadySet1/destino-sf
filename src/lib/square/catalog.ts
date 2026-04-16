// src/lib/square/catalog.ts

import { logger } from '@/utils/logger';
import { squareClient } from './client';

interface CatalogResponse {
  result: {
    objects: Array<{
      id: string;
      type: string;
      category_data?: {
        name: string;
        description?: string;
      };
      item_data?: {
        name: string;
        description?: string;
        category_id?: string;
        variations?: Array<{
          id: string;
          type: string;
          item_variation_data?: {
            name?: string;
            price_money?: {
              amount: bigint;
            };
          };
        }>;
      };
    }>;
    cursor?: string;
  };
}

/**
 * Fetches all catalog items from Square
 * @returns Array of catalog objects
 */
export async function fetchCatalogItems() {
  try {
    // Debug log the client to help diagnose issues
    logger.info('Square client in catalog.ts:', {
      hasClient: !!squareClient,
      hasCatalogApi: !!squareClient.catalogApi,
      clientKeys: Object.keys(squareClient),
    });

    if (!squareClient.catalogApi?.listCatalog) {
      throw new Error('Square catalog API not available');
    }
    const { result } = await squareClient.catalogApi.listCatalog(undefined, 'ITEM');
    return result.objects || [];
  } catch (error) {
    logger.error('Error fetching catalog items from Square:', error);
    throw error;
  }
}

// `createSquareProduct` was a stub that returned mock IDs and never actually called Square.
// It has been removed — use `createSquareItem` from `@/lib/square/catalog-write` instead,
// or enqueue a CREATE job via `enqueueSquareWrite` from `@/lib/square/write-queue` so
// the admin create flow routes through the durable queue with retries and echo suppression.
