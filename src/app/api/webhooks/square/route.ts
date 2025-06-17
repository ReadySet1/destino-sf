import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { SquareClient } from 'square';
import type { Square } from 'square'; // Import the Square namespace for types
import { purchaseShippingLabel } from '@/app/actions/labels'; // Import the new action
import { headers } from 'next/headers';
import crypto from 'crypto';

type SquareEventType =
  | 'order.created'
  | 'order.fulfillment.updated'
  | 'order.updated'
  | 'payment.created'
  | 'payment.updated'
  | 'refund.created'
  | 'refund.updated';

interface SquareWebhookPayload {
  merchant_id: string;
  type: SquareEventType;
  event_id: string;
  created_at: string;
  location_id?: string;
  data: {
    type: 'order' | 'payment' | 'refund';
    id: string;
    object: Record<string, unknown>;
    deleted?: boolean;
  };
}

// Helper function to map Square state strings to your OrderStatus enum
function mapSquareStateToOrderStatus(squareState: string | undefined): OrderStatus {
  switch (squareState?.toUpperCase()) {
    case 'OPEN':
      return OrderStatus.PROCESSING; // Or map OPEN to PENDING/PROCESSING as needed
    case 'COMPLETED':
      return OrderStatus.COMPLETED;
    case 'CANCELED':
      return OrderStatus.CANCELLED;
    case 'DRAFT':
       return OrderStatus.PENDING;
    // REMOVED: Fulfillment states like PROPOSED, PREPARED, READY are handled separately below
    default:
      // Log unhandled *order* states. Fulfillment states are handled elsewhere.
      console.warn(`Unhandled Square *order* state: ${squareState}. Defaulting to PENDING.`);
      return OrderStatus.PENDING;
  }
}

// Event handlers with enhanced duplicate prevention
async function handleOrderCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const squareOrderData = data.object.order_created as any;
  
  console.log('🆕 Processing order.created event:', data.id);

  // Enhanced duplicate check with event ID tracking
  const existingOrder = await prisma.order.findUnique({
    where: { squareOrderId: data.id },
    select: { id: true, rawData: true }
  });

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
    await prisma.order.upsert({
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
    });
    
    console.log(`✅ Successfully processed order.created event for order ${data.id}`);
  } catch (error) {
    console.error(`❌ Error processing order.created for ${data.id}:`, error);
    throw error; // Re-throw to trigger webhook retry
  }
}

