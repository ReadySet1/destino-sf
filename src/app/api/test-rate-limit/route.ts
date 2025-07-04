import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/middleware/rate-limit';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting with a low limit for testing (5 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, {
      config: {
        id: 'test',
        limit: 5,
        window: 60 * 1000, // 1 minute
        prefix: 'test_rl'
      }
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // If rate limiting passed, return success response
    const clientIp = getClientIp(request);
    
    return NextResponse.json({
      success: true,
      message: 'Rate limiting test endpoint',
      timestamp: new Date().toISOString(),
      clientIp,
      note: 'This endpoint allows 5 requests per minute per IP'
    });

  } catch (error) {
    console.error('Test rate limit endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting for POST (2 requests per minute)
    const rateLimitResponse = await applyRateLimit(request, {
      config: {
        id: 'test-post',
        limit: 2,
        window: 60 * 1000, // 1 minute
        prefix: 'test_post_rl'
      }
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const clientIp = getClientIp(request);
    
    return NextResponse.json({
      success: true,
      message: 'POST rate limiting test endpoint',
      timestamp: new Date().toISOString(),
      clientIp,
      receivedData: body,
      note: 'This endpoint allows 2 POST requests per minute per IP'
    });

  } catch (error) {
    console.error('Test rate limit POST endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 