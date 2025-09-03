import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { mapSquareCategoryToCateringCategory } from '@/utils/catering-optimized';

export const revalidate = 3600; // Cache for 1 hour (Phase 4: Data Optimization)
export const dynamic = 'force-static'; // Use static generation for better caching

export async function GET(request: NextRequest) {
  const cacheKey = 'catering-lunch-products';
  const startTime = Date.now();
  
  try {
    logger.info('🥪 [CACHE-OPT] Fetching lunch products from database...');
    logger.info(`🚀 [CACHE-OPT] Request for ${cacheKey} started`);

    // Optimized query: Get category IDs first to avoid JOIN in main query
    const categoryIds = await prisma.category.findMany({
      where: {
        name: {
          in: [
            'CATERING- LUNCH, STARTERS',
            'CATERING- LUNCH, ENTREES',
            'CATERING- LUNCH, SIDES',
            'CATERING- DESSERTS'
          ]
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    const categoryIdMap = new Map(categoryIds.map(cat => [cat.id, cat.name]));
    const categoryIdList = categoryIds.map(cat => cat.id);

    // Optimized main query using categoryId instead of JOIN
    const products = await prisma.product.findMany({
      where: {
        active: true,
        categoryId: {
          in: categoryIdList
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        dietaryPreferences: true,
        active: true,
        ordinal: true,
        categoryId: true
      },
      orderBy: [
        { ordinal: 'asc' },     // Admin-controlled order
        { name: 'asc' }         // Alphabetical fallback
      ]
    });

    const transformedItems = products.map(product => {
      const categoryName = categoryIdMap.get(product.categoryId) || '';
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        squareCategory: categoryName,
        category: mapSquareCategoryToCateringCategory(categoryName),
        imageUrl: product.images?.[0] || null,
        isVegetarian: product.dietaryPreferences?.includes('vegetarian') || false,
        isVegan: product.dietaryPreferences?.includes('vegan') || false,
        isGlutenFree: product.dietaryPreferences?.includes('gluten-free') || false,
        servingSize: 'per serving', // Default serving size since it's not stored in the database
        isActive: product.active,
        ordinal: Number(product.ordinal || 0) // Include ordinal for proper sorting
      };
    });

    // Sort items in the desired order: STARTERS, ENTREES, SIDES, DESSERTS
    const categoryOrder: Record<string, number> = {
      'CATERING- LUNCH, STARTERS': 1,
      'CATERING- LUNCH, ENTREES': 2,
      'CATERING- LUNCH, SIDES': 3,
      'CATERING- DESSERTS': 4
    };

    transformedItems.sort((a, b) => {
      const orderA = categoryOrder[a.squareCategory] || 999;
      const orderB = categoryOrder[b.squareCategory] || 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same category, sort by admin-controlled ordinal first, then by name
      if (a.ordinal !== b.ordinal) {
        return a.ordinal - b.ordinal;
      }
      
      return a.name.localeCompare(b.name);
    });

    logger.info(`✅ [CACHE-OPT] Found ${products.length} lunch products`);
    
    const processingTime = Date.now() - startTime;
    logger.info(`⚡ [CACHE-OPT] ${cacheKey} processed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      items: transformedItems,
      count: products.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache-Source': 'catering-lunch-api',
        'X-Data-Timestamp': new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Error fetching lunch products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lunch products',
        items: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
