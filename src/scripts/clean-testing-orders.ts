#!/usr/bin/env tsx

/**
 * Clean Testing Orders Script
 *
 * This script safely removes testing orders from the database while preserving
 * all legitimate customer data. It includes comprehensive safety features:
 * - Dry run mode for preview
 * - Backup before deletion
 * - Transaction rollback on errors
 * - Configurable identification criteria
 * - Detailed logging and reporting
 *
 * Usage:
 *   pnpm tsx src/scripts/clean-testing-orders.ts --dry-run
 *   pnpm tsx src/scripts/clean-testing-orders.ts --from="2024-01-01" --to="2024-01-31"
 *   pnpm tsx src/scripts/clean-testing-orders.ts --test-emails-only --backup
 *   pnpm tsx src/scripts/clean-testing-orders.ts --execute --confirm
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

interface CleanupConfig {
  dryRun: boolean;
  dateRange?: { start: Date; end: Date };
  testEmailPatterns: string[];
  excludeOrderIds: string[];
  backupBeforeDelete: boolean;
  confirmBeforeDelete: boolean;
  includeFailedOrders: boolean;
  includeCancelledOrders: boolean;
  includeOldOrders: boolean;
  maxBatchSize: number;
}

interface CleanupResult {
  regularOrders: {
    found: number;
    deleted: number;
    emailAlerts: number;
    orderItems: number;
    refunds: number;
    payments: number;
  };
  cateringOrders: {
    found: number;
    deleted: number;
    orderItems: number;
  };
  totalDataDeleted: number;
  backupPath?: string;
  errors: string[];
}

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
    config: CleanupConfig;
  };
}

/**
 * Default configuration with safety-first settings
 */
const DEFAULT_CONFIG: CleanupConfig = {
  dryRun: true,
  testEmailPatterns: [
    'test@',
    '@test.',
    'demo@',
    '@demo.',
    'example@',
    '@example.',
    '+test',
    '.test',
    'testing@',
    '@testing.',
    'temp@',
    '@temp.',
    'fake@',
    '@fake.',
    'dummy@',
    '@dummy.',
    'sample@',
    '@sample.',
    'localhost',
    'gmail.com+',
    'yahoo.com+',
    '10minutemail',
  ],
  excludeOrderIds: [
    // Add specific order IDs that should NEVER be deleted
    // These are hardcoded for extra safety
  ],
  backupBeforeDelete: true,
  confirmBeforeDelete: true,
  includeFailedOrders: true,
  includeCancelledOrders: true,
  includeOldOrders: false, // Only include old orders if explicitly requested
  maxBatchSize: 50, // Process in batches to avoid memory issues
};

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--execute':
        config.dryRun = false;
        break;
      case '--no-backup':
        config.backupBeforeDelete = false;
        break;
      case '--backup':
        config.backupBeforeDelete = true;
        break;
      case '--no-confirm':
        config.confirmBeforeDelete = false;
        break;
      case '--confirm':
        config.confirmBeforeDelete = true;
        break;
      case '--test-emails-only':
        config.includeFailedOrders = false;
        config.includeCancelledOrders = false;
        config.includeOldOrders = false;
        break;
      case '--include-old':
        config.includeOldOrders = true;
        break;
      case '--from':
        const fromDate = args[++i];
        if (!config.dateRange) config.dateRange = { start: new Date(fromDate), end: new Date() };
        else config.dateRange.start = new Date(fromDate);
        break;
      case '--to':
        const toDate = args[++i];
        if (!config.dateRange)
          config.dateRange = { start: new Date('2020-01-01'), end: new Date(toDate) };
        else config.dateRange.end = new Date(toDate);
        break;
      case '--exclude-id':
        config.excludeOrderIds.push(args[++i]);
        break;
      case '--batch-size':
        config.maxBatchSize = parseInt(args[++i]) || DEFAULT_CONFIG.maxBatchSize;
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

  return config;
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🧹 Clean Testing Orders Script

