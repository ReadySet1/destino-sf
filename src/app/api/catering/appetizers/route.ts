import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export const revalidate = 0; // Disable caching for real-time data

export async function GET(request: NextRequest) {
  try {
    logger.info('🍴 Fetching appetizer products, share platters and desserts from database...');
    
    // Fetch appetizer products, share platter products AND dessert products from the products table
    const appetizers = await prisma.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            in: ['CATERING- APPETIZERS', 'CATERING- SHARE PLATTERS', 'CATERING- DESSERTS'],
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

    logger.info(`✅ Found ${appetizers.length} appetizer, share platter and dessert products`);

    // Transform to match the CateringItem interface
    const transformedAppetizers = appetizers.map(product => {
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

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price.toString()),
        category: product.category.name.includes('SHARE PLATTERS') ? 'SHARE PLATTER' : 
                 product.category.name.includes('DESSERTS') ? 'DESSERT' : 'APPETIZER', // Map based on category
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
        variations: product.variants?.length > 0 ? product.variants.map(variant => ({
          id: variant.id,
          name: variant.name,
          price: parseFloat(variant.price?.toString() || product.price.toString())
        })) : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      items: transformedAppetizers,
      count: transformedAppetizers.length,
    });

  } catch (error) {
    logger.error('❌ Failed to fetch appetizer products:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch appetizer products',
        items: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
