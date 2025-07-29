#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';

const ORDER_ID = 'e5df1298-5aca-494e-8db6-2c321dd7ffa4';

async function fixPaymentStatus() {
  console.log('🔧 Fixing payment status inconsistency...');
  console.log(`Order ID: ${ORDER_ID}`);
  console.log('---');

  try {
    // Get current order state
    const order = await prisma.order.findUnique({
      where: { id: ORDER_ID },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        total: true,
        customerName: true,
        email: true,
        fulfillmentType: true,
        payments: {
          select: {
            id: true,
            squarePaymentId: true,
            amount: true,
            status: true,
          }
        }
      },
    });

    if (!order) {
      console.error('❌ Order not found');
      return;
    }

    console.log('📋 Current order state:', {
      id: order.id,
      squareOrderId: order.squareOrderId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total.toString(),
      customerName: order.customerName,
      email: order.email,
      fulfillmentType: order.fulfillmentType,
    });

    console.log('💳 Associated payments:', order.payments);

    // Check if any payment is PAID
    const paidPayment = order.payments.find(p => p.status === 'PAID');
    
    if (paidPayment && order.paymentStatus !== 'PAID') {
      console.log('🔄 Payment is PAID but order paymentStatus is not. Fixing...');
      
      const updatedOrder = await prisma.order.update({
        where: { id: ORDER_ID },
        data: {
          paymentStatus: 'PAID',
          updatedAt: new Date(),
        },
      });

      console.log('✅ Fixed payment status:', {
        id: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        updatedAt: updatedOrder.updatedAt,
      });

      // Verify the fix
      const verifyOrder = await prisma.order.findUnique({
        where: { id: ORDER_ID },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          updatedAt: true,
        },
      });

      console.log('🔍 Verification:', verifyOrder);
    } else if (order.paymentStatus === 'PAID') {
      console.log('✅ Payment status is already correct');
    } else {
      console.log('❌ No PAID payment found for this order');
    }

  } catch (error) {
    console.error('❌ Error fixing payment status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
fixPaymentStatus().catch(console.error);

export { fixPaymentStatus }; 