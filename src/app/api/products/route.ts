import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

type PrismaVariant = {
  id: string;
  name: string;
  price?: number | null;
  squareVariantId?: string | null;
};

type PrismaProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  categoryId: string;
  category?: {
    name: string | null;
  } | null;
  squareId: string;
  featured: boolean;
  active: boolean;
  slug: string | null;
  variants: PrismaVariant[];
};

export async function GET() {
  try {
    logger.info('Fetching products from database');
    
    // Get all products with their variants
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        variants: true
      }
    });
    
    return NextResponse.json({
      success: true,
      count: products.length,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        images: product.images,
        categoryId: product.categoryId,
        categoryName: product.category?.name,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price ? Number(variant.price) : undefined,
          squareVariantId: variant.squareVariantId
        })),
        squareId: product.squareId,
        featured: product.featured,
        active: product.active,
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