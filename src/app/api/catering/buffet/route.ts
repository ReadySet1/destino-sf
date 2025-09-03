import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export const revalidate = 3600; // Cache for 1 hour (Phase 4: Data Optimization)
export const dynamic = 'force-static'; // Use static generation for better caching

export async function GET(request: NextRequest) {
  const cacheKey = 'catering-buffet-products';
  const startTime = Date.now();
  
  try {
    logger.info('🍽️ [CACHE-OPT] Fetching buffet products from database...');
    logger.info(`🚀 [CACHE-OPT] Request for ${cacheKey} started`);
    
    // Optimized query: Get category IDs first to avoid complex JOIN
    const categoryIds = await prisma.category.findMany({
      where: {
        name: {
          in: ['CATERING- BUFFET, STARTERS', 'CATERING- BUFFET, ENTREES', 'CATERING- BUFFET, SIDES'],
          mode: 'insensitive'
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
    const buffetItems = await prisma.product.findMany({
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
        categoryId: true,
        squareId: true,
        createdAt: true,
        updatedAt: true,
        variants: {
          select: {
            id: true,
            name: true,
            price: true,
          }
        }
      },
      orderBy: [
        { ordinal: 'asc' },     // Admin-controlled order
        { name: 'asc' }         // Alphabetical fallback
      ]
    });

    logger.info(`✅ [CACHE-OPT] Found ${buffetItems.length} buffet products`);
    
    const processingTime = Date.now() - startTime;
    logger.info(`⚡ [CACHE-OPT] ${cacheKey} processed in ${processingTime}ms`);

    // Transform to match the CateringItem interface
    const transformedBuffetItems = buffetItems.map(product => {
      const categoryName = categoryIdMap.get(product.categoryId) || '';
      
      // Parse dietary information from description or product metadata
      const description = product.description || '';
      const isGlutenFree = description.toLowerCase().includes('-gf') || 
                          description.toLowerCase().includes('gluten free') ||
                          product.dietaryPreferences?.includes('gluten-free') || false;
      const isVegan = description.toLowerCase().includes('-vgn') || 
                     description.toLowerCase().includes('vegan') ||
                     product.dietaryPreferences?.includes('vegan') || false;
      const isVegetarian = description.toLowerCase().includes('-vg') || 
                          description.toLowerCase().includes('vegetarian') ||
                          product.dietaryPreferences?.includes('vegetarian') || 
                          isVegan; // Vegan items are also vegetarian

      // Determine category type based on category name
      let categoryType = 'BUFFET_ITEM';
      
      if (categoryName.includes('STARTERS')) {
        categoryType = 'BUFFET_STARTER';
      } else if (categoryName.includes('ENTREES')) {
        categoryType = 'BUFFET_ENTREE';
      } else if (categoryName.includes('SIDES')) {
        categoryType = 'BUFFET_SIDE';
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price.toString()),
        category: categoryType,
        isVegetarian,
        isVegan,
        isGlutenFree,
        servingSize: 'per person',
        imageUrl: product.images?.[0] || null,
        isActive: product.active,
        squareCategory: categoryName,
        squareProductId: product.squareId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      items: transformedBuffetItems,
      count: transformedBuffetItems.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache-Source': 'catering-buffet-api',
        'X-Data-Timestamp': new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Failed to fetch buffet products:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch buffet products',
        items: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
