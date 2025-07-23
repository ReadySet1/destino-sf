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
          data: updateData, // Apply updates (only includes status if terminal)
      });

      // Send status change alert for terminal states (COMPLETED, CANCELLED)
      if (updateData.status && previousStatus && previousStatus !== updateData.status) {
          try {
              // Fetch the complete order with items for the alert
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
              // Don't fail the webhook if alert fails
          }
      }

  } catch (error: any) {
      if (error.code === 'P2025') {
          console.warn(`⚠️ Order with squareOrderId ${data.id} not found for order update. Skipping processing until order.created webhook arrives.`);
          // Don't create stub orders - wait for proper order data
          return;
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
  const paymentData = data.object.payment as any;
  const squarePaymentId = data.id;
  const squareOrderId = paymentData?.order_id;
  const eventId = payload.event_id;

  console.log(`Processing payment.created event: ${squarePaymentId} for order: ${squareOrderId}`);

  if (!squareOrderId) {
    console.warn(`Payment ${squarePaymentId} received without order_id. Skipping.`);
    return;
  }

  // Find the order by Square Order ID
  let order = await prisma.order.findUnique({
    where: { squareOrderId: squareOrderId },
    select: { id: true, customerName: true, email: true, phone: true }
  });

  if (!order) {
    console.warn(`⚠️ Order with squareOrderId ${squareOrderId} not found for payment ${squarePaymentId}. Skipping payment processing until order.created webhook arrives.`);
    // Don't create stub orders - wait for proper order data
    return;
  }

  const internalOrderId = order.id;
  const paymentAmount = paymentData?.amount_money?.amount;

  if (paymentAmount === undefined || paymentAmount === null) {
    console.warn(`⚠️ Payment ${data.id} received without an amount.`);
    return;
  }

  console.log(`🔄 Attempting to upsert payment record: squarePaymentId=${data.id}, internalOrderId=${internalOrderId}, amount=${paymentAmount / 100}`);

  try {
    // Enhanced upsert with event tracking
    await prisma.payment.upsert({
      where: { squarePaymentId: data.id },
      update: {
        amount: paymentAmount / 100, // Convert from cents to dollars
        status: 'PAID', // Payment created = paid
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
        amount: paymentAmount / 100, // Convert from cents to dollars
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
    if (upsertError.code === 'P2025') {
      console.error(`❌ Order with internal ID ${internalOrderId} not found when connecting payment ${data.id}`);
    }
    throw upsertError;
  }

  // Update order status and customer information
  try {
    const currentOrder = await prisma.order.findUnique({
      where: { id: internalOrderId },
      select: { paymentStatus: true, status: true, customerName: true, email: true, phone: true }
    });

    if (!currentOrder) {
      console.error(`❌ Order ${internalOrderId} not found when updating status`);
      return;
    }

    // Prepare update data
    const updateData: Prisma.OrderUpdateInput = {
      updatedAt: new Date()
    };

    // Update payment status if not already paid
    if (currentOrder.paymentStatus !== 'PAID') {
      updateData.paymentStatus = 'PAID';
      updateData.status = 'PROCESSING';
    }

    // Update customer information if order has placeholder data
    const hasPlaceholderData = 
      currentOrder.customerName === 'Pending' || 
      currentOrder.email === 'pending@example.com' || 
      currentOrder.phone === 'pending';

    if (hasPlaceholderData) {
      // Extract customer information from payment data
      const customerInfo = paymentData?.buyer_email_address || paymentData?.receipt_email;
      const customerName = paymentData?.buyer?.email_address || paymentData?.receipt_email;
      
      if (customerInfo && currentOrder.email === 'pending@example.com') {
        updateData.email = customerInfo;
        console.log(`📧 Updated order ${internalOrderId} email from placeholder to: ${customerInfo}`);
      }
      
      if (customerName && currentOrder.customerName === 'Pending') {
        updateData.customerName = customerName;
        console.log(`👤 Updated order ${internalOrderId} customer name from placeholder to: ${customerName}`);
      }
      
      // Update phone if available (Square payments don't always include phone)
      if (paymentData?.buyer?.phone_number && currentOrder.phone === 'pending') {
        updateData.phone = paymentData.buyer.phone_number;
        console.log(`📞 Updated order ${internalOrderId} phone from placeholder to: ${paymentData.buyer.phone_number}`);
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 1) { // More than just updatedAt
      await prisma.order.update({
        where: { id: internalOrderId },
        data: updateData
      });
      console.log(`✅ Successfully updated order ${internalOrderId} with payment and customer data`);
    } else {
      console.log(`ℹ️ Order ${internalOrderId} already up to date, no changes needed`);
    }
  } catch (updateError) {
    console.error(`❌ Error updating order status for internal order ${internalOrderId}:`, updateError);
    // Don't throw here as payment was successfully recorded
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