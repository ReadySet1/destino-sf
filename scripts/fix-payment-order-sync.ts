#!/usr/bin/env tsx

/**
 * Script to fix order payment status synchronization issues
 * This script identifies orders where payment status doesn't match order status
 * and fixes them automatically
 */

import { prisma } from '../src/lib/db';
import { safeQuery } from '../src/lib/db-utils';

async function fixPaymentOrderSync() {
  console.log('🔍 Finding orders with payment/order status mismatches...');

  try {
    // Find orders where payment record shows PAID but order shows PENDING
    const problematicOrders = await safeQuery(() =>
      prisma.order.findMany({
        where: {
          paymentStatus: 'PENDING',
          payments: {
            some: {
              status: 'PAID',
            },
          },
        },
        include: {
          payments: true,
        },
      })
    );

    console.log(`📊 Found ${problematicOrders.length} orders with payment status mismatches`);

    for (const order of problematicOrders) {
      console.log(`\n🔧 Fixing order ${order.id}:`);
      console.log(`   Square Order ID: ${order.squareOrderId}`);
      console.log(`   Current order status: ${order.status}`);
      console.log(`   Current payment status: ${order.paymentStatus}`);

      const paidPayments = order.payments.filter(p => p.status === 'PAID');
      console.log(`   Found ${paidPayments.length} PAID payment(s)`);

      if (paidPayments.length > 0) {
        const latestPayment = paidPayments.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        )[0];
        console.log(
          `   Latest PAID payment: ${latestPayment.squarePaymentId} (${latestPayment.updatedAt})`
        );

        // Update the order to match the payment status
        const newOrderStatus = order.status === 'PENDING' ? 'PROCESSING' : order.status;

        console.log(`   Updating order to: status=${newOrderStatus}, paymentStatus=PAID`);

        const updatedOrder = await safeQuery(() =>
          prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              status: newOrderStatus,
              updatedAt: new Date(),
            },
          })
        );

        console.log(`   ✅ Order ${order.id} updated successfully`);

        // Log the fix for audit purposes
        const auditLog = {
          orderId: order.id,
          squareOrderId: order.squareOrderId,
          previousStatus: order.status,
          previousPaymentStatus: order.paymentStatus,
          newStatus: newOrderStatus,
          newPaymentStatus: 'PAID',
          paymentId: latestPayment.id,
          squarePaymentId: latestPayment.squarePaymentId,
          fixedAt: new Date().toISOString(),
          reason: 'Webhook processing failure - payment status mismatch',
        };

        console.log(`   📝 Audit log:`, auditLog);
      }
    }

    if (problematicOrders.length === 0) {
      console.log('✅ No orders found with payment status mismatches');
    } else {
      console.log(`\n✅ Fixed ${problematicOrders.length} orders with payment status mismatches`);
    }

    // Also check for orders that might need shipping label processing
    console.log('\n🔍 Checking for shipping orders that need labels...');

    const shippingOrders = await safeQuery(() =>
      prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          fulfillmentType: 'nationwide_shipping',
          trackingNumber: null,
          shippingRateId: { not: null },
        },
        select: {
          id: true,
          squareOrderId: true,
          shippingRateId: true,
          status: true,
        },
      })
    );

    if (shippingOrders.length > 0) {
      console.log(`📦 Found ${shippingOrders.length} shipping orders that may need labels:`);
      shippingOrders.forEach(order => {
        console.log(
          `   - Order ${order.id} (${order.squareOrderId}) - Rate ID: ${order.shippingRateId}`
        );
      });
      console.log('💡 These orders may need manual label purchase through the admin panel');
    }
  } catch (error) {
    console.error('❌ Error fixing payment order sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix script
fixPaymentOrderSync().catch(console.error);