USAGE:
  pnpm tsx src/scripts/clean-testing-orders.ts [OPTIONS]

OPTIONS:
  --dry-run              Preview what would be deleted (default)
  --execute              Actually perform the deletion
  --backup               Create backup before deletion (default)
  --no-backup            Skip backup creation
  --confirm              Ask for confirmation before deletion (default)
  --no-confirm           Skip confirmation prompts
  --test-emails-only     Only delete orders with test email patterns
  --include-old          Include old orders in deletion criteria
  --from="YYYY-MM-DD"    Delete orders from this date
  --to="YYYY-MM-DD"      Delete orders up to this date
  --exclude-id=ID        Exclude specific order ID from deletion
  --batch-size=N         Process in batches of N orders (default: 50)
  --help                 Show this help message

EXAMPLES:
  # Preview what would be deleted
  pnpm tsx src/scripts/clean-testing-orders.ts --dry-run

  # Delete orders from specific date range with backup
  pnpm tsx src/scripts/clean-testing-orders.ts --execute --from="2024-01-01" --to="2024-01-31" --backup

  # Delete only test email orders
  pnpm tsx src/scripts/clean-testing-orders.ts --execute --test-emails-only --confirm

  # Emergency cleanup with no confirmation (use carefully!)
  pnpm tsx src/scripts/clean-testing-orders.ts --execute --no-confirm --no-backup

