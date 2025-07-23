import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Starting product category fix via API...');

    // Get the category IDs
    const alfajoresCategory = await prisma.category.findFirst({
      where: { name: 'ALFAJORES' }
    });

    const empanadasCategory = await prisma.category.findFirst({
      where: { name: 'EMPANADAS' }
    });

    if (!alfajoresCategory) {
      return NextResponse.json({
        success: false,
        error: 'ALFAJORES category not found'
      }, { status: 404 });
    }

    if (!empanadasCategory) {
      return NextResponse.json({
        success: false,
        error: 'EMPANADAS category not found'
      }, { status: 404 });
    }

    logger.info(`Found ALFAJORES category: ${alfajoresCategory.id}`);
    logger.info(`Found EMPANADAS category: ${empanadasCategory.id}`);

    // Get current counts before the fix
    const beforeAlfajoresCount = await prisma.product.count({
      where: { categoryId: alfajoresCategory.id }
    });

    const beforeEmpanadasCount = await prisma.product.count({
      where: { categoryId: empanadasCategory.id }
    });

    const beforeDefaultCount = await prisma.product.count({
      where: { categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24' }
    });

    // Update alfajores products
    const alfajoresResult = await prisma.product.updateMany({
      where: {
        name: {
          contains: 'alfajor',
          mode: 'insensitive'
        },
        categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24' // Default category
      },
      data: {
        categoryId: alfajoresCategory.id,
        updatedAt: new Date()
      }
    });

    // Update empanadas products
    const empanadasResult = await prisma.product.updateMany({
      where: {
        name: {
          contains: 'empanada',
          mode: 'insensitive'
        },
        categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24' // Default category
      },
      data: {
        categoryId: empanadasCategory.id,
        updatedAt: new Date()
      }
    });

    // Get counts after the fix
    const afterAlfajoresCount = await prisma.product.count({
      where: { categoryId: alfajoresCategory.id }
    });

    const afterEmpanadasCount = await prisma.product.count({
      where: { categoryId: empanadasCategory.id }
    });

    const afterDefaultCount = await prisma.product.count({
      where: { categoryId: '738b24dd-4b07-46a0-a561-57ee885c1f24' }
    });

    logger.info(`Updated ${alfajoresResult.count} alfajores products`);
    logger.info(`Updated ${empanadasResult.count} empanadas products`);

    return NextResponse.json({
      success: true,
      message: 'Product categories fixed successfully',
      results: {
        alfajores: {
          updated: alfajoresResult.count,
          before: beforeAlfajoresCount,
          after: afterAlfajoresCount
        },
        empanadas: {
          updated: empanadasResult.count,
          before: beforeEmpanadasCount,
          after: afterEmpanadasCount
        },
        default: {
          before: beforeDefaultCount,
          after: afterDefaultCount
        }
      },
      categories: {
        alfajores: {
          id: alfajoresCategory.id,
          name: alfajoresCategory.name,
          slug: alfajoresCategory.slug
        },
        empanadas: {
          id: empanadasCategory.id,
          name: empanadasCategory.name,
          slug: empanadasCategory.slug
        }
      }
    });

  } catch (error) {
    logger.error('Error fixing product categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix product categories',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.info('Getting product category status...');

    // Get all categories with product counts
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get specific counts for key categories
    const alfajoresCategory = await prisma.category.findFirst({
      where: { name: 'ALFAJORES' }
    });

    const empanadasCategory = await prisma.category.findFirst({
      where: { name: 'EMPANADAS' }
    });

    const defaultCategory = await prisma.category.findFirst({
      where: { name: 'Default' }
    });

    return NextResponse.json({
      success: true,
      categories,
      keyCategories: {
        alfajores: alfajoresCategory ? {
          id: alfajoresCategory.id,
          name: alfajoresCategory.name,
          slug: alfajoresCategory.slug,
          productCount: await prisma.product.count({
            where: { categoryId: alfajoresCategory.id }
          })
        } : null,
        empanadas: empanadasCategory ? {
          id: empanadasCategory.id,
          name: empanadasCategory.name,
          slug: empanadasCategory.slug,
          productCount: await prisma.product.count({
            where: { categoryId: empanadasCategory.id }
          })
        } : null,
        default: defaultCategory ? {
          id: defaultCategory.id,
          name: defaultCategory.name,
          slug: defaultCategory.slug,
          productCount: await prisma.product.count({
            where: { categoryId: defaultCategory.id }
          })
        } : null
      }
    });

  } catch (error) {
    logger.error('Error getting category status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get category status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 