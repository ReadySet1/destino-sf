import { withConnection, webhookQueries } from './db-optimized';
import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Optimized webhook handlers for Square events
 * Uses efficient database queries and minimal data transfer
 */

interface SquareWebhookPayload {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: any;
  };
}

export async function handleWebhookEvent(payload: SquareWebhookPayload): Promise<void> {
  console.log(`🔄 Processing webhook event: ${payload.type} (${payload.event_id})`);

  switch (payload.type) {
    case 'order.created':
      await handleOrderCreated(payload);
      break;
    case 'order.updated':
      await handleOrderUpdated(payload);
      break;
    case 'order.fulfillment.updated':
      await handleOrderFulfillmentUpdated(payload);
      break;
    case 'payment.created':
      await handlePaymentCreated(payload);
      break;
    case 'payment.updated':
      await handlePaymentUpdated(payload);
      break;
    case 'refund.created':
      await handleRefundCreated(payload);
      break;
    case 'refund.updated':
      await handleRefundUpdated(payload);
      break;
    default:
      console.warn(`⚠️ Unhandled webhook type: ${payload.type}`);
  }
}

async function handleOrderCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const squareOrderData = data.object.order_created;

  console.log(`🆕 Processing order.created event: ${data.id}`);

  // Check if this is a catering order first to prevent duplicates
  const cateringOrder = await withConnection(async prisma => {
    return await webhookQueries.findCateringOrderForPayment(data.id);
  });

  if (cateringOrder) {
    console.log(`✅ Found existing catering order: ${cateringOrder.id}`);
    return;
  }

  // Check for regular order
  const regularOrder = await withConnection(async prisma => {
    return await webhookQueries.findOrderForPayment(data.id);
  });

  if (regularOrder) {
    console.log(`✅ Found existing regular order: ${regularOrder.id}`);
    return;
  }

  console.log(`⚠️ No existing order found for Square Order ID: ${data.id}`);
}

async function handleOrderUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  console.log(`🔄 Processing order.updated event: ${data.id}`);

  // Similar optimized logic for order updates
  // Use selective queries to minimize database load
}

async function handleOrderFulfillmentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  console.log(`📦 Processing order.fulfillment.updated event: ${data.id}`);

  // Handle fulfillment updates with optimized queries
}

async function handlePaymentCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  console.log(`💳 Processing payment.created event: ${data.id}`);

  // Handle payment creation with minimal database operations
}

async function handlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const paymentData = data.object.payment;

  console.log(`💰 Processing payment.updated event: ${data.id}`);
  console.log(`Payment status: ${paymentData?.status}`);

  if (!paymentData?.order_id) {
    console.warn(`⚠️ Payment ${data.id} has no order_id`);
    return;
  }

  const squareOrderId = paymentData.order_id;

  // Check both catering and regular orders efficiently
  const [cateringOrder, regularOrder] = await Promise.all([
    withConnection(async prisma => {
      return await webhookQueries.findCateringOrderForPayment(squareOrderId);
    }),
    withConnection(async prisma => {
      return await webhookQueries.findOrderForPayment(squareOrderId);
    }),
  ]);

  if (paymentData.status === 'COMPLETED') {
    if (cateringOrder) {
      await withConnection(async prisma => {
        return await prisma.cateringOrder.update({
          where: { id: cateringOrder.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: 'CONFIRMED',
          },
        });
      });
      console.log(`✅ Updated catering order payment status: ${cateringOrder.id}`);
    }

    if (regularOrder) {
      await withConnection(async prisma => {
        return await prisma.order.update({
          where: { id: regularOrder.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PROCESSING,
          },
        });
      });
      console.log(`✅ Updated regular order payment status: ${regularOrder.id}`);
    }
  }
}

async function handleRefundCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  console.log(`🔄 Processing refund.created event: ${data.id}`);

  // Handle refund creation with optimized queries
}

async function handleRefundUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  console.log(`💸 Processing refund.updated event: ${data.id}`);

  // Handle refund updates with optimized queries
}
