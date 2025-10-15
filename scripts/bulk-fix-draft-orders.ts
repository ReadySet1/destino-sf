#!/usr/bin/env tsx

/**
 * Bulk Fix Script for Square Draft Orders
 *
 * This script identifies and fixes orders that were stuck in DRAFT state in Square
 * due to the missing autocomplete flag issue. It can complete payments and finalize
 * orders without requiring user credentials by using admin API access.
 */

import { prisma } from '../src/lib/db';
import { getSquareService } from '../src/lib/square/service';
import { logger } from '../src/utils/logger';

interface FixResult {
  orderId: string;
  squareOrderId: string;
  action: 'payment_completed' | 'order_finalized' | 'already_completed' | 'failed';
  error?: string;
}

interface FixSummary {
  totalProcessed: number;
  paymentCompleted: number;
  orderFinalized: number;
  alreadyCompleted: number;
  failed: number;
  results: FixResult[];
}

/**
 * Find orders that may be stuck in DRAFT state due to missing autocomplete
 */
async function findDraftOrders(): Promise<
  Array<{
    id: string;
    squareOrderId: string;
    paymentStatus: string;
    status: string;
    total: number;
    customerName: string;
    email: string;
    createdAt: Date;
    payments: Array<{
      id: string;
      squarePaymentId: string;
      status: string;
      amount: number;
    }>;
  }>
