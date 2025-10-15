#!/usr/bin/env tsx

/**
 * Test script to verify database connection fixes
 */

// Load environment first
import { loadEnvironment } from './load-env';
loadEnvironment();

import { simplePrisma, testSimpleConnection, disconnectSimple } from '../src/lib/db-simple';
import { prisma, getHealthStatus, checkConnection } from '../src/lib/db-unified';
import { diagnoseDatabaseIssues } from '../src/lib/db-connection-resolver';

async function testDatabaseFixes() {
  console.log('🧪 Testing Database Connection Fixes');
  console.log('=====================================');

  let success = true;

  try {
    // Test 0: Diagnose connection issues
    console.log('\n0. Diagnosing connection setup...');
    await diagnoseDatabaseIssues();

    // Test 1: Simple connection
    console.log('\n1. Testing simple connection...');
    const simpleResult = await testSimpleConnection();
    if (!simpleResult) {
      success = false;
    }

    // Test 2: Unified client health
    console.log('\n2. Testing unified client health...');
    const health = await getHealthStatus();
    console.log('Health status:', health);
    if (!health.connected) {
      success = false;
      console.error('❌ Unified client not connected');
    } else {
      console.log(`✅ Unified client connected (${health.latency}ms)`);
    }

    // Test 3: Basic connection check
    console.log('\n3. Testing basic connection check...');
    const connectionOk = await checkConnection();
    if (!connectionOk) {
      success = false;
      console.error('❌ Connection check failed');
    } else {
      console.log('✅ Connection check passed');
    }

    // Test 4: Profile operations (the one that was failing)
    console.log('\n4. Testing profile operations...');
    try {
      const profileCount = await prisma.profile.count();
      console.log(`✅ Profile count: ${profileCount}`);
    } catch (error) {
      success = false;
      console.error('❌ Profile operation failed:', (error as Error).message);
    }

    // Test 5: Complex query operations
    console.log('\n5. Testing complex query operations...');
    try {
      const categories = await prisma.category.findMany({
        take: 3,
        include: {
          products: {
            take: 1,
          },
        },
      });
      console.log(`✅ Found ${categories.length} categories with products`);
    } catch (error) {
      success = false;
      console.error('❌ Complex query failed:', (error as Error).message);
    }

    // Test 6: Raw query
    console.log('\n6. Testing raw queries...');
    try {
      const result = await prisma.$queryRaw<
        Array<{ version: string }>
      >`SELECT version() as version`;
      console.log(`✅ Database version: ${result[0]?.version?.substring(0, 50)}...`);
    } catch (error) {
      success = false;
      console.error('❌ Raw query failed:', (error as Error).message);
    }

    // Test 7: Multiple concurrent operations
    console.log('\n7. Testing concurrent operations...');
    try {
      const [categoryCount, productCount, orderCount] = await Promise.all([
        prisma.category.count(),
        prisma.product.count(),
        prisma.order.count(),
      ]);
      console.log(
        `✅ Counts - Categories: ${categoryCount}, Products: ${productCount}, Orders: ${orderCount}`
      );
    } catch (error) {
      success = false;
      console.error('❌ Concurrent operations failed:', (error as Error).message);
    }
  } catch (error) {
    success = false;
    console.error('❌ Test suite failed:', (error as Error).message);
  } finally {
    // Cleanup
    console.log('\n8. Cleaning up...');
    try {
      await disconnectSimple();
      await prisma.$disconnect();
      console.log('✅ Disconnected all clients');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', (error as Error).message);
    }
  }

  console.log('\n=====================================');
  if (success) {
    console.log('🎉 All database tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some database tests failed!');
    process.exit(1);
  }
}

// Run if this is the main module
testDatabaseFixes().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
