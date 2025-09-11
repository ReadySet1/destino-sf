import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { safeCateringApiOperation } from '@/lib/catering-api-utils';

export const revalidate = 3600; // Cache for 1 hour (Phase 4: Data Optimization)
export const dynamic = 'force-dynamic'; // Ensure admin ordering changes are reflected immediately

export async function GET(request: NextRequest) {
  logger.info('🍽️ [CACHE-OPT] Fetching buffet products from database...');
  logger.info('🚀 [CACHE-OPT] Request for catering-buffet-products started');

  return await safeCateringApiOperation(
    () => getBuffetProducts(),
    [], // Fallback to empty array
    'buffet-products'
  );
}

async function getBuffetProducts() {
  const startTime = Date.now();
  const cacheKey = 'catering-buffet-products';
  
  // Optimized query: Get category IDs first to avoid complex JOIN
  const categoryIds = await withRetry(async () => {
      return await prisma.category.findMany({
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
    }, 3, 'fetchBuffetCategories');

    const categoryIdMap = new Map(categoryIds.map(cat => [cat.id, cat.name]));
    const categoryIdList = categoryIds.map(cat => cat.id);

    // Optimized main query using categoryId instead of JOIN
    const buffetItems = await withRetry(async () => {
      return await prisma.product.findMany({
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
    }, 3, 'fetchBuffetProducts');

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

  return transformedBuffetItems;
}
