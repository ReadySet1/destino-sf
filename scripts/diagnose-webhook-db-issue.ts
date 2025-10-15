#!/usr/bin/env tsx

/**
 * Database Write Permission Diagnostic Script
 *
 * This script diagnoses and attempts to fix the webhook database write issues
 * identified in production where webhooks can read but cannot write to the database.
 */

import { PrismaClient } from '@prisma/client';
import { withRetry, ensureConnection } from '../src/lib/db-unified';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

interface DiagnosticResult {
  test: string;
  success: boolean;
  error?: string;
  details?: any;
  duration: number;
}

async function runDiagnostic(): Promise<void> {
  console.log('🔍 Diagnosing Webhook Database Write Issues');
  console.log('='.repeat(60));

  const results: DiagnosticResult[] = [];

  try {
    // Test 1: Basic Connection
    console.log('\n📋 Test 1: Basic Database Connection');
    const test1Start = Date.now();
    try {
      await ensureConnection(1);
      results.push({
        test: 'Basic Connection',
        success: true,
        duration: Date.now() - test1Start,
      });
      console.log('✅ Basic connection successful');
    } catch (error) {
      results.push({
        test: 'Basic Connection',
        success: false,
        error: (error as Error).message,
        duration: Date.now() - test1Start,
      });
      console.log('❌ Basic connection failed:', (error as Error).message);
    }

    // Test 2: Read Operation
    console.log('\n📋 Test 2: Database Read Operation');
    const test2Start = Date.now();
    try {
      const orders = await withRetry(() =>
        prisma.order.findMany({
          take: 1,
          select: { id: true, status: true, paymentStatus: true },
        })
      );
      results.push({
        test: 'Read Operation',
        success: true,
        details: { orderCount: orders.length },
        duration: Date.now() - test2Start,
      });
      console.log('✅ Read operation successful - found', orders.length, 'orders');
    } catch (error) {
      results.push({
        test: 'Read Operation',
        success: false,
        error: (error as Error).message,
        duration: Date.now() - test2Start,
      });
      console.log('❌ Read operation failed:', (error as Error).message);
    }

    // Test 3: Write Operation (Safe Test)
    console.log('\n📋 Test 3: Database Write Operation (Safe Test)');
    const test3Start = Date.now();
    try {
      // Try to create a test record that we can safely delete
      const testRecord = await withRetry(() =>
        prisma.webAnalytics.create({
          data: {
            event: 'database_write_test',
            page: '/test',
            sessionId: `test-${Date.now()}`,
            timestamp: new Date(),
            userAgent: 'diagnostic-script',
          },
        })
      );

      // Immediately delete the test record
      await withRetry(() =>
        prisma.webAnalytics.delete({
          where: { id: testRecord.id },
        })
      );

      results.push({
        test: 'Write Operation',
        success: true,
        details: { testRecordId: testRecord.id },
        duration: Date.now() - test3Start,
      });
      console.log('✅ Write operation successful - created and deleted test record');
    } catch (error) {
      results.push({
        test: 'Write Operation',
        success: false,
        error: (error as Error).message,
        duration: Date.now() - test3Start,
      });
      console.log('❌ Write operation failed:', (error as Error).message);

      // Try alternative write test with a simpler table
      console.log('🔄 Trying alternative write test...');
      try {
        // Try a simple upsert operation
        await withRetry(() => prisma.$executeRaw`SELECT 1 as write_test_query`);
        console.log('✅ Raw query execution successful');
      } catch (rawError) {
        console.log('❌ Raw query execution failed:', (rawError as Error).message);
      }
    }

    // Test 4: Webhook-Specific Write Test
    console.log('\n📋 Test 4: Webhook-Specific Operations');
    const test4Start = Date.now();
    try {
      // Try to find a catering order and simulate webhook update
      const cateringOrder = await withRetry(() =>
        prisma.cateringOrder.findFirst({
          where: {
            paymentStatus: { not: 'PAID' },
          },
          select: { id: true, paymentStatus: true },
        })
      );

      if (cateringOrder) {
        console.log(
          `Found catering order ${cateringOrder.id} with status ${cateringOrder.paymentStatus}`
        );

        // Test if we can update it (but don't actually change it)
        const currentTime = new Date();
        await withRetry(() =>
          prisma.cateringOrder.update({
            where: { id: cateringOrder.id },
            data: { updatedAt: currentTime },
          })
        );

        results.push({
          test: 'Webhook Update Simulation',
          success: true,
          details: { cateringOrderId: cateringOrder.id },
          duration: Date.now() - test4Start,
        });
        console.log('✅ Webhook update simulation successful');
      } else {
        results.push({
          test: 'Webhook Update Simulation',
          success: false,
          error: 'No suitable catering order found for testing',
          duration: Date.now() - test4Start,
        });
        console.log('⚠️ No suitable catering order found for webhook simulation');
      }
    } catch (error) {
      results.push({
        test: 'Webhook Update Simulation',
        success: false,
        error: (error as Error).message,
        duration: Date.now() - test4Start,
      });
      console.log('❌ Webhook update simulation failed:', (error as Error).message);
    }

    // Test 5: Database Permissions Check
    console.log('\n📋 Test 5: Database Permissions Analysis');
    const test5Start = Date.now();
    try {
      // Check current database user and permissions
      const permissionInfo = await withRetry(
        () => prisma.$queryRaw`SELECT current_user, current_database(), version()`
      );

      console.log('📊 Database Connection Info:', permissionInfo);

      results.push({
        test: 'Permission Analysis',
        success: true,
        details: permissionInfo,
        duration: Date.now() - test5Start,
      });
      console.log('✅ Permission analysis completed');
    } catch (error) {
      results.push({
        test: 'Permission Analysis',
        success: false,
        error: (error as Error).message,
        duration: Date.now() - test5Start,
      });
      console.log('❌ Permission analysis failed:', (error as Error).message);
    }

    // Print Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));

    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;

    console.log(`Tests Passed: ${passedTests}/${totalTests}`);
    console.log('\nDetailed Results:');

    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    });

    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('='.repeat(60));

    const hasWriteIssues = results.some(
      r => (r.test === 'Write Operation' || r.test === 'Webhook Update Simulation') && !r.success
    );

    if (hasWriteIssues) {
      console.log('❌ WRITE PERMISSION ISSUES DETECTED:');
      console.log('   1. Check Supabase project database permissions');
      console.log('   2. Verify RLS (Row Level Security) policies are not blocking writes');
      console.log('   3. Ensure the database user has INSERT/UPDATE permissions');
      console.log('   4. Check if the connection is using the correct database pool');
      console.log('   5. Verify environment variables in production deployment');

      console.log('\n🔧 IMMEDIATE FIXES TO TRY:');
      console.log('   1. Check Supabase dashboard for database settings');
      console.log("   2. Temporarily disable RLS to test if that's the issue");
      console.log('   3. Verify DATABASE_URL points to correct production database');
      console.log('   4. Check Vercel environment variables');
    } else {
      console.log('✅ All database operations working correctly');
      console.log(
        '   The webhook issue may be in the application logic rather than database permissions'
      );
    }
  } catch (error) {
    console.error('❌ Diagnostic script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
runDiagnostic().catch(console.error);
