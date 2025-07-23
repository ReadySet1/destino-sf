#!/usr/bin/env tsx

/**
 * Restore Orders from Backup Script
 *
 * This script restores orders from a backup file created by the clean-testing-orders script.
 * It safely restores all related data in the correct order to maintain referential integrity.
 *
 * Usage:
 *   pnpm tsx src/scripts/restore-orders-from-backup.ts --backup-file="path/to/backup.json" --dry-run
 *   pnpm tsx src/scripts/restore-orders-from-backup.ts --backup-file="path/to/backup.json" --execute
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

interface OrderBackup {
  regularOrders: any[];
  cateringOrders: any[];
  emailAlerts: any[];
  orderItems: any[];
  payments: any[];
  refunds: any[];
  cateringOrderItems: any[];
  metadata: {
    timestamp: string;
    totalRecords: number;
    config: any;
  };
}

interface RestoreConfig {
  backupFile: string;
  dryRun: boolean;
  confirmBeforeRestore: boolean;
  skipConflicts: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): RestoreConfig {
  const args = process.argv.slice(2);
  const config: RestoreConfig = {
    backupFile: '',
    dryRun: true,
    confirmBeforeRestore: true,
    skipConflicts: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--backup-file':
        config.backupFile = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--execute':
        config.dryRun = false;
        break;
      case '--no-confirm':
        config.confirmBeforeRestore = false;
        break;
      case '--fail-on-conflicts':
        config.skipConflicts = false;
        break;
      case '--help':
        showHelp();
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.warn(`⚠️  Unknown argument: ${arg}`);
        }
    }
  }

  if (!config.backupFile) {
    console.error('❌ --backup-file is required');
    showHelp();
    process.exit(1);
  }

  return config;
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🔄 Restore Orders from Backup Script

USAGE:
  pnpm tsx src/scripts/restore-orders-from-backup.ts --backup-file="path/to/backup.json" [OPTIONS]

OPTIONS:
  --backup-file=PATH     Path to the backup JSON file (required)
  --dry-run              Preview what would be restored (default)
  --execute              Actually perform the restoration
  --no-confirm           Skip confirmation prompts
  --fail-on-conflicts    Fail if any conflicts are found (default: skip conflicts)
  --help                 Show this help message

EXAMPLES:
  # Preview restoration
  pnpm tsx src/scripts/restore-orders-from-backup.ts --backup-file="backups/order-cleanup/orders-backup-2024-01-01T10-00-00-000Z.json" --dry-run

  # Restore from backup
  pnpm tsx src/scripts/restore-orders-from-backup.ts --backup-file="backups/order-cleanup/orders-backup-2024-01-01T10-00-00-000Z.json" --execute

SAFETY FEATURES:
  - Dry run mode by default
  - Conflict detection and resolution
  - Transaction rollback on errors
  - Detailed logging and validation
  `);
}

/**
 * Load and validate backup file
 */
