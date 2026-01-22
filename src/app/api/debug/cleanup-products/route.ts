import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db-unified';
import { squareClient } from '@/lib/square/client';
import { logger } from '@/utils/logger';

// Safety threshold: refuse to modify if >50% of products would be affected
// This protects against empty Square catalog (sandbox) or API errors
const SAFETY_THRESHOLD_PERCENT = 50;

/**
 * Cleanup products with invalid Square IDs
 *
 * Available actions:
 * - action=3 (default): List invalid products only (no changes)
 * - action=1: Clear Square IDs from invalid products (keeps products, removes squareId)
 *
 * Note: Delete functionality (action=2) has been removed for safety.
 * Products should be managed through the admin UI or archived instead.
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Starting invalid product cleanup...');

    // Get the action from query param
    const action = request.nextUrl.searchParams.get('action') || '3'; // Default to list only

    // Reject removed delete action
    if (action === '2') {
      logger.warn('Attempted to use removed delete action (action=2)');
      return NextResponse.json(
        {
          error: 'Delete action disabled',
          message:
            'The delete action (action=2) has been permanently removed for safety. ' +
            'Use action=1 to clear Square IDs, or manage products through the admin UI.',
          availableActions: {
            '1': 'Clear Square IDs from invalid products (keeps products)',
            '3': 'List invalid products only (no changes, default)',
          },
        },
        { status: 400 }
      );
    }

    // Check if Square client is available
    if (!squareClient || !squareClient.catalogApi) {
      logger.error('Square client or catalogApi not available');
      return NextResponse.json({ error: 'Square client not properly configured' }, { status: 500 });
    }

    // First get all Square catalog items to know what's valid
    logger.info('Fetching all Square catalog items...');
    const catalogResponse = await squareClient.catalogApi.searchCatalogObjects({
      objectTypes: ['ITEM'],
      includeDeletedObjects: false,
    } as Parameters<typeof squareClient.catalogApi.searchCatalogObjects>[0]);
    const validSquareItems = catalogResponse.result?.objects || [];

    // Extract valid Square IDs
    const validSquareIds = validSquareItems.map(item => item.id);
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
        totalProductCount: products.length,
        validSquareItemCount: validSquareIds.length,
      });
    }

    // Calculate percentage of products that would be affected
    const productsWithSquareId = products.filter(p => p.squareId).length;
    const affectedPercent = productsWithSquareId > 0
      ? (invalidProducts.length / productsWithSquareId) * 100
      : 0;

    const results = {
      action,
      invalidProductCount: invalidProducts.length,
      totalProductCount: products.length,
      productsWithSquareId,
      validSquareItemCount: validSquareIds.length,
      affectedPercent: Math.round(affectedPercent * 10) / 10,
      invalidProducts: invalidProducts.map(p => ({ id: p.id, name: p.name, squareId: p.squareId })),
      changes: [] as Array<{ id: string; name: string; action: string }>,
    };

    switch (action) {
      case '1':
        // Safety check: refuse if too many products would be affected
        if (affectedPercent > SAFETY_THRESHOLD_PERCENT) {
          logger.warn(
            `Safety threshold exceeded: ${invalidProducts.length}/${productsWithSquareId} ` +
            `(${affectedPercent.toFixed(1)}%) products would have squareIds cleared. ` +
            `Threshold is ${SAFETY_THRESHOLD_PERCENT}%. This may indicate an empty Square catalog (sandbox) or API issue.`
          );
          return NextResponse.json({
            error: 'Safety threshold exceeded',
            message: `Refusing to clear squareIds from ${invalidProducts.length} out of ${productsWithSquareId} products ` +
              `(${affectedPercent.toFixed(1)}%). This exceeds the safety threshold of ${SAFETY_THRESHOLD_PERCENT}%. ` +
              `This may indicate: (1) Square Sandbox is empty, (2) Wrong Square environment configured, or (3) Square API error. ` +
              `Use action=3 to list affected products without making changes.`,
            ...results,
            safetyThreshold: SAFETY_THRESHOLD_PERCENT,
          }, { status: 400 });
        }

        // Clear Square IDs
        logger.info('Clearing invalid Square IDs...');
        for (const product of invalidProducts) {
          // Use raw SQL to set squareId to NULL since Prisma types can be tricky with nullable unique fields
          await prisma.$executeRaw`
            UPDATE "products"
            SET "squareId" = NULL, "updatedAt" = NOW()
            WHERE "id" = ${product.id}::uuid
          `;
          logger.info(`Cleared Square ID for product: ${product.name}`);
          results.changes.push({ id: product.id, name: product.name, action: 'cleared_square_id' });
        }
        logger.info(`Successfully cleared Square IDs for ${invalidProducts.length} products`);
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
