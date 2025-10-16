/**
 * Unified Product Visibility Service
 * Handles consistent product fetching with visibility rules and availability evaluation
 */

import { Prisma } from '@prisma/client';
import { prisma, withRetry } from '@/lib/db-unified';
import { AvailabilityQueries } from '@/lib/db/availability-queries';
import { AvailabilityEngine } from '@/lib/availability/engine';
import { logger } from '@/utils/logger';
import { isBuildTime } from '@/lib/build-time-utils';
import type { AvailabilityEvaluation } from '@/types/availability';

export interface ProductVisibilityOptions {
  // Basic filters
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  search?: string;
  exclude?: string;

  // Visibility controls
  onlyActive?: boolean;
  excludeCatering?: boolean;
  includePrivate?: boolean; // For admin views

  // Availability evaluation
  includeAvailabilityEvaluation?: boolean;

  // Pagination
  page?: number;
  limit?: number;
  includePagination?: boolean;

  // Additional options
  includeVariants?: boolean;
  orderBy?: 'name' | 'price' | 'created' | 'ordinal';
  orderDirection?: 'asc' | 'desc';
}

export interface ProductWithEvaluation {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  slug: string | null;
  categoryId: string;
  featured: boolean;
  active: boolean;
  squareId: string;
  ordinal: number | null;
  variants?: Array<{
    id: string;
    name: string;
    price: number | null;
    squareVariantId?: string | null;
  }>;
  category?: {
    id: string;
    name: string | null;
    slug: string | null;
  };
  // Availability fields
  isAvailable?: boolean;
  isPreorder?: boolean;
  visibility?: 'PUBLIC' | 'PRIVATE' | null;
  itemState?: 'ACTIVE' | 'INACTIVE' | 'SEASONAL' | 'ARCHIVED' | null;
  // Evaluation result
  evaluatedAvailability?: {
    currentState: string;
    appliedRulesCount: number;
    nextStateChange?: {
      date: Date;
      newState: string;
    };
  };
}

