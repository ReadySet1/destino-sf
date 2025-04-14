import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    logger.info('Fetching products from database');
    
    // Get all products with their variants
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        category: true
      }
    });
    
    return NextResponse.json({
      success: true,
      count: products.length,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        squareId: product.squareId,
        categoryId: product.categoryId,
        categoryName: product.category?.name,
        variants: product.variants.map(variant => ({
          id: variant.id,
          name: variant.name,
          price: variant.price.toString(),
          squareVariantId: variant.squareVariantId
        })),
        images: product.images,
        featured: product.featured,
        active: product.active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }))
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 