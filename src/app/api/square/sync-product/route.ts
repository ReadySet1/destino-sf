import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';
import { Decimal } from '@prisma/client/runtime/library';

// Define types for Square objects
interface SquareCatalogObject {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    description?: string | null;
    variations?: SquareCatalogObject[];
    image_ids?: string[];
    [key: string]: any;
  };
  item_variation_data?: {
    name?: string;
    price_money?: {
      amount: number | bigint;
      currency: string;
    };
  };
  image_data?: {
    url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Import the getImageUrls function (extracted from sync.ts)
async function getImageUrls(
  item: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[]
): Promise<string[]> {
  const imageUrls: string[] = [];
  const imageIds = item.item_data?.image_ids || [];

  if (imageIds.length === 0) {
    logger.info(`No image IDs found for item ${item.id}`);
    return imageUrls;
  }

  // First pass: create a filtered list of valid imageIds
  const validImageIds = imageIds.filter((imageId: string) => {
    const exists = relatedObjects.some(obj => obj.id === imageId && obj.type === 'IMAGE');
    if (!exists) {
      logger.warn(`Image ID ${imageId} not found in related objects, may be invalid`);
    }
    return exists;
  });

  // Look for image objects in related_objects
  for (const imageId of validImageIds) {
    try {
      const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');

      if (imageObject && imageObject.image_data && imageObject.image_data.url) {
        const imageUrl = imageObject.image_data.url;
        logger.info(`Found image URL in related objects: ${imageUrl}`);
        if (imageUrl) {
          const cacheBustedUrl = addCacheBustingParam(imageUrl);
          imageUrls.push(cacheBustedUrl);
        }
      } else {
        // Try to retrieve image directly
        try {
          logger.info(`Calling Square catalog retrieve API for object ${imageId}`);
          if (squareClient.catalogApi && squareClient.catalogApi.retrieveCatalogObject) {
            const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
            const imageData = imageResponse.result?.object;

            if (imageData && (imageData as any).image_data && (imageData as any).image_data.url) {
              const imageUrl = (imageData as any).image_data.url;
              logger.info(`Retrieved image URL from API: ${imageUrl}`);
              if (imageUrl) {
                const cacheBustedUrl = addCacheBustingParam(imageUrl);
                imageUrls.push(cacheBustedUrl);
              }
            }
          }
        } catch (imageError) {
          logger.error(`Error retrieving image ${imageId}, skipping:`, imageError);
        }
      }
    } catch (error) {
      // Catch any unexpected errors to ensure we process all images
      logger.error(`Unexpected error processing image ${imageId}:`, error);
    }
  }

  logger.info(`Final image URLs for item ${item.id}: ${JSON.stringify(imageUrls)}`);
  return imageUrls;
}

function addCacheBustingParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

export async function GET(request: NextRequest) {
  try {
    // Get product ID from query param
    const productId = request.nextUrl.searchParams.get('id');
    const squareId = request.nextUrl.searchParams.get('squareId');

    if (!productId && !squareId) {
      return NextResponse.json({ error: 'Missing id or squareId parameter' }, { status: 400 });
    }

    // Find the product in our database
    const product = await prisma.product.findFirst({
      where: productId ? { id: productId } : squareId ? { squareId } : undefined,
      include: {
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    logger.info(`Found product: ${product.name} (${product.id})`);

    // Check if we need to get a Square ID first
    if (!product.squareId) {
      logger.info(`Product ${product.name} has no Square ID, searching for a match...`);

      // Try to find a matching product in Square
      const searchRequest = {
        object_types: ['ITEM'],
        query: {
          exact_query: {
            attribute_name: 'name',
            attribute_value: product.name,
          },
        },
        include_related_objects: true,
      };

      if (!squareClient.catalogApi) {
        return NextResponse.json(
          {
            error: 'Square catalog API not available',
            product,
          },
          { status: 500 }
        );
      }

      const searchResponse = await squareClient.catalogApi.searchCatalogObjects(
        searchRequest as any
      );
      const items = searchResponse.result?.objects || [];

      if (items.length === 0) {
        return NextResponse.json(
          {
            error: 'No matching Square product found',
            product,
          },
          { status: 404 }
        );
      }

      // Use the first result as the best match
      const bestMatch = items[0];
      logger.info(`Found matching Square product: ${bestMatch.item_data?.name} (${bestMatch.id})`);

      // Update product with Square ID
      await prisma.product.update({
        where: { id: product.id },
        data: { squareId: bestMatch.id },
      });

      // Use this Square ID for the rest of the process
      product.squareId = bestMatch.id;
    }

    // Fetch the Square catalog item
    logger.info(`Fetching Square catalog item with ID: ${product.squareId}`);

    // Check if the Square ID is valid before proceeding
    if (!product.squareId) {
      return NextResponse.json(
        {
          error: 'Invalid Square ID',
          product,
        },
        { status: 400 }
      );
    }

    // Call retrieveCatalogObject with just the objectId - the client implementation handles related objects
    if (!squareClient.catalogApi) {
      return NextResponse.json(
        {
          error: 'Square catalog API not available',
          product,
        },
        { status: 500 }
      );
    }

    const itemResponse = await squareClient.catalogApi.retrieveCatalogObject(product.squareId);

    // Check for related objects in the response
    const item = itemResponse.result?.object;
    const relatedObjects = itemResponse.result?.related_objects || [];

    logger.info(`Successfully retrieved Square catalog item: ${item?.item_data?.name}`);

    // Get image URLs
    const imageUrls = item ? await getImageUrls(item as any, relatedObjects as any) : [];
    logger.info(`Found ${imageUrls.length} images for product ${product.name}`);

    // Process variations if available
    const variations = item?.item_data?.variations || [];
    let basePrice = product.price;

    if (variations.length > 0) {
      const firstVariation = variations[0];
      if (firstVariation.item_variation_data?.price_money?.amount) {
        const amount = firstVariation.item_variation_data.price_money.amount;
        basePrice = new Decimal(Number(amount) / 100); // Convert cents to dollars
      }
    }

    // Update the product with the latest data from Square
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: item?.item_data?.name || product.name,
        description:
          item?.item_data?.description !== null
            ? item?.item_data?.description
            : product.description,
        price: basePrice,
        images: imageUrls.length > 0 ? imageUrls : product.images,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      squareItem: {
        id: item?.id,
        name: item?.item_data?.name,
        description: item?.item_data?.description,
        imageCount: imageUrls.length,
      },
      imageUrls,
    });
  } catch (error) {
    logger.error('Error syncing product:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync product',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST method for convenience
export const POST = GET;
