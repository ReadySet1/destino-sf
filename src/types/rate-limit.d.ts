export interface RateLimitConfig {
  /** Unique identifier for the rate limit rule */
  id: string;
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in milliseconds */
  window: number;
  /** Optional prefix for Redis keys */
  prefix?: string;
}

export interface RateLimitResult {
  /** Whether the request should be allowed */
  success: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp when the rate limit resets */
  reset: Date;
  /** The limit that was applied */
  limit: number;
  /** Current count of requests in the window */
  count: number;
}

export interface RateLimitOptions {
  /** Custom identifier for the rate limit (defaults to IP) */
  identifier?: string;
  /** Whether to skip rate limiting (for internal requests) */
  skip?: boolean;
  /** Custom rate limit config to override defaults */
  config?: Partial<RateLimitConfig>;
}

export type RateLimitEndpoint = 
  | 'webhooks' 
  | 'checkout' 
  | 'orders' 
  | 'api' 
  | 'admin';

export interface EndpointRateLimits {
  webhooks: RateLimitConfig;
  checkout: RateLimitConfig;
  orders: RateLimitConfig;
  api: RateLimitConfig;
  admin: RateLimitConfig;
}

export interface RateLimitResponse {
  error: string;
  code: 'RATE_LIMIT_EXCEEDED';
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
} 