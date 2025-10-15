import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { safeCateringApiOperation } from '@/lib/catering-api-utils';

export const revalidate = 3600; // Cache for 1 hour (Phase 4: Data Optimization)
export const dynamic = 'force-dynamic'; // Ensure admin ordering changes are reflected immediately

export async function GET(request: NextRequest) {
  logger.info(
    '🍴 [CACHE-OPT] Fetching appetizer products, share platters and desserts from database...'
  );
  logger.info('🚀 [CACHE-OPT] Request for catering-appetizers-products started');

  return await safeCateringApiOperation(
    () => getAppetizerProducts(),
    [], // Fallback to empty array
    'appetizer-products'
  );
}

async function getAppetizerProducts() {
  const startTime = Date.now();
  const cacheKey = 'catering-appetizers-products';

  // Fetch appetizer products, share platter products AND dessert products from the products table
  const appetizers = await withRetry(
    async () => {
      return await prisma.product.findMany({
        where: {
          active: true,
          category: {
            name: {
              in: ['CATERING- APPETIZERS', 'CATERING- SHARE PLATTERS', 'CATERING- DESSERTS'],
              mode: 'insensitive',
            },
          },
        },
        include: {
          category: true,
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
        orderBy: [
          { ordinal: 'asc' }, // Admin-controlled order first
          { name: 'asc' }, // Alphabetical fallback
        ],
      });
    },
    3,
    'fetchAppetizerProducts'
  );

  logger.info(
    `✅ [CACHE-OPT] Found ${appetizers.length} appetizer, share platter and dessert products`
  );

  const processingTime = Date.now() - startTime;
  logger.info(`⚡ [CACHE-OPT] ${cacheKey} processed in ${processingTime}ms`);

  // Transform to match the CateringItem interface
  const transformedAppetizers = appetizers.map(product => {
    // Parse dietary information from description or product metadata
    const description = product.description || '';
    const isGlutenFree =
      description.toLowerCase().includes('-gf') ||
      description.toLowerCase().includes('gluten free') ||
      product.dietaryPreferences?.includes('gluten-free') ||
      false;
    const isVegan =
      description.toLowerCase().includes('-vgn') ||
      description.toLowerCase().includes('vegan') ||
      product.dietaryPreferences?.includes('vegan') ||
      false;
    const isVegetarian =
      description.toLowerCase().includes('-vg') ||
      description.toLowerCase().includes('vegetarian') ||
      product.dietaryPreferences?.includes('vegetarian') ||
      isVegan; // Vegan items are also vegetarian

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price.toString()),
      category: product.category.name.includes('SHARE PLATTERS')
        ? 'SHARE PLATTER'
        : product.category.name.includes('DESSERTS')
          ? 'DESSERT'
          : 'APPETIZER', // Map based on category
      isVegetarian,
      isVegan,
      isGlutenFree,
      servingSize: 'per piece',
      imageUrl: product.images?.[0] || null,
      isActive: product.active,
      squareCategory: product.category.name,
      squareProductId: product.squareId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // Include variations for Share Platters
      variations:
        product.variants?.length > 0
          ? product.variants.map(variant => ({
              id: variant.id,
              name: variant.name,
              price: parseFloat(variant.price?.toString() || product.price.toString()),
            }))
          : undefined,
    };
  });

  return transformedAppetizers;
}