async function handleOrderFulfillmentUpdated(payload: SquareWebhookPayload): Promise<void> {
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

  // Define a broader type for internal logic
  type InternalFulfillmentType = 'pickup' | 'delivery_type' | 'shipping_type' | 'unknown';
  let internalFulfillmentType: InternalFulfillmentType = 'unknown'; 

  try {
      const order = await prisma.order.findUnique({
          where: { squareOrderId },
          select: { fulfillmentType: true, trackingNumber: true, shippingCarrier: true }
      });

      if (order && order.fulfillmentType) {
          const dbType = order.fulfillmentType.toLowerCase();
          // Map DB types to internal types
          if (dbType === 'pickup') {
             internalFulfillmentType = 'pickup';
          } else if (dbType === 'shipping' || dbType === 'nationwide_shipping') {
             internalFulfillmentType = 'shipping_type'; // Map both to shipping_type
          } else if (dbType === 'delivery' || dbType === 'local_delivery') {
             internalFulfillmentType = 'delivery_type'; // Map both to delivery_type
          } else {
             console.warn(`Order ${squareOrderId} has unrecognized fulfillmentType from DB: ${order.fulfillmentType}`);
          }
          trackingData.trackingNumber = order.trackingNumber;
          trackingData.shippingCarrier = order.shippingCarrier;
      } else {
           console.warn(`Fulfillment type not found or null for order ${squareOrderId}. Status mapping might be inaccurate.`);
      }
  } catch (dbError: any) {
       console.error(`Error fetching order ${squareOrderId} to determine fulfillment type:`, dbError);
  }

  // --- Fetch latest tracking info from Square API for shipping orders ---
  if (internalFulfillmentType === 'shipping_type') {
      try {
          console.log(`Fetching tracking details from Square API for order ${squareOrderId}...`);
          const apiTrackingData = await getOrderTracking(squareOrderId);
          if (apiTrackingData) {
              trackingData.trackingNumber = apiTrackingData.trackingNumber;
              trackingData.shippingCarrier = apiTrackingData.shippingCarrier;
              console.log(`Fetched from API - Tracking: ${trackingData.trackingNumber ?? 'N/A'}, Carrier: ${trackingData.shippingCarrier ?? 'N/A'}`);
          } else {
              console.log(`No shipment details found via API for order ${squareOrderId}.`);
          }
      } catch (apiError: any) {
          console.error(`Error fetching tracking details from Square API for order ${squareOrderId}:`, apiError);
      }
  }
  // --- End Fetch tracking info ---

  // Map status based on internal fulfillment type and state
  switch (internalFulfillmentType) {
    case 'pickup':
      if (newFulfillmentState === 'PROPOSED' || newFulfillmentState === 'RESERVED') {
        newStatus = OrderStatus.PROCESSING;
      } else if (newFulfillmentState === 'PREPARED') {
        newStatus = OrderStatus.READY;
      } else if (newFulfillmentState === 'COMPLETED') {
        newStatus = OrderStatus.COMPLETED;
      } else if (newFulfillmentState === 'CANCELED') {
        newStatus = OrderStatus.CANCELLED;
      }
      break;
    case 'shipping_type': // Use the internal type
       if (newFulfillmentState === 'PROPOSED' || newFulfillmentState === 'RESERVED') {
         newStatus = OrderStatus.PROCESSING;
       } else if (newFulfillmentState === 'PREPARED') { 
         newStatus = OrderStatus.SHIPPING; // PREPARED maps to SHIPPING
       } else if (newFulfillmentState === 'COMPLETED') {
         newStatus = OrderStatus.DELIVERED; // COMPLETED maps to DELIVERED
       } else if (newFulfillmentState === 'CANCELED') {
         newStatus = OrderStatus.CANCELLED;
       } else {
         // If state is unknown but we have tracking, set to SHIPPING
         console.log(`Unhandled shipping state '${newFulfillmentState}' for order ${squareOrderId}. Check Square docs.`);
         if(trackingData.trackingNumber) {
            newStatus = OrderStatus.SHIPPING;
         }
       }
       break;
    // TODO: Add case for 'delivery_type' if needed, mapping states appropriately
    default: // Handles 'unknown'
      console.warn(`Unhandled internal fulfillment type '${internalFulfillmentType}' or state '${newFulfillmentState}' for order ${squareOrderId}. No status update determined.`);
      break;
  }

  // Determine data to update
  const updatePayload: Prisma.OrderUpdateInput = {
      rawData: data.object as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
  };

  if (newStatus) {
      updatePayload.status = newStatus;
  }
  // Only update tracking info if it has a new value (could be null if removed in Square)
  if (trackingData.trackingNumber !== undefined) {
      updatePayload.trackingNumber = trackingData.trackingNumber;
  }
  if (trackingData.shippingCarrier !== undefined) {
      updatePayload.shippingCarrier = trackingData.shippingCarrier;
  }

  // Only update if there's something new (status or tracking info)
  if (newStatus || updatePayload.trackingNumber !== undefined || updatePayload.shippingCarrier !== undefined) {
      console.log(`Attempting to update order ${squareOrderId} with status: ${newStatus ?? 'unchanged'}, tracking: ${trackingData.trackingNumber ?? 'N/A'}, carrier: ${trackingData.shippingCarrier ?? 'N/A'}`);
      try {
          let applyUpdate = true;
          if (newStatus) {
              const currentOrder = await prisma.order.findUnique({
                  where: { squareOrderId },
                  select: { status: true }
              });
              const isDowngrade =
                  (currentOrder?.status === OrderStatus.READY && newStatus === OrderStatus.PROCESSING) ||
                  (currentOrder?.status === OrderStatus.SHIPPING && newStatus === OrderStatus.PROCESSING) ||
                  (currentOrder?.status === OrderStatus.COMPLETED && newStatus !== OrderStatus.COMPLETED && newStatus !== OrderStatus.DELIVERED) ||
                  (currentOrder?.status === OrderStatus.DELIVERED && newStatus !== OrderStatus.DELIVERED) ||
                  (currentOrder?.status === OrderStatus.CANCELLED && newStatus !== OrderStatus.CANCELLED);

              if (currentOrder && isDowngrade) {
                  console.log(`Preventing status downgrade for order ${squareOrderId}. Current: ${currentOrder.status}, Proposed Update: ${newStatus}. Status update skipped.`);
                  delete updatePayload.status; 
                  if (updatePayload.trackingNumber === undefined && updatePayload.shippingCarrier === undefined) {
                      applyUpdate = false;
                  }
              }
          }
          
          if (applyUpdate && Object.keys(updatePayload).length > 2) {
              await prisma.order.update({
                  where: { squareOrderId: squareOrderId },
                  data: updatePayload,
              });
              console.log(`Successfully updated order ${squareOrderId}.`);
          } else {
              console.log(`No applicable updates found for order ${squareOrderId} in this webhook.`);
          }
      } catch (error: any) {
          if (error.code === 'P2025') {
              console.warn(`Order with squareOrderId ${squareOrderId} not found for fulfillment update.`);
          } else {
              console.error(`Error updating order ${squareOrderId}:`, error);
          }
      }
  } else {
      console.log(`No status or tracking update needed for order ${squareOrderId} based on this webhook.`);
  }
}

