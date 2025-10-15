#!/usr/bin/env tsx

/**
 * Emergency Restore Script for Incorrectly Archived Products
 *
 * This script identifies and restores products that were incorrectly archived
 * due to the Square sync archive logic bug.
 */

import { prisma } from '../src/lib/db';
import { logger } from '../src/utils/logger';
import { searchCatalogObjects } from '../src/lib/square/catalog-api';
import { LEGACY_CATEGORY_MAPPINGS } from '../src/lib/square/category-mapper';

interface ArchivedProduct {
  id: string;
  name: string;
  squareId: string;
  categoryName: string;
  archivedAt: Date;
  existsInSquare: boolean;
}

/**
 * Check if a product exists in Square by its ID
 */
async function checkIfExistsInSquare(squareId: string): Promise<boolean> {
  try {
    // Try to search for the specific item by ID
    const response = await searchCatalogObjects({
      object_types: ['ITEM'],
      query: {
        exact_query: {
          attribute_name: 'id',
          attribute_value: squareId,
        },
      },
      limit: 1,
    });

    return !!(response.result.objects && response.result.objects.length > 0);
  } catch (error) {
    logger.error(`❌ Error checking Square for product ${squareId}:`, error);
    return false;
  }
}

/**
 * Get all active Square product IDs (for bulk verification)
 */
async function getAllActiveSquareProductIds(): Promise<Set<string>> {
  const allSquareIds = new Set<string>();

  try {
    logger.info('🔍 Fetching ALL active Square product IDs...');

    // Get ALL categories (both CATERING and CORE PRODUCTS)
    const allCategories = Object.entries(LEGACY_CATEGORY_MAPPINGS);

    for (const [squareId, categoryName] of allCategories) {
      try {
        const response = await searchCatalogObjects({
          object_types: ['ITEM'],
          query: {
            exact_query: {
              attribute_name: 'category_id',
              attribute_value: squareId,
            },
          },
          limit: 100,
          include_related_objects: false, // We only need IDs
        });

        if (response.result.objects) {
          for (const item of response.result.objects) {
            if (item.type === 'ITEM' && item.id) {
              allSquareIds.add(item.id);
            }
          }
        }

        logger.info(
          `✅ Category "${categoryName}": found ${response.result.objects?.length || 0} items`
        );
      } catch (error) {
        logger.error(`❌ Failed to fetch items for category "${categoryName}":`, error);
      }
    }

    logger.info(`📊 Total active Square products: ${allSquareIds.size}`);
    return allSquareIds;
  } catch (error) {
    logger.error('❌ Error fetching all Square product IDs:', error);
    throw error;
  }
}

/**
 * Find recently archived products that might have been incorrectly archived
 */
