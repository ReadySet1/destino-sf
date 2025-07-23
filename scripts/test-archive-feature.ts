#!/usr/bin/env tsx

/**
 * Test script for the archive order feature
 * This script tests the basic functionality of archiving and unarchiving orders
 */

import { prisma } from '../src/lib/db';
import { archiveOrder, unarchiveOrder, getArchivedOrders } from '../src/app/actions/orders';

async function testArchiveFeature() {
  console.log('🧪 Testing Archive Order Feature...\n');

  try {
    // 1. Find a test order to archive
    console.log('1. Finding a test order...');
    let testOrder = await prisma.order.findFirst({
      where: {
        isArchived: false,
        email: { contains: 'test' },
      },
      select: { id: true, customerName: true, email: true, isArchived: true },
    });

    if (!testOrder) {
      console.log('❌ No test order found. Creating a test order...');

      // Create a test order
      const newOrder = await prisma.order.create({
        data: {
          customerName: 'Test Customer',
          email: 'test@example.com',
          phone: '555-1234',
          total: 25.0,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });

      console.log(`✅ Created test order: ${newOrder.id}`);
      testOrder = {
        id: newOrder.id,
        customerName: newOrder.customerName,
        email: newOrder.email,
        isArchived: false,
      };
    }

    console.log(`✅ Found test order: ${testOrder.id} (${testOrder.customerName})`);

    // 2. Test archiving the order
    console.log('\n2. Testing archive functionality...');
    const archiveResult = await archiveOrder(testOrder.id, 'Test archive reason');

    if (archiveResult.success) {
      console.log('✅ Order archived successfully');
    } else {
      console.log(`❌ Failed to archive order: ${archiveResult.error}`);
      return;
    }

    // 3. Verify the order is archived
    console.log('\n3. Verifying order is archived...');
    const archivedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      select: { id: true, isArchived: true, archivedAt: true, archiveReason: true },
    });

    if (archivedOrder?.isArchived) {
      console.log('✅ Order is properly archived');
      console.log(`   Archived at: ${archivedOrder.archivedAt}`);
      console.log(`   Reason: ${archivedOrder.archiveReason}`);
    } else {
      console.log('❌ Order is not archived');
      return;
    }

    // 4. Test getting archived orders
    console.log('\n4. Testing getArchivedOrders function...');
    const archivedOrdersResult = await getArchivedOrders({ page: 1 });

    if (archivedOrdersResult.success) {
      console.log(`✅ Found ${archivedOrdersResult.orders.length} archived orders`);
      const foundOrder = archivedOrdersResult.orders.find(o => o.id === testOrder.id);
      if (foundOrder) {
        console.log('✅ Test order found in archived orders list');
      } else {
        console.log('❌ Test order not found in archived orders list');
      }
    } else {
      console.log(`❌ Failed to get archived orders: ${archivedOrdersResult.error}`);
    }

    // 5. Test unarchiving the order
    console.log('\n5. Testing unarchive functionality...');
    const unarchiveResult = await unarchiveOrder(testOrder.id);

    if (unarchiveResult.success) {
      console.log('✅ Order unarchived successfully');
    } else {
      console.log(`❌ Failed to unarchive order: ${unarchiveResult.error}`);
      return;
    }

    // 6. Verify the order is unarchived
    console.log('\n6. Verifying order is unarchived...');
    const unarchivedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      select: { id: true, isArchived: true, archivedAt: true, archiveReason: true },
    });

    if (!unarchivedOrder?.isArchived) {
      console.log('✅ Order is properly unarchived');
    } else {
      console.log('❌ Order is still archived');
      return;
    }

    // 7. Verify it's not in archived orders list
    console.log('\n7. Verifying order is not in archived list...');
    const archivedOrdersAfterUnarchive = await getArchivedOrders({ page: 1 });

    if (archivedOrdersAfterUnarchive.success) {
      const foundOrder = archivedOrdersAfterUnarchive.orders.find(o => o.id === testOrder.id);
      if (!foundOrder) {
        console.log('✅ Test order no longer appears in archived orders list');
      } else {
        console.log('❌ Test order still appears in archived orders list');
      }
    }

    console.log('\n🎉 All tests passed! Archive feature is working correctly.');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testArchiveFeature().catch(console.error);