async function handleOrderUpdated(payload: SquareWebhookPayload): Promise<void> {
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
      // Optionally update paymentStatus if not already handled by payment webhooks
      // updateData.paymentStatus = 'PAID';
  }
  // If mappedStatus is PROCESSING (from OPEN), we DO NOT update the status here,
  // allowing the fulfillment handler to correctly set READY.

  try {
      await prisma.order.update({
          where: { squareOrderId: data.id },
          data: updateData, // Apply updates (only includes status if terminal)
      });
   } catch (error: any) {
      if (error.code === 'P2025') {
          console.warn(`Order with squareOrderId ${data.id} not found for order update. It might be created later.`);
           // Optionally, create the order here as a fallback
      } else {
          console.error(`Error updating order ${data.id}:`, error);
          throw error;
      }
  }
}

async function handlePaymentCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const eventId = payload.event_id;
  const paymentData = data.object.payment as any;
  
  console.log(`💳 Processing payment.created event: ${data.id} for Square Order ID: ${paymentData?.order_id} | Event ID: ${eventId}`);

  if (!paymentData?.order_id) {
    console.warn(`⚠️ Payment ${data.id} received without a Square order_id.`);
    return;
  }

  // Enhanced duplicate prevention - check if this event was already processed
  const existingPayment = await prisma.payment.findUnique({
    where: { squarePaymentId: data.id },
    select: { id: true, rawData: true, orderId: true }
  });

  if (existingPayment?.rawData && typeof existingPayment.rawData === 'object') {
    const rawData = existingPayment.rawData as any;
    if (rawData?.lastProcessedEventId === eventId) {
      console.log(`⚠️ Payment event ${eventId} for payment ${data.id} already processed, skipping`);
      return;
    }
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

  // Update order status only if not already paid/processed
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
    } else {
      console.log(`ℹ️ Order ${internalOrderId} already marked as paid, skipping status update`);
    }
  } catch (updateError) {
    console.error(`❌ Error updating order status for internal order ${internalOrderId}:`, updateError);
    // Don't throw here as payment was successfully recorded
  }
}



