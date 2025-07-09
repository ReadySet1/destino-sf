import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { safeQuery, safeTransaction } from '@/lib/db-utils';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AlertService } from '@/lib/alerts';
import { errorMonitor } from '@/lib/error-monitoring';
import { purchaseShippingLabel } from '@/app/actions/labels';

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

// Map Square order states to our OrderStatus enum
function mapSquareStateToOrderStatus(state: string): OrderStatus {
  switch (state?.toUpperCase()) {
    case 'OPEN':
      return OrderStatus.PROCESSING;
    case 'COMPLETED':
      return OrderStatus.COMPLETED;
    case 'CANCELED':
    case 'CANCELLED':
      return OrderStatus.CANCELLED;
    default:
      return OrderStatus.PROCESSING;
  }
}

/**
 * Handle order.created webhook events
 */
export async function handleOrderCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const squareOrderData = data.object.order_created as any;
  
  console.log('🆕 Processing order.created event:', data.id);

  // Enhanced duplicate check with event ID tracking using safe query
  const existingOrder = await safeQuery(() => 
    prisma.order.findUnique({
      where: { squareOrderId: data.id },
      select: { id: true, rawData: true }
    })
  );

  // Check if this specific event was already processed
  const eventId = payload.event_id;
  if (existingOrder?.rawData && typeof existingOrder.rawData === 'object') {
    const rawData = existingOrder.rawData as any;
    if (rawData?.lastProcessedEventId === eventId) {
      console.log(`⚠️ Event ${eventId} for order ${data.id} already processed, skipping`);
      return;
    }
  }

  const orderStatus = mapSquareStateToOrderStatus(squareOrderData?.state);

  try {
    await safeQuery(() =>
      prisma.order.upsert({
        where: { squareOrderId: data.id },
        update: {
          status: orderStatus,
          rawData: {
            ...data.object,
            lastProcessedEventId: eventId,
            lastProcessedAt: new Date().toISOString()
          } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date()
        },
        create: {
          squareOrderId: data.id,
          status: orderStatus,
          total: 0, // Will be updated by payment webhook
          customerName: 'Pending', // Will be updated with real data
          email: 'pending@example.com', // Will be updated with real data
          phone: 'pending', // Will be updated with real data
          pickupTime: new Date(),
          rawData: {
            ...data.object,
            lastProcessedEventId: eventId,
            lastProcessedAt: new Date().toISOString()
          } as unknown as Prisma.InputJsonValue,
        },
      })
    );
    
    console.log(`✅ Successfully processed order.created event for order ${data.id}`);
  } catch (error: any) {
    console.error(`❌ Error processing order.created for ${data.id}:`, error);
    
    // Enhanced error logging for database connection issues
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.error('🚨 Database connection error in order.created:', {
        errorCode: error.code,
        message: error.message,
        orderId: data.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')
      });
    }
    
    await errorMonitor.captureWebhookError(
      error,
      'order.created',
      { orderId: data.id },
      payload.event_id
    );
    throw error; // Re-throw to trigger webhook retry
  }
}

/**
 * Handle order.updated webhook events with race condition protection
 */
