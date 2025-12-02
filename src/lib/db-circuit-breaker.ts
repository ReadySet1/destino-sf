/**
 * Database Circuit Breaker
 *
 * Prevents cascade failures when the database is unreachable.
 * Uses the circuit breaker pattern to fail fast during outages.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Fast-fail all requests (database assumed down)
 * - HALF_OPEN: Allow single probe request to test recovery
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time window in ms to count failures */
  failureWindow: number;
  /** Time in ms before attempting recovery (OPEN -> HALF_OPEN) */
  recoveryTimeout: number;
  /** Number of successful probes needed to close circuit */
  successThreshold: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
  totalTrips: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // 5 failures to open
  failureWindow: 60000, // within 60 seconds
  recoveryTimeout: 30000, // wait 30 seconds before probing
  successThreshold: 2, // 2 successful probes to close
};

class DatabaseCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: { timestamp: number }[] = [];
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChange: number = Date.now();
  private totalTrips = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    this.updateState();
    return {
      state: this.state,
      failures: this.getRecentFailureCount(),
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
      totalTrips: this.totalTrips,
    };
  }

  /**
   * Check if request should be allowed through
   */
  canExecute(): boolean {
    this.updateState();

    switch (this.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        return false;
      case 'HALF_OPEN':
        // Allow single probe request
        return true;
      default:
        return true;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
        this.successCount = 0;
        this.failures = [];
      }
    } else if (this.state === 'CLOSED') {
      // Clear old failures on success in closed state
      this.pruneOldFailures();
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(error?: Error): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures.push({ timestamp: now });

    if (this.state === 'HALF_OPEN') {
      // Probe failed, go back to OPEN
      this.transitionTo('OPEN');
      this.successCount = 0;
    } else if (this.state === 'CLOSED') {
      this.pruneOldFailures();
      if (this.getRecentFailureCount() >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
        this.totalTrips++;

        if (process.env.DB_DEBUG === 'true') {
          console.warn('[CIRCUIT_BREAKER] Circuit opened due to failures', {
            failures: this.getRecentFailureCount(),
            threshold: this.config.failureThreshold,
            error: error?.message,
          });
        }
      }
    }
  }

  /**
   * Force circuit to specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
    if (state === 'CLOSED') {
      this.failures = [];
      this.successCount = 0;
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = [];
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastStateChange = Date.now();
  }

  /**
   * Get error for when circuit is open
   */
  getOpenCircuitError(): Error {
    const error = new Error(
      'Database circuit breaker is OPEN. Service is temporarily unavailable. ' +
        `Will retry in ${Math.ceil((this.config.recoveryTimeout - (Date.now() - this.lastStateChange)) / 1000)}s.`
    );
    (error as any).code = 'CIRCUIT_OPEN';
    (error as any).circuitState = this.state;
    return error;
  }

  private updateState(): void {
    if (this.state === 'OPEN') {
      const timeSinceOpen = Date.now() - this.lastStateChange;
      if (timeSinceOpen >= this.config.recoveryTimeout) {
        this.transitionTo('HALF_OPEN');
        this.successCount = 0;

        if (process.env.DB_DEBUG === 'true') {
          console.log('[CIRCUIT_BREAKER] Circuit transitioning to HALF_OPEN for probe');
        }
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.lastStateChange = Date.now();

      if (process.env.DB_DEBUG === 'true') {
        console.log(`[CIRCUIT_BREAKER] State transition: ${oldState} -> ${newState}`);
      }
    }
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.config.failureWindow;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }

  private getRecentFailureCount(): number {
    this.pruneOldFailures();
    return this.failures.length;
  }
}

// Singleton instance for database operations
export const dbCircuitBreaker = new DatabaseCircuitBreaker({
  failureThreshold: 5, // 5 connection failures
  failureWindow: 60000, // within 60 seconds
  recoveryTimeout: 30000, // wait 30 seconds before probing
  successThreshold: 2, // 2 successful operations to close
});

/**
 * Execute operation with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  if (!dbCircuitBreaker.canExecute()) {
    throw dbCircuitBreaker.getOpenCircuitError();
  }

  try {
    const result = await operation();
    dbCircuitBreaker.recordSuccess();
    return result;
  } catch (error) {
    // Only record connection-related failures
    if (isCircuitBreakerTriggerError(error as Error)) {
      dbCircuitBreaker.recordFailure(error as Error);
    }
    throw error;
  }
}

/**
 * Check if error should trigger circuit breaker
 */
function isCircuitBreakerTriggerError(error: Error): boolean {
  const triggerErrors = [
    "Can't reach database server",
    'Connection terminated',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'connection timeout',
    'Socket timeout',
    'Connection pool timeout',
    'Timed out fetching a new connection',
  ];

  const triggerCodes = ['P1001', 'P1008', 'P2024'];

  const message = error.message;
  const code = (error as any).code;

  return (
    triggerErrors.some(msg => message.includes(msg)) ||
    (code && triggerCodes.includes(code))
  );
}

/**
 * Get circuit breaker status for health checks
 */
export function getCircuitBreakerStatus(): CircuitBreakerMetrics {
  return dbCircuitBreaker.getMetrics();
}
