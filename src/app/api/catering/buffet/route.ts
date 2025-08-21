import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export const revalidate = 0; // Disable caching for real-time data

export async function GET(request: NextRequest) {
  try {
    logger.info('🍽️ Fetching buffet products from database...');
    
    // Fetch buffet products from the products table
    const buffetItems = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            in: ['CATERING- BUFFET, STARTERS', 'CATERING- BUFFET, ENTREES', 'CATERING- BUFFET, SIDES'],
            mode: 'insensitive'
          }
        }
      },
      include: {
        category: true,
        variants: {
          select: {
            id: true,
            name: true,
            price: true,
          }
        }
      },
      orderBy: [
        {
          category: {
            name: 'asc'  // Keep category ordering
          }
        },
        {
          ordinal: 'asc'  // Admin-controlled order within category
        },
        {
          name: 'asc'     // Alphabetical fallback
        }
      ]
    });

    logger.info(`✅ Found ${buffetItems.length} buffet products`);

    // Transform to match the CateringItem interface
    const transformedBuffetItems = buffetItems.map(product => {
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
      const categoryName = product.category.name;
      
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
        squareCategory: product.category.name,
        squareProductId: product.squareId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      items: transformedBuffetItems,
      count: transformedBuffetItems.length,
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
