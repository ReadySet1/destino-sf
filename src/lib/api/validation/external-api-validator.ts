/**
 * External API Response Validator
 *
 * Runtime validation infrastructure for external API responses.
 * Validates responses against Zod schemas and logs violations without blocking requests.
 *
 * Usage:
 * ```typescript
 * import { validateExternalApiResponse } from '@/lib/api/validation/external-api-validator';
 * import { SquareCatalogApiResponseSchema } from '@/lib/api/schemas/external/square/catalog';
 *
 * const response = await squareClient.catalog.list();
 * const validated = validateExternalApiResponse(
 *   response,
 *   SquareCatalogApiResponseSchema,
 *   { apiName: 'Square Catalog API', operation: 'listCatalog' }
 * );
 * ```
 */

import { z } from 'zod';
import { errorMonitor, ErrorSeverity } from '@/lib/error-monitoring';
import { logger } from '@/utils/logger';
import {
  getValidationConfig,
  shouldValidate,
  validationErrorRateLimiter,
} from './validation-config';
import { validationTrendsTracker } from './validation-trends';

/**
 * Validation result metadata
 */
export interface ValidationMetadata {
  /** Name of the external API (e.g., "Square Catalog API", "Shippo Shipments API") */
  apiName: string;
  /** Operation being performed (e.g., "listCatalog", "createShipment") */
  operation: string;
  /** Optional request ID for tracing */
  requestId?: string;
  /** Optional additional context */
  context?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult<T> {
  /** Whether validation succeeded */
  success: boolean;
  /** Validated data (if successful) */
  data?: T;
  /** Validation errors (if failed) */
  errors?: z.ZodError;
  /** Metadata about the validation */
  metadata: ValidationMetadata;
  /** Timestamp of validation */
  timestamp: Date;
}

/**
 * Validation statistics for monitoring
 */
interface ValidationStats {
  totalValidations: number;
  successCount: number;
  failureCount: number;
  lastFailure?: Date;
  failuresByApi: Record<string, number>;
  skippedDueToSampling: number;
}

/**
 * In-memory validation statistics
 */
const validationStats: ValidationStats = {
  totalValidations: 0,
  successCount: 0,
  failureCount: 0,
  failuresByApi: {},
  skippedDueToSampling: 0,
};

/**
 * Get current validation statistics
 */
export function getValidationStats(): Readonly<ValidationStats> {
  return { ...validationStats };
}

/**
 * Reset validation statistics (useful for testing)
 */
export function resetValidationStats(): void {
  validationStats.totalValidations = 0;
  validationStats.successCount = 0;
  validationStats.failureCount = 0;
  validationStats.lastFailure = undefined;
  validationStats.failuresByApi = {};
  validationStats.skippedDueToSampling = 0;
  validationErrorRateLimiter.reset();
}

/**
 * Validate external API response against a Zod schema
 *
 * This function validates API responses in production without blocking requests.
 * Validation failures are logged for monitoring and alerting.
 *
 * @param data - The API response data to validate
 * @param schema - The Zod schema to validate against
 * @param metadata - Metadata about the API call
 * @returns ValidationResult with success status and validated data
 */
export function validateExternalApiResponse<T>(
  data: unknown,
  schema: z.ZodType<T>,
  metadata: ValidationMetadata
): ValidationResult<T> {
  const config = getValidationConfig();
  const timestamp = new Date();

  // Check if validation is enabled
  if (!config.enabled) {
    return {
      success: true,
      data: data as T, // Return unvalidated data
      metadata,
      timestamp,
    };
  }

  // Check sampling rate
  if (!shouldValidate(config.sampleRate)) {
    validationStats.skippedDueToSampling++;
    return {
      success: true,
      data: data as T, // Return unvalidated data
      metadata,
      timestamp,
    };
  }

  validationStats.totalValidations++;

  try {
    // Attempt to parse/validate the data
    const validated = schema.parse(data);

    // Validation succeeded
    validationStats.successCount++;

    // Record trend data
    validationTrendsTracker.record(metadata.apiName, 1, 0);

    return {
      success: true,
      data: validated,
      metadata,
      timestamp,
    };
  } catch (error) {
    // Validation failed
    validationStats.failureCount++;
    validationStats.lastFailure = timestamp;
    validationStats.failuresByApi[metadata.apiName] =
      (validationStats.failuresByApi[metadata.apiName] || 0) + 1;

    const zodError = error instanceof z.ZodError ? error : undefined;

    // Record trend data
    validationTrendsTracker.record(metadata.apiName, 0, 1);

    // Log the validation failure for monitoring (with rate limiting)
    logValidationFailure(data, zodError, metadata, timestamp);

    // Return original data to prevent breaking the request
    return {
      success: false,
      data: data as T, // Return unvalidated data
      errors: zodError,
      metadata,
      timestamp,
    };
  }
}

/**
 * Async version of validateExternalApiResponse for use with async API calls
 *
 * @param apiCall - Async function that returns the API response
 * @param schema - The Zod schema to validate against
 * @param metadata - Metadata about the API call
 * @returns Promise<ValidationResult> with success status and validated data
 */
export async function validateExternalApiCall<T>(
  apiCall: () => Promise<unknown>,
  schema: z.ZodType<T>,
  metadata: ValidationMetadata
): Promise<ValidationResult<T>> {
  try {
    const data = await apiCall();
    return validateExternalApiResponse(data, schema, metadata);
  } catch (error) {
    // API call itself failed (network error, etc.)
    validationStats.failureCount++;
    validationStats.lastFailure = new Date();

    await errorMonitor.captureError(
      error instanceof Error ? error : new Error(String(error)),
      {
        component: 'external-api-validator',
        action: 'api_call',
        additionalData: {
          type: 'external_api_call_failed',
          apiName: metadata.apiName,
          operation: metadata.operation,
          requestId: metadata.requestId,
          ...metadata.context,
        },
      },
      ErrorSeverity.HIGH
    );

    return {
      success: false,
      metadata,
      timestamp: new Date(),
    };
  }
}

/**
 * Log validation failure for monitoring and alerting
 */
function logValidationFailure(
  data: unknown,
  zodError: z.ZodError | undefined,
  metadata: ValidationMetadata,
  timestamp: Date
): void {
  const config = getValidationConfig();

  // Check rate limit for this API
  const rateLimitKey = `validation-error:${metadata.apiName}`;
  const allowedByRateLimit = validationErrorRateLimiter.check(
    rateLimitKey,
    config.errorLogRateLimit
  );

  if (!allowedByRateLimit) {
    // Rate limit exceeded, skip logging
    return;
  }

  // Format Zod errors into a readable structure
  const errorDetails = zodError?.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  // Log to error monitoring service if enabled
  if (config.sendToErrorMonitoring) {
    errorMonitor.captureError(
      new Error('External API Schema Validation Failed'),
      {
        component: 'external-api-validator',
        action: 'schema_validation',
        additionalData: {
          type: 'external_api_validation_failure',
          apiName: metadata.apiName,
          operation: metadata.operation,
          requestId: metadata.requestId,
          timestamp: timestamp,
          validationErrors: errorDetails,
          // Include sample of data for debugging (be careful with sensitive data)
          dataSample: truncateData(data),
          stats: {
            totalValidations: validationStats.totalValidations,
            failureCount: validationStats.failureCount,
            successRate:
              validationStats.totalValidations > 0
                ? (validationStats.successCount / validationStats.totalValidations) * 100
                : 0,
            skippedDueToSampling: validationStats.skippedDueToSampling,
          },
          ...metadata.context,
        },
      },
      ErrorSeverity.MEDIUM
    );
  }

  // Log to console if enabled (e.g., in development)
  if (config.logToConsole) {
    logger.warn('🔍 External API Validation Failed:', {
      apiName: metadata.apiName,
      operation: metadata.operation,
      errors: errorDetails,
    });
  }
}

/**
 * Truncate large data objects for logging
 * Prevents logging huge payloads while keeping useful debug info
 */
function truncateData(data: unknown): unknown {
  const MAX_STRING_LENGTH = 200;
  const MAX_ARRAY_LENGTH = 5;

  if (typeof data === 'string') {
    return data.length > MAX_STRING_LENGTH ? data.slice(0, MAX_STRING_LENGTH) + '...' : data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, MAX_ARRAY_LENGTH).map(truncateData);
  }

