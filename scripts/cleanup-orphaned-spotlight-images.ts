#!/usr/bin/env tsx

/**
 * Cleanup Orphaned Spotlight Images Script
 * 
 * This script cleans up orphaned spotlight images that were uploaded but never used.
 * It can be run manually or scheduled as a cron job.
 * 
 * Usage:
 *   pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts [--dry-run] [--older-than-minutes=60]
 * 
 * Options:
 *   --dry-run              Show what would be deleted without actually deleting
 *   --older-than-minutes   Only clean up images older than this many minutes (default: 60)
 */

import { 
  cleanupOrphanedSpotlightImages, 
  getSpotlightImageStats 
} from '../src/lib/storage/spotlight-storage';

interface CleanupOptions {
  dryRun: boolean;
  olderThanMinutes: number;
}

function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  
  const options: CleanupOptions = {
    dryRun: false,
    olderThanMinutes: 60,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--older-than-minutes=')) {
      const value = parseInt(arg.split('=')[1]);
      if (isNaN(value) || value < 1) {
        console.error('❌ --older-than-minutes must be a positive number');
        process.exit(1);
      }
      options.olderThanMinutes = value;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Cleanup Orphaned Spotlight Images Script

Usage:
  pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts [options]

Options:
  --dry-run                     Show what would be deleted without actually deleting
  --older-than-minutes=N        Only clean up images older than N minutes (default: 60)
  --help, -h                    Show this help message

Examples:
  pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --dry-run
  pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --older-than-minutes=120
      `);
      process.exit(0);
    } else {
      console.error(`❌ Unknown argument: ${arg}`);
      console.error('Use --help for usage information');
      process.exit(1);
    }
  }

  return options;
}

async function main() {
  console.log('🧹 Spotlight Image Cleanup Script');
  console.log('='.repeat(50));

  try {
    const options = parseArgs();
    let cleanupResult: any = null;

    console.log(`⚙️  Configuration:`);
    console.log(`   - Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log(`   - Older than: ${options.olderThanMinutes} minutes`);
    console.log('');

    // Get current statistics
    console.log('📊 Getting current statistics...');
    const statsResult = await getSpotlightImageStats();
    
    if (!statsResult.success) {
      console.error('❌ Failed to get statistics:', statsResult.error);
      process.exit(1);
    }

    const stats = statsResult.stats!;
    console.log(`   - Total uploads: ${stats.totalUploads}`);
    console.log(`   - Used images: ${stats.usedImages}`);
    console.log(`   - Orphaned images: ${stats.orphanedImages}`);
    console.log(`   - Old orphaned images (>1hr): ${stats.oldOrphanedImages}`);
    console.log('');

    if (stats.orphanedImages === 0) {
      console.log('✅ No orphaned images found. Nothing to clean up!');
      process.exit(0);
    }

    if (options.dryRun) {
      console.log('🔍 DRY RUN: The following actions would be performed:');
      // In a real dry-run, we'd query the database to show exactly what would be deleted
      console.log(`   - Images older than ${options.olderThanMinutes} minutes would be identified`);
      console.log(`   - Those images would be deleted from storage and database`);
      console.log('');
      console.log('💡 Run without --dry-run to perform the actual cleanup');
    } else {
      console.log(`🧹 Starting cleanup of images older than ${options.olderThanMinutes} minutes...`);
      
      cleanupResult = await cleanupOrphanedSpotlightImages(options.olderThanMinutes);
      
      if (!cleanupResult.success) {
        console.error('❌ Cleanup failed:', cleanupResult.error);
        process.exit(1);
      }

      console.log('✅ Cleanup completed successfully!');
      console.log(`   - Images deleted: ${cleanupResult.deletedCount || 0}`);
      
      if (cleanupResult.errors && cleanupResult.errors.length > 0) {
        console.log('⚠️  Some errors occurred:');
        cleanupResult.errors.forEach((error: string) => {
          console.log(`   - ${error}`);
        });
      }
    }

    // Get updated statistics
    if (!options.dryRun && (cleanupResult?.deletedCount || 0) > 0) {
      console.log('');
      console.log('📊 Updated statistics:');
      const updatedStatsResult = await getSpotlightImageStats();
      
      if (updatedStatsResult.success) {
        const updatedStats = updatedStatsResult.stats!;
        console.log(`   - Total uploads: ${updatedStats.totalUploads}`);
        console.log(`   - Used images: ${updatedStats.usedImages}`);
        console.log(`   - Orphaned images: ${updatedStats.orphanedImages}`);
        console.log(`   - Old orphaned images (>1hr): ${updatedStats.oldOrphanedImages}`);
      }
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 