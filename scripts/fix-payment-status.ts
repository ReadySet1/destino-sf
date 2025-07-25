#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';

async function fixPaymentStatus() {
  console.log('🔧 Fixing Payment Status for Order');
  console.log('===================================');

  const squareOrderId = 'voGPZUuiz5wCz02HdOUuMyrl0h4F';
  const squarePaymentId = 'v7Sg2rTTx9aL3KJWLToCnBkUuBZZY';
  const paymentAmount = 7801; // From webhook: 7801 cents = $78.01

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { squareOrderId },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        total: true,
        customerName: true,
      },
    });

    if (!order) {
      console.log('❌ Order not found');
      return;
    }

    console.log('✅ Found order:', {
      id: order.id.substring(0, 8) + '...',
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
    });

    // Check if payment record already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { squarePaymentId },
    });

    if (existingPayment) {
      console.log('✅ Payment record already exists:', {
        id: existingPayment.id,
        status: existingPayment.status,
        amount: existingPayment.amount,
      });
    } else {
      // Create the missing payment record
      console.log('📝 Creating missing payment record...');
      const payment = await prisma.payment.create({
        data: {
          squarePaymentId,
          amount: paymentAmount / 100, // Convert cents to dollars
          status: 'PAID',
          orderId: order.id,
          rawData: {
            createdViaFixScript: true,
            originalWebhookData: {
              squareOrderId,
              squarePaymentId,
              status: 'COMPLETED',
              amount: paymentAmount,
            },
            fixedAt: new Date().toISOString(),
          },
        },
      });

      console.log('✅ Created payment record:', {
        id: payment.id,
        squarePaymentId: payment.squarePaymentId,
        status: payment.status,
        amount: payment.amount,
      });
    }

    // Update order payment status if needed
    if (order.paymentStatus !== 'PAID') {
      console.log('📝 Updating order payment status...');
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          updatedAt: new Date(),
        },
      });

      console.log('✅ Updated order payment status:', {
        id: order.id.substring(0, 8) + '...',
        oldStatus: order.paymentStatus,
        newStatus: updatedOrder.paymentStatus,
      });
    } else {
      console.log('ℹ️ Order payment status already PAID');
    }

    console.log('\n🎉 Payment status fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing payment status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script directly
fixPaymentStatus().catch(console.error); 