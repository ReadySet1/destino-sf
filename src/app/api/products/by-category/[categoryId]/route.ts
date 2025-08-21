import { NextRequest, NextResponse } from 'next/server';
import { getProductsByCategory } from '@/lib/products/display-order';

interface RouteParams {
  params: Promise<{
    categoryId: string;
  }>;
}

/**
 * GET /api/products/by-category/[categoryId]
 * Get products for a category, ordered by ordinal
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
    
    // Check for includeInactive query parameter
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    const products = await getProductsByCategory(categoryId, includeInactive);
    
    return NextResponse.json({
      success: true,
      categoryId,
      products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Error fetching products by category:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
