import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { squareClient } from '@/lib/square/client';
import { directCatalogApi } from '@/lib/square/catalog-api';
import { logger } from '@/utils/logger';

// Process Square image URLs to make them accessible
function processSquareImageUrl(url: string): string {
  // First convert any sandbox URLs to production if needed
  if (url.includes('items-images-sandbox.s3')) {
    url = url.replace('items-images-sandbox.s3', 'items-images-production.s3');
  }
  
  // For Square-hosted images, we can use the URLs directly as they are publicly accessible
  if (url.includes('square-marketplace')) {
    return url;
  }
  
  // The CDN URL pattern isn't working, so we'll use the proxy approach instead
  // which seems to be working more reliably
  if (url.includes('items-images-production.s3') || url.includes('amazonaws.com')) {
    // Use the proxy to access S3 URLs
    const encodedUrl = Buffer.from(url).toString('base64');
    return `/api/proxy/image?url=${encodedUrl}`;
  }
  
  // If no pattern matched or we couldn't parse the URL, return as is
  return url;
}

interface SquareCatalogImageData {
  url?: string;
  caption?: string;
  [key: string]: any;
}

interface SquareCatalogObject {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    image_ids?: string[];
    [key: string]: any;
  };
  image_data?: SquareCatalogImageData;
  [key: string]: any;
}

