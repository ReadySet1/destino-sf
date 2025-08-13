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
    archivedItems: []
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
          { squareId: '' }
        ]
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    if (removedProducts.length === 0) {
      logger.info('✅ No products need to be archived');
      return result;
    }

    logger.info(`📦 Found ${removedProducts.length} products removed from Square`);

    // Archive each removed product
    for (const product of removedProducts) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            active: false,
            updatedAt: new Date()
          }
        });

        result.archivedItems.push({
          id: product.id,
          name: product.name,
          squareId: product.squareId || '',
          category: product.category?.name || 'Uncategorized'
        });

        result.archived++;
        logger.info(`🗃️ Archived: "${product.name}" (Square ID: ${product.squareId})`);
      } catch (error) {
        result.errors++;
        logger.error(`❌ Failed to archive "${product.name}":`, error);
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
}> {
  try {
    const archivedProducts = await prisma.product.findMany({
      where: {
        active: false,
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const byCategory: Record<string, number> = {};
    
    archivedProducts.forEach(product => {
      const categoryName = product.category?.name || 'Uncategorized';
      byCategory[categoryName] = (byCategory[categoryName] || 0) + 1;
    });

    return {
      total: archivedProducts.length,
      byCategory
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
        active: false
      }
    });

    if (archivedProduct) {
      await prisma.product.update({
        where: { id: archivedProduct.id },
        data: {
          active: true,
          updatedAt: new Date()
        }
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
