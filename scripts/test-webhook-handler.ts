#!/usr/bin/env tsx

// Test script to directly call the handlePaymentUpdated function
// This will help us debug why the webhook processing fails

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

// Since we can't directly import the handlePaymentUpdated function (it's not exported),
// let's create a simplified version to test the core logic
import { prisma } from '../src/lib/db';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

async function testHandlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
  console.log(`🧪 Testing handlePaymentUpdated with enhanced debugging...`);
  console.log(`🚀 DEBUG: Starting handlePaymentUpdated function...`);

  try {
    const { data } = payload;
    console.log(`✅ DEBUG: Extracted data from payload`);

    const paymentData = data.object.payment as any;
    console.log(`✅ DEBUG: Extracted paymentData, keys:`, Object.keys(paymentData || {}));

    const squarePaymentId = data.id;
    console.log(`✅ DEBUG: squarePaymentId: ${squarePaymentId}`);

    const squareOrderId = paymentData?.order_id;
    console.log(`✅ DEBUG: squareOrderId: ${squareOrderId}`);

    const paymentStatus = paymentData?.status?.toUpperCase();
    console.log(`✅ DEBUG: paymentStatus: ${paymentStatus}`);

    console.log(`🔄 Processing payment.updated event: ${squarePaymentId}`);

    try {
      console.log(`📋 Payment data:`, {
        squarePaymentId,
        squareOrderId,
        paymentStatus,
        amount: paymentData?.amount_money?.amount,
        currency: paymentData?.amount_money?.currency,
        eventId: payload.event_id,
      });
      console.log(`✅ DEBUG: Successfully logged payment data for ${squarePaymentId}`);
    } catch (logError: any) {
      console.error(`❌ DEBUG: Error logging payment data for ${squarePaymentId}:`, logError);
    }

    if (!squareOrderId) {
      console.error(
        `❌ CRITICAL: No order_id found in payment.updated payload for payment ${squarePaymentId}. Event ID: ${payload.event_id}. Payload:`,
        JSON.stringify(paymentData, null, 2)
      );
      return;
    }

    try {
      // First check for a catering order with this Square order ID
      console.log(
        `🔍 Checking for catering order with squareOrderId: ${squareOrderId} (Event: ${payload.event_id})`
      );

      const cateringOrder = await prisma.cateringOrder.findUnique({
        where: { squareOrderId },
        select: { id: true, paymentStatus: true, status: true },
      });

      if (cateringOrder) {
        console.log(`✅ Found catering order with squareOrderId ${squareOrderId}:`, cateringOrder);
        console.log(`🎯 Test completed - would process catering order here`);
        return;
      } else {
        console.log(`❌ No catering order found with squareOrderId: ${squareOrderId}`);
      }
    } catch (err) {
      console.error(
        `❌ Error checking catering order for ${squareOrderId} (Event: ${payload.event_id}):`,
        err
      );
      // Continue to regular order processing even if catering check fails
    }

    // If not a catering order, find our internal order using the Square Order ID
    console.log(
      `🔍 Checking for regular order with squareOrderId: ${squareOrderId} (Event: ${payload.event_id})`
    );

    const order = await prisma.order.findUnique({
      where: { squareOrderId: squareOrderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        fulfillmentType: true,
        shippingRateId: true,
      },
    });

    if (!order) {
      console.error(
        `❌ CRITICAL: Order with squareOrderId ${squareOrderId} not found for payment update (Event: ${payload.event_id})`
      );
      return;
    }

    console.log(`✅ Found regular order with squareOrderId ${squareOrderId}:`, order);

    // Map Square payment status
    function mapSquarePaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
      switch (status?.toUpperCase()) {
        case 'APPROVED':
        case 'COMPLETED':
        case 'CAPTURED':
          return 'PAID';
        case 'FAILED':
        case 'CANCELED':
          return 'FAILED';
        case 'REFUNDED':
          return 'REFUNDED';
        default:
          return 'PENDING';
      }
    }

    let updatedPaymentStatus = mapSquarePaymentStatus(paymentStatus);
    console.log(
      `📊 Payment status mapping: ${paymentStatus} → ${updatedPaymentStatus} (Event: ${payload.event_id})`
    );

    // Prevent downgrading status
    if (
      (order.paymentStatus === 'PAID' &&
        updatedPaymentStatus !== 'PAID' &&
        updatedPaymentStatus !== 'REFUNDED') ||
      (order.paymentStatus === 'REFUNDED' && updatedPaymentStatus !== 'REFUNDED') ||
      (order.paymentStatus === 'FAILED' && updatedPaymentStatus !== 'FAILED')
    ) {
      console.log(
        `🚫 Preventing payment status downgrade for order ${order.id}. Current: ${order.paymentStatus}, Proposed: ${updatedPaymentStatus} (Event: ${payload.event_id})`
      );
      updatedPaymentStatus = order.paymentStatus;
    }

    // Update order status only if payment is newly PAID
    const updatedOrderStatus =
      order.paymentStatus !== 'PAID' && updatedPaymentStatus === 'PAID'
        ? OrderStatus.PROCESSING
        : order.status;

    console.log(
      `📊 Order status update: ${order.status} → ${updatedOrderStatus} (Event: ${payload.event_id})`
    );
    console.log(
      `💾 Would update order ${order.id} with payment status: ${updatedPaymentStatus}, order status: ${updatedOrderStatus} (Event: ${payload.event_id})`
    );

    console.log(`🎯 Test completed successfully - all data processing worked!`);
  } catch (comprehensiveError: any) {
    console.error(`❌ COMPREHENSIVE ERROR in testHandlePaymentUpdated:`, {
      error: comprehensiveError.message,
      stack: comprehensiveError.stack?.substring(0, 500),
      eventId: payload?.event_id,
      paymentId: payload?.data?.id,
    });

    throw comprehensiveError;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testHandlePaymentUpdated(webhookPayload as SquareWebhookPayload).catch(console.error);

export { testHandlePaymentUpdated };
