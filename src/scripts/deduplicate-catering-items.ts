#!/usr/bin/env tsx

/**
 * Deduplicate Catering Items Script
 *
 * This script identifies and merges duplicate catering items that were created
 * due to naming format differences (e.g., "Alfajores - Chocolate" vs "chocolate alfajores").
 * It keeps the item with the best data (image + Square ID) and deactivates duplicates.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

interface DuplicateGroup {
  normalizedName: string;
  items: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    squareProductId: string | null;
    createdAt: Date;
    category: string;
    price: number;
    description: string | null;
    hasImage: boolean;
    hasSquareId: boolean;
    score: number; // Quality score for choosing best item
  }>;
}

/**
 * Normalize a name for comparison (remove spaces, hyphens, make lowercase, sort words)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-\s]+/g, ' ') // Replace hyphens and multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove all non-word characters except spaces
    .split(' ')
    .filter(word => word.length > 0) // Remove empty strings
    .sort() // Sort words alphabetically to handle order differences
    .join('');
}

/**
 * Calculate quality score for an item (higher is better)
 */
function calculateQualityScore(item: any): number {
  let score = 0;

  // Has image (+10 points)
  if (item.imageUrl) score += 10;

  // Has Square ID (+10 points)
  if (item.squareProductId) score += 10;

  // Has description (+2 points)
  if (item.description && item.description.trim() !== '') score += 2;

  // Newer items get slight preference (+1 point)
  if (new Date(item.createdAt) > new Date('2025-06-18 12:00:00')) score += 1;

  // Prefer proper case format over all lowercase (+1 point)
  if (item.name !== item.name.toLowerCase()) score += 1;

  return score;
}

/**
 * Find all duplicate catering items
 */
async function findDuplicates(): Promise<DuplicateGroup[]> {
  logger.info('🔍 Finding duplicate catering items...');

  const allItems = await prisma.cateringItem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      squareProductId: true,
      createdAt: true,
      category: true,
      price: true,
      description: true,
    },
  });

  // Group items by normalized name
  const groups = new Map<string, any[]>();

  for (const item of allItems) {
    const normalized = normalizeName(item.name);
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }

    groups.get(normalized)!.push({
      ...item,
      hasImage: !!item.imageUrl,
      hasSquareId: !!item.squareProductId,
      score: calculateQualityScore(item),
    });
  }

  // Filter to only groups with duplicates
  const duplicateGroups: DuplicateGroup[] = [];
  for (const [normalizedName, items] of groups.entries()) {
    if (items.length > 1) {
      // Sort by quality score (best first)
      items.sort((a, b) => b.score - a.score);

      duplicateGroups.push({
        normalizedName,
        items,
      });
    }
  }

  logger.info(`Found ${duplicateGroups.length} groups with duplicates`);
  return duplicateGroups;
}

/**
 * Merge duplicate items
 */
async function mergeDuplicates(
  duplicateGroups: DuplicateGroup[],
  dryRun: boolean = true
): Promise<{
  merged: number;
  deactivated: number;
  errors: number;
}> {
  const result = { merged: 0, deactivated: 0, errors: 0 };

  logger.info(`${dryRun ? '🔍 DRY RUN:' : '🔄 EXECUTING:'} Merging duplicate catering items...`);

  for (const group of duplicateGroups) {
    try {
      const bestItem = group.items[0]; // Highest score
      const duplicateItems = group.items.slice(1); // Rest are duplicates

      logger.info(`\n📝 Group: "${group.normalizedName}"`);
      logger.info(
        `   ✅ KEEP: "${bestItem.name}" (Score: ${bestItem.score}, Image: ${bestItem.hasImage}, Square: ${bestItem.hasSquareId})`
      );

      for (const duplicate of duplicateItems) {
        logger.info(
          `   ❌ REMOVE: "${duplicate.name}" (Score: ${duplicate.score}, Image: ${duplicate.hasImage}, Square: ${duplicate.hasSquareId})`
        );

        if (!dryRun) {
          // Merge any missing data from duplicates to the best item
          const updateData: any = {};
          let hasUpdates = false;

          // If best item is missing description but duplicate has it, copy it
          if (!bestItem.description && duplicate.description) {
            updateData.description = duplicate.description;
            hasUpdates = true;
            logger.info(`     → Copying description from duplicate`);
          }

          // If best item is missing image but duplicate has it, copy it
          if (!bestItem.imageUrl && duplicate.imageUrl) {
            updateData.imageUrl = duplicate.imageUrl;
            hasUpdates = true;
            logger.info(`     → Copying image from duplicate`);
          }

          // If best item is missing Square ID but duplicate has it, copy it
          if (!bestItem.squareProductId && duplicate.squareProductId) {
            updateData.squareProductId = duplicate.squareProductId;
            hasUpdates = true;
            logger.info(`     → Copying Square ID from duplicate`);
          }

          // Update the best item if we have improvements
          if (hasUpdates) {
            await prisma.cateringItem.update({
              where: { id: bestItem.id },
              data: {
                ...updateData,
                updatedAt: new Date(),
              },
            });
            result.merged++;
          }

          // Deactivate the duplicate
          await prisma.cateringItem.update({
            where: { id: duplicate.id },
            data: {
              isActive: false,
              updatedAt: new Date(),
            },
          });
          result.deactivated++;
        }
      }
    } catch (error) {
      logger.error(`Error processing group "${group.normalizedName}":`, error);
      result.errors++;
    }
  }

  return result;
}

