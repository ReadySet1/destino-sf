#!/usr/bin/env tsx

/**
 * Monitor for stub orders with placeholder data
 * This script helps detect if the webhook race condition issue reoccurs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function monitorStubOrders() {
  try {
    console.log('🔍 Checking for stub orders with placeholder data...\n');

    // Check for orders with placeholder data
    const stubOrders = await prisma.order.findMany({
      where: {
        OR: [
          { email: 'processing@example.com' },
          { email: 'pending@example.com' },
          { customerName: { contains: 'Processing' } },
          { customerName: { contains: 'Pending' } },
          { phone: 'processing' },
          { phone: 'pending' },
          { total: 0 },
        ],
      },
      select: {
        id: true,
        squareOrderId: true,
        customerName: true,
        email: true,
        phone: true,
        total: true,
        status: true,
        createdAt: true,
        rawData: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (stubOrders.length === 0) {
      console.log('✅ No stub orders found!');
      return;
    }

    console.log(`⚠️  Found ${stubOrders.length} stub order(s) with placeholder data:\n`);

    for (const order of stubOrders) {
      console.log(`Order ID: ${order.id}`);
      console.log(`Square Order ID: ${order.squareOrderId}`);
      console.log(`Customer: ${order.customerName}`);
      console.log(`Email: ${order.email}`);
      console.log(`Phone: ${order.phone}`);
      console.log(`Total: $${order.total}`);
      console.log(`Status: ${order.status}`);
      console.log(`Created: ${order.createdAt.toISOString()}`);

      // Check if it was created from a webhook
      if (order.rawData && typeof order.rawData === 'object') {
        const rawData = order.rawData as any;
        if (rawData.createdFromOrderUpdate || rawData.createdFromPayment) {
          console.log(`⚠️  This appears to be a webhook-created stub order!`);
        }
      }

      console.log('---');
    }

    console.log(
      '\n🚨 RECOMMENDATION: Investigate webhook processing logic if stub orders are found.'
    );
    console.log('   This may indicate a race condition between order.created and other webhooks.');
  } catch (error) {
    console.error('❌ Error monitoring stub orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the monitor
monitorStubOrders();