async function handlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
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
    // First check for a catering order with this Square order ID using simpler query approach
    try {
      // Check if a catering order with this Square order ID exists using raw SQL
      const cateringOrderExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM "CateringOrder"
          WHERE "squareOrderId" = ${squareOrderId}
        );
      `;
      
      // Convert the response properly to boolean
      const isCateringOrder = (cateringOrderExists as any)?.[0]?.exists === true;
      
      if (isCateringOrder) {
        console.log(`Detected catering order with squareOrderId ${squareOrderId}`);
        
        // Map Square payment status to our status values
        let updatedPaymentStatus = 'PENDING';
        let updatedOrderStatus = null;
        
        if (paymentStatus === 'COMPLETED') {
          updatedPaymentStatus = 'PAID';
          updatedOrderStatus = 'CONFIRMED';
          console.log(`Payment completed for catering order ${squareOrderId}, updating to CONFIRMED status`);
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') {
          updatedPaymentStatus = 'FAILED';
          updatedOrderStatus = 'CANCELLED';
          console.log(`Payment failed/canceled for catering order ${squareOrderId}, updating to CANCELLED status`);
        } else if (paymentStatus === 'REFUNDED') {
          updatedPaymentStatus = 'REFUNDED';
          updatedOrderStatus = 'CANCELLED';
          console.log(`Payment refunded for catering order ${squareOrderId}, updating to CANCELLED status`);
        } else {
          console.log(`Other payment status ${paymentStatus} for catering order ${squareOrderId}, keeping as PENDING`);
        }
        
        try {
          // Use raw SQL to update the catering order without relying on schema validation
          await prisma.$executeRaw`
            UPDATE "CateringOrder" 
            SET 
              "paymentStatus" = ${updatedPaymentStatus}::text::"PaymentStatus", 
              "status" = ${updatedOrderStatus ? `${updatedOrderStatus}::text::"CateringStatus"` : 'status'},
              "squarePaymentId" = ${squarePaymentId},
              "updatedAt" = NOW()
            WHERE "squareOrderId" = ${squareOrderId}
          `;
          
          console.log(`Successfully updated catering order with squareOrderId ${squareOrderId} to payment status ${updatedPaymentStatus}`);
        } catch (updateError) {
          console.error(`Error updating catering order ${squareOrderId}:`, updateError);
        }
        
        return; // Exit after handling catering order
      }
    } catch (err) {
      console.error('Error checking/updating catering order:', err);
      // Continue to regular order processing even if catering check fails
    }

    // If not a catering order, find our internal order using the Square Order ID
    const order = await prisma.order.findUnique({
      where: { squareOrderId: squareOrderId },
      select: { 
        id: true, 
        status: true, 
        paymentStatus: true, 
        fulfillmentType: true,
        shippingRateId: true // Select the shipping rate ID
      }
    });

    if (!order) {
      console.warn(`Order with squareOrderId ${squareOrderId} not found for payment update.`);
      return;
    }

    // Update payment status based on Square's status
    let updatedPaymentStatus: Prisma.PaymentUpdateInput['status'] = undefined;
    if (paymentStatus === 'COMPLETED') updatedPaymentStatus = 'PAID';
    else if (paymentStatus === 'FAILED') updatedPaymentStatus = 'FAILED';
    else if (paymentStatus === 'CANCELED') updatedPaymentStatus = 'FAILED'; // Treat canceled payment as failed
    else if (paymentStatus === 'REFUNDED') updatedPaymentStatus = 'REFUNDED';
    else updatedPaymentStatus = 'PENDING';

    // Prevent downgrading status
    if (
      (order.paymentStatus === 'PAID' && updatedPaymentStatus !== 'PAID' && updatedPaymentStatus !== 'REFUNDED') ||
      (order.paymentStatus === 'REFUNDED' && updatedPaymentStatus !== 'REFUNDED') ||
      (order.paymentStatus === 'FAILED' && updatedPaymentStatus !== 'FAILED')
    ) {
      console.log(`Preventing payment status downgrade for order ${order.id}. Current: ${order.paymentStatus}, Proposed: ${updatedPaymentStatus}`);
      updatedPaymentStatus = order.paymentStatus; // Keep current status
    }

    // Update order status only if payment is newly PAID
    const updatedOrderStatus = (order.paymentStatus !== 'PAID' && updatedPaymentStatus === 'PAID')
      ? OrderStatus.PROCESSING // Update to PROCESSING when paid
      : order.status; // Otherwise keep current status

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: updatedPaymentStatus,
        status: updatedOrderStatus,
        rawData: data.object as unknown as Prisma.InputJsonValue, // Append or replace raw data
        updatedAt: new Date(),
      },
    });
    console.log(`Order ${order.id} payment status updated to ${updatedPaymentStatus}, order status to ${updatedOrderStatus}.`);

    // --- Purchase Shipping Label if applicable --- 
    if (
        updatedPaymentStatus === 'PAID' && // Payment just completed
        order.fulfillmentType === 'nationwide_shipping' && // It's a shipping order
        order.shippingRateId // We have a Shippo rate ID
       ) {
        console.log(`Payment confirmed for shipping order ${order.id}. Triggering label purchase with rate ID: ${order.shippingRateId}`);
        try {
            const labelResult = await purchaseShippingLabel(order.id, order.shippingRateId);
            if (labelResult.success) {
                console.log(`Successfully purchased label for order ${order.id}. Tracking: ${labelResult.trackingNumber}`);
            } else {
                console.error(`Failed to purchase label automatically for order ${order.id}: ${labelResult.error}`);
                // Note: The purchaseShippingLabel action already attempts to update order notes on failure.
            }
        } catch (labelError: any) {
             console.error(`Unexpected error calling purchaseShippingLabel for order ${order.id}: ${labelError?.message}`);
             // Attempt to update notes here as a fallback
             await prisma.order.update({
                 where: { id: order.id },
                 data: { notes: `Label purchase action failed: ${labelError?.message}` }
             }).catch(e => console.error("Failed to update order notes on label action catch:", e));
        }
    } else if (updatedPaymentStatus === 'PAID' && order.fulfillmentType === 'nationwide_shipping' && !order.shippingRateId) {
        console.warn(`Order ${order.id} is paid and shipping, but missing shippingRateId. Cannot purchase label automatically.`);
    }
    // --- End Purchase Shipping Label --- 

  } catch (error: any) {
    console.error(`Error processing payment.updated event for order ${squareOrderId}:`, error);
  }
}

async function handleRefundCreated(payload: SquareWebhookPayload): Promise<void> {
    const { data } = payload;
    console.log('Processing refund.created event:', data.id);
    const refundData = data.object.refund as any;

    if (!refundData?.payment_id) {
        console.warn(`Refund ${data.id} received without a Square payment_id.`);
        return;
    }

    // Find the corresponding payment in *your* database
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
            // Connect to the existing payment
            payment: {
                connect: { id: payment.id }
            }
        },
    });

     // Update order status if applicable (e.g., if fully refunded)
     if (payment.orderId && refundData.status === 'COMPLETED') {
         // Add logic here to check if the order is fully refunded
         // and potentially update order status to 'REFUNDED' or 'CANCELLED'
         await prisma.order.update({
             where: { id: payment.orderId },
             data: { paymentStatus: 'REFUNDED' } // Or partially refunded etc.
         });
     }
}

async function handleRefundUpdated(payload: SquareWebhookPayload): Promise<void> {
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
            include: { payment: { select: { orderId: true } } } // Include payment.orderId
        });

        // Update order paymentStatus if refund is completed
         if (refundStatus === 'COMPLETED' && updatedRefund.payment?.orderId) {
             await prisma.order.update({
                 where: { id: updatedRefund.payment.orderId },
                 data: { paymentStatus: 'REFUNDED' } // Adjust logic for partial refunds if needed
             });
         }

    } catch (error: any) {
        if (error.code === 'P2025') {
            console.warn(`Refund with squareRefundId ${data.id} not found for update.`);
            // Optionally, attempt to create/upsert the refund record here
        } else {
            console.error(`Error updating refund ${data.id}:`, error);
            throw error;
        }
    }
}

// Initialize Square Client with proper configuration
const squareEnvString = process.env.SQUARE_ENVIRONMENT?.toLowerCase() ?? 'production';

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: squareEnvString === 'sandbox' ? 'sandbox' : 'production', // Use string literals
});

async function getOrderTracking(orderId: string) {
  try {
      console.log(`Fetching order details from Square API for order ${orderId}`);
      
      // Use client.orders.get method, which is the correct method name
      const response = await client.orders.get({ orderId });
      
      console.log(`Square API response for order ${orderId}:`, JSON.stringify(response, null, 2)); 
      
      // Access order correctly based on response structure
      const order = response.order;
      if (!order || !order.fulfillments || order.fulfillments.length === 0) {
        console.log(`No order or fulfillments found in API response for ${orderId}`);
        return null;
      }

      // Find the SHIPMENT fulfillment using the SDK's Fulfillment type
      const shipment = order.fulfillments.find((f: Square.Fulfillment) => f.type === 'SHIPMENT');
      if (shipment && shipment.shipmentDetails) {
        console.log(`Found shipment details for ${orderId}:`, shipment.shipmentDetails);
        const trackingNumber = shipment.shipmentDetails.trackingNumber ?? null;
        const shippingCarrier = shipment.shipmentDetails.carrier ?? null;
        return { trackingNumber, shippingCarrier };
      } else {
        console.log(`No SHIPMENT fulfillment or shipmentDetails found for ${orderId}`);
      }
    } catch (error: any) {
      // Improve error handling with more specific logging
      console.error(`Error in getOrderTracking for ${orderId}. Raw Error:`, error); // Log the raw error object
      if (error instanceof Error) {
        console.error(`Error Name: ${error.name}, Message: ${error.message}`);
        if ('stack' in error) {
            console.error(`Stack Trace: ${error.stack}`);
        }
      }
      
      // Try to extract and log specific Square API errors if present
      if (error?.errors) { // Use optional chaining
        console.error('Square API Errors:', JSON.stringify(error.errors, null, 2)); // Stringify for better readability
      }
      if (error?.body) { // Log the body if available
        console.error('Error Body:', error.body);
      }
      
      return null;
    }
  }

/**
 * Handles POST requests from Square webhooks.
 * @param request - The incoming request object.
 * @returns A NextResponse indicating successful receipt or an error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('Received Square webhook request');

  try {
    // Read the body as text first to verify signature
    const bodyText = await request.text();
    
    // Verify the webhook signature if a webhook secret is configured
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const timestamp = request.headers.get('x-square-hmacsha256-timestamp');
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    
    if (webhookSecret && signature && timestamp) {
      try {
        // Compute expected signature: HMAC-SHA256(CONCAT(|timestamp|, |notification body|), |SignatureKey|)
        const message = `${timestamp}${bodyText}`;
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(message);
        const expectedSignature = hmac.digest('hex');
        
        if (expectedSignature !== signature) {
          console.warn('Square webhook signature validation failed');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
        
        console.log('Square webhook signature validated successfully');
      } catch (signatureError) {
        console.error('Error validating Square webhook signature:', signatureError);
        // Continue processing even if signature validation fails, but log it
      }
    } else if (webhookSecret) {
      console.warn('Square webhook signature validation skipped: missing headers');
    }
    
    // Parse the JSON payload
    let payload: SquareWebhookPayload;
    try {
      payload = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Error parsing Square webhook JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Log the received payload for debugging
    // In a production environment, you might process this asynchronously
    console.log('Square Webhook Payload Type:', payload.type);

    // Handle different event types
    switch (payload.type) {
      case 'order.created':
        await handleOrderCreated(payload);
        break;
      case 'order.fulfillment.updated':
        await handleOrderFulfillmentUpdated(payload);
        break;
      case 'order.updated':
        await handleOrderUpdated(payload);
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
        console.warn(`Unhandled event type: ${payload.type}`);
    }

    // Acknowledge receipt to Square immediately
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error processing Square webhook:', error);

    let errorMessage = 'Internal Server Error';
    let statusCode = 500;

    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON payload';
      statusCode = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Even in case of processing errors, try to return a success status if the request itself was received.
    // However, if parsing failed (like invalid JSON), return an error status.
    // Square prefers a 2xx response to stop retries. If processing fails reliably,
    // consider returning 2xx but logging the error thoroughly for investigation.
    // For now, we'll return an error status code if processing fails.
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
} 