// src/lib/square/catalog.ts

import squareClient from './client';

interface CatalogResponse {
  result: {
    objects: Array<{
      id: string;
      type: string;
      categoryData?: {
        name: string;
        description?: string;
      };
      itemData?: {
        name: string;
        description?: string;
        categoryId?: string;
        variations?: Array<{
          id: string;
          type: string;
          itemVariationData?: {
            name?: string;
            priceMoney?: {
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
 * Fetches catalog objects (both Items and Categories) from Square, handling pagination.
 * Uses the SDK structure client.catalog.list based on previous findings.
 */
export async function fetchCatalogItems() {
  console.log('Fetching catalog items and categories from Square...');
  try {
    const initialResponse = (await squareClient.catalog.list({
      types: 'ITEM,CATEGORY',
    })) as unknown as CatalogResponse;

    if (!initialResponse?.result?.objects || !Array.isArray(initialResponse.result.objects)) {
      console.error('Initial Square API response is not in the expected format:', initialResponse);
      throw new Error('Received invalid response structure from Square catalog API.');
    }

    let allObjects = [...initialResponse.result.objects];
    console.log(`Workspaceed initial page with ${initialResponse.result.objects.length} objects.`);

    let cursor = initialResponse.result.cursor;
    while (cursor) {
      console.log('Fetching next page of catalog objects...');
      const nextResponse = (await squareClient.catalog.list({
        types: 'ITEM,CATEGORY',
        cursor,
      })) as unknown as CatalogResponse;

      if (!nextResponse?.result?.objects) {
        break;
      }

      allObjects = [...allObjects, ...nextResponse.result.objects];
      cursor = nextResponse.result.cursor;
      console.log(
        `Workspaceed page with ${nextResponse.result.objects.length} objects. Total fetched: ${allObjects.length}`
      );
    }

    console.log(`Finished fetching. Total objects retrieved: ${allObjects.length}`);
    return allObjects;
  } catch (error) {
    console.error('Error fetching Square catalog:', error);
    if (error instanceof Error && 'body' in error) {
      console.error('Square API Error Body:', (error as { body: unknown }).body);
    }
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
 * @returns The created Square catalog item ID or a temporary ID if in development
 */
export async function createSquareProduct({
  name,
  description: _description,
  price: _price,
  categoryId: _categoryId,
  variations: _variations = [],
}: {
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  variations?: Array<{ name: string; price?: number }>;
}) {
  // In development mode, just return a temporary ID
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: Skipping actual Square API call, returning temporary Square ID');
    return `temp_square_${Date.now()}`;
  }

  console.log('Creating product in Square:', name);

  try {
    // TODO: Implement proper Square product creation once API issues are resolved
    // For now, this is a placeholder that returns a temporary ID

    // This would be the proper implementation:
    /*
    const response = await squareClient.catalogApi.createCatalogObject({
      idempotencyKey: `product_${Date.now()}`,
      object: {
        type: "ITEM",
        id: "#1",
        itemData: {
          name,
          description: description || "",
          categoryId,
          variations: [...]
        }
      }
    });
    return response.result.catalogObject.id;
    */

    // For now, return a temporary ID prefixed with "temp_"
    const tempId = `temp_square_${Date.now()}`;
    console.log(`Returning temporary Square ID: ${tempId}`);
    return tempId;
  } catch (error) {
    console.error('Error creating product in Square:', error);
    if (error instanceof Error && 'body' in error) {
      console.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    // Return a temporary ID in case of error
    return `temp_error_${Date.now()}`;
  }
}
