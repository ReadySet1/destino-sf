/**
 * Request Deduplicator
 *
 * Prevents duplicate concurrent requests from being processed multiple times.
 * Part of DES-60 Phase 4: Concurrent Operations & Race Conditions
 *
 * The deduplicator caches in-flight requests and returns the same Promise
 * for duplicate requests with the same key. This prevents:
 * - Double-submit on button clicks
 * - Concurrent API calls for the same resource
 * - Redundant database queries
 *
 * @example
 * ```typescript
 * const deduplicator = new RequestDeduplicator({ ttl: 5000 });
 *
 * // First call - executes the function
 * const result1 = await deduplicator.deduplicate('checkout-user123', async () => {
 *   return await createOrder(cart);
 * });
 *
 * // Second concurrent call with same key - returns the same Promise
 * const result2 = await deduplicator.deduplicate('checkout-user123', async () => {
 *   return await createOrder(cart); // This won't execute
 * });
 *
 * // result1 === result2 (same order)
 * ```
 */

import { logger } from '@/utils/logger';

/**
 * Options for request deduplicator
 */
export interface RequestDeduplicatorOptions {
  /** Time-to-live for cached requests in milliseconds (default: 5000ms) */
  ttl?: number;
  /** Whether to log duplicate request attempts */
  logDuplicates?: boolean;
}

/**
 * Request deduplicator class
 *
 * Caches in-flight requests and deduplicates concurrent requests with the same key.
 */
export class RequestDeduplicator {
  private cache: Map<string, Promise<unknown>> = new Map();
  private ttl: number;
  private logDuplicates: boolean;

  constructor(options: RequestDeduplicatorOptions = {}) {
    this.ttl = options.ttl ?? 5000; // 5 seconds default
    this.logDuplicates = options.logDuplicates ?? true;
  }

  /**
   * Deduplicate a request
   *
   * If a request with the same key is already in progress, returns that Promise.
   * Otherwise, executes the function and caches the Promise.
   *
   * @param key - Unique key for the request
   * @param fn - Function to execute if not cached
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * const order = await deduplicator.deduplicate(
   *   `order-${userId}-${timestamp}`,
   *   async () => {
   *     return await createOrder(cart);
   *   }
   * );
   * ```
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in progress
    if (this.cache.has(key)) {
      if (this.logDuplicates) {
        logger.info(`Duplicate request detected, using cached promise`, {
          key,
          cacheSize: this.cache.size,
        });
      }

      return this.cache.get(key) as Promise<T>;
    }

    // Execute the function and cache the promise
    const promise = (async () => {
      try {
        const result = await fn();

        logger.debug(`Request completed successfully`, {
          key,
        });

        return result;
      } catch (error) {
        // Remove from cache on error so it can be retried
        this.cache.delete(key);

        logger.warn(`Request failed, removed from cache`, {
          key,
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      } finally {
        // Schedule cache cleanup
        setTimeout(() => {
          this.cache.delete(key);
          logger.debug(`Request cache entry expired`, { key });
        }, this.ttl);
      }
    })();

    // Cache the promise
    this.cache.set(key, promise);

    logger.debug(`Request cached`, {
      key,
      cacheSize: this.cache.size,
    });

    return promise as Promise<T>;
  }

  /**
   * Check if a request is currently in progress
   *
   * @param key - Request key to check
   * @returns True if the request is in progress
   */
  isInProgress(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear the cache for a specific key
   *
   * @param key - Request key to clear
   */
  clear(key: string): void {
    this.cache.delete(key);
    logger.debug(`Request cache entry manually cleared`, { key });
  }

  /**
   * Clear all cached requests
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`All request cache entries cleared`, { count: size });
  }

  /**
   * Get the number of cached requests
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Global request deduplicator instance
 *
 * Use this for general request deduplication across the application.
 */
export const globalDeduplicator = new RequestDeduplicator({
  ttl: 5000, // 5 seconds
  logDuplicates: true,
});

/**
 * Decorator for deduplicating method calls
 *
 * @param keyFn - Function to generate the deduplication key from method arguments
 * @param options - Deduplicator options
 *
 * @example
 * ```typescript
 * class OrderService {
 *   @deduplicate((userId, items) => `checkout-${userId}`)
 *   async createOrder(userId: string, items: CartItem[]) {
 *     return await prisma.order.create({ ... });
 *   }
 * }
 * ```
 */
export function deduplicate<T extends (...args: any[]) => Promise<any>>(
  keyFn: (...args: Parameters<T>) => string,
  options: RequestDeduplicatorOptions = {}
) {
  const deduplicator = new RequestDeduplicator(options);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyFn(...args);
      return deduplicator.deduplicate(key, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Create a user-specific deduplicator key
 *
 * @param userId - User ID
 * @param operation - Operation name
 * @param extras - Additional key components
 * @returns Deduplication key
 *
 * @example
 * ```typescript
 * const key = userKey('user-123', 'checkout', cart.id);
 * // Returns: 'user-123:checkout:cart-456'
 * ```
 */
export function userKey(userId: string, operation: string, ...extras: string[]): string {
  return [userId, operation, ...extras].join(':');
}

/**
 * Create a resource-specific deduplicator key
 *
 * @param resource - Resource type
 * @param id - Resource ID
 * @param operation - Operation name
 * @returns Deduplication key
 *
 * @example
 * ```typescript
 * const key = resourceKey('order', 'order-123', 'payment');
 * // Returns: 'order:order-123:payment'
 * ```
 */
export function resourceKey(resource: string, id: string, operation: string): string {
  return `${resource}:${id}:${operation}`;
}
