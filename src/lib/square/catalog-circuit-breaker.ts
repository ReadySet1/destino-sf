/**
 * Square Catalog API Circuit Breaker
 *
 * Adds circuit breaker protection to Square Catalog API calls.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 *
 * The circuit breaker prevents cascading failures by:
 * - Opening after 5 consecutive failures
 * - Staying open for 60 seconds
 * - Testing with 3 requests in HALF_OPEN state
 *
 * @example
 * ```typescript
 * // Use resilient catalog API instead of direct API
 * import { resilientCatalogApi } from '@/lib/square/catalog-circuit-breaker';
 *
 * const object = await resilientCatalogApi.retrieveCatalogObject('item-123');
 * ```
 */

import { CircuitBreaker, CircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { directCatalogApi } from './catalog-api';
import { logger } from '@/utils/logger';

/**
 * Circuit breaker configuration for Square Catalog API
 */
const catalogCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 60000, // Stay open for 60 seconds
  halfOpenRequests: 3, // Test with 3 requests
  serviceName: 'SquareCatalogAPI',
  isFailure: (error: Error) => {
    // Don't count authentication errors or client errors as circuit failures
    const message = error.message.toLowerCase();

    // Authentication errors should be fixed via config, not circuit breaking
    if (message.includes('authentication') || message.includes('401')) {
      return false;
    }

    // Invalid object IDs are client errors, not service failures
    if (message.includes('not found') || message.includes('404')) {
      return false;
    }

    // Count network errors, timeouts, and server errors
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return true;
    }

    // Default: count as failure
    return true;
  },
});

/**
 * Resilient catalog API with circuit breaker protection
 */
export const resilientCatalogApi = {
  /**
   * Retrieve catalog object with circuit breaker protection
   */
  async retrieveCatalogObject(objectId: string) {
    try {
      return await catalogCircuitBreaker.execute(async () => {
        return await directCatalogApi.retrieveCatalogObject(objectId);
      });
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('Square Catalog API circuit breaker is open', {
          objectId,
          state: error.state,
          stats: catalogCircuitBreaker.getStats(),
        });
        throw new Error(`Square Catalog API is temporarily unavailable. Please try again later.`);
      }
      throw error;
    }
  },

  /**
   * Search catalog objects with circuit breaker protection
   */
  async searchCatalogObjects(requestBody: any) {
    try {
      return await catalogCircuitBreaker.execute(async () => {
        return await directCatalogApi.searchCatalogObjects(requestBody);
      });
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('Square Catalog API circuit breaker is open', {
          state: error.state,
          stats: catalogCircuitBreaker.getStats(),
        });
        throw new Error(`Square Catalog API is temporarily unavailable. Please try again later.`);
      }
      throw error;
    }
  },

  /**
   * List catalog with circuit breaker protection
   */
  async listCatalog(cursor?: string, objectTypes?: string) {
    try {
      return await catalogCircuitBreaker.execute(async () => {
        return await directCatalogApi.listCatalog(cursor, objectTypes);
      });
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('Square Catalog API circuit breaker is open', {
          state: error.state,
          stats: catalogCircuitBreaker.getStats(),
        });
        throw new Error(`Square Catalog API is temporarily unavailable. Please try again later.`);
      }
      throw error;
    }
  },

  /**
   * Test connection with circuit breaker protection
   */
  async testConnection() {
    try {
      return await catalogCircuitBreaker.execute(async () => {
        return await directCatalogApi.testConnection();
      });
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('Square Catalog API circuit breaker is open', {
          state: error.state,
          stats: catalogCircuitBreaker.getStats(),
        });
        return {
          success: false,
          environment: 'unknown' as const,
          apiHost: 'unknown',
          error: 'Circuit breaker is open - service temporarily unavailable',
        };
      }
      throw error;
    }
  },

  /**
   * Get circuit breaker statistics
   */
  getCircuitStats() {
    return catalogCircuitBreaker.getStats();
  },

  /**
   * Manually reset circuit breaker (admin operation)
   */
  resetCircuit() {
    catalogCircuitBreaker.reset();
    logger.info('Square Catalog API circuit breaker manually reset');
  },
};