export async function handleOrderUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const orderUpdateData = data.object.order_updated as any;
  console.log('Processing order.updated event:', data.id);

  const newSquareState = orderUpdateData?.state;
  const mappedStatus = mapSquareStateToOrderStatus(newSquareState);

  // Prepare the base update data object
  const updateData: Omit<Prisma.OrderUpdateInput, 'status'> & { status?: OrderStatus } = {
      total: orderUpdateData?.total_money?.amount ? orderUpdateData.total_money.amount / 100 : undefined,
      customerName: orderUpdateData?.customer_id ? 'Customer ID: ' + orderUpdateData.customer_id : undefined,
      rawData: data.object as unknown as Prisma.InputJsonValue,
  };

  // Only add status to the update if it's a terminal state (COMPLETED, CANCELLED)
  if (mappedStatus === OrderStatus.CANCELLED) {
      console.log(`Order ${data.id} cancelled. Setting paymentStatus to REFUNDED and status to CANCELLED.`);
      updateData.paymentStatus = 'REFUNDED';
      updateData.status = OrderStatus.CANCELLED;
  } else if (mappedStatus === OrderStatus.COMPLETED) {
      console.log(`Order ${data.id} completed. Setting status to COMPLETED.`);
      updateData.status = OrderStatus.COMPLETED;
  }

  try {
      // Get the previous status before updating if we're making a status change
      let previousStatus = undefined;
      if (updateData.status) {
          const currentOrder = await prisma.order.findUnique({
              where: { squareOrderId: data.id },
              select: { status: true }
          });
          previousStatus = currentOrder?.status;
      }

      await prisma.order.update({
          where: { squareOrderId: data.id },
          data: updateData,
      });

      // Send status change alert for terminal states (COMPLETED, CANCELLED)
      if (updateData.status && previousStatus && previousStatus !== updateData.status) {
          try {
              const orderWithItems = await prisma.order.findUnique({
                  where: { squareOrderId: data.id },
                  include: {
                      items: {
                          include: {
                              product: true,
                              variant: true
                          }
                      }
                  }
              });

              if (orderWithItems) {
                  const alertService = new AlertService();
                  await alertService.sendOrderStatusChangeAlert(orderWithItems, previousStatus);
                  console.log(`Order status change alert sent for order ${data.id}: ${previousStatus} → ${updateData.status}`);
              }
          } catch (alertError: any) {
              console.error(`Failed to send order status change alert for order ${data.id}:`, alertError);
          }
      }
   } catch (error: any) {
      if (error.code === 'P2025') {
          console.warn(`Order with squareOrderId ${data.id} not found for order update. Creating order stub...`);
          
          // Create order stub if webhook arrives before order.created webhook
          try {
              await prisma.order.create({
                  data: {
                      squareOrderId: data.id,
                      status: mappedStatus,
                      total: orderUpdateData?.total_money?.amount ? orderUpdateData.total_money.amount / 100 : 0,
                      customerName: orderUpdateData?.customer_id ? `Customer ID: ${orderUpdateData.customer_id}` : 'Order Update Processing',
                      email: 'processing@example.com',
                      phone: 'processing',
                      pickupTime: new Date(),
                      rawData: {
                          createdFromOrderUpdate: true,
                          orderUpdateEventId: payload.event_id,
                          note: 'Order created from order.updated webhook - order.created webhook may arrive later'
                      } as unknown as Prisma.InputJsonValue
                  }
              });
              console.log(`🆕 Created order stub from order.updated for ${data.id}`);
          } catch (createError: any) {
              console.error(`❌ Failed to create order stub from order.updated for ${data.id}:`, createError);
              throw createError;
          }
      } else {
          console.error(`Error updating order ${data.id}:`, error);
          throw error;
      }
  }
}

/**
 * Handle order.fulfillment.updated webhook events
 */
