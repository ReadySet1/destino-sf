#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';
import { updateOrderPayment } from '../src/app/actions/orders';

// Your specific order ID that needs payment status update
const ORDER_ID = 'e81085df-96ac-4d2f-81a9-5a56c9b23150';
const SQUARE_ORDER_ID = 'dRPv3LgcGuacfsEssnxrC4m8Lg4F'; // From your order details

async function fixSpecificPaymentStatus() {
  console.log('🔧 Fixing payment status for specific order...');
  console.log(`Order ID: ${ORDER_ID}`);
  console.log(`Square Order ID: ${SQUARE_ORDER_ID}`);
  console.log('---');

  try {
    // First, let's check the current order state
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
        createdAt: true,
        updatedAt: true,
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });

    if (order.paymentStatus === 'PAID') {
      console.log('✅ Payment status is already PAID. No update needed.');
      return;
    }

    console.log('🔄 Updating payment status to PAID...');

    // Method 1: Use the existing updateOrderPayment function
    try {
      const result = await updateOrderPayment(
        ORDER_ID,
        SQUARE_ORDER_ID,
        'PAID',
        'Payment status manually updated after successful Square test payment - webhook sync issue resolved'
      );

      console.log('✅ Successfully updated payment status using updateOrderPayment:', {
        id: result.id,
        status: result.status,
        paymentStatus: result.paymentStatus,
        updatedAt: result.updatedAt,
      });

    } catch (updateError) {
      console.error('❌ Error using updateOrderPayment function:', updateError);
      
      // Fallback: Direct database update
      console.log('🔄 Falling back to direct database update...');
      
      const updatedOrder = await prisma.order.update({
        where: { id: ORDER_ID },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING', // Update status to PROCESSING when payment is confirmed
          squareOrderId: SQUARE_ORDER_ID, // Ensure Square order ID is set
          notes: 'Payment status manually updated after successful Square test payment - webhook sync issue resolved',
          updatedAt: new Date(),
        },
      });

      console.log('✅ Successfully updated via direct database update:', {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        updatedAt: updatedOrder.updatedAt,
      });
    }

    // Verify the update
    const verifyOrder = await prisma.order.findUnique({
      where: { id: ORDER_ID },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        squareOrderId: true,
        updatedAt: true,
        notes: true,
      },
    });

    console.log('🔍 Final verification:', verifyOrder);

  } catch (error) {
    console.error('❌ Error fixing payment status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function directly
fixSpecificPaymentStatus().catch(console.error);

export { fixSpecificPaymentStatus };