function loadBackup(backupFile: string): OrderBackup {
  console.log(`📁 Loading backup file: ${backupFile}`);

  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  try {
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    const backup: OrderBackup = JSON.parse(backupContent);

    // Validate backup structure
    const required = [
      'regularOrders',
      'cateringOrders',
      'emailAlerts',
      'orderItems',
      'payments',
      'refunds',
      'cateringOrderItems',
      'metadata',
    ];
    for (const field of required) {
      if (!backup.hasOwnProperty(field)) {
        throw new Error(`Invalid backup file: missing field '${field}'`);
      }
    }

    console.log('✅ Backup file loaded and validated');
    console.log(`📊 Backup contents:`);
    console.log(`   Regular orders: ${backup.regularOrders.length}`);
    console.log(`   Catering orders: ${backup.cateringOrders.length}`);
    console.log(`   Email alerts: ${backup.emailAlerts.length}`);
    console.log(`   Order items: ${backup.orderItems.length}`);
    console.log(`   Payments: ${backup.payments.length}`);
    console.log(`   Refunds: ${backup.refunds.length}`);
    console.log(`   Catering order items: ${backup.cateringOrderItems.length}`);
    console.log(`   Created: ${backup.metadata.timestamp}`);
    console.log(`   Total records: ${backup.metadata.totalRecords}`);

    return backup;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid backup file: not valid JSON`);
    }
    throw error;
  }
}

/**
 * Check for conflicts with existing data
 */
async function checkConflicts(backup: OrderBackup): Promise<{
  orderConflicts: string[];
  cateringOrderConflicts: string[];
}> {
  console.log('🔍 Checking for conflicts with existing data...');

  const regularOrderIds = backup.regularOrders.map(o => o.id);
  const cateringOrderIds = backup.cateringOrders.map(o => o.id);

  const [existingOrders, existingCateringOrders] = await Promise.all([
    prisma.order.findMany({
      where: { id: { in: regularOrderIds } },
      select: { id: true, email: true, createdAt: true },
    }),
    prisma.cateringOrder.findMany({
      where: { id: { in: cateringOrderIds } },
      select: { id: true, email: true, createdAt: true },
    }),
  ]);

  const orderConflicts = existingOrders.map(o => o.id);
  const cateringOrderConflicts = existingCateringOrders.map(o => o.id);

  if (orderConflicts.length > 0 || cateringOrderConflicts.length > 0) {
    console.log(`⚠️  Found conflicts:`);
    console.log(`   Regular orders: ${orderConflicts.length}`);
    console.log(`   Catering orders: ${cateringOrderConflicts.length}`);
  } else {
    console.log('✅ No conflicts found');
  }

  return { orderConflicts, cateringOrderConflicts };
}

/**
 * Ask for user confirmation
 */
async function askForConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

/**
 * Restore data from backup
 */
async function restoreFromBackup(backup: OrderBackup, config: RestoreConfig): Promise<void> {
  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be restored');
    return;
  }

  console.log('🔄 Starting restoration process...');

  try {
    await prisma.$transaction(async tx => {
      // Filter out conflicts if skipConflicts is enabled
      let regularOrders = backup.regularOrders;
      let cateringOrders = backup.cateringOrders;
      let emailAlerts = backup.emailAlerts;
      let orderItems = backup.orderItems;
      let payments = backup.payments;
      let refunds = backup.refunds;
      let cateringOrderItems = backup.cateringOrderItems;

      if (config.skipConflicts) {
        const conflicts = await checkConflicts(backup);

        if (conflicts.orderConflicts.length > 0) {
          console.log(`⏭️  Skipping ${conflicts.orderConflicts.length} conflicting regular orders`);
          regularOrders = regularOrders.filter(o => !conflicts.orderConflicts.includes(o.id));
          emailAlerts = emailAlerts.filter(
            e => !conflicts.orderConflicts.includes(e.relatedOrderId)
          );
          orderItems = orderItems.filter(i => !conflicts.orderConflicts.includes(i.orderId));
          payments = payments.filter(p => !conflicts.orderConflicts.includes(p.orderId));
          // Refunds are filtered by payment, so they'll be automatically excluded
        }

        if (conflicts.cateringOrderConflicts.length > 0) {
          console.log(
            `⏭️  Skipping ${conflicts.cateringOrderConflicts.length} conflicting catering orders`
          );
          cateringOrders = cateringOrders.filter(
            o => !conflicts.cateringOrderConflicts.includes(o.id)
          );
          cateringOrderItems = cateringOrderItems.filter(
            i => !conflicts.cateringOrderConflicts.includes(i.orderId)
          );
        }
      }

      // Restore in correct order to maintain referential integrity
      console.log('📝 Restoring data in correct order...');

      // Step 1: Restore main order tables first
      if (regularOrders.length > 0) {
        console.log(`   🔄 Restoring ${regularOrders.length} regular orders...`);
        for (const order of regularOrders) {
          await tx.order.create({ data: order });
        }
        console.log(`   ✅ Restored ${regularOrders.length} regular orders`);
      }

      if (cateringOrders.length > 0) {
        console.log(`   🔄 Restoring ${cateringOrders.length} catering orders...`);
        for (const order of cateringOrders) {
          await tx.cateringOrder.create({ data: order });
        }
        console.log(`   ✅ Restored ${cateringOrders.length} catering orders`);
      }

      // Step 2: Restore payments (depends on orders)
      if (payments.length > 0) {
        console.log(`   🔄 Restoring ${payments.length} payments...`);
        for (const payment of payments) {
          await tx.payment.create({ data: payment });
        }
        console.log(`   ✅ Restored ${payments.length} payments`);
      }

      // Step 3: Restore refunds (depends on payments)
      if (refunds.length > 0) {
        console.log(`   🔄 Restoring ${refunds.length} refunds...`);
        for (const refund of refunds) {
          await tx.refund.create({ data: refund });
        }
        console.log(`   ✅ Restored ${refunds.length} refunds`);
      }

      // Step 4: Restore order items (depends on orders)
      if (orderItems.length > 0) {
        console.log(`   🔄 Restoring ${orderItems.length} order items...`);
        for (const item of orderItems) {
          await tx.orderItem.create({ data: item });
        }
        console.log(`   ✅ Restored ${orderItems.length} order items`);
      }

      // Step 5: Restore catering order items (depends on catering orders)
      if (cateringOrderItems.length > 0) {
        console.log(`   🔄 Restoring ${cateringOrderItems.length} catering order items...`);
        for (const item of cateringOrderItems) {
          await tx.cateringOrderItem.create({ data: item });
        }
        console.log(`   ✅ Restored ${cateringOrderItems.length} catering order items`);
      }

      // Step 6: Restore email alerts (depends on orders)
      if (emailAlerts.length > 0) {
        console.log(`   🔄 Restoring ${emailAlerts.length} email alerts...`);
        for (const alert of emailAlerts) {
          await tx.emailAlert.create({ data: alert });
        }
        console.log(`   ✅ Restored ${emailAlerts.length} email alerts`);
      }

      const totalRestored =
        regularOrders.length +
        cateringOrders.length +
        payments.length +
        refunds.length +
        orderItems.length +
        cateringOrderItems.length +
        emailAlerts.length;

      console.log(`✅ Restoration completed successfully! Restored ${totalRestored} records`);
    });
  } catch (error) {
    console.error('❌ Restoration failed and rolled back:', error);
    throw error;
  }
}

/**
 * Generate restoration report
 */
function generateReport(
  backup: OrderBackup,
  config: RestoreConfig,
  conflicts?: { orderConflicts: string[]; cateringOrderConflicts: string[] }
): void {
  console.log('\n📊 RESTORATION REPORT');
  console.log('=====================');

  console.log('\n🔧 Configuration:');
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`   Backup file: ${config.backupFile}`);
  console.log(`   Skip conflicts: ${config.skipConflicts}`);
  console.log(`   Backup created: ${backup.metadata.timestamp}`);

  console.log('\n📦 Backup Contents:');
  console.log(`   Regular orders: ${backup.regularOrders.length}`);
  console.log(`   Catering orders: ${backup.cateringOrders.length}`);
  console.log(`   Email alerts: ${backup.emailAlerts.length}`);
  console.log(`   Order items: ${backup.orderItems.length}`);
  console.log(`   Payments: ${backup.payments.length}`);
  console.log(`   Refunds: ${backup.refunds.length}`);
  console.log(`   Catering order items: ${backup.cateringOrderItems.length}`);
  console.log(`   Total records: ${backup.metadata.totalRecords}`);

  if (conflicts) {
    console.log('\n⚠️  Conflicts:');
    console.log(`   Regular order conflicts: ${conflicts.orderConflicts.length}`);
    console.log(`   Catering order conflicts: ${conflicts.cateringOrderConflicts.length}`);

    if (config.skipConflicts) {
      console.log('   Action: Conflicts will be skipped');
    } else {
      console.log('   Action: Restoration will fail on conflicts');
    }
  }

  if (config.dryRun) {
    console.log('\n💡 This was a dry run. To execute the restoration, use --execute');
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🔄 Starting Orders Restoration Script');
    console.log('====================================\n');

    // Parse configuration
    const config = parseArgs();

    // Load backup
    const backup = loadBackup(config.backupFile);

    // Check for conflicts
    const conflicts = await checkConflicts(backup);

    // Generate initial report
    generateReport(backup, config, conflicts);

    // Check if there are any conflicts and we're not skipping them
    if (
      !config.skipConflicts &&
      (conflicts.orderConflicts.length > 0 || conflicts.cateringOrderConflicts.length > 0)
    ) {
      console.log('\n❌ Conflicts found and --fail-on-conflicts is enabled');
      console.log('Use --skip-conflicts to skip conflicting records or resolve conflicts manually');
      return;
    }

    // Ask for confirmation if not dry run
    if (!config.dryRun && config.confirmBeforeRestore) {
      const totalRecords = backup.metadata.totalRecords;
      const conflictCount =
        conflicts.orderConflicts.length + conflicts.cateringOrderConflicts.length;
      const willRestore = totalRecords - conflictCount;

      const confirmed = await askForConfirmation(
        `This will restore ${willRestore} records from backup (${conflictCount} conflicts will be skipped). Continue?`
      );
      if (!confirmed) {
        console.log('❌ Cancelled by user');
        return;
      }
    }

    // Perform restoration
    await restoreFromBackup(backup, config);

    if (!config.dryRun) {
      console.log('\n🎉 Restoration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Verify the restoration results');
      console.log('2. Test your application to ensure everything works correctly');
      console.log('3. Monitor for any issues with the restored data');
    }
  } catch (error) {
    console.error('\n💥 Restoration failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
