/**
 * API Validation Middleware
 *
 * Request and response validation middleware using Zod schemas
 * for API contract enforcement at runtime.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { validateRequest, validateResponse, type ValidationContext } from '@/lib/openapi-validator';

/**
 * Validation mode
 * - 'enforce': Block requests/responses that fail validation
 * - 'warn': Log validation failures but allow requests/responses through
 * - 'disabled': Skip validation entirely
 */
export type ValidationMode = 'enforce' | 'warn' | 'disabled';

/**
 * Configuration for API validation middleware
 */
export interface ValidationConfig {
  mode?: ValidationMode;
  validateRequests?: boolean;
  validateResponses?: boolean;
  onError?: (error: ValidationError) => void;
}

/**
 * Validation error details
 */
export interface ValidationError {
  type: 'request' | 'response';
  path: string;
  method: string;
  statusCode?: number;
  errors: string[];
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: Required<ValidationConfig> = {
  mode: process.env.NODE_ENV === 'production' ? 'enforce' : 'warn',
  validateRequests: true,
  validateResponses: process.env.NODE_ENV !== 'production',
  onError: (error: ValidationError) => {
    logger.error('API validation error', {
      type: error.type,
      path: error.path,
      method: error.method,
      statusCode: error.statusCode,
      errors: error.errors,
    });
  },
};

/**
 * Create a validation middleware for API routes
 *
 * @param schemas - Request and response schemas
 * @param config - Validation configuration
 * @returns Middleware function
 *
 * @example
 * ```ts
 * export const POST = withValidation(
 *   async (req) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     request: {
 *       body: CreateProductRequestSchema,
 *     },
 *     response: {
 *       200: CreateProductResponseSchema,
 *     },
 *   }
 * );
 * ```
 */
export function withValidation<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  schemas: {
    request?: {
      body?: z.ZodType<any, any, any>;
      query?: z.ZodType<any, any, any>;
      params?: z.ZodType<any, any, any>;
    };
    response?: {
      [statusCode: number]: z.ZodType<any, any, any>;
    };
  },
  config: ValidationConfig = {}
): T {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (async (request: NextRequest, ...args: any[]) => {
    const context: ValidationContext = {
      path: new URL(request.url).pathname,
      method: request.method.toLowerCase(),
    };

    // Skip validation if disabled
    if (finalConfig.mode === 'disabled') {
      return handler(request, ...args);
    }

    // Validate request
    if (finalConfig.validateRequests && schemas.request) {
      try {
        // Validate request body
        if (schemas.request.body && request.method !== 'GET' && request.method !== 'DELETE') {
          const body = await request.clone().json();
          const result = validateRequest(schemas.request.body, body, context);

          if (!result.valid) {
            const error: ValidationError = {
              type: 'request',
              path: context.path,
              method: context.method,
              errors: result.errors,
            };

            if (finalConfig.mode === 'enforce') {
              finalConfig.onError(error);
              return NextResponse.json(
                {
                  error: 'Invalid request',
                  details: result.errors,
                },
                { status: 400 }
              );
            } else {
              finalConfig.onError(error);
            }
          }
        }

        // Validate query parameters
        if (schemas.request.query) {
          const searchParams = new URL(request.url).searchParams;
          const query = Object.fromEntries(searchParams.entries());
          const result = validateRequest(schemas.request.query, query, context);

          if (!result.valid) {
            const error: ValidationError = {
              type: 'request',
              path: context.path,
              method: context.method,
              errors: result.errors,
            };

            if (finalConfig.mode === 'enforce') {
              finalConfig.onError(error);
              return NextResponse.json(
                {
                  error: 'Invalid query parameters',
                  details: result.errors,
                },
                { status: 400 }
              );
            } else {
              finalConfig.onError(error);
            }
          }
        }

        // Validate path parameters
        if (schemas.request.params && args.length > 0) {
          const params = args[0]?.params || {};
          const result = validateRequest(schemas.request.params, params, context);

          if (!result.valid) {
            const error: ValidationError = {
              type: 'request',
              path: context.path,
              method: context.method,
              errors: result.errors,
            };

            if (finalConfig.mode === 'enforce') {
              finalConfig.onError(error);
              return NextResponse.json(
                {
                  error: 'Invalid path parameters',
                  details: result.errors,
                },
                { status: 400 }
              );
            } else {
              finalConfig.onError(error);
            }
          }
        }
      } catch (error) {
        logger.error('Request validation error:', error);
        if (finalConfig.mode === 'enforce') {
          return NextResponse.json(
            {
              error: 'Request validation failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 400 }
          );
        }
      }
    }

    // Call the handler
    const response = await handler(request, ...args);

    // Validate response
    if (finalConfig.validateResponses && schemas.response) {
      try {
        const statusCode = response.status;
        const responseSchema = schemas.response[statusCode];

        if (responseSchema) {
          // Clone response to read body
          const responseClone = response.clone();
          const responseBody = await responseClone.json();

          const result = validateResponse(responseSchema, responseBody, {
            ...context,
            statusCode,
          });

          if (!result.valid) {
            const error: ValidationError = {
              type: 'response',
              path: context.path,
              method: context.method,
              statusCode,
              errors: result.errors,
            };

            if (finalConfig.mode === 'enforce') {
              finalConfig.onError(error);
              return NextResponse.json(
                {
                  error: 'Internal server error',
                  details: 'Response validation failed',
                },
                { status: 500 }
              );
            } else {
              finalConfig.onError(error);
            }
          }
        }
      } catch (error) {
        logger.error('Response validation error:', error);
        // Don't block responses on validation errors in warn mode
        if (finalConfig.mode === 'enforce') {
          return NextResponse.json(
            {
              error: 'Response validation failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      }
    }

    return response;
  }) as T;
}

/**
 * Validate query parameters using a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema for query parameters
 * @returns Parsed and validated query parameters
 * @throws {Error} If validation fails
 */
export function validateQueryParams<T>(request: NextRequest, schema: z.ZodType<T>): T {
  const searchParams = new URL(request.url).searchParams;
  const query = Object.fromEntries(searchParams.entries());

  try {
    return schema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid query parameters: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Validate request body using a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema for request body
 * @returns Parsed and validated request body
 * @throws {Error} If validation fails
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid request body: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}
