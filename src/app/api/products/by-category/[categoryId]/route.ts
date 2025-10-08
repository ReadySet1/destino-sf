import { NextRequest, NextResponse } from 'next/server';
import { ProductVisibilityService } from '@/lib/services/product-visibility-service';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    categoryId: string;
  }>;
}

/**
 * GET /api/products/by-category/[categoryId]
 * Get products for a category with visibility filtering and availability evaluation
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { categoryId } = await context.params;
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeAvailabilityEvaluation = searchParams.get('includeAvailabilityEvaluation') === 'true';
    const includePrivate = searchParams.get('includePrivate') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const includePagination = searchParams.get('includePagination') === 'true';
    
    // Use ProductVisibilityService with proper options
    const result = await ProductVisibilityService.getProductsByCategory(categoryId, {
      onlyActive: !includeInactive,
      includeAvailabilityEvaluation,
      includePrivate,
      excludeCatering: false, // Allow all categories including catering for admin
      includeVariants: true, // Include variants for category listings
      orderBy: 'ordinal', // Order by ordinal for categories
      orderDirection: 'asc',
      limit,
      page,
      includePagination
    });
    
    // Map products to match ProductDisplayOrder interface
    const mappedProducts = result.products.map(product => ({
      id: product.id,
      name: product.name,
      ordinal: product.ordinal ? Number(product.ordinal) : 0,
      categoryId: product.categoryId,
      imageUrl: product.images && product.images.length > 0 ? product.images[0] : undefined,
      price: product.price,
      active: product.active,
      isAvailable: product.isAvailable,
      isPreorder: product.isPreorder,
      visibility: product.visibility,
      itemState: product.itemState,
    }));

    const response = {
      success: true,
      categoryId,
      products: mappedProducts,
      count: mappedProducts.length,
      ...(result.pagination && { pagination: result.pagination })
    };
    
    logger.info('Products fetched by category', {
      categoryId,
      count: mappedProducts.length,
      includeInactive,
      includeAvailabilityEvaluation
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching products by category:', { categoryId: context.params, error });
    
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
