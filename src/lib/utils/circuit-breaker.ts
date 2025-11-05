/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping requests to failing services.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 *
 * State Machine:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail fast
 * - HALF_OPEN: Testing if service recovered, limited requests pass
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeout: 60000,
 *   halfOpenRequests: 3,
 * });
 *
 * const result = await breaker.execute(async () => {
 *   return await externalApiCall();
 * });
 * ```
 */

import { logger } from '@/utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit */
  resetTimeout: number;
  /** Number of requests to test in HALF_OPEN state */
  halfOpenRequests?: number;
  /** Service name for logging */
  serviceName?: string;
  /** Custom function to determine if error should count as failure */
  isFailure?: (error: Error) => boolean;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  halfOpenAttempts: number;
}

/**
 * Circuit breaker error thrown when circuit is open
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly state: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
    Object.setPrototypeOf(this, CircuitBreakerError.prototype);
  }
}

/**
 * Default function to determine if error should count as failure
 */
function defaultIsFailure(error: Error): boolean {
  // Don't count validation errors or client errors as failures
  const message = error.message.toLowerCase();
  if (message.includes('validation')) return false;
  if (message.includes('invalid input')) return false;
  if (message.includes('bad request')) return false;

  // Count network errors, timeouts, and server errors as failures
  return true;
}

/**
 * Circuit Breaker implementation for preventing cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private consecutiveFailures = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private halfOpenAttempts = 0;
  private resetTimer?: NodeJS.Timeout;

  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      halfOpenRequests: 3,
      serviceName: 'unknown',
      isFailure: defaultIsFailure,
      ...config,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit allows request
    if (!this.canExecute()) {
      throw new CircuitBreakerError(
        `Circuit breaker is ${this.state} for ${this.config.serviceName}`,
        this.config.serviceName,
        this.state
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Check if request can be executed based on current state
   */
  private canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if reset timeout has elapsed
        if (this.shouldAttemptReset()) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited requests in HALF_OPEN state
        return this.halfOpenAttempts < this.config.halfOpenRequests;

      default:
        return false;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    this.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;

      // If enough successes in HALF_OPEN, close circuit
      if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
        this.transitionToClosed();
      }
    }

    logger.info(`[CircuitBreaker] ${this.config.serviceName} - Success`, {
      state: this.state,
      successes: this.successes,
      failures: this.failures,
    });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    // Check if error should count as failure
    if (!this.config.isFailure(error)) {
      logger.info(`[CircuitBreaker] ${this.config.serviceName} - Ignoring non-failure error`, {
        error: error.message,
      });
      return;
    }

    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    logger.warn(`[CircuitBreaker] ${this.config.serviceName} - Failure`, {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      threshold: this.config.failureThreshold,
      error: error.message,
    });

    // Transition based on current state
    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately reopens circuit
      this.transitionToOpen();
    } else if (this.consecutiveFailures >= this.config.failureThreshold) {
      // Too many failures in CLOSED state
      this.transitionToOpen();
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const elapsedTime = Date.now() - this.lastFailureTime;
    return elapsedTime >= this.config.resetTimeout;
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    logger.info(`[CircuitBreaker] ${this.config.serviceName} - Transitioned to CLOSED`, {
      successes: this.successes,
      failures: this.failures,
    });
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.halfOpenAttempts = 0;

    // Schedule automatic transition to HALF_OPEN
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.transitionToHalfOpen();
    }, this.config.resetTimeout);

    logger.error(`[CircuitBreaker] ${this.config.serviceName} - Transitioned to OPEN`, {
      consecutiveFailures: this.consecutiveFailures,
      threshold: this.config.failureThreshold,
      resetTimeout: this.config.resetTimeout,
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenAttempts = 0;

    logger.info(`[CircuitBreaker] ${this.config.serviceName} - Transitioned to HALF_OPEN`, {
      allowedRequests: this.config.halfOpenRequests,
    });
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionToClosed();
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;

    logger.info(`[CircuitBreaker] ${this.config.serviceName} - Manually reset`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Check if an error is a circuit breaker error
 */
export function isCircuitBreakerError(error: unknown): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError;
}