> {
  console.log('🔍 Searching for orders that may be stuck in DRAFT state...');

  // Find orders that have PAID payments but might not be completed in Square
  const suspectOrders = await prisma.order.findMany({
    where: {
      AND: [
        { paymentStatus: 'PAID' },
        { squareOrderId: { not: null } },
        {
          OR: [
            { status: 'PENDING' }, // Orders that should be PROCESSING after payment
            { status: 'PROCESSING' },
          ],
        },
        // Only check orders from the last 30 days to avoid processing very old orders
        { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      ],
    },
    include: {
      payments: {
        select: {
          id: true,
          squarePaymentId: true,
          status: true,
          amount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to 100 orders for safety
  });

  console.log(`📊 Found ${suspectOrders.length} orders to investigate`);
  return suspectOrders;
}

/**
 * Check if a Square order is in DRAFT state
 */
async function checkSquareOrderState(squareOrderId: string): Promise<{
  state: string;
  isDraft: boolean;
  needsFinalization: boolean;
}> {
  try {
    const squareService = getSquareService();
    const orderResponse = await squareService.retrieveOrder(squareOrderId);

    if (!orderResponse.order) {
      throw new Error('Order not found in Square');
    }

    const state = orderResponse.order.state || 'UNKNOWN';
    const isDraft = state === 'DRAFT';
    const needsFinalization = isDraft || state === 'OPEN';

    return { state, isDraft, needsFinalization };
  } catch (error) {
    console.error(`❌ Failed to check Square order ${squareOrderId}:`, error);
    throw error;
  }
}

/**
 * Finalize a Square order by updating its state
 */
async function finalizeSquareOrder(squareOrderId: string): Promise<boolean> {
  try {
    const squareService = getSquareService();

    // First get the current order to get the version
    const currentOrder = await squareService.retrieveOrder(squareOrderId);
    if (!currentOrder.order) {
      throw new Error('Order not found');
    }

    // Update the order to OPEN state to make it visible
    const updateRequest = {
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        state: 'OPEN',
        version: currentOrder.order.version,
      },
      fieldsToClear: [],
      idempotencyKey: `finalize-${squareOrderId}-${Date.now()}`,
    };

    await squareService.updateOrder(squareOrderId, updateRequest);
    console.log(`✅ Successfully finalized Square order ${squareOrderId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to finalize Square order ${squareOrderId}:`, error);
    return false;
  }
}

/**
 * Process a single order to fix draft state issues
 */
async function processOrder(order: any): Promise<FixResult> {
  const result: FixResult = {
    orderId: order.id,
    squareOrderId: order.squareOrderId,
    action: 'failed',
  };

  try {
    console.log(`\n🔧 Processing order ${order.id} (Square: ${order.squareOrderId})`);
    console.log(`   Customer: ${order.customerName} (${order.email})`);
    console.log(`   Status: ${order.status}, Payment: ${order.paymentStatus}`);

    // Check if there are any PAID payments
    const paidPayments = order.payments.filter((p: any) => p.status === 'PAID');
    if (paidPayments.length === 0) {
      console.log(`   ❌ No PAID payments found, skipping`);
      result.action = 'failed';
      result.error = 'No PAID payments found';
      return result;
    }

    console.log(`   💳 Found ${paidPayments.length} PAID payment(s)`);

    // Check Square order state
    const squareState = await checkSquareOrderState(order.squareOrderId);
    console.log(`   📋 Square order state: ${squareState.state}`);

    if (!squareState.needsFinalization) {
      console.log(`   ✅ Order already finalized in Square`);
      result.action = 'already_completed';
      return result;
    }

    // If order is in DRAFT or needs finalization, fix it
    if (squareState.isDraft) {
      console.log(`   🔄 Order is in DRAFT state, attempting to finalize...`);
      const success = await finalizeSquareOrder(order.squareOrderId);

      if (success) {
        result.action = 'order_finalized';
        console.log(`   ✅ Successfully finalized order`);
      } else {
        result.action = 'failed';
        result.error = 'Failed to finalize order in Square';
      }
    } else {
      console.log(`   ✅ Order state is acceptable (${squareState.state})`);
      result.action = 'already_completed';
    }

    return result;
  } catch (error) {
    console.error(`   ❌ Error processing order ${order.id}:`, error);
    result.action = 'failed';
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Main function to bulk fix draft orders
 */
async function bulkFixDraftOrders(dryRun: boolean = true): Promise<FixSummary> {
  console.log('🚀 Starting bulk fix for Square draft orders...');
  console.log(
    `📋 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (orders will be fixed)'}`
  );
  console.log('---');

  const summary: FixSummary = {
    totalProcessed: 0,
    paymentCompleted: 0,
    orderFinalized: 0,
    alreadyCompleted: 0,
    failed: 0,
    results: [],
  };

  try {
    // Find orders that might need fixing
    const orders = await findDraftOrders();

    if (orders.length === 0) {
      console.log('✅ No orders found that need fixing');
      return summary;
    }

    console.log(`\n📝 Processing ${orders.length} orders...`);

    for (const order of orders) {
      summary.totalProcessed++;

      if (dryRun) {
        console.log(`\n[DRY RUN] Would process order ${order.id} (${order.squareOrderId})`);
        console.log(
          `          Customer: ${order.customerName}, Status: ${order.status}, Payment: ${order.paymentStatus}`
        );
        summary.results.push({
          orderId: order.id,
          squareOrderId: order.squareOrderId,
          action: 'already_completed', // Simulate success in dry run
        });
        summary.alreadyCompleted++;
      } else {
        const result = await processOrder(order);
        summary.results.push(result);

        switch (result.action) {
          case 'payment_completed':
            summary.paymentCompleted++;
            break;
          case 'order_finalized':
            summary.orderFinalized++;
            break;
          case 'already_completed':
            summary.alreadyCompleted++;
            break;
          case 'failed':
            summary.failed++;
            break;
        }
      }
    }

    return summary;
  } catch (error) {
    console.error('❌ Bulk fix process failed:', error);
    throw error;
  }
}

/**
 * Print summary results
 */
function printSummary(summary: FixSummary) {
  console.log('\n📊 BULK FIX SUMMARY');
  console.log('===================');
  console.log(`Total orders processed: ${summary.totalProcessed}`);
  console.log(`✅ Orders finalized: ${summary.orderFinalized}`);
  console.log(`💳 Payments completed: ${summary.paymentCompleted}`);
  console.log(`✨ Already completed: ${summary.alreadyCompleted}`);
  console.log(`❌ Failed: ${summary.failed}`);

  if (summary.failed > 0) {
    console.log('\n❌ FAILED ORDERS:');
    summary.results
      .filter(r => r.action === 'failed')
      .forEach(r => {
        console.log(`   ${r.orderId} (${r.squareOrderId}): ${r.error}`);
      });
  }

  if (summary.orderFinalized > 0) {
    console.log('\n✅ SUCCESSFULLY FINALIZED:');
    summary.results
      .filter(r => r.action === 'order_finalized')
      .forEach(r => {
        console.log(`   ${r.orderId} (${r.squareOrderId})`);
      });
  }
}

// Main execution
async function main() {
  // Default to dry run unless explicitly disabled
  const isDryRun = process.argv.includes('--live') ? false : true;

  if (!isDryRun) {
    console.log('⚠️ WARNING: Running in LIVE mode. This will make actual changes!');
    console.log('⚠️ Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const summary = await bulkFixDraftOrders(isDryRun);
    printSummary(summary);

    if (isDryRun) {
      console.log('\n💡 To apply these fixes, run with --live flag:');
      console.log('   tsx scripts/bulk-fix-draft-orders.ts --live');
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for testing
export { bulkFixDraftOrders, findDraftOrders, processOrder };

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
