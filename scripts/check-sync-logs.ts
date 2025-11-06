/**
 * Check Recent Sync Logs
 * See what happened in recent Square syncs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSyncLogs() {
  try {
    console.log('🔍 Checking recent sync logs...\n');

    const recentSyncs = await prisma.syncLog.findMany({
      take: 5,
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        status: true,
        itemsCreated: true,
        itemsUpdated: true,
        itemsDeleted: true,
        itemsSkipped: true,
        itemsSynced: true,
        errors: true,
        warnings: true,
        metadata: true,
      },
    });

    if (recentSyncs.length === 0) {
      console.log('❌ No sync logs found!\n');
      return;
    }

    recentSyncs.forEach((log, idx) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Sync #${idx + 1} - ${log.startedAt.toLocaleString()}`);
      console.log(`${'='.repeat(60)}\n`);

      const statusIcon = log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
      console.log(`Status: ${statusIcon} ${log.status}`);

      if (log.completedAt) {
        const duration = Math.round((log.completedAt.getTime() - log.startedAt.getTime()) / 1000);
        console.log(`Duration: ${duration}s`);
      }

      console.log(`\nItems:`);
      console.log(`  Created: ${log.itemsCreated || 0}`);
      console.log(`  Updated: ${log.itemsUpdated || 0}`);
      console.log(`  Deleted: ${log.itemsDeleted || 0}`);
      console.log(`  Skipped: ${log.itemsSkipped || 0}`);
      console.log(`  Total Synced: ${log.itemsSynced || 0}`);

      if (log.errors && Array.isArray(log.errors) && log.errors.length > 0) {
        console.log(`\n❌ Errors (${log.errors.length}):`);
        log.errors.forEach((error: any, i: number) => {
          console.log(
            `  ${i + 1}. ${typeof error === 'string' ? error : JSON.stringify(error).substring(0, 100)}`
          );
        });
      }

      if (log.warnings && Array.isArray(log.warnings) && log.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${log.warnings.length}):`);
        log.warnings.forEach((warning: any, i: number) => {
          console.log(
            `  ${i + 1}. ${typeof warning === 'string' ? warning : JSON.stringify(warning).substring(0, 100)}`
          );
        });
      }

      // Check metadata for category information
      if (log.metadata && typeof log.metadata === 'object') {
        const metadata = log.metadata as any;

        if (metadata.categoriesSynced) {
          console.log(`\n📊 Categories Synced:`);
          if (Array.isArray(metadata.categoriesSynced)) {
            metadata.categoriesSynced.forEach((cat: string) => {
              console.log(`  - ${cat}`);
            });

            // Check if EMPANADAS is missing
            const hasEmpanadas = metadata.categoriesSynced.some((cat: string) =>
              cat.toUpperCase().includes('EMPANADA')
            );

            if (!hasEmpanadas) {
              console.log(`\n⚠️  WARNING: EMPANADAS category not in sync!`);
            }
          }
        }

        if (metadata.categoryStats) {
          console.log(`\n📈 Category Stats:`);
          Object.entries(metadata.categoryStats).forEach(([cat, count]) => {
            console.log(`  ${cat}: ${count} items`);
          });
        }
      }
    });

    console.log(`\n\n${'='.repeat(60)}`);
    console.log('ANALYSIS');
    console.log(`${'='.repeat(60)}\n`);

    const lastSync = recentSyncs[0];
    console.log(`Last sync: ${lastSync.startedAt.toLocaleString()}`);
    console.log(`Status: ${lastSync.status}`);
    console.log(`Items synced: ${lastSync.itemsSynced || 0}`);

    if (lastSync.itemsSynced === 114) {
      console.log(`\n✅ Matches current database count (114 products)`);
      console.log(`\n⚠️  ISSUE: Only 1 empanada synced out of expected 20+`);
      console.log(`   This suggests the sync is working but EMPANADAS category`);
      console.log(`   is not being queried correctly from Square.`);
    }
  } catch (error) {
    console.error('❌ Error checking sync logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSyncLogs();