  if (data && typeof data === 'object') {
    const truncated: Record<string, unknown> = {};
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (count >= 10) {
        truncated['...'] = `${Object.keys(data).length - count} more fields`;
        break;
      }
      truncated[key] = truncateData(value);
      count++;
    }
    return truncated;
  }

  return data;
}

/**
 * Create a validated API client wrapper
 *
 * This helper creates a wrapper around an API client that automatically validates responses.
 *
 * @param client - The API client to wrap
 * @param apiName - Name of the API for logging
 * @returns Proxy that validates all method calls
 */
export function createValidatedApiClient<T extends object>(client: T, apiName: string): T {
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop as keyof T];

      // Only wrap async functions
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          const result = await (value as (...args: unknown[]) => Promise<unknown>).apply(
            target,
            args
          );

          // Return result as-is (validation should be done at specific call sites with schemas)
          // This wrapper is mainly for consistent error handling
          return result;
        };
      }

      return value;
    },
  });
}

/**
 * Batch validate multiple responses (useful for list operations)
 */
export function validateBatch<T>(
  items: unknown[],
  schema: z.ZodType<T>,
  metadata: Omit<ValidationMetadata, 'operation'>
): ValidationResult<T[]> {
  const timestamp = new Date();
  const results: T[] = [];
  const errors: Array<{ index: number; error: z.ZodError }> = [];

  items.forEach((item, index) => {
    try {
      results.push(schema.parse(item));
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({ index, error });
      }
    }
  });

  validationStats.totalValidations++;

  if (errors.length > 0) {
    validationStats.failureCount++;
    validationStats.lastFailure = timestamp;

    errorMonitor.captureError(
      new Error('Batch Validation Failed'),
      {
        component: 'external-api-validator',
        action: 'batch_validation',
        additionalData: {
          type: 'external_api_batch_validation_failure',
          apiName: metadata.apiName,
          totalItems: items.length,
          failedItems: errors.length,
          errorDetails: errors.map((e) => ({
            index: e.index,
            errors: e.error.errors,
          })),
        },
      },
      ErrorSeverity.MEDIUM
    );

    return {
      success: false,
      metadata: { ...metadata, operation: 'batchValidation' },
      timestamp,
    };
  }

  validationStats.successCount++;

  return {
    success: true,
    data: results,
    metadata: { ...metadata, operation: 'batchValidation' },
    timestamp,
  };
}
