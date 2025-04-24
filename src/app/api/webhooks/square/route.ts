import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

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
    // Map fulfillment states if needed, or handle in specific handlers
    case 'PROPOSED': // From fulfillment update
    case 'PREPARED': // From fulfillment update
        return OrderStatus.PROCESSING;
    case 'READY': // From fulfillment update - map to your READY state
        return OrderStatus.READY;
    default:
      console.warn(`Unhandled Square order state: ${squareState}. Defaulting to PENDING.`);
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
  const fulfillmentUpdateData = data.object.order_fulfillment_updated as any;
  console.log('Processing order.fulfillment.updated event:', data.id);

  const newFulfillmentState = fulfillmentUpdateData?.fulfillment_update?.[0]?.new_state;
  const orderStatus = mapSquareStateToOrderStatus(newFulfillmentState);

  try {
      await prisma.order.update({
          where: { squareOrderId: data.id },
          data: {
              status: orderStatus,
              rawData: data.object as unknown as Prisma.InputJsonValue,
          },
      });
  } catch (error: any) {
      if (error.code === 'P2025') {
          console.warn(`Order with squareOrderId ${data.id} not found for fulfillment update. It might be created later.`);
          // Optionally, create the order here as a fallback, similar to handleOrderCreated
      } else {
          console.error(`Error updating order ${data.id} for fulfillment:`, error);
          throw error; // Re-throw other errors
      }
  }
}

async function handleOrderUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const orderUpdateData = data.object.order_updated as any;
  console.log('Processing order.updated event:', data.id);

  const orderStatus = mapSquareStateToOrderStatus(orderUpdateData?.state);

  try {
      await prisma.order.update({
          where: { squareOrderId: data.id },
          data: {
              status: orderStatus,
              total: orderUpdateData?.total_money?.amount ? orderUpdateData.total_money.amount / 100 : undefined,
              customerName: orderUpdateData?.customer_id ? 'Customer ID: ' + orderUpdateData.customer_id : undefined,
              rawData: data.object as unknown as Prisma.InputJsonValue,
          },
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