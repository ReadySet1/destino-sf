/**
 * Rate Limiting for Webhook Endpoints
 * 
 * Implements rate limiting to prevent abuse and protect webhook endpoints
 * from excessive requests that could impact performance.
 */

import { WEBHOOK_CONSTANTS } from '@/types/webhook';

// In-memory rate limit store (in production, use Redis for distributed rate limiting)
class RateLimitStore {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.requests.get(key);
    if (!entry) return null;
    
    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.requests.delete(key);
      return null;
    }
    
    return entry;
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.get(key);
    
    if (existing) {
      existing.count++;
      return existing;
    } else {
      const entry = { count: 1, resetTime: now + windowMs };
      this.requests.set(key, entry);
      return entry;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  clear(): void {
    this.requests.clear();
  }

  size(): number {
    return this.requests.size;
  }
}

export class RateLimiter {
  private store: RateLimitStore;
  private windowMs: number;
  private maxRequests: number;
  private message: string;

  constructor(options: {
    windowMs: number;
    max: number;
    message?: string;
  }) {
    this.store = new RateLimitStore();
    this.windowMs = options.windowMs;
    this.maxRequests = options.max;
    this.message = options.message || 'Too many requests';

    // Cleanup expired entries every minute
    setInterval(() => this.store.cleanup(), 60000);
  }

  async check(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
  }> {
    const entry = this.store.increment(identifier, this.windowMs);
    const allowed = entry.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      message: !allowed ? this.message : undefined
    };
  }

  getStats(): {
    activeClients: number;
    totalRequests: number;
  } {
    return {
      activeClients: this.store.size(),
      totalRequests: Array.from(this.store['requests'].values())
        .reduce((sum, entry) => sum + entry.count, 0)
    };
  }

  reset(): void {
    this.store.clear();
  }
}

// Default webhook rate limiter instance
export const webhookRateLimiter = new RateLimiter({
  windowMs: WEBHOOK_CONSTANTS.RATE_LIMIT.WINDOW_MS,
  max: WEBHOOK_CONSTANTS.RATE_LIMIT.MAX_REQUESTS,
  message: 'Too many webhook requests from this IP'
});

/**
 * Enhanced rate limiting with different limits based on environment
 */
export class EnvironmentAwareRateLimiter {
  private productionLimiter: RateLimiter;
  private sandboxLimiter: RateLimiter;

  constructor() {
    // Production: stricter limits
    this.productionLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 requests per minute
      message: 'Production webhook rate limit exceeded'
    });

    // Sandbox: more lenient for testing
    this.sandboxLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute
      message: 'Sandbox webhook rate limit exceeded'
    });
  }

  async check(identifier: string, environment: 'sandbox' | 'production'): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
  }> {
    const limiter = environment === 'sandbox' ? this.sandboxLimiter : this.productionLimiter;
    return limiter.check(identifier);
  }

  getStats(environment?: 'sandbox' | 'production'): any {
    if (environment === 'sandbox') return this.sandboxLimiter.getStats();
    if (environment === 'production') return this.productionLimiter.getStats();
    
    return {
      production: this.productionLimiter.getStats(),
      sandbox: this.sandboxLimiter.getStats()
    };
  }

  reset(): void {
    this.productionLimiter.reset();
    this.sandboxLimiter.reset();
  }
}

export const environmentRateLimiter = new EnvironmentAwareRateLimiter();
