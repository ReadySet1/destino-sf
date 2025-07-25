#!/usr/bin/env tsx

/**
 * Fix payment status for a specific order
 * 
 * Usage: pnpm tsx scripts/fix-payment-status.ts
 */

import { PrismaClient, OrderStatus } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixPaymentStatus() {
  console.log('🔧 Fixing Payment Status');
  console.log('========================');

  try {
    // The specific order from the webhook logs
    const squareOrderId = 'v8opMwXTldE2zWCT3B67gYuMib4F';
    const orderId = '8ed4c7af-4a13-4dcf-94a8-cfd28645e163';

    console.log(`\n🔍 Fixing order: ${orderId}`);
    console.log(`📋 Square Order ID: ${squareOrderId}`);

    // Get current order status
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        squareOrderId: true,
      },
    });

    if (!currentOrder) {
      console.error('❌ Order not found');
      return;
    }

    console.log('📊 Current order status:', currentOrder);

    // Get the payment status
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      select: {
        id: true,
        status: true,
        squarePaymentId: true,
        amount: true,
      },
    });

    if (!payment) {
      console.error('❌ Payment not found');
      return;
    }

    console.log('💳 Payment status:', payment);

    // If payment is PAID but order paymentStatus is PENDING, fix it
    if (payment.status === 'PAID' && currentOrder.paymentStatus === 'PENDING') {
      console.log('🔧 Fixing payment status mismatch...');

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: currentOrder.status === 'PENDING' ? OrderStatus.PROCESSING : currentOrder.status,
          updatedAt: new Date(),
        },
      });

      console.log('✅ Payment status fixed!');
      console.log('📊 Updated order:', {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        updatedAt: updatedOrder.updatedAt,
      });
    } else {
      console.log('ℹ️ Payment status is already correct or no fix needed');
    }

  } catch (error: any) {
    console.error('❌ Error fixing payment status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
fixPaymentStatus()
  .then(() => {
    console.log('\n✅ Fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix script failed:', error);
    process.exit(1);
  }); 