SAFETY FEATURES:
  - Dry run mode by default
  - Automatic backup creation
  - Transaction rollback on errors
  - Confirmation prompts
  - Hardcoded exclusion lists
  - Detailed logging and reporting
  `);
}

/**
 * Check if an email matches test patterns
 */
function isTestEmail(email: string, patterns: string[]): boolean {
  const lowerEmail = email.toLowerCase();
  return patterns.some(pattern => lowerEmail.includes(pattern.toLowerCase()));
}

/**
 * Check if an order should be considered for deletion
 */
function shouldDeleteOrder(
  order: any,
  config: CleanupConfig
): { shouldDelete: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Never delete if in exclusion list
  if (config.excludeOrderIds.includes(order.id)) {
    return { shouldDelete: false, reasons: ['Order ID in exclusion list'] };
  }

  // Check date range
  if (config.dateRange) {
    const orderDate = new Date(order.createdAt);
    if (orderDate < config.dateRange.start || orderDate > config.dateRange.end) {
      return { shouldDelete: false, reasons: ['Outside specified date range'] };
    }
    reasons.push('Within specified date range');
  }

  // Check email patterns
  if (isTestEmail(order.email, config.testEmailPatterns)) {
    reasons.push('Matches test email pattern');
  }

  // Check order status
  if (config.includeFailedOrders && order.paymentStatus === 'FAILED') {
    reasons.push('Failed payment status');
  }

  if (config.includeCancelledOrders && order.status === 'CANCELLED') {
    reasons.push('Cancelled status');
  }

  // Check if order is old (>90 days and failed/cancelled)
  if (config.includeOldOrders) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (
      order.createdAt < ninetyDaysAgo &&
      (order.status === 'CANCELLED' || order.paymentStatus === 'FAILED')
    ) {
      reasons.push('Old failed/cancelled order (>90 days)');
    }
  }

  // Additional safety checks - preserve orders that look legitimate
  if (order.total > 100 && order.paymentStatus === 'PAID') {
    return { shouldDelete: false, reasons: ['High-value paid order - likely legitimate'] };
  }

  const shouldDelete = reasons.length > 0;
  return { shouldDelete, reasons };
}

/**
 * Find orders that match deletion criteria
 */
async function findOrdersToDelete(config: CleanupConfig): Promise<{
  regularOrders: any[];
  cateringOrders: any[];
}> {
  console.log('🔍 Searching for orders matching deletion criteria...');

  // Build where clause for regular orders
  const regularOrderWhere: any = {
    NOT: {
      id: { in: config.excludeOrderIds },
    },
  };

  // Build where clause for catering orders
  const cateringOrderWhere: any = {
    NOT: {
      id: { in: config.excludeOrderIds },
    },
  };

  // Apply date range if specified
  if (config.dateRange) {
    const dateFilter = {
      gte: config.dateRange.start,
      lte: config.dateRange.end,
    };
    regularOrderWhere.createdAt = dateFilter;
    cateringOrderWhere.createdAt = dateFilter;
  }

  // Fetch regular orders with related data
  const regularOrders = await prisma.order.findMany({
    where: regularOrderWhere,
    include: {
      items: true,
      payments: {
        include: {
          refunds: true,
        },
      },
      emailAlerts: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch catering orders with related data
  const cateringOrders = await prisma.cateringOrder.findMany({
    where: cateringOrderWhere,
    include: {
      items: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter based on criteria
  const filteredRegularOrders = regularOrders.filter(
    order => shouldDeleteOrder(order, config).shouldDelete
  );

  const filteredCateringOrders = cateringOrders.filter(
    order => shouldDeleteOrder(order, config).shouldDelete
  );

  console.log(`📊 Found potential orders for deletion:`);
  console.log(`   Regular orders: ${filteredRegularOrders.length}/${regularOrders.length}`);
  console.log(`   Catering orders: ${filteredCateringOrders.length}/${cateringOrders.length}`);

  return {
    regularOrders: filteredRegularOrders,
    cateringOrders: filteredCateringOrders,
  };
}

/**
 * Create backup of data before deletion
 */
async function createBackup(
  orders: { regularOrders: any[]; cateringOrders: any[] },
  config: CleanupConfig
): Promise<string> {
  console.log('💾 Creating backup before deletion...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', 'order-cleanup');
  const backupPath = path.join(backupDir, `orders-backup-${timestamp}.json`);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Collect all related data
  const regularOrderIds = orders.regularOrders.map(o => o.id);
  const cateringOrderIds = orders.cateringOrders.map(o => o.id);

  // Get all related data that will be deleted
  const [emailAlerts, orderItems, payments, refunds, cateringOrderItems] = await Promise.all([
    prisma.emailAlert.findMany({
      where: { relatedOrderId: { in: regularOrderIds } },
    }),
    prisma.orderItem.findMany({
      where: { orderId: { in: regularOrderIds } },
    }),
    prisma.payment.findMany({
      where: { orderId: { in: regularOrderIds } },
    }),
    prisma.refund.findMany({
      where: {
        payment: {
          orderId: { in: regularOrderIds },
        },
      },
    }),
    prisma.cateringOrderItem.findMany({
      where: { orderId: { in: cateringOrderIds } },
    }),
  ]);

  const backup: OrderBackup = {
    regularOrders: orders.regularOrders,
    cateringOrders: orders.cateringOrders,
    emailAlerts,
    orderItems,
    payments,
    refunds,
    cateringOrderItems,
    metadata: {
      timestamp,
      totalRecords:
        orders.regularOrders.length +
        orders.cateringOrders.length +
        emailAlerts.length +
        orderItems.length +
        payments.length +
        refunds.length +
        cateringOrderItems.length,
      config,
    },
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`✅ Backup created: ${backupPath}`);
  console.log(`📋 Backup contents:`);
  console.log(`   Regular orders: ${backup.regularOrders.length}`);
  console.log(`   Catering orders: ${backup.cateringOrders.length}`);
  console.log(`   Email alerts: ${backup.emailAlerts.length}`);
  console.log(`   Order items: ${backup.orderItems.length}`);
  console.log(`   Payments: ${backup.payments.length}`);
  console.log(`   Refunds: ${backup.refunds.length}`);
  console.log(`   Catering order items: ${backup.cateringOrderItems.length}`);
  console.log(`   Total records: ${backup.metadata.totalRecords}`);

  return backupPath;
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
 * Delete orders and related data in correct order
 */
async function deleteOrdersTransactional(
  orders: { regularOrders: any[]; cateringOrders: any[] },
  config: CleanupConfig
): Promise<CleanupResult> {
  console.log('🗑️  Starting deletion process...');

  const result: CleanupResult = {
    regularOrders: {
      found: orders.regularOrders.length,
      deleted: 0,
      emailAlerts: 0,
      orderItems: 0,
      refunds: 0,
      payments: 0,
    },
    cateringOrders: {
      found: orders.cateringOrders.length,
      deleted: 0,
      orderItems: 0,
    },
    totalDataDeleted: 0,
    errors: [],
  };

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted');

    // Simulate the deletion counts
    const regularOrderIds = orders.regularOrders.map(o => o.id);
    const cateringOrderIds = orders.cateringOrders.map(o => o.id);

    const [emailAlertCount, orderItemCount, paymentCount, refundCount, cateringOrderItemCount] =
      await Promise.all([
        prisma.emailAlert.count({ where: { relatedOrderId: { in: regularOrderIds } } }),
        prisma.orderItem.count({ where: { orderId: { in: regularOrderIds } } }),
        prisma.payment.count({ where: { orderId: { in: regularOrderIds } } }),
        prisma.refund.count({ where: { payment: { orderId: { in: regularOrderIds } } } }),
        prisma.cateringOrderItem.count({ where: { orderId: { in: cateringOrderIds } } }),
      ]);

    result.regularOrders.deleted = orders.regularOrders.length;
    result.regularOrders.emailAlerts = emailAlertCount;
    result.regularOrders.orderItems = orderItemCount;
    result.regularOrders.payments = paymentCount;
    result.regularOrders.refunds = refundCount;
    result.cateringOrders.deleted = orders.cateringOrders.length;
    result.cateringOrders.orderItems = cateringOrderItemCount;
    result.totalDataDeleted =
      emailAlertCount +
      orderItemCount +
      paymentCount +
      refundCount +
      cateringOrderItemCount +
      orders.regularOrders.length +
      orders.cateringOrders.length;

    return result;
  }

  // Actual deletion in transaction
  try {
    await prisma.$transaction(async tx => {
      const regularOrderIds = orders.regularOrders.map(o => o.id);
      const cateringOrderIds = orders.cateringOrders.map(o => o.id);

      console.log('🔄 Deleting related data in correct order...');

      // Step 1: Delete email alerts that reference orders
      if (regularOrderIds.length > 0) {
        const emailAlertResult = await tx.emailAlert.deleteMany({
          where: { relatedOrderId: { in: regularOrderIds } },
        });
        result.regularOrders.emailAlerts = emailAlertResult.count;
        console.log(`   ✅ Deleted ${emailAlertResult.count} email alerts`);
      }

      // Step 2: Delete order items (for regular orders)
      if (regularOrderIds.length > 0) {
        const orderItemResult = await tx.orderItem.deleteMany({
          where: { orderId: { in: regularOrderIds } },
        });
        result.regularOrders.orderItems = orderItemResult.count;
        console.log(`   ✅ Deleted ${orderItemResult.count} order items`);
      }

      // Step 3: Delete catering order items
      if (cateringOrderIds.length > 0) {
        const cateringOrderItemResult = await tx.cateringOrderItem.deleteMany({
          where: { orderId: { in: cateringOrderIds } },
        });
        result.cateringOrders.orderItems = cateringOrderItemResult.count;
        console.log(`   ✅ Deleted ${cateringOrderItemResult.count} catering order items`);
      }

      // Step 4: Delete refunds (which reference payments)
      if (regularOrderIds.length > 0) {
        const refundResult = await tx.refund.deleteMany({
          where: {
            payment: {
              orderId: { in: regularOrderIds },
            },
          },
        });
        result.regularOrders.refunds = refundResult.count;
        console.log(`   ✅ Deleted ${refundResult.count} refunds`);
      }

      // Step 5: Delete payments (which reference orders)
      if (regularOrderIds.length > 0) {
        const paymentResult = await tx.payment.deleteMany({
          where: { orderId: { in: regularOrderIds } },
        });
        result.regularOrders.payments = paymentResult.count;
        console.log(`   ✅ Deleted ${paymentResult.count} payments`);
      }

      // Step 6: Delete catering orders
      if (cateringOrderIds.length > 0) {
        const cateringOrderResult = await tx.cateringOrder.deleteMany({
          where: { id: { in: cateringOrderIds } },
        });
        result.cateringOrders.deleted = cateringOrderResult.count;
        console.log(`   ✅ Deleted ${cateringOrderResult.count} catering orders`);
      }

      // Step 7: Delete regular orders (main tables last)
      if (regularOrderIds.length > 0) {
        const orderResult = await tx.order.deleteMany({
          where: { id: { in: regularOrderIds } },
        });
        result.regularOrders.deleted = orderResult.count;
        console.log(`   ✅ Deleted ${orderResult.count} regular orders`);
      }

      result.totalDataDeleted =
        result.regularOrders.emailAlerts +
        result.regularOrders.orderItems +
        result.regularOrders.refunds +
        result.regularOrders.payments +
        result.cateringOrders.orderItems +
        result.cateringOrders.deleted +
        result.regularOrders.deleted;

      console.log('✅ All deletions completed successfully in transaction');
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    console.error('❌ Transaction failed and rolled back:', errorMessage);
    throw error;
  }

  return result;
}

/**
 * Generate detailed report
 */
function generateReport(
  orders: { regularOrders: any[]; cateringOrders: any[] },
  result: CleanupResult,
  config: CleanupConfig
): void {
  console.log('\n📊 CLEANUP REPORT');
  console.log('==================');

  console.log('\n🔧 Configuration:');
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(
    `   Date range: ${config.dateRange ? `${config.dateRange.start.toISOString().split('T')[0]} to ${config.dateRange.end.toISOString().split('T')[0]}` : 'All dates'}`
  );
  console.log(
    `   Test emails only: ${!config.includeFailedOrders && !config.includeCancelledOrders && !config.includeOldOrders}`
  );
  console.log(`   Include failed orders: ${config.includeFailedOrders}`);
  console.log(`   Include cancelled orders: ${config.includeCancelledOrders}`);
  console.log(`   Include old orders: ${config.includeOldOrders}`);
  console.log(`   Backup created: ${config.backupBeforeDelete}`);
  console.log(`   Excluded order IDs: ${config.excludeOrderIds.length}`);

  console.log('\n🎯 Orders Found:');
  console.log(`   Regular orders: ${result.regularOrders.found}`);
  console.log(`   Catering orders: ${result.cateringOrders.found}`);

  console.log('\n🗑️  Data Processed:');
  console.log(`   Regular orders deleted: ${result.regularOrders.deleted}`);
  console.log(`   Catering orders deleted: ${result.cateringOrders.deleted}`);
  console.log(`   Email alerts deleted: ${result.regularOrders.emailAlerts}`);
  console.log(`   Order items deleted: ${result.regularOrders.orderItems}`);
  console.log(`   Payments deleted: ${result.regularOrders.payments}`);
  console.log(`   Refunds deleted: ${result.regularOrders.refunds}`);
  console.log(`   Catering order items deleted: ${result.cateringOrders.orderItems}`);
  console.log(`   TOTAL RECORDS PROCESSED: ${result.totalDataDeleted}`);

  if (result.backupPath) {
    console.log(`\n💾 Backup: ${result.backupPath}`);
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (config.dryRun) {
    console.log('\n💡 This was a dry run. To execute the deletion, use --execute');
  } else {
    console.log('\n✅ Cleanup completed successfully!');
  }

  // Show sample orders that would be/were deleted
  if (orders.regularOrders.length > 0) {
    console.log('\n📋 Sample Regular Orders (first 5):');
    orders.regularOrders.slice(0, 5).forEach(order => {
      const analysis = shouldDeleteOrder(order, config);
      console.log(
        `   - ${order.id}: ${order.email} ($${order.total}) - ${order.status}/${order.paymentStatus}`
      );
      console.log(`     Created: ${order.createdAt.toISOString().split('T')[0]}`);
      console.log(`     Reasons: ${analysis.reasons.join(', ')}`);
    });
    if (orders.regularOrders.length > 5) {
      console.log(`   ... and ${orders.regularOrders.length - 5} more`);
    }
  }

  if (orders.cateringOrders.length > 0) {
    console.log('\n🍽️  Sample Catering Orders (first 5):');
    orders.cateringOrders.slice(0, 5).forEach(order => {
      const analysis = shouldDeleteOrder(order, config);
      console.log(
        `   - ${order.id}: ${order.email} ($${order.totalAmount}) - ${order.status}/${order.paymentStatus}`
      );
      console.log(`     Created: ${order.createdAt.toISOString().split('T')[0]}`);
      console.log(`     Reasons: ${analysis.reasons.join(', ')}`);
    });
    if (orders.cateringOrders.length > 5) {
      console.log(`   ... and ${orders.cateringOrders.length - 5} more`);
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🧹 Starting Testing Orders Cleanup Script');
    console.log('==========================================\n');

    // Parse configuration
    const config = parseArgs();

    // Safety check for production
    if (!config.dryRun && process.env.NODE_ENV === 'production') {
      console.log('⚠️  PRODUCTION ENVIRONMENT DETECTED');
      if (config.confirmBeforeDelete) {
        const confirmed = await askForConfirmation(
          'Are you sure you want to delete orders in production?'
        );
        if (!confirmed) {
          console.log('❌ Cancelled by user');
          return;
        }
      }
    }

    // Show configuration
    console.log('⚙️  Configuration:');
    console.log(`   Mode: ${config.dryRun ? '🔍 DRY RUN' : '⚡ EXECUTE'}`);
    console.log(
      `   Date range: ${config.dateRange ? `${config.dateRange.start.toISOString().split('T')[0]} to ${config.dateRange.end.toISOString().split('T')[0]}` : 'All dates'}`
    );
    console.log(`   Test email patterns: ${config.testEmailPatterns.length} patterns`);
    console.log(`   Excluded order IDs: ${config.excludeOrderIds.length}`);
    console.log(`   Create backup: ${config.backupBeforeDelete}`);
    console.log(`   Require confirmation: ${config.confirmBeforeDelete}`);
    console.log('');

    // Find orders to delete
    const orders = await findOrdersToDelete(config);

    if (orders.regularOrders.length === 0 && orders.cateringOrders.length === 0) {
      console.log('✅ No orders found matching deletion criteria');
      return;
    }

    // Create backup if requested
    let backupPath: string | undefined;
    if (config.backupBeforeDelete && !config.dryRun) {
      backupPath = await createBackup(orders, config);
    }

    // Ask for confirmation if not dry run
    if (!config.dryRun && config.confirmBeforeDelete) {
      const totalOrders = orders.regularOrders.length + orders.cateringOrders.length;
      const confirmed = await askForConfirmation(
        `This will delete ${totalOrders} orders and all related data. Continue?`
      );
      if (!confirmed) {
        console.log('❌ Cancelled by user');
        return;
      }
    }

    // Perform deletion
    const result = await deleteOrdersTransactional(orders, config);
    result.backupPath = backupPath;

    // Generate report
    generateReport(orders, result, config);

    if (!config.dryRun && result.errors.length === 0) {
      console.log('\n🎉 Cleanup completed successfully!');

      if (backupPath) {
        console.log(`\n📝 Next steps:`);
        console.log(`1. Verify the cleanup results above`);
        console.log(`2. Test your application to ensure everything works`);
        console.log(`3. Keep the backup file: ${backupPath}`);
        console.log(`4. If needed, create a restore script from the backup`);
      }
    }
  } catch (error) {
    console.error('\n💥 Cleanup failed:', error);
    console.error('The database should have been rolled back to its previous state');

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
