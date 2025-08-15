#!/usr/bin/env tsx

/**
 * Clean Duplicate Categories Script
 * 
 * This script identifies and merges duplicate categories that were created
 * due to inconsistent naming in the Square sync process.
 */

import { prisma } from '../src/lib/db';
import { logger } from '../src/utils/logger';

interface CategoryGroup {
  normalizedName: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string | null;
    squareId: string | null;
    productCount: number;
    createdAt: Date;
  }>;
}

/**
 * Normalize category name for grouping duplicates
 */
function normalizeForComparison(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s*-\s*/g, '-')      // Normalize hyphens
    .replace(/,\s*/g, '-')         // Replace commas with hyphens  
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .trim();
}

/**
 * Identify duplicate categories
 */
async function identifyDuplicateCategories(): Promise<CategoryGroup[]> {
  logger.info('🔍 Identifying duplicate categories...');

  // Get all categories with product counts
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Group categories by normalized name
  const categoryGroups = new Map<string, CategoryGroup>();

  for (const category of categories) {
    const normalizedName = normalizeForComparison(category.name);
    
    if (!categoryGroups.has(normalizedName)) {
      categoryGroups.set(normalizedName, {
        normalizedName,
        categories: []
      });
    }

    categoryGroups.get(normalizedName)!.categories.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      squareId: category.squareId,
      productCount: category._count.products,
      createdAt: category.createdAt
    });
  }

  // Filter to only groups with duplicates
  const duplicateGroups: CategoryGroup[] = [];
  for (const group of categoryGroups.values()) {
    if (group.categories.length > 1) {
      duplicateGroups.push(group);
    }
  }

  logger.info(`📊 Found ${duplicateGroups.length} groups with duplicates`);
  
  // Log details
  for (const group of duplicateGroups) {
    logger.info(`\n🔄 Duplicate group: ${group.normalizedName}`);
    for (const cat of group.categories) {
      logger.info(`   • "${cat.name}" (${cat.productCount} products, Square ID: ${cat.squareId || 'none'})`);
    }
  }

  return duplicateGroups;
}

/**
 * Choose the best category to keep from a duplicate group
 */
function choosePrimaryCategory(categories: CategoryGroup['categories']): CategoryGroup['categories'][0] {
  // Priority order:
  // 1. Category with Square ID (most authoritative)
  // 2. Category with most products
  // 3. Category created first (oldest)
  
  return categories.reduce((best, current) => {
    // Prefer category with Square ID
    if (current.squareId && !best.squareId) {
      return current;
    }
    if (best.squareId && !current.squareId) {
      return best;
    }
    
    // If both have Square ID or both don't, prefer one with more products
    if (current.productCount > best.productCount) {
      return current;
    }
    if (current.productCount < best.productCount) {
      return best;
    }
    
    // If same product count, prefer older category
    return current.createdAt < best.createdAt ? current : best;
  });
}

/**
 * Merge duplicate categories
 */
async function mergeDuplicateCategories(groups: CategoryGroup[], dryRun: boolean = true): Promise<void> {
  logger.info(`\n${dryRun ? '🧪 DRY RUN' : '🔧 EXECUTING'}: Merging duplicate categories...`);

  let totalMerged = 0;
  let totalRemoved = 0;

  for (const group of groups) {
    if (group.categories.length <= 1) continue;

    const primaryCategory = choosePrimaryCategory(group.categories);
    const categoriesToMerge = group.categories.filter(cat => cat.id !== primaryCategory.id);

    logger.info(`\n📝 Processing group: ${group.normalizedName}`);
    logger.info(`   🎯 Keeping: "${primaryCategory.name}" (${primaryCategory.productCount} products)`);
    
    for (const categoryToMerge of categoriesToMerge) {
      logger.info(`   🔀 ${dryRun ? 'Would merge' : 'Merging'}: "${categoryToMerge.name}" (${categoryToMerge.productCount} products)`);
      
      if (!dryRun && categoryToMerge.productCount > 0) {
        // Move products to primary category
        const updateResult = await prisma.product.updateMany({
          where: {
            categoryId: categoryToMerge.id
          },
          data: {
            categoryId: primaryCategory.id
          }
        });
        
        logger.info(`     ✅ Moved ${updateResult.count} products`);
        totalMerged += updateResult.count;
      }
    }

    // Delete empty duplicate categories
    for (const categoryToRemove of categoriesToMerge) {
      const remainingProducts = await prisma.product.count({
        where: { categoryId: categoryToRemove.id }
      });
      
      if (remainingProducts === 0) {
        logger.info(`   🗑️ ${dryRun ? 'Would remove' : 'Removing'} empty category: "${categoryToRemove.name}"`);
        
        if (!dryRun) {
          await prisma.category.delete({
            where: { id: categoryToRemove.id }
          });
          totalRemoved++;
        }
      } else {
        logger.warn(`   ⚠️ Cannot remove "${categoryToRemove.name}" - still has ${remainingProducts} products`);
      }
    }
  }

  logger.info(`\n📊 Summary:`);
  logger.info(`   • Categories ${dryRun ? 'would be' : ''} removed: ${totalRemoved}`);
  logger.info(`   • Products ${dryRun ? 'would be' : ''} merged: ${totalMerged}`);
}

/**
 * Verify category cleanup
 */
async function verifyCleanup(): Promise<void> {
  logger.info('\n✅ Verifying category cleanup...');
  
  const duplicateGroups = await identifyDuplicateCategories();
  
  if (duplicateGroups.length === 0) {
    logger.info('🎉 No duplicate categories found - cleanup successful!');
  } else {
    logger.warn(`⚠️ Still found ${duplicateGroups.length} duplicate groups`);
  }
  
  // Show final category summary
  const totalCategories = await prisma.category.count();
  const categoriesWithProducts = await prisma.category.count({
    where: {
      products: {
        some: {}
      }
    }
  });
  
  logger.info(`📊 Final state:`);
  logger.info(`   • Total categories: ${totalCategories}`);
  logger.info(`   • Categories with products: ${categoriesWithProducts}`);
  logger.info(`   • Empty categories: ${totalCategories - categoriesWithProducts}`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');
    
    if (dryRun) {
      logger.info('🧪 Running in DRY RUN mode. Use --execute to apply changes.');
    } else {
      logger.info('🔧 EXECUTING changes to database.');
    }

    // Step 1: Identify duplicates
    const duplicateGroups = await identifyDuplicateCategories();
    
    if (duplicateGroups.length === 0) {
      logger.info('🎉 No duplicate categories found!');
      return;
    }

    // Step 2: Merge duplicates
    await mergeDuplicateCategories(duplicateGroups, dryRun);
    
    // Step 3: Verify (only if not dry run)
    if (!dryRun) {
      await verifyCleanup();
    }
    
    logger.info('\n✅ Category cleanup completed!');
    
  } catch (error) {
    logger.error('❌ Error during category cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { identifyDuplicateCategories, mergeDuplicateCategories };
