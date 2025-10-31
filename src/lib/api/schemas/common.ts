/**
 * Common API Schemas
 *
 * Shared Zod schemas used across multiple API endpoints
 * for request/response validation and OpenAPI generation.
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI extensions
extendZodWithOpenApi(z);

/**
 * Pagination metadata schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().describe('Current page number (1-indexed)'),
  limit: z.number().int().positive().max(100).describe('Items per page (max 100)'),
  total: z.number().int().nonnegative().describe('Total number of items'),
  totalPages: z.number().int().nonnegative().describe('Total number of pages'),
  hasNextPage: z.boolean().describe('Whether there is a next page'),
  hasPreviousPage: z.boolean().describe('Whether there is a previous page'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Paginated response wrapper
 */
export function createPaginatedSchema<T extends z.ZodType<any, any, any>>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema).describe('Array of items for current page'),
    pagination: PaginationSchema.describe('Pagination metadata'),
  });
}

/**
 * API Error response schema
 */
export const ApiErrorSchema = z.object({
  error: z.string().describe('Error message'),
  details: z.string().optional().describe('Detailed error information'),
  code: z.string().optional().describe('Error code for programmatic handling'),
  field: z.string().optional().describe('Field that caused the error (for validation errors)'),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Success response schema
 */
export const SuccessResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  message: z.string().optional().describe('Success message'),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

/**
 * ID parameter schema (UUID format)
 */
export const IdParamSchema = z.object({
  id: z.string().uuid().describe('Resource UUID identifier'),
});

/**
 * Slug parameter schema
 */
export const SlugParamSchema = z.object({
  slug: z.string().min(1).max(100).describe('URL-friendly slug identifier'),
});

/**
 * Date range filter schema
 */
export const DateRangeSchema = z.object({
  startDate: z
    .string()
    .datetime()
    .optional()
    .describe('Start date in ISO 8601 format (inclusive)'),
  endDate: z.string().datetime().optional().describe('End date in ISO 8601 format (inclusive)'),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

/**
 * Sort order enum
 */
export const SortOrderSchema = z.enum(['asc', 'desc']).describe('Sort direction');

export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Common query parameters for list endpoints
 */
export const ListQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional().describe('Page number'),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .optional()
    .describe('Items per page'),
  search: z.string().optional().describe('Search query'),
  orderBy: z.string().optional().describe('Field to sort by'),
  orderDirection: SortOrderSchema.optional().describe('Sort direction'),
});

export type ListQueryParams = z.infer<typeof ListQueryParamsSchema>;

/**
 * Money/Price schema (in cents)
 */
export const MoneySchema = z
  .number()
  .int()
  .nonnegative()
  .describe('Amount in cents (e.g., 1099 = $10.99)');

/**
 * Email schema with validation
 */
export const EmailSchema = z.string().email().max(255).describe('Valid email address');

/**
 * Phone number schema (US format)
 */
export const PhoneSchema = z
  .string()
  .regex(/^\+?1?\d{10,14}$/)
  .describe('Phone number (US format, 10-14 digits)');

/**
 * Timestamp schema
 */
export const TimestampSchema = z.string().datetime().describe('Timestamp in ISO 8601 format');

/**
 * Status enum for various resources
 */
export const StatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
]);

export type Status = z.infer<typeof StatusSchema>;

/**
 * Address schema
 */
export const AddressSchema = z.object({
  street: z.string().min(1).max(255).describe('Street address'),
  city: z.string().min(1).max(100).describe('City'),
  state: z.string().length(2).describe('State code (2 letters)'),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/)
    .describe('ZIP code (5 or 9 digits)'),
  country: z.string().length(2).default('US').describe('Country code (ISO 3166-1 alpha-2)'),
});

export type Address = z.infer<typeof AddressSchema>;

/**
 * Standard API response headers
 */
export const ResponseHeadersSchema = z.object({
  'Content-Type': z.literal('application/json'),
  'X-Request-ID': z.string().uuid().optional(),
  'X-RateLimit-Limit': z.string().optional(),
  'X-RateLimit-Remaining': z.string().optional(),
  'X-RateLimit-Reset': z.string().optional(),
});

/**
 * Health check response schema
 */
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']).describe('Overall health status'),
  timestamp: TimestampSchema.describe('Health check timestamp'),
  services: z
    .record(
      z.object({
        status: z.enum(['up', 'down', 'degraded']),
        latency: z.number().optional().describe('Response latency in ms'),
        message: z.string().optional().describe('Status message'),
      })
    )
    .describe('Status of individual services'),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
