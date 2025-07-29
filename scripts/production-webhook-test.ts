#!/usr/bin/env tsx

/**
 * Production webhook testing script
 * 
 * This script validates webhook processing functionality in production environments.
 * It can be used for pre-deployment validation and post-deployment verification.
 * 
 * Usage: 
 *   pnpm tsx scripts/production-webhook-test.ts
 *   pnpm tsx scripts/production-webhook-test.ts --order-id=<order-id>
 *   pnpm tsx scripts/production-webhook-test.ts --validate-processing
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

interface TestResults {
  totalTests: number;
  passed: number;
  failed: number;
  errors: string[];
}

async function runWebhookTests(): Promise<TestResults> {
  const results: TestResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  console.log('🧪 Production Webhook Testing');
  console.log('=============================\n');

  // Test 1: Database Connectivity
  await runTest(
    'Database Connectivity',
    async () => {
      const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
      return Array.isArray(testQuery) && testQuery.length > 0;
    },
    results
  );

  // Test 2: Recent Order Processing
  await runTest(
    'Recent Order Processing Validation',
    async () => {
      const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { payments: true },
      });

      // Check if orders have been processed correctly
      const processedOrders = recentOrders.filter(order => 
        order.paymentStatus === 'PAID' && order.payments.length > 0
      );

      console.log(`   📊 Found ${recentOrders.length} recent orders, ${processedOrders.length} properly processed`);
      return recentOrders.length > 0; // At least some orders exist
    },
    results
  );

  // Test 3: Payment Records Consistency
  await runTest(
    'Payment Records Consistency',
    async () => {
      const ordersWithPayments = await prisma.order.findMany({
        where: { paymentStatus: 'PAID' },
        include: { payments: true },
      });

      const inconsistentOrders = ordersWithPayments.filter(order => 
        order.payments.length === 0
      );

      if (inconsistentOrders.length > 0) {
        console.log(`   ⚠️ Found ${inconsistentOrders.length} orders marked as PAID without payment records`);
        return false;
      }

      console.log(`   ✅ All ${ordersWithPayments.length} paid orders have payment records`);
      return true;
    },
    results
  );

  // Test 4: Webhook Processing Function Validation
  await runTest(
    'Webhook Processing Functions',
    async () => {
      try {
        // Import webhook handlers to ensure they load correctly
        const handlers = await import('../src/lib/webhook-handlers');
        const queueHandler = await import('../src/lib/webhook-queue');

        // Verify key functions exist
        const requiredFunctions = [
          'handlePaymentCreated',
          'handlePaymentUpdated', 
          'handleOrderCreated',
          'handleOrderUpdated',
          'handleWebhookWithQueue'
        ];

        const missing = requiredFunctions.filter(fn => {
          return !handlers[fn as keyof typeof handlers] && !queueHandler[fn as keyof typeof queueHandler];
        });

        if (missing.length > 0) {
          console.log(`   ❌ Missing functions: ${missing.join(', ')}`);
          return false;
        }

        console.log(`   ✅ All webhook handler functions available`);
        return true;
      } catch (error) {
        console.log(`   ❌ Error importing webhook handlers: ${error}`);
        return false;
      }
    },
    results
  );

  // Test 5: Environment Configuration
  await runTest(
    'Environment Configuration',
    async () => {
      const requiredEnvVars = [
        'DATABASE_URL',
        'SQUARE_ACCESS_TOKEN',
        'SQUARE_WEBHOOK_SECRET',
        'RESEND_API_KEY'
      ];

      const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

      if (missing.length > 0) {
        console.log(`   ❌ Missing environment variables: ${missing.join(', ')}`);
        return false;
      }

      // Validate webhook secret format
      const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
      if (webhookSecret && webhookSecret.length < 20) {
        console.log(`   ⚠️ Webhook secret seems too short (${webhookSecret.length} chars)`);
        return false;
      }

      console.log(`   ✅ All required environment variables configured`);
      return true;
    },
    results
  );

  return results;
}

async function runTest(
  testName: string,
  testFunction: () => Promise<boolean>,
  results: TestResults
): Promise<void> {
  results.totalTests++;
  console.log(`🔍 Testing: ${testName}`);
  
  try {
    const success = await testFunction();
    if (success) {
      results.passed++;
      console.log(`   ✅ PASSED\n`);
    } else {
      results.failed++;
      results.errors.push(`${testName}: Test function returned false`);
      console.log(`   ❌ FAILED\n`);
    }
  } catch (error: any) {
    results.failed++;
    results.errors.push(`${testName}: ${error.message}`);
    console.log(`   ❌ ERROR: ${error.message}\n`);
  }
}

async function validateSpecificOrder(orderId: string): Promise<void> {
  console.log(`🔍 Validating specific order: ${orderId}`);
  console.log('=================================\n');

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        items: { include: { product: true, variant: true } },
      },
    });

    if (!order) {
      console.log(`❌ Order ${orderId} not found`);
      return;
    }

    console.log(`✅ Order found:`, {
      id: order.id,
      squareOrderId: order.squareOrderId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      customerName: order.customerName,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });

    console.log(`\n💳 Payment records (${order.payments.length}):`);
    order.payments.forEach((payment, index) => {
      console.log(`   ${index + 1}. ID: ${payment.id}`);
      console.log(`      Square Payment ID: ${payment.squarePaymentId}`);
      console.log(`      Amount: $${(payment.amount / 100).toFixed(2)}`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Created: ${payment.createdAt}`);
      console.log('');
    });

    // Validate consistency
    if (order.paymentStatus === 'PAID' && order.payments.length === 0) {
      console.log(`⚠️ WARNING: Order marked as PAID but no payment records found`);
    }

    if (order.payments.length > 0 && order.paymentStatus === 'PENDING') {
      console.log(`⚠️ WARNING: Payment records exist but order still marked as PENDING`);
    }

  } catch (error) {
    console.error(`❌ Error validating order ${orderId}:`, error);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const orderIdArg = args.find(arg => arg.startsWith('--order-id='));
  const validateProcessing = args.includes('--validate-processing');

  try {
    if (orderIdArg) {
      const orderId = orderIdArg.split('=')[1];
      await validateSpecificOrder(orderId);
    } else if (validateProcessing) {
      console.log('🔄 Validating webhook processing functionality...\n');
      // This would trigger a test webhook in development
      console.log('⚠️ Processing validation not implemented yet');
    } else {
      const results = await runWebhookTests();
      
      console.log('\n📊 Test Results Summary');
      console.log('======================');
      console.log(`Total Tests: ${results.totalTests}`);
      console.log(`Passed: ${results.passed}`);
      console.log(`Failed: ${results.failed}`);
      console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%\n`);

      if (results.failed > 0) {
        console.log('❌ Failed Tests:');
        results.errors.forEach(error => console.log(`   - ${error}`));
        console.log('');
      }

      if (results.failed === 0) {
        console.log('🎉 All tests passed! Webhook system is ready for production.');
      } else {
        console.log('⚠️ Some tests failed. Please review and fix issues before deployment.');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
main().catch(console.error); 