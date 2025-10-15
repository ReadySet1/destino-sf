#!/usr/bin/env tsx
/**
 * Square Sync Verification Script
 *
 * This script helps verify if the Square sync is working correctly by:
 * 1. Checking Square catalog for recent product changes
 * 2. Comparing Square products with local database
 * 3. Identifying any missing or outdated products
 * 4. Providing a detailed report
 */

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { searchCatalogObjects } from '@/lib/square/catalog-api';

interface VerificationResult {
  squareProductsCount: number;
  localProductsCount: number;
  missingFromLocal: Array<{
    squareId: string;
    name: string;
    category: string;
    lastUpdated?: string;
  }>;
  outdatedInLocal: Array<{
    squareId: string;
    name: string;
    localLastUpdate: Date;
    squareLastUpdate?: string;
  }>;
  extraInLocal: Array<{
    squareId: string;
    name: string;
  }>;
  recentSquareChanges: Array<{
    squareId: string;
    name: string;
    updatedAt: string;
  }>;
}

/**
 * Get all products from Square
 */
async function getSquareProducts() {
  try {
    logger.info('🔍 Fetching all products from Square...');

    const response = await searchCatalogObjects({
      objectTypes: ['ITEM'],
      includeDeletedObjects: false,
      includeRelatedObjects: true,
    });

    if (!response.success || !response.objects) {
      throw new Error(`Square API error: ${response.error || 'No objects returned'}`);
    }

    const products = response.objects
      .filter(obj => obj.type === 'ITEM' && obj.item_data)
      .map(obj => ({
        squareId: obj.id,
        name: obj.item_data!.name || 'Unknown',
        categoryIds: obj.item_data!.category_ids || [],
        updatedAt: obj.updated_at,
        version: obj.version,
        isDeleted: obj.is_deleted,
      }));

    logger.info(`✅ Found ${products.length} products in Square`);
    return { products, relatedObjects: response.relatedObjects || [] };
  } catch (error) {
    logger.error('❌ Failed to fetch Square products:', error);
    throw error;
  }
}

/**
 * Get all products from local database
 */
async function getLocalProducts() {
  try {
    logger.info('🔍 Fetching all products from local database...');

    const products = await prisma.product.findMany({
      select: {
        id: true,
        squareId: true,
        name: true,
        updatedAt: true,
        active: true,
        category: {
          select: {
            name: true,
            squareId: true,
          },
        },
      },
      where: {
        squareId: { not: null },
      },
    });

    logger.info(`✅ Found ${products.length} products in local database with Square IDs`);
    return products;
  } catch (error) {
    logger.error('❌ Failed to fetch local products:', error);
    throw error;
  }
}

/**
 * Get category name from related objects
 */
function getCategoryName(categoryIds: string[], relatedObjects: any[]): string {
  if (!categoryIds.length) return 'Uncategorized';

  const categoryId = categoryIds[0];
  const category = relatedObjects.find(obj => obj.type === 'CATEGORY' && obj.id === categoryId);

  return category?.category_data?.name || 'Unknown Category';
}

/**
 * Main verification function
 */
