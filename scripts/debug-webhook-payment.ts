#!/usr/bin/env tsx

/**
 * Debug script to investigate payment webhook issues
 * 
 * Usage: pnpm tsx scripts/debug-webhook-payment.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugPaymentWebhook() {
  console.log('🔍 Debugging Payment Webhook Issue');
  console.log('=====================================');

  try {
    // The Square order ID from the webhook logs
    const squareOrderId = 'v8opMwXTldE2zWCT3B67gYuMib4F';
    const squarePaymentId = 'TnnqbGVEqrCHhtqoM422PFvzNGAZY';

    console.log(`\n📋 Looking for order with Square Order ID: ${squareOrderId}`);
    console.log(`💳 Square Payment ID: ${squarePaymentId}`);

    // Check for regular order
    console.log('\n🔍 Checking regular orders table...');
    const regularOrder = await prisma.order.findUnique({
      where: { squareOrderId },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        total: true,
        customerName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (regularOrder) {
      console.log('✅ Found regular order:', regularOrder);
    } else {
      console.log('❌ No regular order found with this Square Order ID');
    }

    // Check for catering order
    console.log('\n🔍 Checking catering orders table...');
    const cateringOrder = await prisma.cateringOrder.findUnique({
      where: { squareOrderId },
      select: {
        id: true,
        squareOrderId: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (cateringOrder) {
      console.log('✅ Found catering order:', cateringOrder);
    } else {
      console.log('❌ No catering order found with this Square Order ID');
    }

    // If no order found, list recent orders to help debug
    if (!regularOrder && !cateringOrder) {
      console.log('\n📋 Recent regular orders for comparison:');
      const recentOrders = await prisma.order.findMany({
        take: 10,
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

      console.log('\n📋 Recent catering orders for comparison:');
      const recentCateringOrders = await prisma.cateringOrder.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          squareOrderId: true,
          status: true,
          paymentStatus: true,
          name: true,
          createdAt: true,
        },
      });
      
      console.table(recentCateringOrders);
    }

    // Check for payments table entries
    console.log('\n💳 Checking payments table...');
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { squarePaymentId },
          { orderId: regularOrder?.id },
        ],
      },
      select: {
        id: true,
        squarePaymentId: true,
        orderId: true,
        status: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (payments.length > 0) {
      console.log('✅ Found payments:', payments);
    } else {
      console.log('❌ No payments found');
    }

    // Test the payment status mapping
    console.log('\n🔧 Testing payment status mapping...');
    function mapSquarePaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
      switch (status?.toUpperCase()) {
        case 'APPROVED':
        case 'COMPLETED':
        case 'CAPTURED':
          return 'PAID';
        case 'FAILED':
          return 'FAILED';
        case 'CANCELED':
          return 'FAILED';
        case 'REFUNDED':
          return 'REFUNDED';
        default:
          return 'PENDING';
      }
    }

    const testStatuses = ['COMPLETED', 'APPROVED', 'FAILED', 'PENDING', 'CAPTURED'];
    testStatuses.forEach(status => {
      console.log(`${status} → ${mapSquarePaymentStatus(status)}`);
    });

    // Database connection test
    console.log('\n🔗 Testing database connection...');
    const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', connectionTest);

  } catch (error: any) {
    console.error('❌ Error in debug script:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugPaymentWebhook()
  .then(() => {
    console.log('\n✅ Debug script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug script failed:', error);
    process.exit(1);
  }); 