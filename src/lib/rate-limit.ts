import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import { 
  RateLimitConfig, 
  RateLimitResult, 
  RateLimitOptions, 
  RateLimitEndpoint,
  EndpointRateLimits,
  RateLimitResponse 
} from '@/types/rate-limit';

/**
 * Redis client for rate limiting
 * Uses Upstash Redis with REST API for edge compatibility
 */
const redis = Redis.fromEnv();

/**
 * Predefined rate limit configurations for different endpoints
 * Based on the production plan requirements
 */
export const ENDPOINT_RATE_LIMITS: EndpointRateLimits = {
  webhooks: {
    id: 'webhooks',
    limit: 100, // 100 requests per minute for webhooks
    window: 60 * 1000, // 1 minute
    prefix: 'webhook_rl'
  },
  checkout: {
    id: 'checkout',
    limit: 10, // 10 requests per minute per IP for checkout
    window: 60 * 1000, // 1 minute
    prefix: 'checkout_rl'
  },
  orders: {
    id: 'orders',
    limit: 30, // 30 requests per minute per user for orders
    window: 60 * 1000, // 1 minute
    prefix: 'orders_rl'
  },
  api: {
    id: 'api',
    limit: 60, // 60 requests per minute for general API
    window: 60 * 1000, // 1 minute
    prefix: 'api_rl'
  },
  admin: {
    id: 'admin',
    limit: 120, // 120 requests per minute for admin endpoints
    window: 60 * 1000, // 1 minute
    prefix: 'admin_rl'
  }
};

/**
 * Rate limiter instances with token bucket algorithm
 */
const rateLimiters = new Map<string, Ratelimit>();

/**
 * Get or create a rate limiter for a specific configuration
 */
function getRateLimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.id}_${config.limit}_${config.window}`;
  
  if (!rateLimiters.has(key)) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(config.limit, `${config.window}ms`, config.limit),
      prefix: config.prefix || 'rl',
      analytics: true, // Enable analytics for monitoring
    });
    
    rateLimiters.set(key, limiter);
  }
  
  return rateLimiters.get(key)!;
}

/**
 * Extract IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP (handling proxies/CDNs)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  const xClientIp = request.headers.get('x-client-ip');
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  if (xRealIp) {
    return xRealIp;
  }
  
  if (xClientIp) {
    return xClientIp;
  }
  
  // Fallback to host header if no other IP headers are available
  return request.headers.get('host') || 'unknown';
}

/**
 * Get rate limit identifier based on request and options
 */
function getRateLimitIdentifier(
  request: NextRequest, 
  options: RateLimitOptions = {}
): string {
  if (options.identifier) {
    return options.identifier;
  }
  
  // Default to IP-based rate limiting
  return getClientIp(request);
}

/**
 * Check rate limit for a specific endpoint
 */
export async function checkRateLimit(
  request: NextRequest,
  endpoint: RateLimitEndpoint,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  try {
    // Skip rate limiting if explicitly requested
    if (options.skip) {
      return {
        success: true,
        remaining: 999,
        reset: new Date(Date.now() + 60000),
        limit: 999,
        count: 0
      };
    }
    
    // Get configuration for the endpoint
    const baseConfig = ENDPOINT_RATE_LIMITS[endpoint];
    const config = { ...baseConfig, ...options.config };
    
    // Get rate limiter instance
    const limiter = getRateLimiter(config);
    
    // Get identifier for rate limiting
    const identifier = getRateLimitIdentifier(request, options);
    
    // Check rate limit
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      remaining: result.remaining,
      reset: new Date(result.reset),
      limit: result.limit,
      count: result.limit - result.remaining
    };
    
  } catch (error) {
    console.error(`Rate limit check failed for endpoint ${endpoint}:`, error);
    
    // On error, allow the request but log it
    // This prevents rate limiting failures from breaking the API
    return {
      success: true,
      remaining: 999,
      reset: new Date(Date.now() + 60000),
      limit: 999,
      count: 0
    };
  }
}

/**
 * Determine which endpoint rate limit to apply based on request path
 */
export function getEndpointFromPath(pathname: string): RateLimitEndpoint {
  if (pathname.startsWith('/api/webhooks/')) {
    return 'webhooks';
  }
  
  if (pathname.startsWith('/api/checkout')) {
    return 'checkout';
  }
  
  if (pathname.startsWith('/api/orders')) {
    return 'orders';
  }
  
  if (pathname.startsWith('/api/admin')) {
    return 'admin';
  }
  
  // Default to general API rate limit
  return 'api';
}

/**
 * Create standardized rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const response: RateLimitResponse = {
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    limit: result.limit,
    remaining: result.remaining,
    reset: Math.floor(result.reset.getTime() / 1000),
    retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000)
  };
  
  return new Response(JSON.stringify(response), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.floor(result.reset.getTime() / 1000).toString(),
      'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
    }
  });
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('X-RateLimit-Limit', result.limit.toString());
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', Math.floor(result.reset.getTime() / 1000).toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Rate limiting service class for more complex scenarios
 */
export class RateLimitService {
  private static instance: RateLimitService;
  
  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }
  
  /**
   * Check rate limit with custom configuration
   */
  async checkCustomLimit(
    identifier: string, 
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      const limiter = getRateLimiter(config);
      const result = await limiter.limit(identifier);
      
      return {
        success: result.success,
        remaining: result.remaining,
        reset: new Date(result.reset),
        limit: result.limit,
        count: result.limit - result.remaining
      };
    } catch (error) {
      console.error('Custom rate limit check failed:', error);
      
      // Return permissive result on error
      return {
        success: true,
        remaining: 999,
        reset: new Date(Date.now() + 60000),
        limit: 999,
        count: 0
      };
    }
  }
  
  /**
   * Get rate limit status without incrementing counter
   */
  async getRateLimitStatus(
    identifier: string,
    endpoint: RateLimitEndpoint
  ): Promise<RateLimitResult | null> {
    try {
      const config = ENDPOINT_RATE_LIMITS[endpoint];
      const key = `${config.prefix || 'rl'}:${identifier}`;
      
      // Get current count from Redis without incrementing
      const count = await redis.get(key) as number || 0;
      const remaining = Math.max(0, config.limit - count);
      
      return {
        success: remaining > 0,
        remaining,
        reset: new Date(Date.now() + config.window),
        limit: config.limit,
        count
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return null;
    }
  }
}

/**
 * Export default service instance
 */
export const rateLimitService = RateLimitService.getInstance(); 