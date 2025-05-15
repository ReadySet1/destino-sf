import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';

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

// Define cleanup modes
type CleanupMode = 'report' | 'clear' | 'match' | 'full';

// Define the detail object type to include all possible properties
interface ProductDetail {
  id: string;
  name: string;
  squareId: string | null;
  action: string;
  newSquareId?: string;
  error?: string;
}

// Define response types
interface CleanupResult {
  total: number;
  invalid: number;
  cleared: number;
  matched: number;
  failed: number;
  details: ProductDetail[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get parameters from query string
    const mode = (request.nextUrl.searchParams.get('mode') || 'report') as CleanupMode;
    const matchThreshold = Number(request.nextUrl.searchParams.get('threshold') || '0.7');
    
    logger.info(`Starting bulk cleanup of products with mode: ${mode}`);
    
    // Fetch all Square catalog items to build a valid ID list
    logger.info('Fetching all Square catalog items...');
    
    const requestBody = {
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false
    };
    
    const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
    const squareItems = (catalogResponse.result?.objects || []) as SquareCatalogObject[];
    
    // Create a map of valid Square IDs and their names for quick lookup
    const validSquareIds = new Map<string, string>();
    squareItems.forEach(item => {
      const name = item.item_data?.name || '';
      validSquareIds.set(item.id, name);
    });
    
    logger.info(`Found ${validSquareIds.size} valid Square catalog items`);
    
    // Get all products from the database with Square IDs
    const products = await prisma.product.findMany({
      where: {
        squareId: { not: undefined }
      },
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true
      }
    });
    
    logger.info(`Found ${products.length} products with Square IDs in the database`);
    
    // Find products with invalid Square IDs
    const result: CleanupResult = {
      total: products.length,
      invalid: 0,
      cleared: 0,
      matched: 0,
      failed: 0,
      details: []
    };
    
    // Iterate through products and check their Square IDs
    for (const product of products) {
      // Safe non-null assertion since we filtered for non-null above
      if (product.squareId && validSquareIds.has(product.squareId)) {
        // Skip products with valid Square IDs
        continue;
      }
      
      result.invalid++;
      const detail: ProductDetail = {
        id: product.id,
        name: product.name,
        squareId: product.squareId,
        action: 'identified'
      };
      
      // Handle the invalid Square ID based on the mode
      if (mode === 'report') {
        // Just report, don't change anything
        result.details.push(detail);
        continue;
      }
      
      if (mode === 'clear' || mode === 'full') {
        try {
          // Clear the invalid Square ID
          await prisma.product.update({
            where: { id: product.id },
            data: {
              squareId: undefined, // Use undefined for database operations to clear the field
              updatedAt: new Date()
            }
          });
          
          detail.action = 'cleared';
          result.cleared++;
          
          logger.info(`Cleared invalid Square ID for product: ${product.name}`);
        } catch (error) {
          detail.action = 'clear_failed';
          detail.error = error instanceof Error ? error.message : String(error);
          result.failed++;
          
          logger.error(`Failed to clear Square ID for product ${product.name}:`, error);
        }
      }
      
      if (mode === 'match' || mode === 'full') {
        try {
          // Try to find a matching product in Square
          const bestMatch = findBestMatch(product.name, squareItems, matchThreshold);
          
          if (bestMatch) {
            // Update with the new Square ID
            await prisma.product.update({
              where: { id: product.id },
              data: {
                squareId: bestMatch.id,
                updatedAt: new Date()
              }
            });
            
            detail.action = mode === 'full' ? 'cleared_and_matched' : 'matched';
            detail.newSquareId = bestMatch.id;
            result.matched++;
            
            logger.info(`Matched product ${product.name} with Square item ${bestMatch.item_data?.name} (${bestMatch.id})`);
            
            // Optionally fetch and update images as well
            if (bestMatch.item_data?.image_ids && bestMatch.item_data.image_ids.length > 0) {
              const imageUrls = await getImageUrls(bestMatch, catalogResponse.result?.related_objects || []);
              
              if (imageUrls.length > 0) {
                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    images: imageUrls,
                    updatedAt: new Date()
                  }
                });
                
                logger.info(`Updated ${imageUrls.length} images for matched product ${product.name}`);
              }
            }
          } else {
            logger.info(`No match found for product ${product.name}`);
            detail.action = mode === 'full' ? 'cleared_no_match' : 'no_match';
          }
        } catch (error) {
          detail.action = 'match_failed';
          detail.error = error instanceof Error ? error.message : String(error);
          result.failed++;
          
          logger.error(`Failed to match product ${product.name}:`, error);
        }
      }
      
      result.details.push(detail);
    }
    
    logger.info(`Cleanup complete. Results: ${JSON.stringify({
      total: result.total,
      invalid: result.invalid,
      cleared: result.cleared,
      matched: result.matched,
      failed: result.failed
    })}`);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in bulk cleanup process:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform bulk cleanup',
        details: error instanceof Error ? error.message : String(error)
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
): SquareCatalogObject | null {
  // Normalize the product name for comparison
  const normalizedName = productName.toLowerCase().trim();
  
  // Find exact matches first
  const exactMatch = squareItems.find(item => 
    (item.item_data?.name?.toLowerCase().trim() === normalizedName)
  );
  
  if (exactMatch) {
    return exactMatch;
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
  
  return bestMatch;
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
async function getImageUrls(item: SquareCatalogObject, relatedObjects: SquareCatalogObject[]): Promise<string[]> {
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
      const imageObject = relatedObjects.find((obj) => obj.id === imageId && obj.type === 'IMAGE');
      
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
          if (squareClient.catalogApi.retrieveCatalogObject) {
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