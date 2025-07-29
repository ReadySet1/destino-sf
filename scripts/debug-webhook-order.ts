#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';

const SQUARE_ORDER_ID = '9FhNm5NYhy6yi5jmU1z3tnzVHb4F';
const SQUARE_PAYMENT_ID = 'RQyVDYvsGlUC4RbOhUbBnTUQItaZY';

async function debugWebhookOrder() {
  console.log('🔍 Debugging webhook order issue...');
  console.log(`Looking for Square Order ID: ${SQUARE_ORDER_ID}`);
  console.log(`Looking for Square Payment ID: ${SQUARE_PAYMENT_ID}`);
  console.log('---');

  try {
    // Check for regular orders
    console.log('1. Checking for regular orders...');
    const regularOrder = await prisma.order.findUnique({
      where: { squareOrderId: SQUARE_ORDER_ID },
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
        payments: {
          select: {
            id: true,
            squarePaymentId: true,
            amount: true,
            status: true,
            createdAt: true,
          }
        }
      },
    });

    if (regularOrder) {
      console.log('✅ Found regular order:', {
        id: regularOrder.id,
        squareOrderId: regularOrder.squareOrderId,
        status: regularOrder.status,
        paymentStatus: regularOrder.paymentStatus,
        total: regularOrder.total.toString(),
        customerName: regularOrder.customerName,
        email: regularOrder.email,
        fulfillmentType: regularOrder.fulfillmentType,
        createdAt: regularOrder.createdAt,
        updatedAt: regularOrder.updatedAt,
      });
      
      console.log('💳 Associated payments:', regularOrder.payments);
      
      // Check if payment exists
      const existingPayment = regularOrder.payments.find(p => p.squarePaymentId === SQUARE_PAYMENT_ID);
      if (existingPayment) {
        console.log('✅ Payment already exists:', existingPayment);
      } else {
        console.log('❌ Payment not found in database');
      }
    } else {
      console.log('❌ No regular order found');
    }

    // Check for catering orders
    console.log('\n2. Checking for catering orders...');
    const cateringOrder = await prisma.cateringOrder.findUnique({
      where: { squareOrderId: SQUARE_ORDER_ID },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        name: true,
        email: true,
        eventDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (cateringOrder) {
      console.log('✅ Found catering order:', {
        id: cateringOrder.id,
        squareOrderId: cateringOrder.squareOrderId,
        status: cateringOrder.status,
        paymentStatus: cateringOrder.paymentStatus,
        totalAmount: cateringOrder.totalAmount.toString(),
        customerName: cateringOrder.name,
        email: cateringOrder.email,
        eventDate: cateringOrder.eventDate,
        createdAt: cateringOrder.createdAt,
        updatedAt: cateringOrder.updatedAt,
      });
    } else {
      console.log('❌ No catering order found');
    }

    // Check for any orders with similar Order IDs
    console.log('\n3. Checking for similar Order IDs...');
    const similarOrders = await prisma.order.findMany({
      where: {
        squareOrderId: {
          contains: '9FhNm5NYhy6yi5jmU1z3tnz'
        }
      },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        customerName: true,
        createdAt: true,
      },
      take: 5,
    });

    if (similarOrders.length > 0) {
      console.log('🔍 Found similar regular orders:', similarOrders);
    }

    const similarCateringOrders = await prisma.cateringOrder.findMany({
      where: {
        squareOrderId: {
          contains: '9FhNm5NYhy6yi5jmU1z3tnz'
        }
      },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        name: true,
        createdAt: true,
      },
      take: 5,
    });

    if (similarCateringOrders.length > 0) {
      console.log('🔍 Found similar catering orders:', similarCateringOrders);
    }

    // Check for recent orders that might be related
    console.log('\n4. Checking recent orders...');
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        customerName: true,
        total: true,
        createdAt: true,
      },
    });

    console.log('📋 Recent regular orders:', recentOrders);

    const recentCateringOrders = await prisma.cateringOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        name: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    console.log('📋 Recent catering orders:', recentCateringOrders);

    // Check if payment exists anywhere
    console.log('\n5. Checking for payment by Square Payment ID...');
    const existingPayment = await prisma.payment.findUnique({
      where: { squarePaymentId: SQUARE_PAYMENT_ID },
      select: {
        id: true,
        squarePaymentId: true,
        amount: true,
        status: true,
        orderId: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            squareOrderId: true,
            status: true,
            paymentStatus: true,
          }
        }
      },
    });

    if (existingPayment) {
      console.log('💳 Found existing payment:', existingPayment);
    } else {
      console.log('❌ No payment found with Square Payment ID:', SQUARE_PAYMENT_ID);
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
debugWebhookOrder().catch(console.error);

export { debugWebhookOrder }; 