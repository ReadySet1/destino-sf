/**
 * Products API Schemas
 *
 * Zod schemas for product catalog API endpoints
 * for request/response validation and OpenAPI generation.
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  MoneySchema,
  SlugParamSchema,
  IdParamSchema,
  SortOrderSchema,
  createPaginatedSchema,
} from './common';

// Extend Zod with OpenAPI extensions
extendZodWithOpenApi(z);

/**
 * Product Category schema
 */
export const ProductCategorySchema = z.object({
  id: z.string().uuid().describe('Category UUID'),
  name: z.string().min(1).max(100).describe('Category name'),
  slug: z.string().min(1).max(100).describe('URL-friendly slug'),
});

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

/**
 * Product Variant schema
 */
export const ProductVariantSchema = z.object({
  id: z.string().uuid().describe('Variant UUID'),
  name: z.string().min(1).max(255).describe('Variant name (e.g., "Large", "Dozen")'),
  price: MoneySchema.describe('Variant price in cents'),
  squareVariantId: z
    .string()
    .nullable()
    .optional()
    .describe('Square catalog item variation ID'),
  available: z.boolean().optional().default(true).describe('Whether variant is available'),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

/**
 * Product schema (full details)
 */
export const ProductSchema = z
  .object({
    id: z.string().uuid().describe('Product UUID'),
    name: z.string().min(1).max(255).describe('Product name'),
    description: z.string().nullable().describe('Product description'),
    slug: z.string().min(1).max(100).describe('URL-friendly slug'),
    price: MoneySchema.describe('Base price in cents'),
    images: z
      .array(z.string().url())
      .min(1)
      .describe('Array of image URLs (first is primary)'),
    categoryId: z.string().uuid().nullable().describe('Category UUID'),
    category: ProductCategorySchema.nullable().optional().describe('Category details'),
    squareId: z.string().nullable().optional().describe('Square catalog object ID'),
    featured: z.boolean().default(false).describe('Whether product is featured'),
    active: z.boolean().default(true).describe('Whether product is active/published'),
    variants: z
      .array(ProductVariantSchema)
      .optional()
      .default([])
      .describe('Product variants (sizes, quantities, etc.)'),
    isCatering: z.boolean().optional().default(false).describe('Whether product is catering-only'),
    isAvailable: z.boolean().optional().describe('Current availability status'),
    isPreorder: z.boolean().optional().describe('Whether product is available for preorder'),
    availabilityStartDate: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .describe('Availability start date'),
    availabilityEndDate: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .describe('Availability end date'),
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * Product list item schema (summary view)
 */
export const ProductSummarySchema = ProductSchema.omit({
  variants: true,
  category: true,
}).extend({
  categoryName: z.string().nullable().optional().describe('Category name for display'),
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/**
 * GET /api/products query parameters
 */
export const GetProductsQuerySchema = z
  .object({
    includeVariants: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val === 'true')
      .describe('Include product variants in response'),
    onlyActive: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val !== 'false')
      .default('true')
      .describe('Filter to only active products (default: true)'),
    categoryId: z.string().uuid().optional().describe('Filter by category UUID'),
    categorySlug: z.string().optional().describe('Filter by category slug'),
    featured: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val === 'true')
      .describe('Filter to only featured products'),
    exclude: z.string().uuid().optional().describe('Exclude specific product by UUID'),
    excludeCatering: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val !== 'false')
      .default('true')
      .describe('Exclude catering products (default: true)'),
    includeAvailabilityEvaluation: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val === 'true')
      .describe('Evaluate and include current availability status'),
    includePagination: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val === 'true')
      .describe('Return pagination metadata'),
    page: z.string().optional().default('1').pipe(z.coerce.number().int().positive()).describe('Page number'),
    limit: z.coerce.number().int().positive().max(100).optional().describe('Items per page'),
    search: z.string().optional().describe('Search query for name/description'),
    orderBy: z
      .enum(['name', 'price', 'createdAt', 'updatedAt'])
      .optional()
      .default('name')
      .describe('Sort field'),
    orderDirection: SortOrderSchema.optional().default('asc').describe('Sort direction'),
    // Admin-specific options
    includePrivate: z
      .enum(['true', 'false'])
      .optional()
      .transform(val => val === 'true')
      .describe('Include private/unpublished products (admin only)'),
});

export type GetProductsQuery = z.infer<typeof GetProductsQuerySchema>;

/**
 * GET /api/products response (array)
 */
export const GetProductsResponseSchema = z.array(ProductSchema);

/**
 * GET /api/products response (paginated)
 */
export const GetProductsPaginatedResponseSchema = createPaginatedSchema(ProductSchema);

/**
 * GET /api/products/:id parameters
 */
export const GetProductByIdParamsSchema = IdParamSchema;

/**
 * GET /api/products/:id response
 */
export const GetProductByIdResponseSchema = ProductSchema;

/**
 * GET /api/products/slug/:slug parameters
 */
export const GetProductBySlugParamsSchema = SlugParamSchema;

/**
 * GET /api/products/slug/:slug response
 */
export const GetProductBySlugResponseSchema = ProductSchema;

/**
 * POST /api/products request body (admin)
 */
export const CreateProductRequestSchema = ProductSchema.omit({
  id: true,
  category: true,
  variants: true,
})
  .partial({
    slug: true,
    images: true,
    squareId: true,
    featured: true,
    active: true,
    isCatering: true,
  });

export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

/**
 * POST /api/products response
 */
export const CreateProductResponseSchema = ProductSchema;

/**
 * PATCH /api/products/:id request body (admin)
 */
export const UpdateProductRequestSchema = ProductSchema.omit({
  id: true,
  category: true,
  variants: true,
}).partial();

export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

/**
 * PATCH /api/products/:id response
 */
export const UpdateProductResponseSchema = ProductSchema;

/**
 * DELETE /api/products/:id parameters
 */
export const DeleteProductParamsSchema = IdParamSchema;

/**
 * DELETE /api/products/:id response
 */
export const DeleteProductResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
