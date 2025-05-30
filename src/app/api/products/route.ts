import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeVariants = searchParams.get('includeVariants') === 'true';
    const onlyActive = searchParams.get('onlyActive') !== 'false'; // Default to true
    const categoryId = searchParams.get('categoryId') || undefined;
    const featured = searchParams.get('featured') === 'true' ? true : undefined;
    const exclude = searchParams.get('exclude') || undefined; // Product ID to exclude
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Build the query based on parameters
    const whereCondition: any = {
      active: onlyActive ? true : undefined,
      categoryId: categoryId,
      featured: featured,
    };

    // Add exclusion condition if provided
    if (exclude) {
      whereCondition.NOT = {
        id: exclude,
      };
    }

    // Remove undefined values
    Object.keys(whereCondition).forEach(
      (key) => whereCondition[key] === undefined && delete whereCondition[key]
    );

    // Get products with optional variants
    const products = await prisma.product.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: includeVariants ? {
          select: {
            id: true,
            name: true,
            price: true,
          },
        } : false,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit, // Apply limit if provided
    });

    // Convert BigInt price to regular number for JSON serialization
    const serializedProducts = products.map(product => ({
      ...product,
      price: product.price ? parseFloat(product.price.toString()) : 0,
      variants: includeVariants 
        ? product.variants.map(variant => ({
            ...variant,
            price: variant.price ? parseFloat(variant.price.toString()) : null,
          }))
        : [],
    }));

    return NextResponse.json(serializedProducts);
  } catch (error) {
    logger.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 