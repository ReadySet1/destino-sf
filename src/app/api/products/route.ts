import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeQuery } from '@/lib/db-utils';
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
    const excludeCatering = searchParams.get('excludeCatering') !== 'false'; // Default to true

    // New parameters for pagination and search
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const search = searchParams.get('search') || undefined;
    const includePagination = searchParams.get('includePagination') === 'true';

    // Build the query based on parameters
    const whereCondition: any = {
      active: onlyActive ? true : undefined,
      categoryId: categoryId,
      featured: featured,
    };

    // Add proper visibility filtering for customer-facing queries
    if (onlyActive) {
      // Only apply visibility filters when fetching active products for customers
      whereCondition.OR = [
        { visibility: 'PUBLIC' },
        { visibility: null }, // Default to PUBLIC if null
      ];
      whereCondition.isAvailable = true;
      whereCondition.NOT = {
        OR: [
          { itemState: 'INACTIVE' },
          { itemState: 'ARCHIVED' },
        ],
      };
    }

    // Exclude catering products by default (unless explicitly requested)
    if (excludeCatering) {
      // Need to merge with existing NOT conditions
      if (whereCondition.NOT) {
        whereCondition.NOT.OR.push({
          category: {
            name: {
              startsWith: 'CATERING',
              mode: 'insensitive',
            },
          },
        });
      } else {
        whereCondition.category = {
          NOT: {
            name: {
              startsWith: 'CATERING',
              mode: 'insensitive',
            },
          },
        };
      }
    }

    // Add search condition if provided
    if (search) {
      whereCondition.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          category: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Add exclusion condition if provided
    if (exclude) {
      whereCondition.NOT = {
        id: exclude,
      };
    }

    // Remove undefined values
    Object.keys(whereCondition).forEach(
      key => whereCondition[key] === undefined && delete whereCondition[key]
    );

    // Calculate pagination
    const itemsPerPage = limit || (includePagination ? 10 : undefined);
    const skip = includePagination && itemsPerPage ? (page - 1) * itemsPerPage : undefined;

    // Get total count if pagination is requested with connection management
    const totalCount = includePagination
      ? await safeQuery(() => prisma.product.count({ where: whereCondition }))
      : undefined;

    // Get products with optional variants with connection management
    const products = await safeQuery(() =>
      prisma.product.findMany({
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
          variants: includeVariants
            ? {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              }
            : false,
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
        skip: skip,
        take: itemsPerPage,
      })
    );

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

    // Return with pagination metadata if requested
    if (includePagination && totalCount !== undefined && itemsPerPage) {
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      return NextResponse.json({
        data: serializedProducts,
        pagination: {
          page,
          limit: itemsPerPage,
          total: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    }

    return NextResponse.json(serializedProducts);
  } catch (error) {
    logger.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
