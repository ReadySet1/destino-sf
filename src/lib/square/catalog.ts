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
      clientKeys: Object.keys(squareClient)
    });
    
    const { result } = await squareClient.catalogApi.listCatalog(undefined, 'ITEM');
    return result.objects || [];
  } catch (error) {
    logger.error('Error fetching catalog items from Square:', error);
    throw error;
  }
}

/**
 * Creates a new product in Square with variants
 * @param name Product name
 * @param description Product description
 * @param price Base price in dollars
 * @param categoryId Square category ID, can be undefined
 * @param variations Array of product variants
 * @returns The created Square catalog item ID
 */
export async function createSquareProduct({
  name,
  description,
  price,
  categoryId,
  variations = [],
}: {
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  variations?: Array<{ name: string; price?: number }>;
}): Promise<string> {
  // In development mode, just return a temporary ID
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Development mode: Skipping actual Square API call, returning temporary Square ID');
    return `temp_square_${Date.now()}`;
  }

  logger.info('Creating product in Square:', name);

  try {
    // Convert dollar amount to cents for Square
    const priceInCents = Math.round(price * 100);

    // Create the base variation if no variations are provided
    const catalogVariations = variations.length > 0 
      ? variations.map((variation, index) => ({
          type: 'ITEM_VARIATION',
          id: `#variation${index + 1}`,
          item_variation_data: {
            name: variation.name,
            price_money: {
              amount: Math.round((variation.price || price) * 100),
              currency: 'USD'
            },
            pricing_type: 'FIXED_PRICING'
          }
        }))
      : [{
          type: 'ITEM_VARIATION',
          id: '#variation1',
          item_variation_data: {
            name: 'Standard',
            price_money: {
              amount: priceInCents,
              currency: 'USD'
            },
            pricing_type: 'FIXED_PRICING'
          }
        }];

    // Create the catalog object with proper snake_case keys
    const response = await squareClient.catalogApi.upsertCatalogObject({
      idempotency_key: `product_${Date.now()}`,
      object: {
        type: 'ITEM',
        id: '#1',
        item_data: {
          name,
          description: description || '',
          category_id: categoryId,
          variations: catalogVariations,
          tax_ids: [], // Add tax IDs if needed
          is_archived: false,
        }
      }
    });

    if (!response.result?.catalog_object?.id) {
      throw new Error('Failed to get catalog object ID from Square response');
    }

    logger.info(`Successfully created product in Square with ID: ${response.result.catalog_object.id}`);
    return response.result.catalog_object.id;
  } catch (error) {
    logger.error('Error creating product in Square:', error);
    if (error instanceof Error && 'body' in error) {
      logger.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw new Error('Failed to create product in Square');
  }
}
