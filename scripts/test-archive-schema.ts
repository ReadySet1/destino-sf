#!/usr/bin/env tsx

/**
 * Test script for the archive order schema changes
 * This script tests that the database schema has been updated correctly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testArchiveSchema() {
  console.log('🧪 Testing Archive Order Schema Changes...\n');

  try {
    // 1. Test that the Order model has archive fields
    console.log('1. Testing Order model archive fields...');
    
    // Try to create an order with archive fields
    const testOrder = await prisma.order.create({
      data: {
        customerName: 'Schema Test Customer',
        email: 'schema-test@example.com',
        phone: '555-1234',
        total: 25.00,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        isArchived: false,
        archiveReason: null,
      }
    });
    
    console.log(`✅ Created test order with archive fields: ${testOrder.id}`);
    console.log(`   isArchived: ${testOrder.isArchived}`);
    console.log(`   archivedAt: ${testOrder.archivedAt}`);
    console.log(`   archivedBy: ${testOrder.archivedBy}`);
    console.log(`   archiveReason: ${testOrder.archiveReason}`);

    // 2. Test archiving the order
    console.log('\n2. Testing archive operation...');
    const archivedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: null, // Set to null for testing (no foreign key constraint)
        archiveReason: 'Schema test',
      }
    });
    
    console.log('✅ Order archived successfully');
    console.log(`   isArchived: ${archivedOrder.isArchived}`);
    console.log(`   archivedAt: ${archivedOrder.archivedAt}`);
    console.log(`   archivedBy: ${archivedOrder.archivedBy}`);
    console.log(`   archiveReason: ${archivedOrder.archiveReason}`);

    // 3. Test unarchiving the order
    console.log('\n3. Testing unarchive operation...');
    const unarchivedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      }
    });
    
    console.log('✅ Order unarchived successfully');
    console.log(`   isArchived: ${unarchivedOrder.isArchived}`);
    console.log(`   archivedAt: ${unarchivedOrder.archivedAt}`);
    console.log(`   archivedBy: ${unarchivedOrder.archivedBy}`);
    console.log(`   archiveReason: ${unarchivedOrder.archiveReason}`);

    // 4. Test CateringOrder model archive fields
    console.log('\n4. Testing CateringOrder model archive fields...');
    
    const testCateringOrder = await prisma.cateringOrder.create({
      data: {
        email: 'catering-test@example.com',
        name: 'Catering Test Customer',
        phone: '555-5678',
        eventDate: new Date(),
        numberOfPeople: 10,
        totalAmount: 150.00,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        isArchived: false,
        archiveReason: null,
      }
    });
    
    console.log(`✅ Created test catering order with archive fields: ${testCateringOrder.id}`);
    console.log(`   isArchived: ${testCateringOrder.isArchived}`);
    console.log(`   archivedAt: ${testCateringOrder.archivedAt}`);
    console.log(`   archivedBy: ${testCateringOrder.archivedBy}`);
    console.log(`   archiveReason: ${testCateringOrder.archiveReason}`);

    // 5. Test archiving the catering order
    console.log('\n5. Testing catering order archive operation...');
    const archivedCateringOrder = await prisma.cateringOrder.update({
      where: { id: testCateringOrder.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: null, // Set to null for testing (no foreign key constraint)
        archiveReason: 'Catering schema test',
      }
    });
    
    console.log('✅ Catering order archived successfully');
    console.log(`   isArchived: ${archivedCateringOrder.isArchived}`);
    console.log(`   archivedAt: ${archivedCateringOrder.archivedAt}`);
    console.log(`   archivedBy: ${archivedCateringOrder.archivedBy}`);
    console.log(`   archiveReason: ${archivedCateringOrder.archiveReason}`);

    // 6. Test querying archived orders
    console.log('\n6. Testing archived orders queries...');
    
    const archivedOrders = await prisma.order.findMany({
      where: { isArchived: true },
      select: { id: true, customerName: true, isArchived: true }
    });
    
    console.log(`✅ Found ${archivedOrders.length} archived regular orders`);
    
    const archivedCateringOrders = await prisma.cateringOrder.findMany({
      where: { isArchived: true },
      select: { id: true, name: true, isArchived: true }
    });
    
    console.log(`✅ Found ${archivedCateringOrders.length} archived catering orders`);

    // 7. Test querying non-archived orders
    console.log('\n7. Testing non-archived orders queries...');
    
    const nonArchivedOrders = await prisma.order.findMany({
      where: { isArchived: false },
      select: { id: true, customerName: true, isArchived: true }
    });
    
    console.log(`✅ Found ${nonArchivedOrders.length} non-archived regular orders`);
    
    const nonArchivedCateringOrders = await prisma.cateringOrder.findMany({
      where: { isArchived: false },
      select: { id: true, name: true, isArchived: true }
    });
    
    console.log(`✅ Found ${nonArchivedCateringOrders.length} non-archived catering orders`);

    // 8. Clean up test data
    console.log('\n8. Cleaning up test data...');
    
    await prisma.order.deleteMany({
      where: {
        email: { in: ['schema-test@example.com'] }
      }
    });
    
    await prisma.cateringOrder.deleteMany({
      where: {
        email: { in: ['catering-test@example.com'] }
      }
    });
    
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All schema tests passed! Archive fields are working correctly.');

  } catch (error) {
    console.error('❌ Schema test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testArchiveSchema().catch(console.error); 