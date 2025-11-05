/**
 * Shippo API Circuit Breaker
 *
 * Adds circuit breaker protection to Shippo shipping rate calculations.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 *
 * The circuit breaker prevents cascading failures by:
 * - Opening after 5 consecutive failures
 * - Staying open for 45 seconds (shorter for shipping quotes)
 * - Testing with 2 requests in HALF_OPEN state
 *
 * @example
 * ```typescript
 * import { resilientShippingApi } from '@/lib/shipping/shippo-circuit-breaker';
 *
 * const result = await resilientShippingApi.calculateShippingRates({
 *   fromAddress,
 *   toAddress,
 *   parcel
 * });
 * ```
 */

import { CircuitBreaker, CircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { calculateShippingRates, type RateCalculationParams } from './rate-calculation';
import { logger } from '@/utils/logger';

/**
 * Circuit breaker configuration for Shippo API
 */
const shippoCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 45000, // Stay open for 45 seconds (shorter for shipping)
  halfOpenRequests: 2, // Test with 2 requests
  serviceName: 'ShippoAPI',
  isFailure: (error: Error) => {
    const message = error.message.toLowerCase();

    // Don't count authentication/configuration errors as circuit failures
    if (message.includes('api key') || message.includes('not configured')) {
      return false;
    }

    // Don't count validation errors (bad addresses, invalid parcel)
    if (
      message.includes('validation') ||
      message.includes('invalid address') ||
      message.includes('invalid parcel')
    ) {
      return false;
    }

    // Count network errors, timeouts, and service errors
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('service unavailable')
    ) {
      return true;
    }

    // Default: count as failure
    return true;
  },
});

/**
 * Resilient shipping API with circuit breaker protection
 */
export const resilientShippingApi = {
  /**
   * Calculate shipping rates with circuit breaker protection
   */
  async calculateShippingRates(params: RateCalculationParams) {
    try {
      return await shippoCircuitBreaker.execute(async () => {
        return await calculateShippingRates(params);
      });
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        logger.error('Shippo API circuit breaker is open', {
          state: error.state,
          stats: shippoCircuitBreaker.getStats(),
        });

        // Return error result instead of throwing
        return {
          success: false,
          error:
            'Shipping rate calculation is temporarily unavailable. Please try again in a few moments.',
        };
      }

      // For non-circuit-breaker errors, check if it's already an error result
      if (error && typeof error === 'object' && 'success' in error) {
        return error as { success: boolean; error?: string };
      }

      // Convert other errors to error result
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rate calculation failed',
      };
    }
  },

  /**
   * Get circuit breaker statistics
   */
  getCircuitStats() {
    return shippoCircuitBreaker.getStats();
  },

  /**
   * Manually reset circuit breaker (admin operation)
   */
  resetCircuit() {
    shippoCircuitBreaker.reset();
    logger.info('Shippo API circuit breaker manually reset');
  },
};
