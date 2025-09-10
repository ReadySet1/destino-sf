#!/usr/bin/env tsx

import { webhookPrisma, ensureWebhookConnection, disconnectWebhook } from '../src/lib/db/webhook-connection';
import { withWebhookRetry } from '../src/lib/db/webhook-retry';

async function testConnection() {
  console.log('🔍 Testing webhook database connection...');
  
  try {
    // Test 1: Basic connection
    await ensureWebhookConnection();
    console.log('✅ Basic connection successful');
    
    // Test 2: Simple query
    const result = await webhookPrisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Query successful:', result);
    
    // Test 3: Retry logic
    let attemptCount = 0;
    await withWebhookRetry(
      async () => {
        attemptCount++;
        if (attemptCount < 3) {
          // Use a retryable error message that matches our retry patterns
          const error = new Error('Engine is not yet connected');
          (error as any).code = 'P1001'; // Simulate database connection error
          throw error;
        }
        return 'Success';
      },
      'test-retry',
      { maxAttempts: 5 }
    );
    console.log('✅ Retry logic working (succeeded on attempt', attemptCount, ')');
    
    // Test 4: WebhookQueue table access
    const queueCount = await webhookPrisma.webhookQueue.count();
    console.log('✅ WebhookQueue table accessible, current count:', queueCount);
    
    // Test 5: Transaction test
    await webhookPrisma.$transaction(async (tx) => {
      const count = await tx.webhookQueue.count();
      console.log('✅ Transaction successful, queue count:', count);
    });
    
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await disconnectWebhook();
  }
}

// Direct execution - simplified approach
testConnection();

export { testConnection };
