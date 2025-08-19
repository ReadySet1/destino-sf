import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export const revalidate = 0; // Disable caching for real-time data

export async function GET(request: NextRequest) {
  try {
    logger.info('📦 Fetching boxed lunch items from database...');

    const products = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            in: ['CATERING- BOXED LUNCHES'],
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
      orderBy: {
        name: 'asc'
      }
    });

    logger.info(`✅ Found ${products.length} boxed lunch products`);

    // Transform to match the BoxedLunchItem interface
    const transformedItems = products.map(product => {
      // Parse dietary information from description
      const description = product.description || '';
      const dietaryPreferences = product.dietaryPreferences || [];
      
      // Extract dietary info from description text (e.g., "-gf", "-vg", "-vegan")
      const isGlutenFree = dietaryPreferences.includes('gluten-free') || 
                          description.toLowerCase().includes('-gf') || 
                          description.toLowerCase().includes('gluten free');
      
      const isVegan = dietaryPreferences.includes('vegan') || 
                     description.toLowerCase().includes('-vg') || 
                     description.toLowerCase().includes('vegan');
      
      const isVegetarian = dietaryPreferences.includes('vegetarian') || 
                          description.toLowerCase().includes('vegetarian') || 
                          isVegan; // Vegan items are also vegetarian

      // Check if this is the Tropical Salad that needs modifiers
      const isTropicalSalad = product.name.toLowerCase().includes('tropical salad');
      
      const modifiers = isTropicalSalad ? [
        {
          id: 'queso_fresco',
          name: 'Add Queso Fresco (4oz)',
          price: 2.00,
          dietaryInfo: 'gf'
        },
        {
          id: 'sirloin_steak', 
          name: 'Add Sirloin Steak (4oz)',
          price: 4.00,
          dietaryInfo: 'gf'
        },
        {
          id: 'chicken_mojo',
          name: 'Add Chicken Mojo (4oz)', 
          price: 3.00,
          dietaryInfo: 'gf'
        }
      ] : [];

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        squareId: product.squareId || '',
        imageUrl: product.images?.[0] || null,
        dietaryPreferences: dietaryPreferences,
        isGlutenFree,
        isVegan,
        isVegetarian,
        modifiers: modifiers.length > 0 ? modifiers : undefined
      };
    });

    return NextResponse.json({
      success: true,
      items: transformedItems
    });

  } catch (error) {
    logger.error('❌ Failed to fetch boxed lunch items:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch boxed lunch items',
        items: []
      },
      { status: 500 }
    );
  }
}
