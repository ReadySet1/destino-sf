#!/usr/bin/env tsx

/**
 * Test script to validate performance improvements
 * Run this script to measure the impact of the optimizations
 */

import { prisma } from '@/lib/db-connection';
import { logger } from '@/utils/logger';

interface PerformanceTest {
  name: string;
  test: () => Promise<any>;
  expectedImprovement: string;
}

async function measurePerformance<T>(
  testName: string,
  testFn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await testFn();
  const duration = Date.now() - startTime;
  
  logger.info(`⏱️  ${testName}: ${duration}ms`);
  return { result, duration };
}

async function testDatabaseIndexes() {
  logger.info('🔍 Testing database index performance...');
  
  // Test 1: Query by active status (should use new index)
  const indexTest1 = await measurePerformance(
    'Query products by active status (indexed)',
    () => prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true },
      take: 100
    })
  );
  
  // Test 2: Query by squareId and active (should use composite index)
  const indexTest2 = await measurePerformance(
    'Query products by squareId and active (composite index)',
    () => prisma.product.findMany({
      where: { 
        squareId: { not: '' },
        active: true 
      },
      select: { id: true, name: true },
      take: 100
    })
  );
  
  // Test 3: Query by creation date (should use new index)
  const indexTest3 = await measurePerformance(
    'Query products by creation date (indexed)',
    () => prisma.product.findMany({
      where: { 
        createdAt: { 
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: { id: true, name: true },
      take: 100
    })
  );
  
  return {
    activeStatusQuery: indexTest1.duration,
    compositeQuery: indexTest2.duration,
    dateQuery: indexTest3.duration
  };
}

async function testConnectionStability() {
  logger.info('🔌 Testing database connection stability...');
  
  const connectionTests = [];
  
  // Test multiple rapid connections
  for (let i = 0; i < 5; i++) {
    const test = await measurePerformance(
      `Connection test ${i + 1}`,
      async () => {
        await prisma.$queryRaw`SELECT 1 as test`;
        return 'success';
      }
    );
    connectionTests.push(test.duration);
  }
  
  // Test connection health
  const healthCheck = await measurePerformance(
    'Connection health check',
    () => prisma.$queryRaw`SELECT version()`
  );
  
  return {
    connectionTests,
    healthCheck: healthCheck.duration,
    averageConnectionTime: connectionTests.reduce((a, b) => a + b, 0) / connectionTests.length
  };
}

async function testBulkOperations() {
  logger.info('📦 Testing bulk operation performance...');
  
  // Get some test products
  const testProducts = await prisma.product.findMany({
    where: { active: true },
    select: { id: true },
    take: 50
  });
  
  if (testProducts.length === 0) {
    logger.warn('No test products found, skipping bulk operation test');
    return { bulkUpdate: 0 };
  }
  
  const productIds = testProducts.map(p => p.id);
  
  // Test bulk update operation
  const bulkTest = await measurePerformance(
    'Bulk update operation (50 products)',
    async () => {
      // Create a temporary field for testing
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { updatedAt: new Date() }
      });
      return 'success';
    }
  );
  
  return {
    bulkUpdate: bulkTest.duration,
    productsProcessed: productIds.length
  };
}

async function runPerformanceTests() {
  logger.info('🚀 Starting performance validation tests...');
  logger.info('==========================================');
  
  try {
    // Test 1: Database indexes
    const indexResults = await testDatabaseIndexes();
    logger.info('📊 Index Performance Results:', indexResults);
    
    // Test 2: Connection stability
    const connectionResults = await testConnectionStability();
    logger.info('📊 Connection Stability Results:', connectionResults);
    
    // Test 3: Bulk operations
    const bulkResults = await testBulkOperations();
    logger.info('📊 Bulk Operation Results:', bulkResults);
    
    // Summary
    logger.info('==========================================');
    logger.info('📈 Performance Test Summary:');
    logger.info(`   • Active status queries: ${indexResults.activeStatusQuery}ms`);
    logger.info(`   • Composite index queries: ${indexResults.compositeQuery}ms`);
    logger.info(`   • Date-based queries: ${indexResults.dateQuery}ms`);
    logger.info(`   • Average connection time: ${connectionResults.averageConnectionTime.toFixed(2)}ms`);
    logger.info(`   • Bulk update (50 products): ${bulkResults.bulkUpdate}ms`);
    
    // Performance recommendations
    logger.info('💡 Performance Recommendations:');
    if (indexResults.activeStatusQuery < 100) {
      logger.info('   ✅ Active status queries are performing well');
    } else {
      logger.info('   ⚠️  Active status queries could be optimized');
    }
    
    if (connectionResults.averageConnectionTime < 50) {
      logger.info('   ✅ Database connections are stable and fast');
    } else {
      logger.info('   ⚠️  Database connections may need optimization');
    }
    
    if (bulkResults.bulkUpdate < 200) {
      logger.info('   ✅ Bulk operations are performing well');
    } else {
      logger.info('   ⚠️  Bulk operations could be optimized');
    }
    
  } catch (error) {
    logger.error('❌ Performance test failed:', error);
  } finally {
    await prisma.$disconnect();
    logger.info('✅ Performance tests completed');
  }
}

// Run the tests if this script is executed directly
if (import.meta.main) {
  runPerformanceTests().catch(console.error);
}

export { runPerformanceTests };