export async function handleOrderFulfillmentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const fulfillmentUpdateData = data.object.order_fulfillment_updated as any; 
  console.log('Processing order.fulfillment.updated event:', data.id);

  const squareOrderId = data.id;
  const fulfillmentUpdate = fulfillmentUpdateData?.fulfillment_update?.[0];
  const newFulfillmentState = fulfillmentUpdate?.new_state?.toUpperCase();
  const fulfillmentUid = fulfillmentUpdate?.fulfillment_uid;

  if (!newFulfillmentState || !fulfillmentUid) {
    console.warn(`No new_state or fulfillment_uid found in fulfillment update for order ${squareOrderId}. Skipping.`);
    return;
  }

  let newStatus: OrderStatus | undefined;
  let trackingData: { trackingNumber?: string | null; shippingCarrier?: string | null } = {};

  // Map status based on fulfillment type and state
  if (newFulfillmentState === 'PROPOSED' || newFulfillmentState === 'RESERVED') {
    newStatus = OrderStatus.PROCESSING;
  } else if (newFulfillmentState === 'PREPARED') {
    newStatus = OrderStatus.READY;
  } else if (newFulfillmentState === 'COMPLETED') {
    newStatus = OrderStatus.COMPLETED;
  } else if (newFulfillmentState === 'CANCELED') {
    newStatus = OrderStatus.CANCELLED;
  }

  // Determine data to update
  const updatePayload: Prisma.OrderUpdateInput = {
      rawData: data.object as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
  };

  if (newStatus) {
      updatePayload.status = newStatus;
  }

  // Only update if there's something new
  if (newStatus || updatePayload.trackingNumber !== undefined || updatePayload.shippingCarrier !== undefined) {
      console.log(`Attempting to update order ${squareOrderId} with status: ${newStatus ?? 'unchanged'}`);
      try {
          await prisma.order.update({
              where: { squareOrderId: squareOrderId },
              data: updatePayload,
          });
          console.log(`Successfully updated order ${squareOrderId}.`);
      } catch (error: any) {
          if (error.code === 'P2025') {
              console.warn(`Order with squareOrderId ${squareOrderId} not found for fulfillment update.`);
          } else {
              console.error(`Error updating order ${squareOrderId}:`, error);
              throw error;
          }
      }
  }
}

/**
 * Handle payment.created webhook events
 */
export async function handlePaymentCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const eventId = payload.event_id;
  const paymentData = data.object.payment as any;
  
  console.log(`💳 Processing payment.created event: ${data.id} for Square Order ID: ${paymentData?.order_id} | Event ID: ${eventId}`);

  if (!paymentData?.order_id) {
    console.warn(`⚠️ Payment ${data.id} received without a Square order_id.`);
    return;
  }

  const squareOrderId = paymentData.order_id;
  let order: { id: string } | null = null;
  
  try {
    order = await prisma.order.findUnique({
      where: { squareOrderId: squareOrderId },
      select: { id: true, status: true, paymentStatus: true },
    });
  } catch (dbError) {
    console.error(`❌ Error finding order with squareOrderId ${squareOrderId}:`, dbError);
    return;
  }

  if (!order) {
    console.warn(`⚠️ Order with squareOrderId ${squareOrderId} not found in DB for payment ${data.id}. Creating order stub.`);
    
    // Create order stub if webhook arrives before order webhook
    try {
      const newOrder = await prisma.order.create({
        data: {
          squareOrderId: squareOrderId,
          status: 'PROCESSING',
          total: paymentData?.amount_money?.amount ? paymentData.amount_money.amount / 100 : 0,
          customerName: 'Payment Processing',
          email: 'processing@example.com',
          phone: 'processing',
          pickupTime: new Date(),
          paymentStatus: 'PAID',
          rawData: {
            createdFromPayment: true,
            paymentEventId: eventId,
            squareOrderId: squareOrderId,
            note: 'Order created from payment webhook - order webhook may arrive later'
          } as unknown as Prisma.InputJsonValue
        }
      });
      order = { id: newOrder.id };
      console.log(`🆕 Created order stub ${newOrder.id} from payment ${data.id}`);
    } catch (createError) {
      console.error(`❌ Failed to create order stub for payment ${data.id}:`, createError);
      return;
    }
  }

  const internalOrderId = order.id;
  const paymentAmount = paymentData?.amount_money?.amount;

  if (paymentAmount === undefined || paymentAmount === null) {
    console.warn(`⚠️ Payment ${data.id} received without an amount.`);
    return;
  }

  try {
    await prisma.payment.upsert({
      where: { squarePaymentId: data.id },
      update: {
        amount: paymentAmount / 100,
        status: 'PAID',
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
          updatedViaWebhook: true
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date()
      },
      create: {
        squarePaymentId: data.id,
        amount: paymentAmount / 100,
        status: 'PAID',
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
          createdViaWebhook: true
        } as unknown as Prisma.InputJsonValue,
        order: {
          connect: { id: internalOrderId }
        }
      }
    });
    console.log(`✅ Successfully upserted payment record for internal order ${internalOrderId}`);
  } catch (upsertError: any) {
    console.error(`❌ Error upserting payment record for internal order ${internalOrderId}:`, upsertError);
    throw upsertError;
  }

  // Update order status
  try {
    const currentOrder = await prisma.order.findUnique({
      where: { id: internalOrderId },
      select: { paymentStatus: true, status: true }
    });

    if (currentOrder && currentOrder.paymentStatus !== 'PAID') {
      await prisma.order.update({
        where: { id: internalOrderId },
        data: { 
          status: 'PROCESSING',
          paymentStatus: 'PAID',
          updatedAt: new Date()
        }
      });
      console.log(`✅ Successfully updated order ${internalOrderId} status to PROCESSING/PAID`);
    }
  } catch (updateError) {
    console.error(`❌ Error updating order status for internal order ${internalOrderId}:`, updateError);
  }
}

