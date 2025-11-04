/**
 * Validation Configuration
 *
 * Configuration for external API validation including sampling rates,
 * rate limiting, and environment-specific settings.
 */

/**
 * Validation configuration per environment
 */
export interface ValidationConfig {
  /** Whether validation is enabled */
  enabled: boolean;
  /** Sample rate (0.0 to 1.0) - percentage of requests to validate */
  sampleRate: number;
  /** Whether to log validation failures to console */
  logToConsole: boolean;
  /** Whether to send validation failures to error monitoring */
  sendToErrorMonitoring: boolean;
  /** Rate limit for validation error logging (max errors per minute) */
  errorLogRateLimit: number;
}

/**
 * Get validation configuration based on environment
 */
export function getValidationConfig(): ValidationConfig {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const isTest = env === 'test';

  // Override via environment variable
  const sampleRateOverride = process.env.VALIDATION_SAMPLE_RATE
    ? parseFloat(process.env.VALIDATION_SAMPLE_RATE)
    : undefined;

  if (isTest) {
    // Tests: Validate everything, don't send to monitoring
    return {
      enabled: true,
      sampleRate: 1.0,
      logToConsole: false,
      sendToErrorMonitoring: false,
      errorLogRateLimit: 1000, // High limit for tests
    };
  }

  if (isProduction) {
    // Production: Sample 10% by default, send to monitoring
    return {
      enabled: true,
      sampleRate: sampleRateOverride ?? 0.1, // 10% sampling in production
      logToConsole: false,
      sendToErrorMonitoring: true,
      errorLogRateLimit: 10, // Max 10 errors per minute per API
    };
  }

  // Development/Staging: Validate everything, log to console
  return {
    enabled: true,
    sampleRate: sampleRateOverride ?? 1.0, // 100% in development
    logToConsole: true,
    sendToErrorMonitoring: true,
    errorLogRateLimit: 50, // Higher limit for dev
  };
}

/**
 * Determine if a request should be validated based on sample rate
 */
export function shouldValidate(sampleRate: number): boolean {
  // Always validate if sample rate is 1.0
  if (sampleRate >= 1.0) {
    return true;
  }

  // Never validate if sample rate is 0
  if (sampleRate <= 0) {
    return false;
  }

  // Random sampling based on rate
  return Math.random() < sampleRate;
}

/**
 * Simple in-memory rate limiter for validation error logging
 */
class RateLimiter {
  private counts: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly windowMs = 60000; // 1 minute window

  /**
   * Check if an action is allowed within rate limit
   */
  check(key: string, maxRequests: number): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);

    // No entry or window expired
    if (!entry || now > entry.resetAt) {
      this.counts.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    // Within window, check count
    if (entry.count < maxRequests) {
      entry.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  reset(): void {
    this.counts.clear();
  }
}

/**
 * Global rate limiter instance
 */
export const validationErrorRateLimiter = new RateLimiter();