/**
 * Generate detailed report of duplicates
 */
async function generateDuplicatesReport(duplicateGroups: DuplicateGroup[]): Promise<void> {
  logger.info('\n📊 DUPLICATE CATERING ITEMS REPORT');
  logger.info('===================================');

  if (duplicateGroups.length === 0) {
    logger.info('✅ No duplicates found!');
    return;
  }

  logger.info(`🔍 Found ${duplicateGroups.length} groups with duplicates:\n`);

  for (const group of duplicateGroups) {
    logger.info(`🏷️  Group: "${group.normalizedName}"`);
    logger.info(`   Items (${group.items.length}):`);

    group.items.forEach((item, index) => {
      const status = index === 0 ? '✅ KEEP' : '❌ REMOVE';
      const imageStatus = item.hasImage ? '🖼️ ' : '📷 ';
      const squareStatus = item.hasSquareId ? '🔗 ' : '🚫 ';

      logger.info(`     ${status}: "${item.name}"`);
      logger.info(
        `           Score: ${item.score} | ${imageStatus}Image | ${squareStatus}Square | Created: ${item.createdAt.toISOString().split('T')[0]}`
      );
    });
    logger.info('');
  }

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.items.length - 1), 0);
  logger.info(`📈 Summary:`);
  logger.info(`   • Groups with duplicates: ${duplicateGroups.length}`);
  logger.info(`   • Total duplicate items to remove: ${totalDuplicates}`);
  logger.info(`   • Items to keep: ${duplicateGroups.length}`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('🚀 Starting catering items deduplication...');

    // Find duplicates
    const duplicateGroups = await findDuplicates();

    // Generate report
    await generateDuplicatesReport(duplicateGroups);

    if (duplicateGroups.length === 0) {
      logger.info('✅ No action needed. All catering items are unique!');
      return;
    }

    // First run as dry run
    logger.info('\n🔍 Running dry run to preview changes...');
    const dryRunResult = await mergeDuplicates(duplicateGroups, true);

    // Ask for confirmation (in a real scenario, you might want user input)
    const shouldExecute = process.argv.includes('--execute');

    if (shouldExecute) {
      logger.info('\n🔄 Executing deduplication...');
      const realResult = await mergeDuplicates(duplicateGroups, false);

      logger.info('\n✅ Deduplication completed!');
      logger.info(`📊 Results:`);
      logger.info(`   • Items merged: ${realResult.merged}`);
      logger.info(`   • Items deactivated: ${realResult.deactivated}`);
      logger.info(`   • Errors: ${realResult.errors}`);

      if (realResult.errors === 0) {
        logger.info('\n🎉 All duplicates resolved successfully!');
      }
    } else {
      logger.info('\n💡 To execute the deduplication, run:');
      logger.info('   pnpm tsx src/scripts/deduplicate-catering-items.ts --execute');
    }
  } catch (error) {
    logger.error('❌ Fatal error in deduplication:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { findDuplicates, mergeDuplicates, generateDuplicatesReport };