async function findRecentlyArchivedProducts(hours: number = 24): Promise<ArchivedProduct[]> {
  logger.info(`🔍 Looking for products archived in the last ${hours} hours...`);

  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  const archivedProducts = await prisma.product.findMany({
    where: {
      active: false,
      updatedAt: {
        gte: cutoffDate,
      },
      squareId: {
        not: '',
      },
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  logger.info(`📦 Found ${archivedProducts.length} recently archived products with Square IDs`);

  return archivedProducts.map(product => ({
    id: product.id,
    name: product.name,
    squareId: product.squareId || '',
    categoryName: product.category?.name || 'Uncategorized',
    archivedAt: product.updatedAt,
    existsInSquare: false, // Will be checked later
  }));
}

/**
 * Verify which archived products still exist in Square
 */
async function verifyArchivedProducts(
  archivedProducts: ArchivedProduct[],
  useIndividualChecks: boolean = false
): Promise<ArchivedProduct[]> {
  logger.info(`🔍 Verifying ${archivedProducts.length} archived products against Square...`);

  if (useIndividualChecks) {
    // Check each product individually (slower but more reliable)
    logger.info('📞 Using individual Square API calls for verification...');

    for (let i = 0; i < archivedProducts.length; i++) {
      const product = archivedProducts[i];
      logger.info(`   Checking ${i + 1}/${archivedProducts.length}: ${product.name}...`);

      product.existsInSquare = await checkIfExistsInSquare(product.squareId);

      // Add small delay to avoid rate limits
      if (i < archivedProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } else {
    // Bulk verification (faster)
    logger.info('📋 Using bulk Square API call for verification...');

    const activeSquareIds = await getAllActiveSquareProductIds();

    for (const product of archivedProducts) {
      product.existsInSquare = activeSquareIds.has(product.squareId);
    }
  }

  const stillExistInSquare = archivedProducts.filter(p => p.existsInSquare);
  const trulyRemoved = archivedProducts.filter(p => !p.existsInSquare);

  logger.info(`📊 Verification results:`);
  logger.info(`   • Still exist in Square (incorrectly archived): ${stillExistInSquare.length}`);
  logger.info(`   • Truly removed from Square (correctly archived): ${trulyRemoved.length}`);

  // Log details of incorrectly archived products
  if (stillExistInSquare.length > 0) {
    logger.info(`\n🚨 Incorrectly archived products:`);
    for (const product of stillExistInSquare) {
      logger.info(
        `   • "${product.name}" (${product.categoryName}) - archived at ${product.archivedAt.toISOString()}`
      );
    }
  }

  return stillExistInSquare;
}

/**
 * Restore incorrectly archived products
 */
async function restoreIncorrectlyArchivedProducts(
  productsToRestore: ArchivedProduct[],
  dryRun: boolean = true
): Promise<void> {
  logger.info(
    `\n${dryRun ? '🧪 DRY RUN' : '🔧 EXECUTING'}: Restoring incorrectly archived products...`
  );

  if (productsToRestore.length === 0) {
    logger.info('✅ No products need to be restored!');
    return;
  }

  let restoredCount = 0;
  let errorCount = 0;

  for (const product of productsToRestore) {
    try {
      logger.info(
        `   ${dryRun ? 'Would restore' : 'Restoring'}: "${product.name}" (Square ID: ${product.squareId})`
      );

      if (!dryRun) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            active: true,
            updatedAt: new Date(),
          },
        });
        restoredCount++;
      }
    } catch (error) {
      errorCount++;
      logger.error(`❌ Failed to restore "${product.name}":`, error);
    }
  }

  logger.info(`\n📊 Restore Summary:`);
  logger.info(
    `   • Products ${dryRun ? 'would be' : ''} restored: ${dryRun ? productsToRestore.length : restoredCount}`
  );
  logger.info(`   • Errors: ${errorCount}`);
}

/**
 * Generate restoration report
 */
async function generateRestorationReport(): Promise<void> {
  logger.info('\n📊 Generating restoration report...');

  const totalProducts = await prisma.product.count();
  const activeProducts = await prisma.product.count({ where: { active: true } });
  const archivedProducts = await prisma.product.count({ where: { active: false } });
  const archivedWithSquareId = await prisma.product.count({
    where: {
      active: false,
      squareId: { not: '' },
    },
  });

  // Group archived products by category
  const archivedByCategory = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { active: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const categoryDetails = await Promise.all(
    archivedByCategory.map(async group => {
      const category = await prisma.category.findUnique({
        where: { id: group.categoryId },
        select: { name: true },
      });
      return {
        categoryName: category?.name || 'Unknown',
        count: group._count.id,
      };
    })
  );

  logger.info(`\n📋 Current Database State:`);
  logger.info(`   • Total products: ${totalProducts}`);
  logger.info(`   • Active products: ${activeProducts}`);
  logger.info(`   • Archived products: ${archivedProducts}`);
  logger.info(`   • Archived with Square ID: ${archivedWithSquareId}`);

  if (categoryDetails.length > 0) {
    logger.info(`\n📂 Archived products by category:`);
    for (const detail of categoryDetails) {
      logger.info(`   • ${detail.categoryName}: ${detail.count} products`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');
    const hours = args.includes('--hours') ? parseInt(args[args.indexOf('--hours') + 1]) || 24 : 24;
    const individualChecks = args.includes('--individual-checks');

    logger.info('🚀 Emergency Product Restoration Script');
    logger.info(`⚙️ Configuration:`);
    logger.info(`   • Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
    logger.info(`   • Time window: ${hours} hours`);
    logger.info(
      `   • Verification method: ${individualChecks ? 'Individual API calls' : 'Bulk verification'}`
    );

    if (dryRun) {
      logger.info('\n🧪 Running in DRY RUN mode. Use --execute to apply changes.');
    }

    // Step 1: Find recently archived products
    const recentlyArchived = await findRecentlyArchivedProducts(hours);

    if (recentlyArchived.length === 0) {
      logger.info('✅ No recently archived products found!');
      await generateRestorationReport();
      return;
    }

    // Step 2: Verify which ones still exist in Square
    const incorrectlyArchived = await verifyArchivedProducts(recentlyArchived, individualChecks);

    // Step 3: Restore incorrectly archived products
    await restoreIncorrectlyArchivedProducts(incorrectlyArchived, dryRun);

    // Step 4: Generate final report
    if (!dryRun) {
      await generateRestorationReport();
    }

    logger.info('\n✅ Emergency restoration completed!');
  } catch (error) {
    logger.error('❌ Error during emergency restoration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  findRecentlyArchivedProducts,
  verifyArchivedProducts,
  restoreIncorrectlyArchivedProducts,
  checkIfExistsInSquare,
};
