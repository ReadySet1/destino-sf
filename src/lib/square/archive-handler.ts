/**
 * Square Archive Handler
 *
 * Handles archiving products that are removed from Square
 */

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export interface ArchiveResult {
  archived: number;
  errors: number;
  archivedItems: Array<{
    id: string;
    name: string;
    squareId: string;
    category: string;
  }>;
}

/**
 * Archive products that exist in local database but are no longer in Square
 */
export async function archiveRemovedSquareProducts(
  validSquareIds: string[]
): Promise<ArchiveResult> {
  const result: ArchiveResult = {
    archived: 0,
    errors: 0,
    archivedItems: [],
  };

  try {
    logger.info('🗃️ Checking for products removed from Square...');

    // Find products with Square IDs that are no longer in Square
    const removedProducts = await prisma.product.findMany({
      where: {
        active: true,
        squareId: {
          // Condition 1: Find products whose ID is NOT in the list from Square
          notIn: validSquareIds,
        },
        NOT: [
          // Condition 2: AND the squareId should NOT be an empty string
          { squareId: '' },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (removedProducts.length === 0) {
      logger.info('✅ No products need to be archived');
      return result;
    }

    // Circuit breaker: refuse to archive more than 20% of the catalog in one run
    const totalActiveWithSquareId = await prisma.product.count({
      where: { active: true, NOT: [{ squareId: '' }] },
    });

    if (totalActiveWithSquareId > 0) {
      const archiveRatio = removedProducts.length / totalActiveWithSquareId;
      if (archiveRatio > 0.20) {
        logger.error(
          `CIRCUIT BREAKER: Would archive ${removedProducts.length} of ${totalActiveWithSquareId} ` +
          `products (${(archiveRatio * 100).toFixed(1)}%), exceeding 20% threshold. ` +
          `This likely indicates a Square API issue. Skipping archive.`
        );
        result.errors = 1;
        return result;
      }
    }

    logger.info(`📦 Found ${removedProducts.length} products removed from Square`);

    // Batch archive all removed products for better performance
    try {
      const archiveStartTime = Date.now();

      // Use updateMany for batch operation - much faster than individual updates
      const updateResult = await prisma.product.updateMany({
        where: {
          active: true,
          squareId: {
            notIn: validSquareIds,
          },
          NOT: [{ squareId: '' }],
        },
        data: {
          active: false,
          isArchived: true,
          archivedAt: new Date(),
          archivedReason: 'removed_from_square',
          updatedAt: new Date(),
        },
      });

      const archiveTime = Date.now() - archiveStartTime;
      result.archived = updateResult.count;

      // Store archived items info for reporting
      result.archivedItems = removedProducts.map(product => ({
        id: product.id,
        name: product.name,
        squareId: product.squareId || '',
        category: product.category?.name || 'Uncategorized',
      }));

      logger.info(
        `✅ Batch archived ${result.archived} products in ${archiveTime}ms (${Math.round(archiveTime / 1000)}s)`
      );

      // Log first few archived items for verification
      if (result.archivedItems.length > 0) {
        logger.info(`📋 Sample archived products:`);
        result.archivedItems.slice(0, 5).forEach(item => {
          logger.info(`   • "${item.name}" (${item.squareId}) in ${item.category}`);
        });
        if (result.archivedItems.length > 5) {
          logger.info(`   • ... and ${result.archivedItems.length - 5} more`);
        }
      }
    } catch (error) {
      result.errors++;
      logger.error(`❌ Failed to batch archive products:`, error);

      // Fallback to individual updates if batch fails
      logger.info('🔄 Falling back to individual updates...');
      for (const product of removedProducts) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              active: false,
              isArchived: true,
              archivedAt: new Date(),
              archivedReason: 'removed_from_square',
              updatedAt: new Date(),
            },
          });

          result.archivedItems.push({
            id: product.id,
            name: product.name,
            squareId: product.squareId || '',
            category: product.category?.name || 'Uncategorized',
          });

          result.archived++;
          logger.info(`🗃️ Archived: "${product.name}" (Square ID: ${product.squareId})`);
        } catch (individualError) {
          result.errors++;
          logger.error(`❌ Failed to archive "${product.name}":`, individualError);
        }
      }
    }

    logger.info(`\n📊 Archive Summary:`);
    logger.info(`   • Products archived: ${result.archived}`);
    logger.info(`   • Errors: ${result.errors}`);
    logger.info(`   • Total processed: ${removedProducts.length}`);

    return result;
  } catch (error) {
    logger.error('❌ Error during archive process:', error);
    throw error;
  }
}

/**
 * Get count of archived products for reporting
 */
export async function getArchivedProductsCount(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byReason: Record<string, number>;
}> {
  try {
    const archivedProducts = await prisma.product.findMany({
      where: {
        isArchived: true, // Use dedicated archive field
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const byCategory: Record<string, number> = {};
    const byReason: Record<string, number> = {};

    archivedProducts.forEach(product => {
      const categoryName = product.category?.name || 'Uncategorized';
      byCategory[categoryName] = (byCategory[categoryName] || 0) + 1;

      const reason = product.archivedReason || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    });

    return {
      total: archivedProducts.length,
      byCategory,
      byReason,
    };
  } catch (error) {
    logger.error('❌ Error getting archived products count:', error);
    throw error;
  }
}

/**
 * Restore archived product if it appears again in Square
 */
export async function restoreArchivedProduct(squareId: string): Promise<boolean> {
  try {
    const archivedProduct = await prisma.product.findFirst({
      where: {
        squareId,
        isArchived: true, // Use dedicated archive field
      },
    });

    if (archivedProduct) {
      await prisma.product.update({
        where: { id: archivedProduct.id },
        data: {
          active: true,
          isArchived: false,
          archivedAt: null,
          archivedReason: null,
          updatedAt: new Date(),
        },
      });

      logger.info(`🔄 Restored archived product: "${archivedProduct.name}" (${squareId})`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`❌ Error restoring archived product ${squareId}:`, error);
    return false;
  }
}
