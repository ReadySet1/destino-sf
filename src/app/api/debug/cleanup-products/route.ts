import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';
import { Prisma } from '@prisma/client';

// Define the shape of catalog objects from Square
interface SquareCatalogObject {
  id: string;
  type: string;
  [key: string]: any; // Allow other properties
}

export async function GET(request: NextRequest) {
  try {
    logger.info('Starting invalid product cleanup...');

    // Get the action from query param
    const action = request.nextUrl.searchParams.get('action') || '3'; // Default to list only

    // Check if Square client is available
    if (!squareClient || !squareClient.catalogApi) {
      logger.error('Square client or catalogApi not available');
      return NextResponse.json({ error: 'Square client not properly configured' }, { status: 500 });
    }

    // First get all Square catalog items to know what's valid
    logger.info('Fetching all Square catalog items...');
    const requestBody = {
      object_types: ['ITEM'],
      include_deleted_objects: false,
    };

    const catalogResponse = await squareClient.catalogApi.searchCatalogObjects(requestBody);
    const validSquareItems = catalogResponse.result?.objects || [];

    // Extract valid Square IDs
    const validSquareIds = validSquareItems.map((item: SquareCatalogObject) => item.id);
    logger.info(`Found ${validSquareIds.length} valid Square catalog items`);

    // Get all products from the database
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        squareId: true,
        images: true,
      },
    });

    logger.info(`Found ${products.length} products in the database`);

    // Identify products with invalid Square IDs
    const invalidProducts = products.filter(
      product => product.squareId && !validSquareIds.includes(product.squareId)
    );

    logger.info(`Found ${invalidProducts.length} products with invalid Square IDs`);

    if (invalidProducts.length === 0) {
      return NextResponse.json({
        message: 'No invalid products found. Database is clean.',
        invalidProductCount: 0,
      });
    }

    const results = {
      action,
      invalidProductCount: invalidProducts.length,
      invalidProducts: invalidProducts.map(p => ({ id: p.id, name: p.name, squareId: p.squareId })),
      changes: [] as Array<{ id: string; name: string; action: string }>,
    };

    switch (action) {
      case '1':
        // Clear Square IDs
        logger.info('Clearing invalid Square IDs...');
        for (const product of invalidProducts) {
          // Use undefined instead of null for Prisma to properly handle this field
          const updateData: Prisma.ProductUpdateInput = {
            squareId: undefined,
            updatedAt: new Date(),
          };

          await prisma.product.update({
            where: { id: product.id },
            data: updateData,
          });
          logger.info(`Cleared Square ID for product: ${product.name}`);
          results.changes.push({ id: product.id, name: product.name, action: 'cleared_square_id' });
        }
        logger.info(`Successfully cleared Square IDs for ${invalidProducts.length} products`);
        break;

      case '2':
        // Delete products entirely
        logger.info('Deleting invalid products...');
        for (const product of invalidProducts) {
          // First delete associated variants
          await prisma.variant.deleteMany({
            where: { productId: product.id },
          });

          // Then delete the product
          await prisma.product.delete({
            where: { id: product.id },
          });

          logger.info(`Deleted product: ${product.name}`);
          results.changes.push({ id: product.id, name: product.name, action: 'deleted' });
        }
        logger.info(`Successfully deleted ${invalidProducts.length} invalid products`);
        break;

      case '3':
      default:
        // Just list the invalid products
        logger.info('Listing invalid products only, no changes made');
        break;
    }

    logger.info('Cleanup process completed');
    return NextResponse.json(results);
  } catch (error) {
    logger.error('Error in cleanup process:', error);
    return NextResponse.json(
      {
        error: 'Failed to clean up products',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
