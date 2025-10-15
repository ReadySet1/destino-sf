import { NextRequest, NextResponse } from 'next/server';

// Timeout for fetching images from S3
const IMAGE_FETCH_TIMEOUT = 10000; // 10 seconds

interface ImageParams {
  url: string;
  w?: string;
  q?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const width = searchParams.get('w') || '800';
    const quality = searchParams.get('q') || '80';

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL is from allowed domains
    const allowedDomains = [
      'items-images-production.s3.us-west-2.amazonaws.com',
      'items-images-sandbox.s3.us-west-2.amazonaws.com',
      'square-marketplace.s3.amazonaws.com',
      'square-marketplace-sandbox.s3.amazonaws.com',
    ];

    try {
      const urlObj = new URL(decodeURIComponent(url));
      const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain);

      if (!isAllowed) {
        return NextResponse.json({ error: 'URL not from allowed domain' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT);

    try {
      // Fetch the image with timeout
      const response = await fetch(decodeURIComponent(url), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DestinoSF-ImageProxy/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'Response is not an image' }, { status: 400 });
      }

      // Get the image buffer
      const imageBuffer = await response.arrayBuffer();

      // Return the image with appropriate headers
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Image-Proxy': 'destino-sf',
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`Image fetch timeout for URL: ${url}`);
        return NextResponse.json({ error: 'Image fetch timeout' }, { status: 408 });
      }

      console.error('Error fetching image:', error);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
