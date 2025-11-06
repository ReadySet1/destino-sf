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
  squareVariantId: z.string().nullable().optional().describe('Square catalog item variation ID'),
  available: z.boolean().optional().default(true).describe('Whether variant is available'),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

/**
 * Product schema (full details)
 */
export const ProductSchema = z.object({
  id: z.string().uuid().describe('Product UUID'),
  name: z.string().min(1).max(255).describe('Product name'),
  description: z.string().nullable().describe('Product description'),
  slug: z.string().min(1).max(100).describe('URL-friendly slug'),
  price: MoneySchema.describe('Base price in cents'),
  images: z.array(z.string().url()).min(1).describe('Array of image URLs (first is primary)'),
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
export const GetProductsQuerySchema = z.object({
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
  page: z
    .string()
    .optional()
    .default('1')
    .pipe(z.coerce.number().int().positive())
    .describe('Page number'),
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
}).partial({
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

// ============================================================
// Extended Products API Schemas (Phase 3)
// ============================================================

/**
 * Product display order schema (for reordering)
 */
export const ProductDisplayOrderSchema = z.object({
  id: z.string().uuid().describe('Product UUID'),
  name: z.string().describe('Product name'),
  ordinal: z.number().int().nonnegative().describe('Display order position'),
  categoryId: z.string().uuid().nullable().describe('Category UUID'),
  imageUrl: z.string().url().optional().describe('Primary image URL'),
  price: MoneySchema.describe('Product price'),
  active: z.boolean().describe('Whether product is active'),
  isAvailable: z.boolean().optional().describe('Current availability status'),
  isPreorder: z.boolean().optional().describe('Whether product is available for preorder'),
  visibility: z.string().optional().describe('Product visibility setting'),
  itemState: z.string().optional().describe('Product item state'),
});

export type ProductDisplayOrder = z.infer<typeof ProductDisplayOrderSchema>;

/**
 * GET /api/products/by-category/[categoryId] query parameters
 */
export const GetProductsByCategoryQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform(val => val === 'true')
    .describe('Include inactive products'),
  includeAvailabilityEvaluation: z
    .enum(['true', 'false'])
    .optional()
    .transform(val => val === 'true')
    .describe('Evaluate current availability'),
  includePrivate: z
    .enum(['true', 'false'])
    .optional()
    .transform(val => val === 'true')
    .describe('Include private products (admin only)'),
  limit: z.coerce.number().int().positive().optional().describe('Items per page'),
  page: z.coerce.number().int().positive().optional().default(1).describe('Page number'),
  includePagination: z
    .enum(['true', 'false'])
    .optional()
    .transform(val => val === 'true')
    .describe('Include pagination metadata'),
});

export type GetProductsByCategoryQuery = z.infer<typeof GetProductsByCategoryQuerySchema>;

/**
 * GET /api/products/by-category/[categoryId] path parameters
 */
export const GetProductsByCategoryParamsSchema = z.object({
  categoryId: z.string().uuid().describe('Category UUID'),
});

export type GetProductsByCategoryParams = z.infer<typeof GetProductsByCategoryParamsSchema>;

/**
 * Pagination metadata schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * GET /api/products/by-category/[categoryId] response
 */
export const GetProductsByCategoryResponseSchema = z.object({
  success: z.boolean(),
  categoryId: z.string().uuid(),
  products: z.array(ProductDisplayOrderSchema),
  count: z.number().int().nonnegative(),
  pagination: PaginationSchema.optional(),
});

export type GetProductsByCategoryResponse = z.infer<typeof GetProductsByCategoryResponseSchema>;

/**
 * Product validation issue schema
 */
export const ProductValidationIssueSchema = z.object({
  field: z.string().describe('Field with issue'),
  message: z.string().describe('Issue description'),
  severity: z.enum(['error', 'warning', 'info']).describe('Issue severity'),
  current: z.unknown().optional().describe('Current value'),
  expected: z.unknown().optional().describe('Expected value'),
});

export type ProductValidationIssue = z.infer<typeof ProductValidationIssueSchema>;

/**
 * POST /api/products/validate request body
 */
export const ValidateProductRequestSchema = z.object({
  productId: z.string().uuid().describe('Product UUID to validate'),
});

export type ValidateProductRequest = z.infer<typeof ValidateProductRequestSchema>;

/**
 * POST /api/products/validate response
 */
export const ValidateProductResponseSchema = z.object({
  success: z.boolean(),
  issues: z.array(ProductValidationIssueSchema),
  isValid: z.boolean().describe('Whether product passes validation'),
});

export type ValidateProductResponse = z.infer<typeof ValidateProductResponseSchema>;

/**
 * Product reorder update schema
 */
export const ProductReorderUpdateSchema = z.object({
  id: z.string().uuid().describe('Product UUID'),
  ordinal: z.number().int().positive().describe('New display order position'),
});

export type ProductReorderUpdate = z.infer<typeof ProductReorderUpdateSchema>;

/**
 * POST /api/products/reorder request body
 */
export const ReorderProductsRequestSchema = z.object({
  updates: z
    .array(ProductReorderUpdateSchema)
    .min(1, 'At least one product update is required')
    .describe('Array of product reorder updates'),
  categoryId: z.string().uuid().optional().describe('Optional category filter for validation'),
});

export type ReorderProductsRequest = z.infer<typeof ReorderProductsRequestSchema>;

/**
 * POST /api/products/reorder response
 */
export const ReorderProductsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  updatedCount: z.number().int().nonnegative(),
});

export type ReorderProductsResponse = z.infer<typeof ReorderProductsResponseSchema>;

/**
 * Reorder strategy enum
 */
export const ReorderStrategySchema = z.enum([
  'ALPHABETICAL',
  'PRICE_ASC',
  'PRICE_DESC',
  'NEWEST_FIRST',
]);

export type ReorderStrategy = z.infer<typeof ReorderStrategySchema>;

/**
 * PUT /api/products/reorder request body (quick sort)
 */
export const QuickSortProductsRequestSchema = z.object({
  categoryId: z.string().uuid().describe('Category UUID to sort'),
  strategy: ReorderStrategySchema.describe('Sorting strategy to apply'),
});

export type QuickSortProductsRequest = z.infer<typeof QuickSortProductsRequestSchema>;

/**
 * PUT /api/products/reorder response (quick sort)
 */
export const QuickSortProductsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  updatedCount: z.number().int().nonnegative(),
  strategy: ReorderStrategySchema,
});

export type QuickSortProductsResponse = z.infer<typeof QuickSortProductsResponseSchema>;

/**
 * GET /api/categories response
 */
export const GetCategoriesResponseSchema = z.array(ProductCategorySchema);

export type GetCategoriesResponse = z.infer<typeof GetCategoriesResponseSchema>;
