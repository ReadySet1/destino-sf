import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { mapSquareCategoryToCateringCategory } from '@/utils/catering-optimized';
import { safeCateringApiOperation } from '@/lib/catering-api-utils';

export const revalidate = 3600; // Cache for 1 hour (Phase 4: Data Optimization)
export const dynamic = 'force-dynamic'; // Ensure admin ordering changes are reflected immediately

export async function GET(request: NextRequest) {
  logger.info('🥪 [CACHE-OPT] Fetching lunch products from database...');
  logger.info('🚀 [CACHE-OPT] Request for catering-lunch-products started');

  return await safeCateringApiOperation(
    () => getLunchProducts(),
    [], // Fallback to empty array
    'lunch-products'
  );
}

async function getLunchProducts() {
  const startTime = Date.now();
  const cacheKey = 'catering-lunch-products';

  // Optimized query: Get category IDs first to avoid JOIN in main query with connection management
  const categoryIds = await withRetry(
    () =>
      prisma.category.findMany({
        where: {
          name: {
            in: [
              'CATERING- LUNCH, STARTERS',
              'CATERING- LUNCH, ENTREES',
              'CATERING- LUNCH, SIDES',
              'CATERING- DESSERTS',
            ],
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),
    3,
    'find-many'
  );

  const categoryIdMap = new Map(categoryIds.map(cat => [cat.id, cat.name]));
  const categoryIdList = categoryIds.map(cat => cat.id);

  // Optimized main query using categoryId instead of JOIN with connection management
  const products = await withRetry(
    () =>
      prisma.product.findMany({
        where: {
          active: true,
          categoryId: {
            in: categoryIdList,
          },
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
        },
        orderBy: [
          { ordinal: 'asc' }, // Admin-controlled order
          { name: 'asc' }, // Alphabetical fallback
        ],
      }),
    3,
    'find-many'
  );

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
      ordinal: Number(product.ordinal || 0), // Include ordinal for proper sorting
    };
  });

  // Sort items in the desired order: STARTERS, ENTREES, SIDES, DESSERTS
  const categoryOrder: Record<string, number> = {
    'CATERING- LUNCH, STARTERS': 1,
    'CATERING- LUNCH, ENTREES': 2,
    'CATERING- LUNCH, SIDES': 3,
    'CATERING- DESSERTS': 4,
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

  return transformedItems;
}