export interface ProductQueryResult {
  products: ProductWithEvaluation[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Service for fetching products with consistent visibility and availability evaluation
 */
export class ProductVisibilityService {
  /**
   * Fetch products with visibility filtering and availability evaluation
   */
  static async getProducts(options: ProductVisibilityOptions = {}): Promise<ProductQueryResult> {
    const {
      categoryId,
      categorySlug,
      featured,
      search,
      exclude,
      onlyActive = true,
      excludeCatering = true,
      includePrivate = false,
      includeAvailabilityEvaluation = false,
      page = 1,
      limit,
      includePagination = false,
      includeVariants = false,
      orderBy = 'name',
      orderDirection = 'asc',
    } = options;

    try {
      // Resolve categoryId from categorySlug if provided
      let resolvedCategoryId = categoryId;
      if (categorySlug && !categoryId && !isBuildTime()) {
        try {
          const category = await withRetry(
            () =>
              prisma.category.findUnique({
                where: { slug: categorySlug },
                select: { id: true },
              }),
            3,
            'resolve-category-slug'
          );
          resolvedCategoryId = category?.id;
        } catch (error) {
          logger.error('Error resolving category slug:', { categorySlug, error });
        }
      }

      // Build base where condition
      const whereCondition = this.buildWhereCondition({
        categoryId: resolvedCategoryId,
        featured,
        search,
        exclude,
        onlyActive,
        excludeCatering,
        includePrivate,
      });

      // Handle build time scenarios
      if (isBuildTime()) {
        logger.info('Build-time detected: Using fallback data for products');
        return {
          products: [],
          ...(includePagination && {
            pagination: {
              page,
              limit: limit || 10,
              total: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          }),
        };
      }

      // Calculate pagination
      const itemsPerPage = limit || (includePagination ? 10 : undefined);
      const skip = includePagination && itemsPerPage ? (page - 1) * itemsPerPage : undefined;

      // Get total count if pagination is requested
      const totalCount = includePagination
        ? await withRetry(() => prisma.product.count({ where: whereCondition }), 3, 'product-count')
        : undefined;

      // Build order by clause
      const orderByClause = this.buildOrderBy(orderBy, orderDirection);

      // Fetch products with visibility filtering
      const products = await withRetry(
        () =>
          prisma.product.findMany({
            where: whereCondition,
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              images: true,
              slug: true,
              categoryId: true,
              featured: true,
              active: true,
              squareId: true,
              ordinal: true,
              // Visibility fields
              isAvailable: true,
              isPreorder: true,
              visibility: true,
              itemState: true,
              // Variants if requested
              variants: includeVariants
                ? {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      squareVariantId: true,
                    },
                  }
                : false,
              // Category info
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: orderByClause,
            skip,
            take: itemsPerPage,
          }),
        3,
        'products-visibility-fetch'
      );

      // Evaluate availability if requested
      let availabilityEvaluations = new Map<string, AvailabilityEvaluation>();
      if (includeAvailabilityEvaluation && products.length > 0) {
        try {
          const productIds = products.map(p => p.id);
          const availabilityRules = await AvailabilityQueries.getMultipleProductRules(productIds);
          availabilityEvaluations =
            await AvailabilityEngine.evaluateMultipleProducts(availabilityRules);
        } catch (error) {
          logger.error('Error evaluating availability in ProductVisibilityService:', error);
          // Continue without availability evaluation if there's an error
        }
      }

      // Apply additional filtering based on evaluated availability
      const filteredProducts = onlyActive
        ? await this.filterByEvaluatedAvailability(products, availabilityEvaluations)
        : products;

      // Convert and serialize products
      const serializedProducts: ProductWithEvaluation[] = filteredProducts.map(product => {
        const evaluation = availabilityEvaluations.get(product.id);

        return {
          ...product,
          price: product.price ? parseFloat(product.price.toString()) : 0,
          ordinal: product.ordinal !== null ? Number(product.ordinal) : null,
          visibility: product.visibility as 'PUBLIC' | 'PRIVATE' | null,
          itemState: product.itemState as 'ACTIVE' | 'INACTIVE' | 'SEASONAL' | 'ARCHIVED' | null,
          variants:
            includeVariants && product.variants
              ? product.variants.map(variant => ({
                  ...variant,
                  price: variant.price ? parseFloat(variant.price.toString()) : null,
                }))
              : undefined,
          // Add availability evaluation if requested and available
          ...(includeAvailabilityEvaluation &&
            evaluation && {
              evaluatedAvailability: {
                currentState: evaluation.currentState,
                appliedRulesCount: evaluation.appliedRules.length,
                nextStateChange: evaluation.nextStateChange,
              },
            }),
        };
      });

      // Build pagination metadata
      const paginationData =
        includePagination && totalCount !== undefined && itemsPerPage
          ? {
              page,
              limit: itemsPerPage,
              total: Number(totalCount),
              totalPages: Math.ceil(Number(totalCount) / itemsPerPage),
              hasNextPage: page < Math.ceil(Number(totalCount) / itemsPerPage),
              hasPreviousPage: page > 1,
            }
          : undefined;

      return {
        products: serializedProducts,
        ...(paginationData && { pagination: paginationData }),
      };
    } catch (error) {
      logger.error('Error in ProductVisibilityService.getProducts:', error);
      throw error;
    }
  }

  /**
   * Get products for a specific category with visibility filtering
   */
  static async getProductsByCategory(
    categoryId: string,
    options: Omit<ProductVisibilityOptions, 'categoryId'> = {}
  ): Promise<ProductQueryResult> {
    return this.getProducts({ ...options, categoryId });
  }

  /**
   * Build the where condition for product queries
   */
  private static buildWhereCondition(options: {
    categoryId?: string;
    featured?: boolean;
    search?: string;
    exclude?: string;
    onlyActive: boolean;
    excludeCatering: boolean;
    includePrivate: boolean;
  }) {
    const { categoryId, featured, search, exclude, onlyActive, excludeCatering, includePrivate } =
      options;

    const whereCondition: Record<string, unknown> = {
      active: onlyActive ? true : undefined,
      categoryId: categoryId,
      featured: featured,
    };

    // Add visibility filtering for customer-facing queries
    if (onlyActive && !includePrivate) {
      whereCondition.isArchived = false; // Exclude archived products
      whereCondition.OR = [
        { visibility: 'PUBLIC' },
        { visibility: null }, // Default to PUBLIC if null
      ];
      // Don't filter by isAvailable here - let availability evaluation handle it
      // This allows "Coming Soon" and other states to be properly evaluated
      whereCondition.NOT = {
        OR: [{ itemState: 'INACTIVE' }, { itemState: 'ARCHIVED' }],
      };
    }

    // Exclude catering products by default (unless explicitly requested)
    // Only apply if we're NOT filtering by a specific categoryId
    if (excludeCatering && !categoryId) {
      if (whereCondition.NOT && typeof whereCondition.NOT === 'object' && 'OR' in whereCondition.NOT) {
        (whereCondition.NOT as { OR: unknown[] }).OR.push({
          category: {
            name: {
              startsWith: 'CATERING',
              mode: 'insensitive',
            },
          },
        });
      } else {
        whereCondition.category = {
          NOT: {
            name: {
              startsWith: 'CATERING',
              mode: 'insensitive',
            },
          },
        };
      }
    }

    // Add search condition if provided
    if (search) {
      whereCondition.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          category: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Add exclusion condition if provided
    if (exclude) {
      whereCondition.NOT = {
        ...(whereCondition.NOT || {}),
        id: exclude,
      };
    }

    // Remove undefined values
    Object.keys(whereCondition).forEach(
      key => whereCondition[key] === undefined && delete whereCondition[key]
    );

    return whereCondition as Prisma.ProductWhereInput;
  }

  /**
   * Build order by clause
   */
  private static buildOrderBy(orderBy: string, orderDirection: string) {
    const sortOrder = orderDirection as 'asc' | 'desc';

    switch (orderBy) {
      case 'price':
        return { price: sortOrder };
      case 'created':
        return { createdAt: sortOrder };
      case 'ordinal':
        return [
          { ordinal: sortOrder },
          { name: 'asc' as const }, // Fallback
        ];
      case 'name':
      default:
        return { name: sortOrder };
    }
  }

  /**
   * Filter products based on evaluated availability
   */
  private static async filterByEvaluatedAvailability<T extends { id: string; isAvailable?: boolean | null; visibility?: string | null; itemState?: string | null }>(
    products: T[],
    evaluations: Map<string, AvailabilityEvaluation>
  ): Promise<T[]> {
    return products.filter(product => {
      const evaluation = evaluations.get(product.id);

      // If no evaluation available, use database flags
      if (!evaluation) {
        return (
          product.isAvailable &&
          product.visibility !== 'PRIVATE' &&
          (product.itemState ? !['INACTIVE', 'ARCHIVED'].includes(product.itemState) : true)
        );
      }

      // If evaluation exists but NO rules were applied, fall back to base product state
      if (evaluation.appliedRules.length === 0) {
        return (
          product.isAvailable &&
          product.visibility !== 'PRIVATE' &&
          (product.itemState ? !['INACTIVE', 'ARCHIVED'].includes(product.itemState) : true)
        );
      }

      // Filter based on evaluated state when rules ARE applied
      // Only exclude UNAVAILABLE and HIDDEN states
      // Include: AVAILABLE, PRE_ORDER, VIEW_ONLY, COMING_SOON, SOLD_OUT, etc.
      const state = evaluation.currentState.toUpperCase().replace(/[\s-]/g, '_');
      return !['UNAVAILABLE', 'HIDDEN'].includes(state);
    });
  }

  /**
   * Get product with full availability evaluation
   */
  static async getProductWithAvailability(
    productId: string
  ): Promise<ProductWithEvaluation | null> {
    try {
      const result = await this.getProducts({
        includeAvailabilityEvaluation: true,
        includeVariants: true,
        onlyActive: false, // Get product regardless of active state for admin
        includePrivate: true,
        limit: 1,
      });

      const product = result.products.find(p => p.id === productId);
      return product || null;
    } catch (error) {
      logger.error('Error getting product with availability:', { productId, error });
      return null;
    }
  }

  /**
   * Clear cache for specific category (placeholder for future caching implementation)
   */
  static async clearCategoryCache(categoryId: string): Promise<void> {
    // TODO: Implement caching layer and cache invalidation
    logger.info('Category cache cleared', { categoryId });
  }

  /**
   * Clear cache for specific product (placeholder for future caching implementation)
   */
  static async clearProductCache(productId: string): Promise<void> {
    // TODO: Implement caching layer and cache invalidation
    logger.info('Product cache cleared', { productId });
  }
}

export default ProductVisibilityService;
