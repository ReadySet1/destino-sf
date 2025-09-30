import { NextRequest, NextResponse } from 'next/server';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

// Define interfaces for Square catalog objects
interface SquareCatalogObject {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    [key: string]: any;
  };
  image_data?: {
    url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // Get the search query from query parameters
    const query = request.nextUrl.searchParams.get('q');
    const exact = request.nextUrl.searchParams.get('exact') === 'true';

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter (q)' }, { status: 400 });
    }

    logger.info(`Searching Square catalog for products matching: "${query}" (exact: ${exact})`);

    // Prepare the search request
    let searchRequest;

    if (exact) {
      // Exact match search
      searchRequest = {
        object_types: ['ITEM'],
        query: {
          exact_query: {
            attribute_name: 'name',
            attribute_value: query,
          },
        },
        include_related_objects: true,
      };
    } else {
      // Prefix search (starts with)
      searchRequest = {
        object_types: ['ITEM'],
        query: {
          prefix_query: {
            attribute_name: 'name',
            attribute_prefix: query,
          },
        },
        include_related_objects: true,
      };
    }

    // Execute the search request
    if (!squareClient.catalogApi) {
      return NextResponse.json(
        {
          error: 'Square catalog API not available',
        },
        { status: 500 }
      );
    }

    const searchResponse = await squareClient.catalogApi.searchCatalogObjects(searchRequest as any);

    // Extract items and related objects from the response
    const items = (searchResponse.result?.objects || []) as SquareCatalogObject[];
    const relatedObjects = (searchResponse.result?.related_objects || []) as SquareCatalogObject[];

    logger.info(`Found ${items.length} matching items in Square catalog`);

    // Process the results to include image URLs
    const processedItems = await Promise.all(
      items.map(async item => {
        const imageIds = item.item_data?.image_ids || [];
        const imageUrls: string[] = [];

        // Extract image URLs from related objects
        for (const imageId of imageIds) {
          const imageObject = relatedObjects.find(
            obj => obj.id === imageId && obj.type === 'IMAGE'
          );

          if (imageObject && imageObject.image_data?.url) {
            const imageUrl = imageObject.image_data.url;
            imageUrls.push(imageUrl);
          } else {
            try {
              // Try to fetch the image directly if not found in related objects
              if (!squareClient.catalogApi) {
                logger.error(`Square catalog API not available for image ${imageId}`);
                continue;
              }

              const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
              const imageData = imageResponse.result?.object;

              if (imageData && (imageData as any).image_data?.url) {
                imageUrls.push((imageData as any).image_data.url);
              }
            } catch (error) {
              logger.error(`Error retrieving image ${imageId}:`, error);
            }
          }
        }

        // Return a simplified object with only the data we need
        return {
          id: item.id,
          name: item.item_data?.name || 'Unnamed Product',
          description: item.item_data?.description || '',
          imageIds,
          imageUrls,
        };
      })
    );

    // Sort results by name for easier viewing
    processedItems.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      query,
      exact,
      count: processedItems.length,
      items: processedItems,
    });
  } catch (error) {
    logger.error('Error searching Square catalog:', error);
    return NextResponse.json(
      {
        error: 'Failed to search Square catalog',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST method to support form submissions
export const POST = GET;
