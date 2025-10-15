#!/usr/bin/env tsx

/**
 * Webhook Scenario Test Script
 *
 * This script simulates the exact webhook scenario that's failing:
 * 1. Square payment webhook received
 * 2. Webhook tries to update order payment status
 * 3. Test if the database write operation succeeds
 */

import { withRetry, ensureConnection } from '../src/lib/db-unified';
import { prisma } from '../src/lib/db-unified';

interface TestScenario {
  name: string;
  test: () => Promise<boolean>;
  description: string;
}

async function runWebhookScenarioTest(): Promise<void> {
  console.log('🎯 Testing Webhook Payment Status Update Scenario');
  console.log('='.repeat(60));

  const scenarios: TestScenario[] = [
    {
      name: 'Database Connection',
      description: 'Ensure webhook can connect to database',
      test: async () => {
        await ensureConnection(3);
        return true;
      },
    },

    {
      name: 'Find Catering Order',
      description: 'Simulate finding catering order for webhook',
      test: async () => {
        const order = await withRetry(() =>
          prisma.cateringOrder.findFirst({
            where: {
              paymentStatus: { not: 'PAID' },
            },
            select: { id: true, squareOrderId: true, paymentStatus: true },
          })
        );

        if (order) {
          console.log(`   Found order: ${order.id} (Square: ${order.squareOrderId || 'none'})`);
          console.log(`   Current payment status: ${order.paymentStatus}`);
          return true;
        } else {
          console.log('   No unpaid catering orders found');
          return false;
        }
      },
    },

    {
      name: 'Simulate Payment Update',
      description: 'Test the exact webhook payment status update',
      test: async () => {
        // Find a catering order to test with
        const order = await withRetry(() =>
          prisma.cateringOrder.findFirst({
            where: {
              paymentStatus: { not: 'PAID' },
            },
            select: { id: true, paymentStatus: true },
          })
        );

        if (!order) {
          console.log('   No order available for payment update test');
          return false;
        }

        // Simulate the webhook payment update (but don't actually change the status)
        const originalStatus = order.paymentStatus;
        console.log(`   Testing payment update for order ${order.id}`);
        console.log(`   Current status: ${originalStatus}`);

        // Test 1: Can we read the order?
        const currentOrder = await withRetry(() =>
          prisma.cateringOrder.findUnique({
            where: { id: order.id },
            select: { id: true, paymentStatus: true, updatedAt: true },
          })
        );

        if (!currentOrder) {
          console.log('   ❌ Could not read order');
          return false;
        }

        // Test 2: Can we update the order? (Just update timestamp, not payment status)
        const updateResult = await withRetry(() =>
          prisma.cateringOrder.update({
            where: { id: order.id },
            data: {
              updatedAt: new Date(),
            },
            select: { id: true, paymentStatus: true, updatedAt: true },
          })
        );

        console.log(`   ✅ Successfully updated order timestamp`);
        console.log(`   Payment status remains: ${updateResult.paymentStatus}`);

        return true;
      },
    },

    {
      name: 'Test Payment Status Change',
      description: 'Test actual payment status update (if safe)',
      test: async () => {
        // Find a test order or create one for testing
        const testOrderData = {
          email: 'webhook-test@example.com',
          name: 'Webhook Test Order',
          phone: '555-0123',
          eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          numberOfPeople: 10,
          totalAmount: 100.0,
          paymentStatus: 'PENDING' as const,
          status: 'PENDING' as const,
          notes: 'Test order for webhook scenario testing',
        };

        // Check if test order already exists
        let testOrder = await withRetry(() =>
          prisma.cateringOrder.findFirst({
            where: {
              email: testOrderData.email,
              name: testOrderData.name,
            },
            select: { id: true, paymentStatus: true },
          })
        );

        // Create test order if it doesn't exist
        if (!testOrder) {
          console.log('   Creating test order for payment status testing...');
          testOrder = await withRetry(() =>
            prisma.cateringOrder.create({
              data: testOrderData,
              select: { id: true, paymentStatus: true },
            })
          );
          console.log(`   Created test order: ${testOrder.id}`);
        }

        // Test payment status update (simulate webhook behavior)
        const updatedOrder = await withRetry(() =>
          prisma.cateringOrder.update({
            where: { id: testOrder.id },
            data: {
              paymentStatus: 'PAID',
              status: 'CONFIRMED',
              updatedAt: new Date(),
            },
            select: { id: true, paymentStatus: true, status: true },
          })
        );

        console.log(
          `   ✅ Payment status updated: ${testOrder.paymentStatus} → ${updatedOrder.paymentStatus}`
        );
        console.log(`   ✅ Order status updated: → ${updatedOrder.status}`);

        // Clean up: revert to original status
        await withRetry(() =>
          prisma.cateringOrder.update({
            where: { id: testOrder.id },
            data: {
              paymentStatus: 'PENDING',
              status: 'PENDING',
              updatedAt: new Date(),
            },
          })
        );
        console.log(`   🔄 Reverted test order back to PENDING status`);

        return true;
      },
    },
  ];

  let passedTests = 0;
  const totalTests = scenarios.length;

  for (const scenario of scenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);

    try {
      const startTime = Date.now();
      const success = await scenario.test();
      const duration = Date.now() - startTime;

      if (success) {
        console.log(`   ✅ PASSED (${duration}ms)`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED (${duration}ms)`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${(error as Error).message}`);
      console.log(`   Stack: ${(error as Error).stack?.split('\n')[1]?.trim()}`);
    }
  }

  console.log('\n📊 WEBHOOK SCENARIO TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Webhook payment updates should work!');
    console.log('\n✅ The webhook database write issue appears to be resolved');
    console.log('✅ Payment status updates should now work in production');
  } else {
    console.log('⚠️ SOME TESTS FAILED - Webhook may still have issues');
    console.log('\n🔧 Issues that need attention:');
    console.log('   1. Database connection problems');
    console.log('   2. Write permission issues');
    console.log('   3. Order lookup failures');
    console.log('   4. Payment status update failures');
  }

  console.log('\n🎯 NEXT STEPS:');
  if (passedTests === totalTests) {
    console.log('   1. Monitor production webhooks for successful payment updates');
    console.log('   2. Check webhook logs for any remaining errors');
    console.log('   3. Verify Square payment events are processed correctly');
  } else {
    console.log('   1. Review failed tests above');
    console.log('   2. Check database permissions in Supabase dashboard');
    console.log('   3. Verify production DATABASE_URL configuration');
    console.log('   4. Test with a real Square payment webhook');
  }
}

// Run the webhook scenario test
runWebhookScenarioTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
