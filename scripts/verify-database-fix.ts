#!/usr/bin/env tsx

/**
 * Database Connection Fix Verification Script
 * 
 * This script verifies that the database connection fixes are working properly
 * and provides recommendations for monitoring and maintenance.
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

// Load environment variables
config({ path: '.env.local' });

interface ConnectionTest {
  name: string;
  test: () => Promise<{ success: boolean; latency: number; error?: string }>;
}

async function main() {
  console.log('🔍 Database Connection Fix Verification');
  console.log('=====================================\n');
  
  // Environment checks
  console.log('📋 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   VERCEL: ${process.env.VERCEL || 'not set'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);
  
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`   Database Host: ${url.hostname}`);
      console.log(`   Supabase Pooler: ${url.hostname.includes('pooler.supabase.com') ? 'YES' : 'NO'}`);
      console.log(`   pgbouncer: ${url.searchParams.get('pgbouncer') || 'not set'}`);
      console.log(`   pool_timeout: ${url.searchParams.get('pool_timeout') || 'not set'}`);
      console.log(`   statement_timeout: ${url.searchParams.get('statement_timeout') || 'not set'}`);
    } catch (error) {
      console.log('   ⚠️ Invalid DATABASE_URL format');
    }
  }
  
  console.log('\n🧪 Running Connection Tests:');
  console.log('============================\n');
  
  // Dynamic import to avoid module resolution issues
  let dbUnified: any;
  try {
    dbUnified = await import('../src/lib/db-unified.ts');
    console.log('✅ Successfully imported unified database client');
  } catch (error) {
    console.error('❌ Failed to import unified database client:', (error as Error).message);
    process.exit(1);
  }
  
  const tests: ConnectionTest[] = [
    {
      name: 'Basic Connection Check',
      test: async () => {
        const start = performance.now();
        try {
          const connected = await dbUnified.checkConnection();
          return { 
            success: connected, 
            latency: performance.now() - start,
            error: connected ? undefined : 'Connection check returned false'
          };
        } catch (error) {
          return { 
            success: false, 
            latency: performance.now() - start, 
            error: (error as Error).message 
          };
        }
      }
    },
    {
      name: 'Ensured Connection with Retry',
      test: async () => {
        const start = performance.now();
        try {
          await dbUnified.ensureConnection(2);
          return { success: true, latency: performance.now() - start };
        } catch (error) {
          return { 
            success: false, 
            latency: performance.now() - start, 
            error: (error as Error).message 
          };
        }
      }
    },
    {
      name: 'Webhook Retry Operation',
      test: async () => {
        const start = performance.now();
        try {
          await dbUnified.withWebhookRetry(
            () => dbUnified.prisma.$queryRaw`SELECT 1 as webhook_test`,
            'test-webhook-operation',
            10000
          );
          return { success: true, latency: performance.now() - start };
        } catch (error) {
          return { 
            success: false, 
            latency: performance.now() - start, 
            error: (error as Error).message 
          };
        }
      }
    },
    {
      name: 'Transaction with Retry',
      test: async () => {
        const start = performance.now();
        try {
          await dbUnified.withTransaction(async (tx: any) => {
            return await tx.$queryRaw`SELECT 1 as transaction_test`;
          });
          return { success: true, latency: performance.now() - start };
        } catch (error) {
          return { 
            success: false, 
            latency: performance.now() - start, 
            error: (error as Error).message 
          };
        }
      }
    },
    {
      name: 'Concurrent Connection Test',
      test: async () => {
        const start = performance.now();
        try {
          // Test 10 concurrent connections
          const promises = Array.from({ length: 10 }, () => 
            dbUnified.withRetry(() => 
              dbUnified.prisma.$queryRaw`SELECT 1 as concurrent_test`,
              2,
              'concurrent-test'
            )
          );
          
          await Promise.all(promises);
          return { success: true, latency: performance.now() - start };
        } catch (error) {
          return { 
            success: false, 
            latency: performance.now() - start, 
            error: (error as Error).message 
          };
        }
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    process.stdout.write(`   ${test.name}... `);
    
    try {
      const result = await test.test();
      
      if (result.success) {
        console.log(`✅ PASS (${Math.round(result.latency)}ms)`);
      } else {
        console.log(`❌ FAIL (${Math.round(result.latency)}ms): ${result.error}`);
      }
      
      results.push({ name: test.name, ...result });
    } catch (error) {
      console.log(`💥 ERROR: ${(error as Error).message}`);
      results.push({ 
        name: test.name, 
        success: false, 
        latency: 0, 
        error: (error as Error).message 
      });
    }
  }
  
  // Get health status
  console.log('\n🏥 Health Status:');
  console.log('=================\n');
  
  try {
    const healthStatus = await dbUnified.getHealthStatus();
    console.log(`   Status: ${healthStatus.connected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`   Latency: ${Math.round(healthStatus.latency)}ms`);
    console.log(`   Version: ${healthStatus.version}`);
    
    if (healthStatus.error) {
      console.log(`   Error: ${healthStatus.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to get health status: ${(error as Error).message}`);
  }
  
  // Summary and recommendations
  console.log('\n📊 Test Summary:');
  console.log('================\n');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const averageLatency = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.latency, 0) / passed || 0;
  
  console.log(`   Tests Passed: ${passed}/${total}`);
  console.log(`   Average Latency: ${Math.round(averageLatency)}ms`);
  
  if (passed === total) {
    console.log('   Overall Status: ✅ ALL TESTS PASSED');
  } else if (passed > total / 2) {
    console.log('   Overall Status: ⚠️ SOME TESTS FAILED');
  } else {
    console.log('   Overall Status: ❌ MAJORITY TESTS FAILED');
  }
  
  console.log('\n💡 Recommendations:');
  console.log('===================\n');
  
  if (passed === total) {
    console.log('   ✅ Database connection fixes are working properly');
    console.log('   ✅ All connection patterns are functioning correctly');
    console.log('   ✅ Retry mechanisms are operational');
  } else {
    console.log('   ⚠️ Some database connection issues remain');
    
    const failedTests = results.filter(r => !r.success);
    failedTests.forEach(test => {
      console.log(`   ❌ ${test.name}: ${test.error}`);
    });
  }
  
  if (averageLatency > 2000) {
    console.log('   ⚠️ High latency detected - consider connection pool optimization');
  } else if (averageLatency > 1000) {
    console.log('   ⚠️ Elevated latency - monitor database performance');
  } else {
    console.log('   ✅ Connection latency is within acceptable range');
  }
  
  console.log('\n🔧 Monitoring Setup:');
  console.log('=====================\n');
  
  console.log('   1. Health Check Endpoint: /api/health/database');
  console.log('   2. Monitor webhook processing logs for connection errors');
  console.log('   3. Watch for "Socket timeout" and "Connection pool timeout" errors');
  console.log('   4. Track connection retry patterns in production logs');
  
  console.log('\n🚀 Production Deployment:');
  console.log('==========================\n');
  
  console.log('   1. Deploy the unified database client changes');
  console.log('   2. Monitor the health check endpoint');
  console.log('   3. Watch webhook processing for improved reliability');
  console.log('   4. Verify connection pool timeout issues are resolved');
  
  // Cleanup
  try {
    await dbUnified.shutdown();
    console.log('\n✅ Database connections closed successfully');
  } catch (error) {
    console.log(`\n⚠️ Cleanup warning: ${(error as Error).message}`);
  }
  
  console.log('\n🎉 Database connection fix verification complete!');
  
  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run the script
main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
