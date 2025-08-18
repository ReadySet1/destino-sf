import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { mapSquareCategoryToCateringCategory } from '@/utils/catering-optimized';

export async function GET(request: NextRequest) {
  try {
    logger.info('🥪 Fetching lunch products from database...');

    const products = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            in: [
              'CATERING- LUNCH, STARTERS',
              'CATERING- LUNCH, ENTREES',
              'CATERING- LUNCH, SIDES',
              'CATERING- DESSERTS'
            ]
          }
        }
      },
      include: {
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    const transformedItems = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      squareCategory: product.category?.name || '',
      category: mapSquareCategoryToCateringCategory(product.category?.name || ''),
      imageUrl: product.images?.[0] || null,
      isVegetarian: product.dietaryPreferences?.includes('vegetarian') || false,
      isVegan: product.dietaryPreferences?.includes('vegan') || false,
      isGlutenFree: product.dietaryPreferences?.includes('gluten-free') || false,
      servingSize: 'per serving', // Default serving size since it's not stored in the database
      isActive: product.active
    }));

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
      
      // If same category, sort by name
      return a.name.localeCompare(b.name);
    });

    logger.info(`✅ Found ${products.length} lunch products`);

    return NextResponse.json({
      success: true,
      items: transformedItems,
      count: products.length
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
