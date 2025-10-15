/**
 * Resilient Payment Processor
 * Implements retry logic, circuit breaker pattern, and comprehensive error handling
 * for Square payment processing
 */

import * as Square from 'square';
import { squareClient } from './client';
import { performanceMonitor } from '../monitoring/performance';
import { randomUUID } from 'crypto';

interface PaymentRequest {
  amount: number;
  currency: string;
  source_id: string;
  order_id?: string;
  customer_id?: string;
  location_id?: string;
  note?: string;
  metadata?: Record<string, string>;
}

interface PaymentResult {
  success: boolean;
  payment?: any;
  payment_id?: string;
  error?: PaymentError;
  attempts: number;
  total_duration_ms: number;
}

interface PaymentError {
  code: string;
  category: string;
  detail: string;
  retryable: boolean;
  retry_after_ms?: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttempt: Date | null;
}

export class ResilientPaymentProcessor {
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 2000, 4000]; // Progressive backoff
  private readonly timeout = 30000; // 30 seconds
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerResetTime = 60000; // 1 minute

  private paymentsApi: any;
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: null,
    state: 'CLOSED',
    nextAttempt: null,
  };

  constructor() {
    this.paymentsApi = squareClient.paymentsApi;
  }

  /**
   * Process payment with resilience features
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const startTime = Date.now();
    let lastError: PaymentError | null = null;
    let attempts = 0;

    // Check circuit breaker
    if (!this.canAttemptPayment()) {
      return {
        success: false,
        error: {
          code: 'CIRCUIT_BREAKER_OPEN',
          category: 'SYSTEM_ERROR',
          detail: 'Payment system temporarily unavailable due to high failure rate',
          retryable: true,
          retry_after_ms: this.getCircuitBreakerResetTime(),
        },
        attempts: 0,
        total_duration_ms: Date.now() - startTime,
      };
    }

    // Attempt payment with retries
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      attempts++;

      try {
        // Add idempotency key for each attempt
        const idempotencyKey = this.generateIdempotencyKey(request, attempt);

        // Process payment with timeout
        const result = await this.processWithTimeout(request, idempotencyKey);

        // Track success metrics
        const duration = Date.now() - startTime;
        await this.logPaymentMetrics(result, attempts, duration, true);

        // Reset circuit breaker on success
        this.resetCircuitBreaker();

        return {
          success: true,
          payment: result,
          payment_id: result.id,
          attempts,
          total_duration_ms: duration,
        };
      } catch (error) {
        const paymentError = this.parsePaymentError(error);
        lastError = paymentError;

        await this.handlePaymentError(paymentError, attempt, request);

        // Check if we should retry
        if (!this.shouldRetry(paymentError, attempt)) {
          break;
        }

        // Wait before retry (unless it's the last attempt)
        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateRetryDelay(attempt, paymentError);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    await this.logPaymentMetrics(null, attempts, duration, false);
    await this.alertPaymentFailure(request, lastError!);

    // Update circuit breaker
    this.recordFailure();

    return {
      success: false,
      error: lastError!,
      attempts,
      total_duration_ms: duration,
    };
  }

  /**
   * Process payment with timeout protection
   */
  private async processWithTimeout(request: PaymentRequest, idempotencyKey: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const squareRequest: any = {
        sourceId: request.source_id,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(Math.round(request.amount * 100)), // Convert to cents
          currency: request.currency.toUpperCase(),
        },
        locationId: request.location_id || process.env.SQUARE_LOCATION_ID,
        orderId: request.order_id,
        customerId: request.customer_id,
        note: request.note,
        appFeeMoney: undefined, // Could be configured for marketplace scenarios
        delayCapture: false,
        autocomplete: true,
        externalDetails: request.metadata
          ? {
              type: 'OTHER',
              source: JSON.stringify(request.metadata),
            }
          : undefined,
      };

      const { result } = await this.paymentsApi.createPayment(squareRequest);

      if (!result.payment) {
        throw new Error('Payment creation failed - no payment object returned');
      }

      return result.payment;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate unique idempotency key for each attempt
   */
  private generateIdempotencyKey(request: PaymentRequest, attempt: number): string {
    const baseKey = request.order_id || randomUUID();
    const timestamp = Date.now();
    return `${baseKey}-${attempt}-${timestamp}`;
  }

  /**
   * Parse Square API errors into structured format
   */
  private parsePaymentError(error: any): PaymentError {
    // Handle timeout errors
    if (error.name === 'AbortError' || error.code === 'TIMEOUT') {
      return {
        code: 'TIMEOUT',
        category: 'NETWORK_ERROR',
        detail: 'Payment request timed out',
        retryable: true,
        retry_after_ms: 2000,
      };
    }

    // Handle network errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      return {
        code: error.code,
        category: 'NETWORK_ERROR',
        detail: 'Network connection error',
        retryable: true,
        retry_after_ms: 1000,
      };
    }

    // Handle Square API errors
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      const squareError = error.errors[0];
      return {
        code: squareError.code || 'UNKNOWN_SQUARE_ERROR',
        category: squareError.category || 'API_ERROR',
        detail: squareError.detail || 'Unknown Square API error',
        retryable: this.isRetryableSquareError(squareError.code),
        retry_after_ms: this.getRetryAfterMs(squareError.code),
      };
    }

    // Generic error fallback
    return {
      code: 'UNKNOWN_ERROR',
      category: 'SYSTEM_ERROR',
      detail: error.message || 'Unknown payment processing error',
      retryable: false,
    };
  }

  /**
   * Determine if a Square error is retryable
   */
  private isRetryableSquareError(errorCode: string): boolean {
    const retryableCodes = [
      'INTERNAL_SERVER_ERROR',
      'SERVICE_UNAVAILABLE',
      'GATEWAY_TIMEOUT',
      'REQUEST_TIMEOUT',
      'RATE_LIMITED',
      'TEMPORARY_REDIRECT',
    ];

    const nonRetryableCodes = [
      'INVALID_REQUEST_ERROR',
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR',
      'NOT_FOUND_ERROR',
      'CARD_DECLINED',
      'VERIFY_CVV_FAILURE',
      'VERIFY_AVS_FAILURE',
      'CARD_EXPIRED',
      'INSUFFICIENT_FUNDS',
    ];

    if (nonRetryableCodes.includes(errorCode)) {
      return false;
    }

    return retryableCodes.includes(errorCode) || errorCode.includes('TIMEOUT');
  }

  /**
   * Get retry delay for specific error types
   */
  private getRetryAfterMs(errorCode: string): number {
    switch (errorCode) {
      case 'RATE_LIMITED':
        return 5000; // 5 seconds for rate limiting
      case 'SERVICE_UNAVAILABLE':
        return 10000; // 10 seconds for service issues
      default:
        return 1000; // Default 1 second
    }
  }

  /**
   * Calculate retry delay with jitter
   */
  private calculateRetryDelay(attempt: number, error: PaymentError): number {
    const baseDelay = error.retry_after_ms || this.retryDelays[attempt] || 4000;

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;

    return baseDelay + jitter;
  }

  /**
   * Determine if payment should be retried
   */
  private shouldRetry(error: PaymentError, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= this.maxRetries - 1) {
      return false;
    }

    // Don't retry non-retryable errors
    return error.retryable;
  }

  /**
   * Circuit breaker methods
   */
  private canAttemptPayment(): boolean {
    const now = new Date();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (this.circuitBreaker.nextAttempt && now >= this.circuitBreaker.nextAttempt) {
          this.circuitBreaker.state = 'HALF_OPEN';
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return true;
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = new Date();

    if (this.circuitBreaker.failures >= this.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttempt = new Date(Date.now() + this.circuitBreakerResetTime);
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.lastFailure = null;
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.nextAttempt = null;
  }

  private getCircuitBreakerResetTime(): number {
    if (this.circuitBreaker.nextAttempt) {
      return Math.max(0, this.circuitBreaker.nextAttempt.getTime() - Date.now());
    }
    return this.circuitBreakerResetTime;
  }

  /**
   * Logging and monitoring methods
   */
  private async logPaymentMetrics(
    payment: any | null,
    attempts: number,
    duration: number,
    success: boolean
  ): Promise<void> {
    await performanceMonitor.trackBusinessMetric(
      'payment_processing',
      duration,
      {
        success: success.toString(),
        attempts: attempts.toString(),
        circuit_breaker_state: this.circuitBreaker.state,
      },
      {
        payment_id: payment?.id,
        amount: payment?.amountMoney?.amount?.toString(),
        currency: payment?.amountMoney?.currency,
      }
    );

    // Log to application logs
    if (success) {
      console.log(`💳 Payment processed successfully in ${duration}ms (${attempts} attempts)`);
    } else {
      console.error(`❌ Payment failed after ${attempts} attempts (${duration}ms)`);
    }
  }

  private async handlePaymentError(
    error: PaymentError,
    attempt: number,
    request: PaymentRequest
  ): Promise<void> {
    // Track error metrics
    await performanceMonitor.trackBusinessMetric(
      'payment_error',
      1,
      {
        error_code: error.code,
        error_category: error.category,
        attempt: (attempt + 1).toString(),
        retryable: error.retryable.toString(),
      },
      {
        order_id: request.order_id,
        amount: request.amount,
        currency: request.currency,
      }
    );

    // Log error details
    console.error(`🚨 Payment error (attempt ${attempt + 1}):`, {
      code: error.code,
      category: error.category,
      detail: error.detail,
      retryable: error.retryable,
      order_id: request.order_id,
    });
  }

  private async alertPaymentFailure(request: PaymentRequest, error: PaymentError): Promise<void> {
    // In production, integrate with alerting system
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Payment processing failed after all retries', {
        order_id: request.order_id,
        error_code: error.code,
        error_detail: error.detail,
        amount: request.amount,
        currency: request.currency,
      });

      // Could integrate with:
      // - Sentry for error tracking
      // - PagerDuty for alerting
      // - Slack for notifications
      // - Email alerts to admin team
    }
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      circuit_breaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        last_failure: this.circuitBreaker.lastFailure,
        next_attempt: this.circuitBreaker.nextAttempt,
      },
      configuration: {
        max_retries: this.maxRetries,
        timeout_ms: this.timeout,
        circuit_breaker_threshold: this.circuitBreakerThreshold,
        circuit_breaker_reset_time_ms: this.circuitBreakerResetTime,
      },
    };
  }
}

// Singleton instance
export const resilientPaymentProcessor = new ResilientPaymentProcessor();