/**
 * Handle payment.updated webhook events
 */
export async function handlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const paymentData = data.object.payment as any;
  const squarePaymentId = data.id;
  const squareOrderId = paymentData?.order_id;
  const paymentStatus = paymentData?.status?.toUpperCase();
  console.log(`Processing payment.updated event: ${squarePaymentId}`);

  if (!squareOrderId) {
    console.warn(`No order_id found in payment.updated payload for payment ${squarePaymentId}. Skipping.`);
    return;
  }

  try {
    // Check for catering order first
    const cateringOrder = await prisma.cateringOrder.findUnique({
      where: { squareOrderId },
      select: { id: true, paymentStatus: true, status: true },
    });

    if (cateringOrder) {
      console.log(`Detected catering order with squareOrderId ${squareOrderId}`);

      let updatedPaymentStatus: Prisma.CateringOrderUpdateInput['paymentStatus'] = 'PENDING';
      let updatedOrderStatus: Prisma.CateringOrderUpdateInput['status'] | undefined;

      if (paymentStatus === 'COMPLETED') {
        updatedPaymentStatus = 'PAID';
        updatedOrderStatus = 'CONFIRMED';
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') {
        updatedPaymentStatus = 'FAILED';
        updatedOrderStatus = 'CANCELLED';
      } else if (paymentStatus === 'REFUNDED') {
        updatedPaymentStatus = 'REFUNDED';
        updatedOrderStatus = 'CANCELLED';
      }

      const cateringUpdateData: Prisma.CateringOrderUpdateInput = {
        paymentStatus: updatedPaymentStatus,
        updatedAt: new Date(),
      };
      if (updatedOrderStatus) {
        cateringUpdateData.status = updatedOrderStatus;
      }

      await prisma.cateringOrder.update({
        where: { id: cateringOrder.id },
        data: cateringUpdateData,
      });

      console.log(`Successfully updated catering order ${cateringOrder.id} to payment status ${updatedPaymentStatus}`);
      return;
    }

    // Find regular order
    const order = await prisma.order.findUnique({
      where: { squareOrderId: squareOrderId },
      select: { 
        id: true, 
        status: true, 
        paymentStatus: true, 
        fulfillmentType: true,
        shippingRateId: true
      }
    });

    if (!order) {
      console.warn(`Order with squareOrderId ${squareOrderId} not found for payment update.`);
      return;
    }

    // Update payment status
    let updatedPaymentStatus: Prisma.PaymentUpdateInput['status'] = undefined;
    if (paymentStatus === 'COMPLETED') updatedPaymentStatus = 'PAID';
    else if (paymentStatus === 'FAILED') updatedPaymentStatus = 'FAILED';
    else if (paymentStatus === 'CANCELED') updatedPaymentStatus = 'FAILED';
    else if (paymentStatus === 'REFUNDED') updatedPaymentStatus = 'REFUNDED';
    else updatedPaymentStatus = 'PENDING';

    const updatedOrderStatus = (order.paymentStatus !== 'PAID' && updatedPaymentStatus === 'PAID')
      ? OrderStatus.PROCESSING
      : order.status;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: updatedPaymentStatus,
        status: updatedOrderStatus,
        rawData: data.object as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    console.log(`Order ${order.id} payment status updated to ${updatedPaymentStatus}, order status to ${updatedOrderStatus}.`);

    // Purchase shipping label if applicable
    if (
        updatedPaymentStatus === 'PAID' && 
        order.fulfillmentType === 'nationwide_shipping' && 
        order.shippingRateId
       ) {
        console.log(`Payment confirmed for shipping order ${order.id}. Triggering label purchase with rate ID: ${order.shippingRateId}`);
        try {
            const labelResult = await purchaseShippingLabel(order.id, order.shippingRateId);
            if (labelResult.success) {
                console.log(`Successfully purchased label for order ${order.id}. Tracking: ${labelResult.trackingNumber}`);
            } else {
                console.error(`Failed to purchase label automatically for order ${order.id}: ${labelResult.error}`);
            }
        } catch (labelError: any) {
             console.error(`Unexpected error calling purchaseShippingLabel for order ${order.id}: ${labelError?.message}`);
        }
    }

  } catch (error: any) {
    console.error(`Error processing payment.updated event for order ${squareOrderId}:`, error);
  }
}