async function fetchImagesForProduct(squareId: string): Promise<string[]> {
  if (!squareId) return [];
  
  try {
    // Use our direct API implementation instead of the Square SDK
    const objectResponse = await directCatalogApi.retrieveCatalogObject(squareId);
    
    if (!objectResponse.result?.object || !objectResponse.result.object.item_data) {
      logger.warn(`Product ${squareId} not found in Square or is not an item`);
      return [];
    }
    
    const item = objectResponse.result.object;
    const relatedObjects = objectResponse.result.related_objects || [];
    const imageIds = item.item_data.image_ids || [];
    
    if (imageIds.length === 0) {
      logger.info(`No image IDs found for product ${squareId}`);
      return [];
    }
    
    const imageUrls: string[] = [];
    
    // Process each image ID
    for (const imageId of imageIds) {
      let imageUrl: string | undefined;
      
      // First try to find the image in related objects
      const imageFromRelated = relatedObjects.find(
        (obj: SquareCatalogObject) => obj.id === imageId && obj.type === 'IMAGE'
      );
      
      if (imageFromRelated && imageFromRelated.image_data?.url) {
        imageUrl = imageFromRelated.image_data.url;
      } else {
        // If not found in related objects, fetch directly using our direct implementation
        try {
          const imageResponse = await directCatalogApi.retrieveCatalogObject(imageId);
          const imageObject = imageResponse.result?.object;
          
          if (imageObject && imageObject.image_data?.url) {
            imageUrl = imageObject.image_data.url;
          }
        } catch (error) {
          logger.error(`Error fetching image ${imageId} for product ${squareId}:`, error);
        }
      }
      
      if (imageUrl) {
        // Extract file ID and name if it's an S3 URL
        const filePathMatch = imageUrl.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
        
        if (filePathMatch && filePathMatch.length >= 3) {
          const fileId = filePathMatch[1];
          const fileName = filePathMatch[2];
          
          // Try sandbox URL first - from logs we see these work better
          const sandboxUrl = `https://items-images-sandbox.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`;
          let workingUrl: string | null = null;
          
          try {
            const response = await fetch(sandboxUrl, { 
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (response.ok) {
              workingUrl = sandboxUrl;
            }
          } catch (fetchError) {
            logger.warn(`Error checking sandbox URL for ${imageId}:`, fetchError);
          }
          
          // If sandbox URL didn't work, try production URL
          if (!workingUrl) {
            const productionUrl = `https://items-images-production.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`;
            
            try {
              const response = await fetch(productionUrl, { 
                method: 'HEAD',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (response.ok) {
                workingUrl = productionUrl;
              }
            } catch (fetchError) {
              logger.warn(`Error checking production URL for ${imageId}:`, fetchError);
            }
          }
          
          // If we have a working URL, add it to our list
          if (workingUrl) {
            imageUrls.push(workingUrl);
          }
        } else {
          // Not an S3 URL, add as is
          imageUrls.push(imageUrl);
        }
      }
    }
    
    return imageUrls;
  } catch (error) {
    logger.error(`Error fetching images for product ${squareId}:`, error);
    return [];
  }
}

/**
 * API endpoint to fix product images
 * This will update products with no images using information from Square
 */
export async function POST(request: NextRequest) {
  try {
    // Get request params to allow toggling sandbox mode
    const searchParams = request.nextUrl.searchParams;
    const useSandbox = searchParams.get('sandbox') === 'true';
    const tempToken = searchParams.get('token');
    
    // Save original environment values
    const originalSandboxSetting = process.env.USE_SQUARE_SANDBOX;
    const originalSandboxToken = process.env.SQUARE_SANDBOX_TOKEN;
    const originalProductionToken = process.env.SQUARE_PRODUCTION_TOKEN;
    const originalAccessToken = process.env.SQUARE_ACCESS_TOKEN;
    
    // Log environment information to help diagnose token issues
    logger.info('Image refresh environment before changes:', {
      useSandbox,
      hasTempToken: !!tempToken,
      hasSandboxToken: !!process.env.SQUARE_SANDBOX_TOKEN,
      hasProductionToken: !!process.env.SQUARE_PRODUCTION_TOKEN,
      hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
      nodeEnv: process.env.NODE_ENV,
      useSquareSandbox: process.env.USE_SQUARE_SANDBOX
    });
    
    // Apply temporary token if provided
    if (tempToken) {
      logger.info('Using temporary token for this request');
      
      if (useSandbox) {
        process.env.SQUARE_SANDBOX_TOKEN = tempToken;
      } else {
        process.env.SQUARE_ACCESS_TOKEN = tempToken;
        process.env.SQUARE_PRODUCTION_TOKEN = tempToken;
      }
    }
    
    if (useSandbox) {
      // Force sandbox mode for this request
      process.env.USE_SQUARE_SANDBOX = 'true';
      logger.info('Sandbox mode enabled for this request');
    }
    
    logger.info('Starting image refresh process...');
    
    // Get all products that have a Square ID and refresh their images
    const productsWithSquareId = await prisma.product.findMany({
      where: {
        squareId: { not: '' }
      },
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true
      }
    });
    
    logger.info(`Found ${productsWithSquareId.length} products with Square IDs`);
    
    const results = {
      total: productsWithSquareId.length,
      updated: 0,
      noChange: 0,
      errors: 0,
      details: [] as any[]
    };
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < productsWithSquareId.length; i += batchSize) {
      const batch = productsWithSquareId.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(productsWithSquareId.length/batchSize)}`);
      
      await Promise.all(batch.map(async (product) => {
        try {
          if (!product.squareId) return;
          
          // Fetch fresh images from Square
          const newImages = await fetchImagesForProduct(product.squareId);
          
          // If we have new images, update the product
          if (newImages.length > 0) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                images: newImages,
                updatedAt: new Date()
              }
            });
            
            logger.info(`Updated product "${product.name}" with ${newImages.length} images`);
            results.updated++;
            results.details.push({
              id: product.id,
              name: product.name,
              action: 'updated',
              imageCount: newImages.length
            });
          } else {
            logger.info(`No images found for product "${product.name}" in Square, leaving unchanged`);
            results.noChange++;
            results.details.push({
              id: product.id,
              name: product.name,
              action: 'no_change',
              reason: 'no_square_images'
            });
          }
        } catch (error) {
          logger.error(`Error processing product ${product.id} (${product.name}):`, error);
          results.errors++;
          results.details.push({
            id: product.id,
            name: product.name,
            action: 'error',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < productsWithSquareId.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Restore original environment settings
    process.env.USE_SQUARE_SANDBOX = originalSandboxSetting;
    process.env.SQUARE_SANDBOX_TOKEN = originalSandboxToken;
    process.env.SQUARE_PRODUCTION_TOKEN = originalProductionToken;
    process.env.SQUARE_ACCESS_TOKEN = originalAccessToken;
    
    logger.info(`Image refresh complete. Updated: ${results.updated}, No Change: ${results.noChange}, Errors: ${results.errors}`);
    
    return NextResponse.json({
      success: true,
      message: 'Image refresh process completed',
      results
    });
  } catch (error) {
    logger.error('Error in image refresh process:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const GET = async (request: NextRequest) => {
  // Get request parameters
  const searchParams = request.nextUrl.searchParams;
  const tempToken = searchParams.get('token');
  
  // Get the environment and token status
  const usesSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
  
  // Apply temporary token if provided
  let sandboxToken = process.env.SQUARE_SANDBOX_TOKEN;
  let productionToken = process.env.SQUARE_PRODUCTION_TOKEN;
  let accessToken = process.env.SQUARE_ACCESS_TOKEN;
  
  if (tempToken) {
    if (usesSandbox) {
      sandboxToken = tempToken;
    } else {
      productionToken = tempToken;
      accessToken = tempToken;
    }
  }
  
  const tokenInfo = {
    environment: usesSandbox ? 'sandbox' : 'production',
    hasSandboxToken: !!sandboxToken,
    hasProductionToken: !!productionToken,
    hasAccessToken: !!accessToken,
    currentTokenSource: usesSandbox 
      ? 'SQUARE_SANDBOX_TOKEN' 
      : process.env.NODE_ENV === 'production' && productionToken
        ? 'SQUARE_PRODUCTION_TOKEN'
        : 'SQUARE_ACCESS_TOKEN',
    nodeEnv: process.env.NODE_ENV,
    usingTempToken: !!tempToken
  };
  
  return NextResponse.json({
    message: 'Square API configuration',
    tokenInfo
  });
}; 