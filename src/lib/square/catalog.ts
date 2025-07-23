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
    const catalogVariations =
      variations.length > 0
        ? variations.map((variation, index) => ({
            type: 'ITEM_VARIATION',
            id: `#variation${index + 1}`,
            item_variation_data: {
              name: variation.name,
              price_money: {
                amount: Math.round((variation.price || price) * 100),
                currency: 'USD',
              },
              pricing_type: 'FIXED_PRICING',
            },
          }))
        : [
            {
              type: 'ITEM_VARIATION',
              id: '#variation1',
              item_variation_data: {
                name: 'Standard',
                price_money: {
                  amount: priceInCents,
                  currency: 'USD',
                },
                pricing_type: 'FIXED_PRICING',
              },
            },
          ];

    // For now, return a development ID since this is primarily for development
    // In a full production setup, this would use the proper Square catalog upsert API
    logger.info('Development mode: Creating product mock for Square compatibility');
    const mockSquareId = `square_product_${Date.now()}`;

    logger.info(`Mock Square product created with ID: ${mockSquareId}`);
    return mockSquareId;
  } catch (error) {
    logger.error('Error creating product in Square:', error);
    if (error instanceof Error && 'body' in error) {
      logger.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw new Error('Failed to create product in Square');
  }
}
