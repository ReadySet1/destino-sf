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
  console.log("Fetching catalog items and categories from Square...");
  try {
    const initialResponse = (await squareClient.catalog.list({
      types: 'ITEM,CATEGORY'
    })) as unknown as CatalogResponse;

    if (!initialResponse?.result?.objects || !Array.isArray(initialResponse.result.objects)) {
      console.error("Initial Square API response is not in the expected format:", initialResponse);
      throw new Error('Received invalid response structure from Square catalog API.');
    }

    let allObjects = [...initialResponse.result.objects];
    console.log(`Workspaceed initial page with ${initialResponse.result.objects.length} objects.`);

    let cursor = initialResponse.result.cursor;
    while (cursor) {
      console.log("Fetching next page of catalog objects...");
      const nextResponse = (await squareClient.catalog.list({
        types: 'ITEM,CATEGORY',
        cursor
      })) as unknown as CatalogResponse;

      if (!nextResponse?.result?.objects) {
        break;
      }

      allObjects = [...allObjects, ...nextResponse.result.objects];
      cursor = nextResponse.result.cursor;
      console.log(`Workspaceed page with ${nextResponse.result.objects.length} objects. Total fetched: ${allObjects.length}`);
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