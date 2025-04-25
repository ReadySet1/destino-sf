import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { SquareClient } from 'square';
import type { Square } from 'square'; // Import the Square namespace for types

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

// Event handlers
async function handleOrderCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const squareOrderData = data.object.order_created as any;
  console.log('Processing order.created event:', data.id);

  const orderStatus = mapSquareStateToOrderStatus(squareOrderData?.state);

  await prisma.order.upsert({
    where: { squareOrderId: data.id },
    update: {
      status: orderStatus,
      rawData: data.object as unknown as Prisma.InputJsonValue,
    },
    create: {
      squareOrderId: data.id,
      status: orderStatus,
      total: 0, // Placeholder
      customerName: 'Unknown', // Placeholder
      email: 'unknown@example.com', // Placeholder
      phone: 'unknown', // Placeholder
      pickupTime: new Date(), // Placeholder
      rawData: data.object as unknown as Prisma.InputJsonValue,
    },
  });
}

async function handleOrderFulfillmentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  // TODO: Define a more specific type for fulfillment update data if possible
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
  let trackingData: { trackingNumber?: string | null; shippingCarrier?: string | null } = {}; // Use null for Prisma fields

  // --- Fetch fulfillment type and potentially existing tracking info --- 
  let fulfillmentType: 'pickup' | 'shipping' | 'delivery' | 'unknown' = 'unknown';
  try {
      const order = await prisma.order.findUnique({
          where: { squareOrderId },
          select: { fulfillmentType: true, trackingNumber: true, shippingCarrier: true }
      });

      if (order && order.fulfillmentType) {
          const type = order.fulfillmentType.toLowerCase();
          if (type === 'pickup' || type === 'shipping' || type === 'delivery') {
             fulfillmentType = type as 'pickup' | 'shipping' | 'delivery';
          } else {
             console.warn(`Order ${squareOrderId} has unexpected fulfillmentType: ${order.fulfillmentType}`);
          }
          trackingData.trackingNumber = order.trackingNumber;
          trackingData.shippingCarrier = order.shippingCarrier;
      } else {
           console.warn(`Fulfillment type not found or null for order ${squareOrderId}. Status mapping might be inaccurate.`);
      }
  } catch (dbError: any) {
       console.error(`Error fetching order ${squareOrderId} to determine fulfillment type:`, dbError);
  }
  // --- End Fetch fulfillment type ---

  // --- Extract Tracking Info if applicable ---
  const shipmentDetails = fulfillmentUpdateData?.shipment_details;
  if (shipmentDetails && fulfillmentType === 'shipping') {
      if (shipmentDetails.tracking_number) {
          trackingData.trackingNumber = shipmentDetails.tracking_number;
          console.log(`Extracted tracking number ${trackingData.trackingNumber} for order ${squareOrderId}`);
      }
      if (shipmentDetails.carrier) {
          trackingData.shippingCarrier = shipmentDetails.carrier;
           console.log(`Extracted shipping carrier ${trackingData.shippingCarrier} for order ${squareOrderId}`);
      }
  }
  // --- End Extract Tracking Info ---

  // Map status based on fulfillment type and state
  switch (fulfillmentType) {
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
    case 'shipping':
       if (newFulfillmentState === 'PROPOSED' || newFulfillmentState === 'RESERVED') {
         newStatus = OrderStatus.PROCESSING;
       } else if (newFulfillmentState === 'PREPARED') { 
         newStatus = OrderStatus.SHIPPING;
       } else if (newFulfillmentState === 'COMPLETED') {
         newStatus = OrderStatus.DELIVERED;
       } else if (newFulfillmentState === 'CANCELED') {
         newStatus = OrderStatus.CANCELLED;
       } else {
         console.log(`Unhandled shipping state '${newFulfillmentState}' for order ${squareOrderId}. Check Square docs.`);
         if(trackingData.trackingNumber) {
            newStatus = OrderStatus.SHIPPING;
         }
       }
       break;
    default:
      console.warn(`Unhandled fulfillment type '${fulfillmentType}' or state '${newFulfillmentState}' for order ${squareOrderId}. No status update determined.`);
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
  const paymentData = data.object.payment as any;
  console.log(`Processing payment.created event: ${data.id} for Square Order ID: ${paymentData?.order_id}`);

  if (!paymentData?.order_id) {
    console.warn(`Payment ${data.id} received without a Square order_id.`);
    return;
  }

  const squareOrderId = paymentData.order_id;
  let order: { id: string } | null = null;
  try {
    order = await prisma.order.findUnique({
      where: { squareOrderId: squareOrderId },
      select: { id: true },
    });
  } catch (dbError) {
    console.error(`Error finding order with squareOrderId ${squareOrderId}:`, dbError);
    return; // Stop processing if DB query fails
  }

  if (!order) {
    console.warn(`Order with squareOrderId ${squareOrderId} not found in DB for payment ${data.id}. Webhook might be early.`);
    return;
  }

  const internalOrderId = order.id; // Get the internal ID
  const paymentAmount = paymentData?.amount_money?.amount;

  if (paymentAmount === undefined || paymentAmount === null) {
      console.warn(`Payment ${data.id} received without an amount.`);
      return;
  }

  // Log values just before the create call
  console.log(`Attempting to create payment record with: squarePaymentId=${data.id}, internalOrderId=${internalOrderId}, amount=${paymentAmount}`);

  try {
      await prisma.payment.create({
        data: {
          squarePaymentId: data.id,
          amount: paymentAmount,
          status: 'PENDING',
          rawData: data.object as unknown as Prisma.InputJsonValue,
          order: {
            connect: { id: internalOrderId } // Use the internal order ID found
          }
        },
      });
      console.log(`Successfully created payment record for internal order ${internalOrderId}`);
  } catch (createError) {
       console.error(`Error creating payment record for internal order ${internalOrderId}:`, createError);
       // Rethrow or handle as needed, but logging the specific error is key
       throw createError;
  }

  // Update order status
  try {
      await prisma.order.update({
          where: { id: internalOrderId }, // Use internal ID
          data: { status: OrderStatus.PROCESSING, paymentStatus: 'PAID' } // Use OrderStatus enum
      });
      console.log(`Successfully updated order ${internalOrderId} status to PROCESSING/PAID`);
  } catch (updateError) {
      console.error(`Error updating order status for internal order ${internalOrderId}:`, updateError);
      // Decide if this error should prevent success response
  }
}

