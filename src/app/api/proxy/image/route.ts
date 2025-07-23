import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Cache responses for 24 hours (in seconds)
const CACHE_MAX_AGE = 86400;

/**
 * Proxy handler for external images to avoid CORS issues
 * This endpoint takes an encoded URL and serves the image with proper CORS headers
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL parameter from the request (it's base64 encoded)
    const searchParams = request.nextUrl.searchParams;
    const encodedUrl = searchParams.get('url');

    if (!encodedUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Decode the URL and validate it
    let imageUrl: string;
    try {
      imageUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');

      // Basic validation - only allow specific domains that we trust
      const validDomains = [
        's3.us-west-2.amazonaws.com',
        'items-images-sandbox.s3.us-west-2.amazonaws.com',
        'items-images-production.s3.us-west-2.amazonaws.com',
        'square-marketplace.s3.amazonaws.com',
        'square-marketplace-sandbox.s3.amazonaws.com',
        'square-catalog-production.s3.amazonaws.com',
        'square-catalog-sandbox.s3.amazonaws.com',
        'destino-sf.square.site',
      ];

      const url = new URL(imageUrl);
      if (
        !validDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))
      ) {
        logger.warn(`Blocked proxy request to non-allowed domain: ${url.hostname}`);
        return new NextResponse('Domain not allowed', { status: 403 });
      }
    } catch (error) {
      logger.error('Error decoding URL:', error);
      return new NextResponse('Invalid URL format', { status: 400 });
    }

    logger.info(`Proxying image request for: ${imageUrl}`);

    // Handle Square S3 URLs specifically
    const isSquareS3Url =
      imageUrl.includes('items-images-production.s3') ||
      imageUrl.includes('items-images-sandbox.s3') ||
      imageUrl.includes('square-catalog-production.s3') ||
      imageUrl.includes('square-catalog-sandbox.s3') ||
      imageUrl.includes('square-marketplace.s3');

    // Handle destino-sf.square.site URLs separately
    const isDestinoSquareSite = imageUrl.includes('destino-sf.square.site');

    if (isSquareS3Url) {
      // Extract key file information
      const filePathMatch = imageUrl.match(/\/files\/([^\/]+)\/([^\/\?]+)/);
      if (filePathMatch && filePathMatch.length >= 3) {
        const fileId = filePathMatch[1];
        const fileName = filePathMatch[2];

        // Try multiple URL formats for Square images
        const result = await tryMultipleSquareFormats(fileId, fileName);

        if (result.success) {
          return new NextResponse(result.data, {
            status: 200,
            headers: {
              'Content-Type': result.contentType,
              'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        logger.error(`All attempts to fetch Square image failed: ${result.error}`);
        return new NextResponse(`Failed to fetch image after multiple attempts: ${result.error}`, {
          status: 404,
        });
      }
    }

    // Handle destino-sf.square.site URLs with simple fetch (they should be publicly accessible)
    if (isDestinoSquareSite) {
      const fetchOptions: RequestInit = {
        headers: {
          Accept: 'image/*',
          'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
          Referer: 'https://destino-sf.square.site/',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      };

      try {
        const response = await fetch(imageUrl, fetchOptions);

        if (!response.ok) {
          logger.error(
            `Error fetching destino-sf.square.site image: ${response.status} ${response.statusText} for URL: ${imageUrl}`
          );

          // For 404 errors, return a cached response to prevent infinite retries
          if (response.status === 404) {
            return new NextResponse(`Image not found: ${imageUrl}`, {
              status: 404,
              headers: {
                'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`, // Cache 404s to prevent retries
                'Access-Control-Allow-Origin': '*',
              },
            });
          }

          return new NextResponse(
            `Error fetching image: ${response.status} ${response.statusText}`,
            {
              status: response.status,
            }
          );
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) {
          logger.error(
            `The destino-sf.square.site resource isn't a valid image: received ${contentType}`
          );
          return new NextResponse(`The requested resource isn't a valid image`, {
            status: 415,
          });
        }

        const imageData = await response.arrayBuffer();

        return new NextResponse(imageData, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (fetchError) {
        logger.error(
          `Network error fetching destino-sf.square.site image: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
        );
        return new NextResponse('Network error fetching image', { status: 502 });
      }
    }

    // For non-Square images or if file path extraction failed, proceed with normal fetch
    const fetchOptions: RequestInit = {
      headers: {
        Accept: 'image/*',
        'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    };

    // Fetch the image from the original source
    let response;
    try {
      response = await fetch(imageUrl, fetchOptions);
    } catch (fetchError) {
      logger.error(
        `Network error fetching image: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      );
      return new NextResponse('Network error fetching image', { status: 502 });
    }

    if (!response.ok) {
      logger.error(
        `Error fetching image: ${response.status} ${response.statusText} for URL: ${imageUrl}`
      );

      // Special handling for common errors
      if (response.status === 403) {
        logger.error(
          'Access denied (403) for S3 image. This might be due to missing permissions or expired URLs.'
        );
        return new NextResponse('Access denied for image resource', { status: 403 });
      }

      // Cache 404 errors to prevent infinite retries
      if (response.status === 404) {
        return new NextResponse(`Image not found: ${imageUrl}`, {
          status: 404,
          headers: {
            'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`, // Cache 404s to prevent retries
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new NextResponse(`Error fetching image: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    // Check that we got an image back and not some other content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      logger.error(`The requested resource isn't a valid image: received ${contentType}`);
      return new NextResponse(
        `The requested resource isn't a valid image for ${imageUrl} received ${contentType}`,
        {
          status: 415, // Unsupported Media Type
        }
      );
    }

    // Get the image data
    const imageData = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    logger.error('Image proxy error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}

/**
 * Try multiple URL formats for Square images with different request configurations
 */