/**
 * Handle refund.created webhook events
 */
export async function handleRefundCreated(payload: SquareWebhookPayload): Promise<void> {
    const { data } = payload;
    console.log('Processing refund.created event:', data.id);
    const refundData = data.object.refund as any;

    if (!refundData?.payment_id) {
        console.warn(`Refund ${data.id} received without a Square payment_id.`);
        return;
    }

    const payment = await prisma.payment.findUnique({
        where: { squarePaymentId: refundData.payment_id },
        select: { id: true, orderId: true }
    });

    if (!payment) {
        console.warn(`Payment with squarePaymentId ${refundData.payment_id} not found for refund ${data.id}.`);
        return;
    }

    const refundAmount = refundData?.amount_money?.amount;
     if (refundAmount === undefined || refundAmount === null) {
        console.warn(`Refund ${data.id} received without an amount.`);
        return;
    }

    await prisma.refund.create({
        data: {
            squareRefundId: data.id,
            amount: refundAmount,
            status: refundData.status || 'PENDING',
            reason: refundData.reason,
            rawData: data.object as unknown as Prisma.InputJsonValue,
            payment: {
                connect: { id: payment.id }
            }
        },
    });

     if (payment.orderId && refundData.status === 'COMPLETED') {
         await prisma.order.update({
             where: { id: payment.orderId },
             data: { paymentStatus: 'REFUNDED' }
         });
     }
}

/**
 * Handle refund.updated webhook events
 */
export async function handleRefundUpdated(payload: SquareWebhookPayload): Promise<void> {
    const { data } = payload;
    console.log('Processing refund.updated event:', data.id);
    const refundData = data.object.refund as any;
    const refundStatus = refundData.status || 'PENDING';

     try {
        const updatedRefund = await prisma.refund.update({
            where: { squareRefundId: data.id },
            data: {
                status: refundStatus,
                rawData: data.object as unknown as Prisma.InputJsonValue,
            },
            include: { payment: { select: { orderId: true } } }
        });

         if (refundStatus === 'COMPLETED' && updatedRefund.payment?.orderId) {
             await prisma.order.update({
                 where: { id: updatedRefund.payment.orderId },
                 data: { paymentStatus: 'REFUNDED' }
             });
         }

    } catch (error: any) {
        if (error.code === 'P2025') {
            console.warn(`Refund with squareRefundId ${data.id} not found for update.`);
        } else {
            console.error(`Error updating refund ${data.id}:`, error);
            throw error;
        }
    }
} 