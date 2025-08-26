// src/app/api/square/sync/route.ts

import { NextResponse } from 'next/server';
import { syncProductsProduction } from '@/lib/square/production-sync';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';

// Explicit Vercel runtime configuration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
  try {
    logger.info('🚀 Square sync API triggered via POST');
    logger.info('📊 Pre-sync statistics:');
    
    // Log current state before sync
    const preStats = await prisma.product.groupBy({
      by: ['active', 'categoryId'],
      _count: true
    });
    
    logger.info('Pre-sync product distribution:', preStats);

    // Check specifically for empanadas before sync
    const empanadasCategoryBefore = await prisma.category.findFirst({
      where: { name: 'EMPANADAS' }
    });
    
    let empanadasCountBefore = 0;
    if (empanadasCategoryBefore) {
      empanadasCountBefore = await prisma.product.count({
        where: {
          categoryId: empanadasCategoryBefore.id,
          active: true
        }
      });
      logger.info(`🌮 Active empanadas before sync: ${empanadasCountBefore}`);
    } else {
      logger.warn('⚠️ EMPANADAS category not found before sync');
    }

    // Parse request body for options
    let options = {};
    try {
      const body = await request.json();
      options = body.options || {};
    } catch {
      // If body parsing fails, use default options
      logger.info('Using default sync options');
    }

    // Start the production sync process
    const result = await syncProductsProduction(options);

    // Log post-sync state
    logger.info('📊 Post-sync statistics:');
    const postStats = await prisma.product.groupBy({
      by: ['active', 'categoryId'],
      _count: true
    });
    
    logger.info('Post-sync product distribution:', postStats);

    // Check specifically for empanadas after sync
    const empanadasCategory = await prisma.category.findFirst({
      where: { name: 'EMPANADAS' }
    });
    
    if (empanadasCategory) {
      const empanadasCount = await prisma.product.count({
        where: {
          categoryId: empanadasCategory.id,
          active: true
        }
      });
      logger.info(`🌮 Active empanadas after sync: ${empanadasCount} (was: ${empanadasCountBefore})`);
      
      // Log sample empanadas to verify category assignment
      const sampleEmpanadas = await prisma.product.findMany({
        where: {
          categoryId: empanadasCategory.id
        },
        take: 3,
        select: {
          name: true,
          active: true,
          squareId: true
        }
      });
      
      logger.info('📋 Sample empanadas:', sampleEmpanadas);
    } else {
      logger.error('❌ EMPANADAS category still not found after sync!');
    }

    const response = {
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      data: {
        syncedProducts: result.syncedProducts,
        skippedProducts: result.skippedProducts,
        productDetails: result.productDetails,
        errors: result.errors,
        warnings: result.warnings,
        empanadasInfo: empanadasCategory ? {
          categoryId: empanadasCategory.id,
          activeCount: await prisma.product.count({
            where: { categoryId: empanadasCategory.id, active: true }
          }),
          totalCount: await prisma.product.count({
            where: { categoryId: empanadasCategory.id }
          })
        } : null,
      },
    };

    // Return appropriate status code based on result
    const statusCode = result.success ? 200 : 500;

    logger.info(`✅ Sync completed - Status: ${result.success ? 'SUCCESS' : 'FAILED'}`, {
      syncedProducts: result.syncedProducts,
      errors: result.errors.length,
      warnings: result.warnings.length,
    });

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    logger.error('❌ Critical error in Square sync API route:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Critical sync failure',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          syncedProducts: 0,
          skippedProducts: 0,
          productDetails: {
            created: 0,
            updated: 0,
            withImages: 0,
            withoutImages: 0,
          },
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
        },
      },
      { status: 500 }
    );
  }
}

// Add GET method for triggering sync via admin panel
export async function GET() {
  try {
    logger.info('🚀 Square sync API triggered via GET (admin trigger)');

    // Use default production options
    const result = await syncProductsProduction({
      validateImages: true,
      enableCleanup: true,
      batchSize: 25, // Smaller batch for admin-triggered sync
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      data: {
        syncedProducts: result.syncedProducts,
        skippedProducts: result.skippedProducts,
        productDetails: result.productDetails,
        errors: result.errors,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    logger.error('❌ Critical error in Square sync API GET route:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Critical sync failure',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