async function handlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const paymentData = data.object.payment as any;
  console.log('Processing payment.updated event:', data.id);

  const paymentStatus = paymentData?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING';

  try {
      const updatedPayment = await prisma.payment.update({
          where: { squarePaymentId: data.id },
          data: {
              status: paymentStatus,
              rawData: data.object as unknown as Prisma.InputJsonValue,
          },
          select: { orderId: true } // Select orderId to update the order status
      });

      // If payment completed, update the main order status as well
      if (paymentStatus === 'COMPLETED' && updatedPayment.orderId) {
          await prisma.order.update({
              where: { id: updatedPayment.orderId },
              // Check current order status before potentially overriding fulfillment status
              // data: { status: 'COMPLETED', paymentStatus: 'PAID' }
              data: { paymentStatus: 'PAID' } // Safer to only update paymentStatus here
          });
      }

  } catch (error: any) {
      if (error.code === 'P2025') {
          console.warn(`Payment with squarePaymentId ${data.id} not found for update. Create event might have failed or is delayed.`);
          // Optionally, attempt to create/upsert the payment record here as a fallback
      } else {
          console.error(`Error updating payment ${data.id}:`, error);
          throw error;
      }
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

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: 'production', // or 'sandbox'
});

async function getOrderTracking(orderId: string) {
  const response = await client.orders.get({ orderId }); // Get the full response
  const order = response.order;
  if (!order || !order.fulfillments) return null;

  // Find the SHIPMENT fulfillment using the SDK's Fulfillment type
  const shipment = order.fulfillments.find((f: Square.Fulfillment) => f.type === 'SHIPMENT');
  if (shipment && shipment.shipmentDetails) {
    return {
      trackingNumber: shipment.shipmentDetails.trackingNumber,
      carrier: shipment.shipmentDetails.carrier,
    };
  }
  return null;
}

/**
 * Handles POST requests from Square webhooks.
 * @param request - The incoming request object.
 * @returns A NextResponse indicating successful receipt or an error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('Received Square webhook request');

  try {
    // It's crucial to respond quickly, so we parse the body but don't do heavy processing here.
    const payload: SquareWebhookPayload = await request.json();

    // Log the received payload for debugging
    // In a production environment, you might process this asynchronously
    console.log('Square Webhook Payload:', JSON.stringify(payload, null, 2));
 
    // TODO: Add webhook signature verification using x-square-hmacsha256-signature header

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