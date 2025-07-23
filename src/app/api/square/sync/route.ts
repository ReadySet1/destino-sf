// src/app/api/square/sync/route.ts

import { NextResponse } from 'next/server';
import { syncProductsProduction } from '@/lib/square/production-sync';
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  try {
    logger.info('🚀 Square sync API triggered via POST');

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
