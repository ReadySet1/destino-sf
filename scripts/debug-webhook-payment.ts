#!/usr/bin/env tsx

/**
 * Production webhook debugging tool
 * 
 * This tool helps diagnose webhook processing issues in production environments.
 * It can investigate specific orders, payments, or recent webhook failures.
 * 
 * Usage: 
 *   pnpm tsx scripts/debug-webhook-payment.ts --order-id=<order-id>
 *   pnpm tsx scripts/debug-webhook-payment.ts --square-order-id=<square-order-id>
 *   pnpm tsx scripts/debug-webhook-payment.ts --payment-id=<square-payment-id>
 *   pnpm tsx scripts/debug-webhook-payment.ts --recent-failures
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugSpecificOrder(orderId: string): Promise<void> {
  console.log(`🔍 Debugging Order: ${orderId}`);
  console.log('=====================================\n');

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        items: { include: { product: true, variant: true } },
      },
    });

    if (!order) {
      console.log(`❌ Order ${orderId} not found`);
      return;
    }

    console.log('📋 Order Details:');
    console.log('=================');
    console.log(`ID: ${order.id}`);
    console.log(`Square Order ID: ${order.squareOrderId}`);
    console.log(`Status: ${order.status}`);
    console.log(`Payment Status: ${order.paymentStatus}`);
    console.log(`Total: $${order.total}`);
    console.log(`Customer: ${order.customerName} (${order.email})`);
    console.log(`Fulfillment Type: ${order.fulfillmentType}`);
    console.log(`Created: ${order.createdAt}`);
    console.log(`Updated: ${order.updatedAt}\n`);

    console.log(`💳 Payment Records (${order.payments.length}):`);
    console.log('=========================');
    if (order.payments.length === 0) {
      console.log('❌ No payment records found\n');
    } else {
      order.payments.forEach((payment, index) => {
        console.log(`${index + 1}. Payment ID: ${payment.id}`);
        console.log(`   Square Payment ID: ${payment.squarePaymentId}`);
        console.log(`   Amount: $${(payment.amount / 100).toFixed(2)}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Created: ${payment.createdAt}`);
        console.log(`   Updated: ${payment.updatedAt}\n`);
      });
    }

    // Consistency checks
    console.log('🔍 Consistency Checks:');
    console.log('======================');
    
    if (order.paymentStatus === 'PAID' && order.payments.length === 0) {
      console.log('⚠️ WARNING: Order marked as PAID but no payment records');
    } else if (order.paymentStatus === 'PENDING' && order.payments.length > 0) {
      console.log('⚠️ WARNING: Payment records exist but order still PENDING');
    } else {
      console.log('✅ Order and payment records are consistent');
    }

    // Suggest fixes
    if (order.paymentStatus === 'PENDING' && order.payments.some(p => p.status === 'PAID')) {
      console.log('\n🔧 Suggested Fix:');
      console.log('Run the following to fix payment status:');
      console.log(`pnpm tsx scripts/production-webhook-test.ts --fix-order=${order.id}`);
    }

  } catch (error) {
    console.error('❌ Error debugging order:', error);
  }
}

async function debugBySquareOrderId(squareOrderId: string): Promise<void> {
  console.log(`🔍 Debugging Square Order: ${squareOrderId}`);
  console.log('==========================================\n');

  try {
    // Check regular orders
    const order = await prisma.order.findUnique({
      where: { squareOrderId },
      include: { payments: true },
    });

    if (order) {
      console.log('✅ Found in regular orders table');
      await debugSpecificOrder(order.id);
      return;
    }

    // Check catering orders
    const cateringOrder = await prisma.cateringOrder.findUnique({
      where: { squareOrderId },
    });

    if (cateringOrder) {
      console.log('✅ Found in catering orders table');
      console.log(`ID: ${cateringOrder.id}`);
      console.log(`Status: ${cateringOrder.status}`);
      console.log(`Payment Status: ${cateringOrder.paymentStatus}`);
      console.log(`Total: $${cateringOrder.totalAmount}`);
      console.log(`Customer: ${cateringOrder.name} (${cateringOrder.email})`);
      return;
    }

    console.log(`❌ No order found with Square Order ID: ${squareOrderId}`);
    
    // Show recent orders for comparison
    console.log('\n📋 Recent orders for comparison:');
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        customerName: true,
        createdAt: true,
      },
    });
    console.table(recentOrders);

  } catch (error) {
    console.error('❌ Error debugging Square order:', error);
  }
}

async function debugByPaymentId(paymentId: string): Promise<void> {
  console.log(`🔍 Debugging Payment: ${paymentId}`);
  console.log('=====================================\n');

  try {
    const payment = await prisma.payment.findUnique({
      where: { squarePaymentId: paymentId },
      include: { order: true },
    });

    if (!payment) {
      console.log(`❌ Payment ${paymentId} not found`);
      return;
    }

    console.log('💳 Payment Details:');
    console.log('==================');
    console.log(`ID: ${payment.id}`);
    console.log(`Square Payment ID: ${payment.squarePaymentId}`);
    console.log(`Amount: $${(payment.amount / 100).toFixed(2)}`);
    console.log(`Status: ${payment.status}`);
    console.log(`Order ID: ${payment.orderId}`);
    console.log(`Created: ${payment.createdAt}`);
    console.log(`Updated: ${payment.updatedAt}\n`);

    if (payment.order) {
      console.log('📋 Associated Order:');
      console.log('===================');
      console.log(`Order ID: ${payment.order.id}`);
      console.log(`Square Order ID: ${payment.order.squareOrderId}`);
      console.log(`Status: ${payment.order.status}`);
      console.log(`Payment Status: ${payment.order.paymentStatus}`);
      console.log(`Customer: ${payment.order.customerName}`);
    }

  } catch (error) {
    console.error('❌ Error debugging payment:', error);
  }
}

async function analyzeRecentFailures(): Promise<void> {
  console.log('🔍 Analyzing Recent Webhook Failures');
  console.log('====================================\n');

  try {
    // Find orders with inconsistent states
    const inconsistentOrders = await prisma.order.findMany({
      where: {
        AND: [
          { paymentStatus: 'PENDING' },
          { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Last 24 hours
        ]
      },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`📊 Found ${inconsistentOrders.length} potentially problematic orders from last 24 hours:\n`);

    inconsistentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.id}`);
      console.log(`   Square Order ID: ${order.squareOrderId}`);
      console.log(`   Status: ${order.status} | Payment: ${order.paymentStatus}`);
      console.log(`   Customer: ${order.customerName}`);
      console.log(`   Payment Records: ${order.payments.length}`);
      console.log(`   Created: ${order.createdAt}\n`);
    });

    if (inconsistentOrders.length === 0) {
      console.log('✅ No recent problematic orders found');
    }

  } catch (error) {
    console.error('❌ Error analyzing recent failures:', error);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  try {
    if (args.length === 0) {
      console.log('🔧 Webhook Debugging Tool');
      console.log('=========================\n');
      console.log('Usage:');
      console.log('  --order-id=<id>           Debug specific order by internal ID');
      console.log('  --square-order-id=<id>    Debug by Square Order ID');
      console.log('  --payment-id=<id>         Debug by Square Payment ID');
      console.log('  --recent-failures         Analyze recent webhook failures\n');
      return;
    }

    for (const arg of args) {
      if (arg.startsWith('--order-id=')) {
        const orderId = arg.split('=')[1];
        await debugSpecificOrder(orderId);
      } else if (arg.startsWith('--square-order-id=')) {
        const squareOrderId = arg.split('=')[1];
        await debugBySquareOrderId(squareOrderId);
      } else if (arg.startsWith('--payment-id=')) {
        const paymentId = arg.split('=')[1];
        await debugByPaymentId(paymentId);
      } else if (arg === '--recent-failures') {
        await analyzeRecentFailures();
      } else {
        console.log(`❌ Unknown argument: ${arg}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug tool failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug tool
main().catch(console.error); 