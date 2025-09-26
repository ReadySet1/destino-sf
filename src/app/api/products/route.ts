import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { ProductVisibilityService } from '@/lib/services/product-visibility-service';
import { isBuildTime } from '@/lib/build-time-utils';

// Types are now handled by ProductVisibilityService

export async function GET(request: NextRequest) {
  try {
    // Handle build time fallback
    if (isBuildTime()) {
      logger.info('Build-time detected: Using fallback data');
      return NextResponse.json({ 
        success: true, 
        data: [], 
        note: 'Fallback data used due to build-time constraints' 
      });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters and map to ProductVisibilityOptions
    const options = {
      includeVariants: searchParams.get('includeVariants') === 'true',
      onlyActive: searchParams.get('onlyActive') !== 'false', // Default to true
      categoryId: searchParams.get('categoryId') || undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      exclude: searchParams.get('exclude') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      excludeCatering: searchParams.get('excludeCatering') !== 'false', // Default to true
      includeAvailabilityEvaluation: searchParams.get('includeAvailabilityEvaluation') === 'true',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      search: searchParams.get('search') || undefined,
      includePagination: searchParams.get('includePagination') === 'true',
      // Admin-specific options
      includePrivate: searchParams.get('includePrivate') === 'true',
      orderBy: (searchParams.get('orderBy') as any) || 'name',
      orderDirection: (searchParams.get('orderDirection') as any) || 'asc',
    };

    // Use the unified product visibility service
    const result = await ProductVisibilityService.getProducts(options);

    // Return with pagination metadata if requested
    if (options.includePagination && result.pagination) {
      return NextResponse.json({
        data: result.products,
        pagination: result.pagination,
      });
    }

    return NextResponse.json(result.products);
  } catch (error) {
    logger.error('Error fetching products via ProductVisibilityService:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
