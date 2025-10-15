#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';
import { logger } from '../src/utils/logger';

async function checkSyncStatus() {
  try {
    logger.info('🔍 Checking current sync status...');

    // Check for any stuck syncs (RUNNING status)
    const runningSyncs = await prisma.userSyncLog.findMany({
      where: {
        status: 'RUNNING',
      },
      select: {
        id: true,
        syncId: true,
        userId: true,
        startTime: true,
        message: true,
        currentStep: true,
        progress: true,
        startedBy: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (runningSyncs.length === 0) {
      logger.info('✅ No running syncs found');
      return;
    }

    logger.info(`⚠️ Found ${runningSyncs.length} running sync(s):`);

    for (const sync of runningSyncs) {
      const duration = Date.now() - sync.startTime.getTime();
      const durationMinutes = Math.floor(duration / (1000 * 60));
      const durationSeconds = Math.floor((duration % (1000 * 60)) / 1000);

      logger.info(`\n📊 Sync: ${sync.syncId}`);
      logger.info(`   Started: ${sync.startTime.toISOString()}`);
      logger.info(`   Duration: ${durationMinutes}m ${durationSeconds}s`);
      logger.info(`   Progress: ${sync.progress}%`);
      logger.info(`   Step: ${sync.currentStep || 'Unknown'}`);
      logger.info(`   Message: ${sync.message || 'No message'}`);
      logger.info(`   Started by: ${sync.startedBy}`);

      // Check if sync is stale (older than 30 minutes)
      if (duration > 30 * 60 * 1000) {
        logger.warn(`   ⚠️ This sync appears to be STALE (over 30 minutes old)`);

        // Ask user if they want to fix it
        logger.info(`   🔧 Would you like to mark this sync as failed? (y/n)`);

        // For now, just log the recommendation
        logger.info(`   💡 Recommendation: Mark as failed to prevent infinite polling`);
      }
    }

    // Check for recent completed syncs
    const recentSyncs = await prisma.userSyncLog.findMany({
      where: {
        status: {
          in: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
        startTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        syncId: true,
        status: true,
        startTime: true,
        endTime: true,
        message: true,
        startedBy: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 5,
    });

    if (recentSyncs.length > 0) {
      logger.info(`\n📋 Recent sync history (last 24 hours):`);
      for (const sync of recentSyncs) {
        const duration = sync.endTime ? sync.endTime.getTime() - sync.startTime.getTime() : 0;
        const durationMinutes = Math.floor(duration / (1000 * 60));
        const durationSeconds = Math.floor((duration % (1000 * 60)) / 1000);

        logger.info(
          `   ${sync.status}: ${sync.syncId} (${durationMinutes}m ${durationSeconds}s) - ${sync.message || 'No message'}`
        );
      }
    }
  } catch (error) {
    logger.error('❌ Error checking sync status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fixStuckSyncs() {
  try {
    logger.info('🔧 Attempting to fix stuck syncs...');

    // Find all stuck syncs (RUNNING status older than 30 minutes)
    const stuckSyncs = await prisma.userSyncLog.findMany({
      where: {
        status: 'RUNNING',
        startTime: {
          lt: new Date(Date.now() - 30 * 60 * 1000), // Older than 30 minutes
        },
      },
      select: {
        id: true,
        syncId: true,
        startTime: true,
        message: true,
      },
    });

    if (stuckSyncs.length === 0) {
      logger.info('✅ No stuck syncs found to fix');
      return;
    }

    logger.info(`🔧 Found ${stuckSyncs.length} stuck sync(s) to fix:`);

    for (const sync of stuckSyncs) {
      const duration = Date.now() - sync.startTime.getTime();
      const durationMinutes = Math.floor(duration / (1000 * 60));

      logger.info(`   Fixing sync ${sync.syncId} (stuck for ${durationMinutes} minutes)`);

      // Mark as failed
      await prisma.userSyncLog.update({
        where: { id: sync.id },
        data: {
          status: 'FAILED',
          endTime: new Date(),
          message: `Sync automatically marked as failed - was stuck for ${durationMinutes} minutes`,
          progress: 0,
        },
      });

      logger.info(`   ✅ Marked sync ${sync.syncId} as FAILED`);
    }

    logger.info(`\n🎯 Successfully fixed ${stuckSyncs.length} stuck sync(s)`);
  } catch (error) {
    logger.error('❌ Error fixing stuck syncs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'check':
      await checkSyncStatus();
      break;
    case 'fix':
      await fixStuckSyncs();
      break;
    case 'all':
      await checkSyncStatus();
      console.log('\n' + '='.repeat(50) + '\n');
      await fixStuckSyncs();
      break;
    default:
      console.log('Usage:');
      console.log('  tsx scripts/check-sync-status.ts check  - Check current sync status');
      console.log('  tsx scripts/check-sync-status.ts fix    - Fix stuck syncs');
      console.log('  tsx scripts/check-sync-status.ts all    - Check and fix all issues');
      break;
  }
}

main().catch(console.error);
