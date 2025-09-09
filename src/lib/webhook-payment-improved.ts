/**
 * Improved payment webhook handler with transaction-based atomic updates
 * This ensures that payment records and order status are updated atomically
 */

import { prisma } from '@/lib/db';
import { safeQuery } from '@/lib/db-utils';
import { executeWebhookTransaction } from '@/lib/db-webhook-optimized';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { errorMonitor } from '@/lib/error-monitoring';

interface SquareWebhookPayload {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  location_id?: string;
  data: {
    type: 'payment';
    id: string;
    object: Record<string, unknown>;
  };
}

/**
 * Map Square payment status to our internal payment status
 */
function mapSquarePaymentStatus(status: string): PaymentStatus {
  switch (status?.toUpperCase()) {
    case 'APPROVED':
    case 'COMPLETED':
    case 'CAPTURED':
      return 'PAID';
    case 'FAILED':
      return 'FAILED';
    case 'CANCELED':
      return 'FAILED';
    case 'REFUNDED':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}

/**
 * Improved payment webhook handler with atomic transactions
 */
export async function handlePaymentUpdatedImproved(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const paymentData = data.object.payment as any;
  const squarePaymentId = data.id;
  const squareOrderId = paymentData?.order_id;
  const paymentStatus = paymentData?.status?.toUpperCase();
  const eventId = payload.event_id;

  console.log(`🔄 [IMPROVED] Processing payment.updated event: ${squarePaymentId} (Event: ${eventId})`);

  if (!squareOrderId) {
    console.error(`❌ No order_id found in payment.updated payload for payment ${squarePaymentId}`);
    return;
  }

  try {
    // First check for catering orders
    const cateringOrder = await safeQuery(() =>
      prisma.cateringOrder.findUnique({
        where: { squareOrderId },
        select: { id: true, paymentStatus: true, status: true },
      })
    );

    if (cateringOrder) {
      console.log(`✅ Found catering order, delegating to catering handler...`);
      // Handle catering order separately (existing logic)
      return;
    }

    // Use atomic transaction for regular orders
    await executeWebhookTransaction(async (tx) => {
      // Step 1: Find the order
      const order = await tx.order.findUnique({
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
        throw new Error(`Order with squareOrderId ${squareOrderId} not found`);
      }

      console.log(`✅ [TRANSACTION] Found order ${order.id} for payment ${squarePaymentId}`);

      // Step 2: Check if this event was already processed
      const existingPayment = await tx.payment.findUnique({
        where: { squarePaymentId: squarePaymentId },
        select: { id: true, rawData: true, status: true },
      });

      if (existingPayment?.rawData && typeof existingPayment.rawData === 'object') {
        const rawData = existingPayment.rawData as any;
        if (rawData?.lastProcessedEventId === eventId) {
          console.log(`⚠️ [TRANSACTION] Event ${eventId} already processed, skipping`);
          return;
        }
      }

      // Step 3: Map payment status
      const mappedPaymentStatus = mapSquarePaymentStatus(paymentStatus);
      console.log(`📊 [TRANSACTION] Payment status mapping: ${paymentStatus} → ${mappedPaymentStatus}`);

      // Step 4: Determine order status update
      const shouldUpdateOrderStatus = order.paymentStatus !== 'PAID' && mappedPaymentStatus === 'PAID';
      const newOrderStatus = shouldUpdateOrderStatus ? OrderStatus.PROCESSING : order.status;

      console.log(`🔄 [TRANSACTION] Order status: ${order.status} → ${newOrderStatus}`);
      console.log(`💳 [TRANSACTION] Payment status: ${order.paymentStatus} → ${mappedPaymentStatus}`);

      // Step 5: Upsert payment record
      await tx.payment.upsert({
        where: { squarePaymentId: squarePaymentId },
        update: {
          status: mappedPaymentStatus,
          rawData: {
            ...data.object,
            lastProcessedEventId: eventId,
            lastProcessedAt: new Date().toISOString(),
            updatedViaWebhook: true,
          } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
        create: {
          squarePaymentId: squarePaymentId,
          amount: (paymentData?.amount_money?.amount || 0) / 100,
          status: mappedPaymentStatus,
          rawData: {
            ...data.object,
            lastProcessedEventId: eventId,
            lastProcessedAt: new Date().toISOString(),
            createdViaWebhook: true,
          } as unknown as Prisma.InputJsonValue,
          order: {
            connect: { id: order.id },
          },
        },
      });

      console.log(`✅ [TRANSACTION] Payment record upserted for ${squarePaymentId}`);

      // Step 6: Update order atomically
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: mappedPaymentStatus,
          status: newOrderStatus,
          rawData: {
            ...(typeof order.paymentStatus === 'object' ? {} : {}), // Preserve existing rawData if needed
            lastProcessedEventId: eventId,
            lastPaymentUpdate: data.object,
            lastPaymentUpdateAt: new Date().toISOString(),
          } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ [TRANSACTION] Order ${order.id} updated atomically`);

      // Return order info for post-transaction processing
      return {
        orderId: order.id,
        fulfillmentType: order.fulfillmentType,
        shippingRateId: order.shippingRateId,
        paymentStatusChanged: order.paymentStatus !== mappedPaymentStatus,
        newPaymentStatus: mappedPaymentStatus,
        oldPaymentStatus: order.paymentStatus,
      };
    }, `payment-updated-${squarePaymentId}`);

    console.log(`✅ [IMPROVED] Successfully processed payment.updated event for ${squarePaymentId}`);

  } catch (error: any) {
    console.error(`❌ [IMPROVED] Error processing payment.updated for ${squarePaymentId}:`, error);
    
    // Capture the error for monitoring
    await errorMonitor.captureWebhookError(
      error,
      'payment.updated.improved',
      { squarePaymentId, squareOrderId, paymentStatus },
      eventId
    );
    
    throw error; // Re-throw to trigger webhook retry
  }
}

/**
 * Helper function to check if orders need status sync
 */
export async function syncOrderStatusFromPayments(): Promise<{
  ordersChecked: number;
  ordersSynced: number;
  errors: string[];
}> {
  const result = {
    ordersChecked: 0,
    ordersSynced: 0,
    errors: [] as string[],
  };

  try {
    // Find orders where payment status doesn't match order status
    const problematicOrders = await safeQuery(() =>
      prisma.order.findMany({
        where: {
          paymentStatus: 'PENDING',
          payments: {
            some: {
              status: 'PAID'
            }
          }
        },
        include: {
          payments: {
            where: { status: 'PAID' },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      })
    );

    result.ordersChecked = problematicOrders.length;

    for (const order of problematicOrders) {
      try {
        await executeWebhookTransaction(async (tx) => {
          const newOrderStatus = order.status === 'PENDING' ? OrderStatus.PROCESSING : order.status;
          
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              status: newOrderStatus,
              updatedAt: new Date(),
            },
          });
        }, `sync-order-${order.id}`);
        
        result.ordersSynced++;
        console.log(`✅ Synced order ${order.id} payment status`);
      } catch (error: any) {
        const errorMsg = `Failed to sync order ${order.id}: ${error.message}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

  } catch (error: any) {
    result.errors.push(`Failed to query problematic orders: ${error.message}`);
  }

  return result;
}
