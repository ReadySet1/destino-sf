import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Get the parameter that decides whether to clear all or only those with images
    const onlyWithImages = request.nextUrl.searchParams.get('only_with_images') === 'true';
    const dryRun = request.nextUrl.searchParams.get('dry_run') === 'true';
    
    logger.info(`Starting Square ID clear operation. Only with images: ${onlyWithImages}, Dry run: ${dryRun}`);
    
    // Build the where clause based on the parameter
    let whereClause: any = {
      squareId: {
        not: null
      }
    };
    
    // If only_with_images is true, add a condition for images array length
    if (onlyWithImages) {
      whereClause = {
        ...whereClause,
        images: {
          isEmpty: false
        }
      };
    }
    
    // First count how many products will be affected
    const count = await prisma.product.count({
      where: whereClause
    });
    
    logger.info(`Found ${count} products to clear Square IDs for`);
    
    // If this is a dry run, just return the count
    if (dryRun) {
      return NextResponse.json({
        dry_run: true,
        would_clear: count
      });
    }
    
    // Update the products to clear their Square IDs
    let result;
    if (onlyWithImages) {
      // Use raw SQL for the update when filtering by images
      const updateResult = await prisma.$executeRaw`
        UPDATE "Product"
        SET "squareId" = NULL, "updatedAt" = NOW()
        WHERE "squareId" IS NOT NULL AND array_length("images", 1) > 0
      `;
      result = { count: updateResult };
    } else {
      // Use raw SQL for the update
      const updateResult = await prisma.$executeRaw`
        UPDATE "Product" 
        SET "squareId" = NULL, "updatedAt" = NOW()
        WHERE "squareId" IS NOT NULL
      `;
      result = { count: updateResult };
    }
    
    logger.info(`Successfully cleared Square IDs for ${result.count} products`);
    
    return NextResponse.json({
      success: true,
      cleared: result.count,
      total: count
    });
  } catch (error) {
    logger.error('Error clearing Square IDs:', error);
    return NextResponse.json(
      { error: 'Failed to clear Square IDs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 