async function verifySquareSync(): Promise<VerificationResult> {
  logger.info('🚀 Starting Square sync verification...');

  try {
    // Fetch data from both sources
    const [squareData, localProducts] = await Promise.all([
      getSquareProducts(),
      getLocalProducts(),
    ]);

    const { products: squareProducts, relatedObjects } = squareData;

    // Create lookup maps
    const localBySquareId = new Map(localProducts.map(p => [p.squareId!, p]));
    const squareBySquareId = new Map(squareProducts.map(p => [p.squareId, p]));

    // Find discrepancies
    const missingFromLocal: VerificationResult['missingFromLocal'] = [];
    const outdatedInLocal: VerificationResult['outdatedInLocal'] = [];
    const recentSquareChanges: VerificationResult['recentSquareChanges'] = [];

    // Check each Square product
    for (const squareProduct of squareProducts) {
      const localProduct = localBySquareId.get(squareProduct.squareId);

      if (!localProduct) {
        missingFromLocal.push({
          squareId: squareProduct.squareId,
          name: squareProduct.name,
          category: getCategoryName(squareProduct.categoryIds, relatedObjects),
          lastUpdated: squareProduct.updatedAt,
        });
      }

      // Check for recent changes (within last 7 days)
      if (squareProduct.updatedAt) {
        const updatedDate = new Date(squareProduct.updatedAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (updatedDate > sevenDaysAgo) {
          recentSquareChanges.push({
            squareId: squareProduct.squareId,
            name: squareProduct.name,
            updatedAt: squareProduct.updatedAt,
          });
        }
      }
    }

    // Find products that exist locally but not in Square
    const extraInLocal: VerificationResult['extraInLocal'] = [];
    for (const localProduct of localProducts) {
      if (!squareBySquareId.has(localProduct.squareId!)) {
        extraInLocal.push({
          squareId: localProduct.squareId!,
          name: localProduct.name,
        });
      }
    }

    return {
      squareProductsCount: squareProducts.length,
      localProductsCount: localProducts.length,
      missingFromLocal,
      outdatedInLocal,
      extraInLocal,
      recentSquareChanges,
    };
  } catch (error) {
    logger.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Print verification report
 */
function printReport(result: VerificationResult) {
  logger.info('\n📊 SQUARE SYNC VERIFICATION REPORT');
  logger.info('=====================================');

  logger.info(`\n📈 SUMMARY:`);
  logger.info(`   Square products: ${result.squareProductsCount}`);
  logger.info(`   Local products:  ${result.localProductsCount}`);
  logger.info(`   Missing from local: ${result.missingFromLocal.length}`);
  logger.info(`   Extra in local: ${result.extraInLocal.length}`);
  logger.info(`   Recent Square changes (7 days): ${result.recentSquareChanges.length}`);

  if (result.missingFromLocal.length > 0) {
    logger.info(`\n❌ PRODUCTS MISSING FROM LOCAL DATABASE:`);
    for (const product of result.missingFromLocal.slice(0, 10)) {
      logger.info(`   • ${product.name} (${product.category}) - ${product.squareId}`);
    }
    if (result.missingFromLocal.length > 10) {
      logger.info(`   ... and ${result.missingFromLocal.length - 10} more`);
    }
  } else {
    logger.info(`\n✅ All Square products are present in local database`);
  }

  if (result.extraInLocal.length > 0) {
    logger.info(`\n⚠️  PRODUCTS IN LOCAL BUT NOT IN SQUARE:`);
    for (const product of result.extraInLocal.slice(0, 5)) {
      logger.info(`   • ${product.name} - ${product.squareId}`);
    }
    if (result.extraInLocal.length > 5) {
      logger.info(`   ... and ${result.extraInLocal.length - 5} more`);
    }
  } else {
    logger.info(`\n✅ No extra products found in local database`);
  }

  if (result.recentSquareChanges.length > 0) {
    logger.info(`\n🔄 RECENT CHANGES IN SQUARE (Last 7 days):`);
    for (const product of result.recentSquareChanges.slice(0, 10)) {
      logger.info(
        `   • ${product.name} - Updated: ${new Date(product.updatedAt).toLocaleString()}`
      );
    }
    if (result.recentSquareChanges.length > 10) {
      logger.info(`   ... and ${result.recentSquareChanges.length - 10} more`);
    }
  } else {
    logger.info(`\n✅ No recent changes in Square (last 7 days)`);
  }

  logger.info(`\n🎯 CONCLUSION:`);
  if (result.missingFromLocal.length === 0 && result.recentSquareChanges.length === 0) {
    logger.info(`   ✅ Sync appears to be working correctly - all products are up to date`);
    logger.info(`   💡 The "0 items synced" message is normal when everything is synchronized`);
  } else if (result.missingFromLocal.length > 0) {
    logger.info(`   ❌ Found ${result.missingFromLocal.length} products that should be synced`);
    logger.info(`   💡 Try running the sync again or check for sync errors`);
  } else if (result.recentSquareChanges.length > 0) {
    logger.info(`   ⚠️  Found ${result.recentSquareChanges.length} recent changes in Square`);
    logger.info(`   💡 Run a sync to update these products`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await verifySquareSync();
    printReport(result);

    // Exit with appropriate code
    const hasIssues = result.missingFromLocal.length > 0 || result.recentSquareChanges.length > 5;
    process.exit(hasIssues ? 1 : 0);
  } catch (error) {
    logger.error('❌ Verification script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification immediately
main();

export { verifySquareSync, printReport };
