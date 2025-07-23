import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

// Define interfaces for Square objects
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

// Define response types
interface MatchResult {
  total: number;
  matched: number;
  withImages: number;
  noMatch: number;
  details: Array<{
    id: string;
    name: string;
    squareId: string | null;
    matched: boolean;
    matchedName?: string;
    similarity?: number;
    imageCount?: number;
  }>;
}

// Product detail interface for type safety
interface ProductDetail {
  id: string;
  name: string;
  squareId: string | null;
  matched: boolean;
  matchedName?: string;
  similarity?: number;
  imageCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query string
    const threshold = Number(request.nextUrl.searchParams.get('threshold') || '0.6');
    const limit = Number(request.nextUrl.searchParams.get('limit') || '0'); // 0 means no limit
    const updateDb = request.nextUrl.searchParams.get('update') === 'true';

    logger.info(
      `Starting mass product matching with threshold: ${threshold}, updateDb: ${updateDb}`
    );

    // Step 1: Fetch all products from the database
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true,
      },
    });

    // Filter to get products without Square ID or with Square ID but no images
    const products = allProducts.filter(
      product => product.squareId === null || (product.images && product.images.length === 0)
    );

    // Apply limit if specified
    const productsToProcess = limit > 0 ? products.slice(0, limit) : products;

    logger.info(
      `Found ${products.length} products without Square IDs in the database, processing ${productsToProcess.length}`
    );

    // Step 2: Fetch all Square catalog items to build a match pool
    logger.info('Fetching all Square catalog items...');

    const requestBody = {
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false,
    };

    if (!squareClient.catalogApi) {
      return NextResponse.json(
        {
          error: 'Square catalog API not available',
        },
        { status: 500 }
      );
    }

    const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
    const squareItems = (catalogResponse.result?.objects || []) as SquareCatalogObject[];
    const relatedObjects = (catalogResponse.result?.related_objects || []) as SquareCatalogObject[];

    logger.info(`Found ${squareItems.length} items in Square catalog`);

    // Step 3: Match products to Square items
    const result: MatchResult = {
      total: productsToProcess.length,
      matched: 0,
      withImages: 0,
      noMatch: 0,
      details: [],
    };

    // Process each product
    for (const product of productsToProcess) {
      logger.info(`Processing product: ${product.name}`);

      // Find the best match
      const { bestMatch, similarity } = findBestMatch(product.name, squareItems, threshold);

      const detail: ProductDetail = {
        id: product.id,
        name: product.name,
        squareId: product.squareId,
        matched: false,
      };

      if (bestMatch) {
        detail.matched = true;
        detail.matchedName = bestMatch.item_data?.name;
        detail.similarity = similarity;
        detail.imageCount = bestMatch.item_data?.image_ids?.length || 0;

        // Extract image URLs if available
        const imageUrls = await getImageUrls(bestMatch, relatedObjects);

        // Update the database if requested
        if (updateDb) {
          try {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                squareId: bestMatch.id,
                images: imageUrls.length > 0 ? imageUrls : undefined,
                updatedAt: new Date(),
              },
            });

            logger.info(
              `Updated product ${product.name} with Square ID ${bestMatch.id} and ${imageUrls.length} images`
            );
          } catch (updateError) {
            logger.error(`Error updating product ${product.name}:`, updateError);
          }
        }

        result.matched++;
        if (imageUrls.length > 0) {
          result.withImages++;
        }
      } else {
        result.noMatch++;
      }

      result.details.push(detail);
    }

    logger.info(
      `Matching complete. Results: ${JSON.stringify({
        total: result.total,
        matched: result.matched,
        withImages: result.withImages,
        noMatch: result.noMatch,
      })}`
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in mass product matching:', error);
    return NextResponse.json(
      {
        error: 'Failed to match products',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Helper function to find the best match for a product name in Square catalog
function findBestMatch(
  productName: string,
  squareItems: SquareCatalogObject[],
  threshold: number
): { bestMatch: SquareCatalogObject | null; similarity: number } {
  // Normalize the product name for comparison
  const normalizedName = productName.toLowerCase().trim();

  // Find exact matches first
  const exactMatch = squareItems.find(
    item => item.item_data?.name?.toLowerCase().trim() === normalizedName
  );

  if (exactMatch) {
    return { bestMatch: exactMatch, similarity: 1 };
  }

  // No exact match, find the closest match
  let bestMatch: SquareCatalogObject | null = null;
  let bestScore = 0;

  for (const item of squareItems) {
    if (!item.item_data?.name) continue;

    const itemName = item.item_data.name.toLowerCase().trim();
    const score = calculateSimilarity(normalizedName, itemName);

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return { bestMatch, similarity: bestScore };
}

// Calculate similarity between two strings (0-1, higher is more similar)
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1; // Exact match
  if (a.length === 0 || b.length === 0) return 0; // Empty string

  // Simple word overlap calculation
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));

  // Intersection size
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));

  // Calculate Jaccard similarity: intersection / union
  return intersection.size / (wordsA.size + wordsB.size - intersection.size);
}

// Function to extract image URLs from related objects
async function getImageUrls(
  item: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[]
): Promise<string[]> {
  const imageUrls: string[] = [];
  const imageIds = item.item_data?.image_ids || [];

  if (imageIds.length === 0) {
    return imageUrls;
  }

  // First pass: create a filtered list of valid imageIds
  const validImageIds = imageIds.filter(imageId => {
    return relatedObjects.some(obj => obj.id === imageId && obj.type === 'IMAGE');
  });

  // Look for image objects in related_objects
  for (const imageId of validImageIds) {
    try {
      const imageObject = relatedObjects.find(obj => obj.id === imageId && obj.type === 'IMAGE');

      if (imageObject && imageObject.image_data && imageObject.image_data.url) {
        const imageUrl = imageObject.image_data.url;

        if (imageUrl) {
          // Add a cache busting parameter
          const cacheBustedUrl = addCacheBustingParam(imageUrl);
          imageUrls.push(cacheBustedUrl);
        }
      } else {
        // Try to retrieve image directly
        try {
          if (squareClient.catalogApi && squareClient.catalogApi.retrieveCatalogObject) {
            const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
            const imageData = imageResponse.result?.object;

            if (imageData && imageData.image_data && imageData.image_data.url) {
              const imageUrl = imageData.image_data.url;
              const cacheBustedUrl = addCacheBustingParam(imageUrl);
              imageUrls.push(cacheBustedUrl);
            }
          }
        } catch (imageError) {
          // Just log and continue
          logger.error(`Error retrieving image ${imageId}, skipping:`, imageError);
        }
      }
    } catch (error) {
      // Catch errors to ensure we process all images
      logger.error(`Error processing image ${imageId}:`, error);
    }
  }

  return imageUrls;
}

// Helper function to add cache busting parameter to image URLs
function addCacheBustingParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

// For POST method access as well
export const POST = GET;
