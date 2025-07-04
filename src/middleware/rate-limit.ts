import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimit, 
  getEndpointFromPath, 
  createRateLimitResponse,
  addRateLimitHeaders,
  getClientIp 
} from '@/lib/rate-limit';
import { RateLimitOptions } from '@/types/rate-limit';

/**
 * Rate limiting middleware that integrates with Next.js middleware
 */
export async function applyRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  try {
    const { pathname } = request.nextUrl;
    
    // Skip rate limiting for static assets and internal Next.js routes
    if (shouldSkipRateLimit(pathname)) {
      return null; // Continue to next middleware
    }
    
    // Skip rate limiting if explicitly disabled
    if (options.skip) {
      return null;
    }
    
    // Determine which endpoint rate limit to apply
    const endpoint = getEndpointFromPath(pathname);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, endpoint, options);
    
    // If rate limit exceeded, return 429 response
    if (!rateLimitResult.success) {
      console.warn(`Rate limit exceeded for ${getClientIp(request)} on ${pathname}`, {
        endpoint,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset
      });
      
      return new NextResponse(
        createRateLimitResponse(rateLimitResult).body,
        {
          status: 429,
          headers: createRateLimitResponse(rateLimitResult).headers
        }
      );
    }
    
    // Rate limit passed - continue with rate limit headers attached
    const response = NextResponse.next();
    
    // Add rate limit headers to successful response
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.floor(rateLimitResult.reset.getTime() / 1000).toString());
    
    return response;
    
  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    
    // On error, allow request to continue but log the issue
    // This ensures rate limiting failures don't break the API
    return null;
  }
}

/**
 * Determine if rate limiting should be skipped for this path
 */
function shouldSkipRateLimit(pathname: string): boolean {
  // Skip for static assets
  if (
    pathname.includes('/_next/') ||
    pathname.includes('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js|ico)$/)
  ) {
    return true;
  }
  
  // Skip for health checks (common for monitoring systems)
  if (pathname === '/api/health' || pathname === '/health') {
    return true;
  }
  
  // Skip for internal Next.js routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs_')) {
    return true;
  }
  
  return false;
}

/**
 * Enhanced rate limiting with user-based limiting for authenticated requests
 */
export async function applyUserBasedRateLimit(
  request: NextRequest,
  userId?: string,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  if (!userId) {
    // Fall back to IP-based rate limiting
    return applyRateLimit(request, options);
  }
  
  // Use user ID as identifier for rate limiting
  const userOptions: RateLimitOptions = {
    ...options,
    identifier: `user:${userId}`
  };
  
  return applyRateLimit(request, userOptions);
}

/**
 * Apply strict rate limiting for sensitive endpoints
 */
export async function applyStrictRateLimit(
  request: NextRequest,
  customLimit?: number
): Promise<NextResponse | null> {
  const strictOptions: RateLimitOptions = {
    config: customLimit ? {
      id: 'strict',
      limit: customLimit,
      window: 60 * 1000, // 1 minute
      prefix: 'strict_rl'
    } : undefined
  };
  
  return applyRateLimit(request, strictOptions);
}

/**
 * Webhook-specific rate limiting with enhanced signature validation timing
 */
export async function applyWebhookRateLimit(
  request: NextRequest,
  webhookSource?: string
): Promise<NextResponse | null> {
  const webhookOptions: RateLimitOptions = {
    identifier: webhookSource ? `webhook:${webhookSource}` : getClientIp(request),
    config: {
      id: 'webhook',
      limit: 100, // 100 requests per minute for webhooks
      window: 60 * 1000,
      prefix: 'webhook_rl'
    }
  };
  
  return applyRateLimit(request, webhookOptions);
}

/**
 * Rate limiting for admin endpoints with higher limits
 */
export async function applyAdminRateLimit(
  request: NextRequest,
  adminUserId?: string
): Promise<NextResponse | null> {
  const adminOptions: RateLimitOptions = {
    identifier: adminUserId ? `admin:${adminUserId}` : getClientIp(request),
    config: {
      id: 'admin',
      limit: 120, // Higher limit for admin operations
      window: 60 * 1000,
      prefix: 'admin_rl'
    }
  };
  
  return applyRateLimit(request, adminOptions);
}

/**
 * Development mode bypass for rate limiting
 */
export function shouldBypassInDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' && 
         process.env.BYPASS_RATE_LIMIT === 'true';
} 