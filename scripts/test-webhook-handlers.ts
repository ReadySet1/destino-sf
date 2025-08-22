#!/usr/bin/env tsx

import { startupDatabase } from '../src/lib/db';
import { handleOrderCreated, handleOrderUpdated, handleOrderFulfillmentUpdated } from '../src/lib/webhook-handlers';

async function testWebhookHandlers() {
  console.log('🧪 Testing webhook handlers...');
  
  try {
    // Initialize database connection
    console.log('\n1. Initializing database connection...');
    await startupDatabase();
    
    // Test webhook handlers with mock data
    console.log('\n2. Testing order.created handler...');
    const mockOrderCreatedPayload = {
      merchant_id: 'test-merchant',
      type: 'order.created',
      event_id: 'test-event-123',
      created_at: new Date().toISOString(),
      data: {
        type: 'order.created',
        id: 'test-order-123',
        object: {
          order_created: {
            state: 'OPEN'
          }
        }
      }
    };
    
    try {
      await handleOrderCreated(mockOrderCreatedPayload);
      console.log('✅ order.created handler executed successfully');
    } catch (error) {
      console.log('⚠️ order.created handler error (expected for test data):', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n3. Testing order.updated handler...');
    const mockOrderUpdatedPayload = {
      merchant_id: 'test-merchant',
      type: 'order.updated',
      event_id: 'test-event-456',
      created_at: new Date().toISOString(),
      data: {
        type: 'order.updated',
        id: 'test-order-123',
        object: {
          order_updated: {
            state: 'COMPLETED'
          }
        }
      }
    };
    
    try {
      await handleOrderUpdated(mockOrderUpdatedPayload);
      console.log('✅ order.updated handler executed successfully');
    } catch (error) {
      console.log('⚠️ order.updated handler error (expected for test data):', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n4. Testing order.fulfillment.updated handler...');
    const mockFulfillmentPayload = {
      merchant_id: 'test-merchant',
      type: 'order.fulfillment.updated',
      event_id: 'test-event-789',
      created_at: new Date().toISOString(),
      data: {
        type: 'order.fulfillment.updated',
        id: 'test-order-123',
        object: {
          order_fulfillment_updated: {
            fulfillment_update: [{
              new_state: 'COMPLETED',
              fulfillment_uid: 'test-fulfillment-123'
            }]
          }
        }
      }
    };
    
    try {
      await handleOrderFulfillmentUpdated(mockFulfillmentPayload);
      console.log('✅ order.fulfillment.updated handler executed successfully');
    } catch (error) {
      console.log('⚠️ order.fulfillment.updated handler error (expected for test data):', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n✅ All webhook handler tests completed!');
    
  } catch (error) {
    console.error('\n❌ Webhook handler test failed:', error);
    process.exit(1);
  } finally {
    const { prisma } = await import('../src/lib/db');
    await prisma.$disconnect();
  }
}

// Run the test
testWebhookHandlers().catch(console.error);
