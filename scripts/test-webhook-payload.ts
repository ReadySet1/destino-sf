#!/usr/bin/env tsx

// Test script to debug the exact webhook payload that's failing
const webhookPayload = {
  merchant_id: 'MLJD4JJXS3YSP',
  type: 'payment.updated',
  event_id: 'b1909a1d-a062-3202-a0f0-20500a046c3b',
  created_at: '2025-07-29T18:46:46.28Z',
  data: {
    type: 'payment',
    id: 'RQyVDYvsGlUC4RbOhUbBnTUQItaZY',
    object: {
      payment: {
        amount_money: {
          amount: 5826,
          currency: 'USD',
        },
        application_details: {
          application_id: 'sandbox-sq0idb-lky4CaPAWmDnHY3YtYxINg',
          square_product: 'ECOMMERCE_API',
        },
        capabilities: [
          'EDIT_AMOUNT_UP',
          'EDIT_AMOUNT_DOWN',
          'EDIT_TIP_AMOUNT_UP',
          'EDIT_TIP_AMOUNT_DOWN',
        ],
        created_at: '2025-07-29T18:46:44.271Z',
        external_details: {
          source: 'Developer Control Panel',
          type: 'CARD',
        },
        id: 'RQyVDYvsGlUC4RbOhUbBnTUQItaZY',
        location_id: 'LMV06M1ER6HCC',
        order_id: '9FhNm5NYhy6yi5jmU1z3tnzVHb4F',
        receipt_number: 'RQyV',
        receipt_url: 'https://squareupsandbox.com/receipt/preview/RQyVDYvsGlUC4RbOhUbBnTUQItaZY',
        source_type: 'EXTERNAL',
        status: 'COMPLETED',
        total_money: {
          amount: 5826,
          currency: 'USD',
        },
        updated_at: '2025-07-29T18:46:44.382Z',
        version: 1,
      },
    },
  },
};

type SquareWebhookPayload = {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, unknown>;
  };
};

function debugWebhookPayload() {
  console.log('🔍 Testing webhook payload structure...');
  console.log('===================================');

  try {
    const payload = webhookPayload as SquareWebhookPayload;
    console.log('✅ Payload type:', payload.type);
    console.log('✅ Event ID:', payload.event_id);
    console.log('✅ Data type:', payload.data.type);
    console.log('✅ Data ID:', payload.data.id);

    // Simulate the exact data extraction from handlePaymentUpdated
    console.log('\n🔍 Simulating handlePaymentUpdated data extraction...');

    const { data } = payload;
    console.log('✅ data extracted:', !!data);

    const paymentData = data.object.payment as any;
    console.log('✅ paymentData extracted:', !!paymentData);
    console.log('📋 paymentData keys:', Object.keys(paymentData || {}));

    const squarePaymentId = data.id;
    console.log('✅ squarePaymentId:', squarePaymentId);

    const squareOrderId = paymentData?.order_id;
    console.log('✅ squareOrderId:', squareOrderId);

    const paymentStatus = paymentData?.status?.toUpperCase();
    console.log('✅ paymentStatus:', paymentStatus);

    // This is the exact log that should appear but doesn't in the webhook logs
    console.log('\n📋 Payment data that should be logged:', {
      squarePaymentId,
      squareOrderId,
      paymentStatus,
      amount: paymentData?.amount_money?.amount,
      currency: paymentData?.amount_money?.currency,
      eventId: payload.event_id,
    });

    // Test the early validation that might be failing
    console.log('\n🔍 Testing early validations...');

    if (!squareOrderId) {
      console.error('❌ CRITICAL: No order_id found in payment.updated payload');
      return;
    } else {
      console.log('✅ squareOrderId validation passed');
    }

    console.log('\n✅ All data extractions successful - webhook should work!');
    console.log('🤔 The issue might be in database queries or later processing...');
  } catch (error: any) {
    console.error('❌ Error in payload processing:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Test different payload variations
function testPayloadVariations() {
  console.log('\n🔍 Testing payload variations...');
  console.log('===============================');

  // Test if the issue is with nested object access
  console.log('\n1. Testing direct object access...');
  try {
    const testPayload = webhookPayload;
    console.log('Direct access to data.object.payment:', !!testPayload.data.object.payment);
    console.log('Payment object keys:', Object.keys(testPayload.data.object.payment as any));
  } catch (error) {
    console.error('❌ Error in direct access:', error);
  }

  // Test different type casting approaches
  console.log('\n2. Testing type casting approaches...');
  try {
    const data = webhookPayload.data;
    const payment1 = (data.object as any).payment;
    const payment2 = data.object.payment;
    const payment3 = data.object['payment'];

    console.log('Type cast 1 (as any):', !!payment1);
    console.log('Type cast 2 (direct):', !!payment2);
    console.log('Type cast 3 (bracket):', !!payment3);
  } catch (error) {
    console.error('❌ Error in type casting:', error);
  }
}

// Run the tests
debugWebhookPayload();
testPayloadVariations();

export { debugWebhookPayload };
