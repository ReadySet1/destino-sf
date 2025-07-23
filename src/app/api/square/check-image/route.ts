import { NextRequest, NextResponse } from 'next/server';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

// Define Square catalog types
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

// Process Square image URLs to make them accessible
function processSquareImageUrl(url: string): string {
  if (!url) {
    return '';
  }

  try {
    // Parse the URL to work with it more reliably
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // 1. Square Marketplace URLs (usually public and accessible)
    if (hostname.includes('square-marketplace')) {
      return url;
    }

    // 2. Square CDN URLs (may need a proxy)
    if (hostname.includes('squarecdn.com')) {
      return url;
    }

    // 3. Square S3 bucket URLs (need proxy)
    if (
      hostname.includes('items-images-') ||
      hostname.includes('square-catalog-') ||
      hostname.includes('s3.amazonaws.com')
    ) {
      // Extract file path components
      const filePathMatch = url.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
      if (filePathMatch && filePathMatch.length >= 3) {
        const fileId = filePathMatch[1];
        const fileName = filePathMatch[2];

        // Create a normalized URL for proxy
        const normalizedUrl = `https://square-catalog-production.s3.amazonaws.com/files/${fileId}/${fileName}`;
        const encodedUrl = Buffer.from(normalizedUrl).toString('base64');
        return `/api/proxy/image?url=${encodedUrl}`;
      }

      // If we can't extract the file path, use the original URL
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }

    return url;
  } catch (error) {
    logger.error(`Error processing Square image URL: ${error}`);

    // Fall back to simple string matching
    if (
      url.includes('items-images-') ||
      url.includes('square-catalog-') ||
      url.includes('s3.amazonaws.com')
    ) {
      const encodedUrl = Buffer.from(url).toString('base64');
      return `/api/proxy/image?url=${encodedUrl}`;
    }

    return url;
  }
}

// Generate alternative URLs to test
function generateAlternativeUrls(originalUrl: string): string[] {
  if (!originalUrl) return [];

  try {
    const filePathMatch = originalUrl.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
    if (!filePathMatch || filePathMatch.length < 3) return [originalUrl];

    const fileId = filePathMatch[1];
    const fileName = filePathMatch[2];

    return [
      originalUrl,
      `https://items-images-production.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`,
      `https://square-catalog-production.s3.amazonaws.com/files/${fileId}/${fileName}`,
      `https://square-marketplace.s3.amazonaws.com/files/${fileId}/${fileName}`,
      `https://items-images-sandbox.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`,
      `https://square-catalog-sandbox.s3.amazonaws.com/files/${fileId}/${fileName}`,
    ];
  } catch (error) {
    return [originalUrl];
  }
}

/**
 * API endpoint to check a Square catalog image by ID or object ID
 * This is helpful for diagnostics and troubleshooting
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('imageId');
    const objectId = searchParams.get('objectId');

    if (!imageId && !objectId) {
      return NextResponse.json(
        { error: 'Either imageId or objectId parameter is required' },
        { status: 400 }
      );
    }

    if (imageId) {
      // If we have an image ID, get that specific image
      try {
        if (!squareClient.catalogApi) {
          return NextResponse.json({ error: 'Square catalog API not available' }, { status: 500 });
        }

        const response = await squareClient.catalogApi.retrieveCatalogObject(imageId);

        if (!response.result?.object || response.result.object.type !== 'IMAGE') {
          return NextResponse.json(
            { error: 'Not a valid image object', details: response.result },
            { status: 404 }
          );
        }

        const imageData = response.result.object.image_data;
        const originalUrl = imageData?.url || '';

        // Process the URL to create proxied versions to test
        const encodedUrl = Buffer.from(originalUrl).toString('base64');
        const proxiedUrl = `/api/proxy/image?url=${encodedUrl}`;

        // Generate alternative URLs to try
        const alternativeUrls = generateAlternativeUrls(originalUrl);

        return NextResponse.json({
          success: true,
          image: {
            id: response.result.object.id,
            name: imageData?.caption || 'No caption',
            originalUrl,
            proxiedUrl,
            alternativeUrls,
            isS3Url: originalUrl.includes('s3.'),
            isSquareS3:
              originalUrl.includes('items-images-production.s3') ||
              originalUrl.includes('items-images-sandbox.s3') ||
              originalUrl.includes('square-catalog-production.s3') ||
              originalUrl.includes('square-catalog-sandbox.s3'),
          },
        });
      } catch (error) {
        logger.error(`Error retrieving image ${imageId}:`, error);
        return NextResponse.json(
          {
            error: 'Failed to retrieve image',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    } else if (objectId) {
      // If we have an object ID (item/product ID), get all its images
      try {
        if (!squareClient.catalogApi) {
          return NextResponse.json({ error: 'Square catalog API not available' }, { status: 500 });
        }

        // First, retrieve the object (product)
        const objectResponse = await squareClient.catalogApi.retrieveCatalogObject(objectId);

        if (!objectResponse.result?.object) {
          return NextResponse.json({ error: 'Object not found' }, { status: 404 });
        }

        const item = objectResponse.result.object;
        const relatedObjects = objectResponse.result.related_objects || [];

        // Get image IDs from the item
        const imageIds = item.item_data?.image_ids || [];

        if (imageIds.length === 0) {
          return NextResponse.json({
            success: true,
            images: [],
            message: 'Item has no associated images',
          });
        }

        // Process each image
        const images = await Promise.all(
          imageIds.map(async (imageId: string) => {
            try {
              // First look in related objects
              const imageFromRelated = relatedObjects.find(
                (obj: SquareCatalogObject) => obj.id === imageId && obj.type === 'IMAGE'
              );

              if (imageFromRelated && imageFromRelated.image_data?.url) {
                const originalUrl = imageFromRelated.image_data.url;
                const encodedUrl = Buffer.from(originalUrl).toString('base64');
                const proxiedUrl = `/api/proxy/image?url=${encodedUrl}`;

                return {
                  id: imageId,
                  name: imageFromRelated.image_data.caption || 'No caption',
                  originalUrl,
                  proxiedUrl,
                  alternativeUrls: generateAlternativeUrls(originalUrl),
                  source: 'related_objects',
                };
              }

              // If not found in related objects, fetch directly
              if (!squareClient.catalogApi) {
                return {
                  id: imageId,
                  error: 'Square catalog API not available',
                };
              }

              const imageResponse = await squareClient.catalogApi.retrieveCatalogObject(imageId);
              const imageObject = imageResponse.result?.object;

              if (imageObject && imageObject.image_data?.url) {
                const originalUrl = imageObject.image_data.url;
                const encodedUrl = Buffer.from(originalUrl).toString('base64');
                const proxiedUrl = `/api/proxy/image?url=${encodedUrl}`;

                return {
                  id: imageId,
                  name: imageObject.image_data.caption || 'No caption',
                  originalUrl,
                  proxiedUrl,
                  alternativeUrls: generateAlternativeUrls(originalUrl),
                  source: 'direct_fetch',
                };
              }

              return {
                id: imageId,
                error: 'Image data not found',
              };
            } catch (error) {
              return {
                id: imageId,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          })
        );

        return NextResponse.json({
          success: true,
          item: {
            id: item.id,
            name: item.item_data?.name || 'Unknown item',
          },
          images,
        });
      } catch (error) {
        logger.error(`Error retrieving item ${objectId}:`, error);
        return NextResponse.json(
          {
            error: 'Failed to retrieve item',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error('Error in check-image API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