async function tryMultipleSquareFormats(
  fileId: string,
  fileName: string
): Promise<{
  success: boolean;
  data?: ArrayBuffer;
  contentType: string;
  error?: string;
}> {
  // Different URL formats to try
  const urlFormats = [
    // Production URLs
    `https://items-images-production.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`,
    `https://square-catalog-production.s3.amazonaws.com/files/${fileId}/${fileName}`,
    `https://square-marketplace.s3.amazonaws.com/files/${fileId}/${fileName}`,
    // Sandbox URLs
    `https://items-images-sandbox.s3.us-west-2.amazonaws.com/files/${fileId}/${fileName}`,
    `https://square-catalog-sandbox.s3.amazonaws.com/files/${fileId}/${fileName}`,
    `https://square-marketplace-sandbox.s3.amazonaws.com/files/${fileId}/${fileName}`,
  ];

  // Different user agents to try
  const userAgents = [
    'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ];

  // Try each URL with different fetch configurations
  for (const url of urlFormats) {
    for (const userAgent of userAgents) {
      try {
        const fetchOptions: RequestInit = {
          headers: {
            Accept: 'image/*',
            'User-Agent': userAgent,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            // Add a referrer that matches allowed domains for Square's CDN
            Referer: 'https://squareup.com/',
          },
          // Add cache busting with a new query parameter every time
          cache: 'no-store',
        };

        // Add cache busting parameter to URL
        const cacheBustUrl = `${url}?t=${Date.now()}`;

        const response = await fetch(cacheBustUrl, fetchOptions);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          if (contentType.startsWith('image/')) {
            logger.info(`Successfully fetched image from ${url} with user agent ${userAgent}`);
            const data = await response.arrayBuffer();
            return {
              success: true,
              data,
              contentType,
            };
          }
        } else {
          logger.warn(
            `Failed to fetch from ${url} with status ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        // Continue to the next attempt
        logger.warn(
          `Failed attempt for ${url}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // All attempts failed
  return {
    success: false,
    contentType: '',
    error: 'All image URL formats failed',
  };
}
