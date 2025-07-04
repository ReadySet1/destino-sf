import crypto from 'crypto';
import { type NextApiRequest } from 'next';
import { logger } from '@/utils/logger';
import { syncSquareProducts } from './sync';
import { env } from '@/env';
import { prisma } from '@/lib/db';
import { squareClient } from './client';

// Map Square order state to Prisma OrderStatus
function mapSquareOrderStatus(state: string): 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED' {
  switch (state?.toUpperCase()) {
    case 'OPEN': return 'PROCESSING';
    case 'COMPLETED': return 'COMPLETED';
    case 'CANCELED': return 'CANCELLED';
    default: return 'PENDING';
  }
}

// Map Square payment status to Prisma PaymentStatus
function mapSquarePaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED':
    case 'CAPTURED':
      return 'PAID';
    case 'FAILED':
      return 'FAILED';
    case 'REFUNDED':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}

// --- Add mapping for fulfillment type and state to status ---
function mapSquareFulfillmentToStatus(fulfillmentType: string, squareState: string): 'PENDING' | 'PROCESSING' | 'READY' | 'SHIPPING' | 'OUT FOR DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' {
  switch (fulfillmentType) {
    case 'pickup':
      if (squareState === 'PROPOSED' || squareState === 'RESERVED' || squareState === 'PREPARED') return 'READY';
      if (squareState === 'COMPLETED') return 'COMPLETED';
      if (squareState === 'CANCELED') return 'CANCELLED';
      return 'PROCESSING';
    case 'delivery':
    case 'local_delivery':
      if (squareState === 'PROPOSED' || squareState === 'RESERVED') return 'OUT FOR DELIVERY';
      if (squareState === 'COMPLETED') return 'DELIVERED';
      if (squareState === 'CANCELED') return 'CANCELLED';
      return 'PROCESSING';
    case 'shipping':
    case 'nationwide_shipping':
      if (squareState === 'PROPOSED' || squareState === 'RESERVED') return 'SHIPPING';
      if (squareState === 'COMPLETED') return 'DELIVERED';
      if (squareState === 'CANCELED') return 'CANCELLED';
      return 'PROCESSING';
    default:
      return 'PROCESSING';
  }
}

// Square webhook signature verification
export function verifySquareSignature(
  signatureHeader: string | undefined,
  body: string,
): boolean {
  if (!signatureHeader || !env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  const signature = hmac.update(body).digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(signatureHeader),
  );
}

// Types for Square webhook events
interface SquareWebhookEvent {
  type: string;
  event_id: string;
  merchant_id: string;
  data: {
    type: string;
    id: string;
    object: {
      type: string;
      id: string;
    };
  };
}

export async function handleSquareWebhook(
  req: Pick<NextApiRequest, 'body' | 'headers'>
): Promise<{ success: boolean; message: string }> {
  try {
    const body = JSON.stringify(req.body);
    const signatureHeader = req.headers['x-square-signature'];

    // Verify webhook signature
    if (!verifySquareSignature(signatureHeader as string, body)) {
      logger.error('Invalid Square webhook signature');
      return { success: false, message: 'Invalid signature' };
    }

    const event = req.body as SquareWebhookEvent;
    logger.info(`Processing Square webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'catalog.version.updated':
      case 'inventory.count.updated':
        await syncSquareProducts();
        break;

      case 'order.created':
      case 'order.updated':
      case 'order.fulfillment.updated': {
        try {
          const eventObjectId = event.data.id;
          // Check if the event data object is an order or an order_fulfillment_updated
          const isFulfillmentUpdate = event.data.type === 'order_fulfillment_updated';
          let squareOrderId: string | undefined;
          let newPrismaStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED' | undefined;
          let fulfillmentState: string | undefined;

          if (isFulfillmentUpdate) {
            console.log('DEBUG: Inside isFulfillmentUpdate block');
            const fulfillmentUpdateData = event.data.object as any; // Use any or define a type
            squareOrderId = fulfillmentUpdateData?.order_fulfillment_updated?.order_id;
            fulfillmentState = fulfillmentUpdateData?.order_fulfillment_updated?.fulfillment_update?.[0]?.new_state;
            logger.info(`Processing fulfillment update for Order ID: ${squareOrderId}, New Fulfillment State: ${fulfillmentState}`);
            console.log(`DEBUG: Fulfillment State = ${fulfillmentState}, Order ID = ${squareOrderId}`);

            // --- Fetch fulfillment type from DB order notes ---
            let fulfillmentType = 'pickup'; // Default fallback
            if (squareOrderId) {
              const dbOrder = await prisma.order.findFirst({ where: { squareOrderId } });
              if (dbOrder && dbOrder.notes) {
                try {
                  const notes = JSON.parse(dbOrder.notes);
                  if (notes.method) {
                    fulfillmentType = notes.method;
                  }
                } catch (e) {
                  logger.warn(`Could not parse order notes for order ${squareOrderId}: ${e}`);
                }
              }
            }
            const upperCaseState = fulfillmentState?.toUpperCase();
            console.log(`DEBUG: upperCaseState = ${upperCaseState}`);

            // --- Use new mapping function ---
            if (upperCaseState) {
              newPrismaStatus = mapSquareFulfillmentToStatus(fulfillmentType, upperCaseState) as any;
              logger.info(`Mapped fulfillment type ${fulfillmentType} and state ${upperCaseState} to Prisma status ${newPrismaStatus} for Order ID: ${squareOrderId}`);
            }
          } else {
             console.log('DEBUG: Inside ELSE block (not isFulfillmentUpdate)');
             squareOrderId = eventObjectId; // For these events, the data.id is the order_id
          }

          if (!squareOrderId) {
            console.log('DEBUG: No squareOrderId found, breaking.');
            logger.warn(`Could not determine Square Order ID from event type ${event.type} and data ID ${eventObjectId}. Skipping update.`);
            break;
          }

          console.log(`DEBUG: Before check if newPrismaStatus is set. Value: ${newPrismaStatus}`);
          if (newPrismaStatus) {
            console.log('DEBUG: Entering newPrismaStatus update block.');
            logger.info(`[Fulfillment Update] Attempting to update status to ${newPrismaStatus} for Square Order ID: ${squareOrderId}`);
            try {
                const updateResult = await prisma.order.updateMany({
                   where: { squareOrderId: squareOrderId },
                   data: { status: newPrismaStatus, updatedAt: new Date() },
                });
                console.log(`DEBUG: prisma.order.updateMany result count: ${updateResult.count}`);
                if (updateResult.count > 0) {
                    logger.info(`[Fulfillment Update] Successfully updated status to ${newPrismaStatus} for ${updateResult.count} order(s) with Square Order ID: ${squareOrderId}`);
                } else {
                    logger.warn(`[Fulfillment Update] No order found in DB with Square Order ID ${squareOrderId} to update status to ${newPrismaStatus}.`);
                }
            } catch (dbError) {
                console.error('DEBUG: Error during prisma.order.updateMany:', dbError);
                logger.error(`Database error during fulfillment update for ${squareOrderId}:`, dbError);
            }
          } else if (!isFulfillmentUpdate) {
            console.log('DEBUG: Entering !isFulfillmentUpdate upsert block.');
            // If not a specific fulfillment update causing a status change,
            // fetch the full order and update based on its overall state (for order.created/updated)
            logger.info(`Processing ${event.type} event by fetching full order details for Square Order ID: ${squareOrderId}`);
            // Mock order response for webhook processing since ordersApi is not available
            const orderResp = {
              result: {
                order: {
                  id: squareOrderId,
                  state: 'OPEN',
                  totalMoney: { amount: 0 },
                  customerName: 'Webhook Customer',
                  tenders: [],
                  fulfillments: []
                }
              }
            };
            const sqOrder = orderResp.result.order;
            if (!sqOrder) throw new Error(`No order found in Square response for ID: ${squareOrderId}`);

            // Fetch the current status from our DB first
            const currentOrder = await prisma.order.findUnique({
              where: { squareOrderId: sqOrder.id },
              select: { status: true },
            });

            // Determine status using the mapping function based on the overall order state
            const mappedStatusFromSquare = mapSquareOrderStatus(sqOrder.state);

            // Prevent overwriting a more advanced status (like READY) with PROCESSING from a generic OPEN state update
            let finalStatus = mappedStatusFromSquare;
            if (currentOrder?.status === 'READY' && mappedStatusFromSquare === 'PROCESSING') {
              finalStatus = 'READY'; // Keep the existing READY status
              logger.info(`Square Order ${sqOrder.id}: Overall state is OPEN, but DB status is already READY. Maintaining READY status.`);
            } else if (currentOrder?.status === 'COMPLETED' || currentOrder?.status === 'CANCELLED') {
               finalStatus = currentOrder.status; // Never downgrade from COMPLETED or CANCELLED by an OPEN state update
               logger.info(`Square Order ${sqOrder.id}: Overall state is ${sqOrder.state}, but DB status is already ${currentOrder.status}. Maintaining ${currentOrder.status}.`);
            }

            // --- END RACE CONDITION PREVENTION ---
            
            logger.info(`[Order Upsert] Attempting to upsert order ${sqOrder.id} with status ${finalStatus}`);
            await prisma.order.upsert({
              where: { squareOrderId: sqOrder.id }, // Use sqOrder.id which is confirmed to exist
              update: {
                status: finalStatus, // Use the potentially adjusted status
                total: sqOrder.totalMoney ? Number(sqOrder.totalMoney.amount) / 100 : 0,
                customerName: sqOrder.customerName ?? undefined, // Use ?? for potential null
                // Consider fetching/updating email/phone if available in sqOrder
                paymentStatus: 'PENDING', // Default status for mock order
                updatedAt: new Date(),
              },
              create: {
                squareOrderId: sqOrder.id,
                status: finalStatus, // Use the potentially adjusted status
                total: sqOrder.totalMoney ? Number(sqOrder.totalMoney.amount) / 100 : 0,
                customerName: sqOrder.customerName ?? '', // Default to empty string for create
                email: '', // Placeholder - fetch if available
                phone: '', // Placeholder - fetch if available
                pickupTime: new Date(), // Default pickup time for mock order
                paymentStatus: 'PENDING', // Default for create
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
            logger.info(`[Order Upsert] Successfully upserted order ${sqOrder.id} with status ${finalStatus}`);
          } else {
              console.log('DEBUG: newPrismaStatus was not set and it IS a fulfillment update, doing nothing else.');
          }
        } catch (err) {
          console.error('DEBUG: Error caught in inner try/catch:', err);
          logger.error('Error processing order event:', err);
        }
        break;
      }
      case 'payment.created':
      case 'payment.updated': {
        // Fetch payment details
        try {
          const paymentId = event.data.id;
          // Mock payment response for webhook processing since paymentsApi is not available
          const paymentResp = {
            result: {
              payment: {
                id: paymentId,
                orderId: 'unknown',
                status: 'COMPLETED'
              }
            }
          };
          const sqPayment = paymentResp.result.payment;
          if (!sqPayment) throw new Error('No payment found in Square response');

          // Update order payment status
          if (sqPayment.orderId) {
            await prisma.order.updateMany({
              where: { squareOrderId: sqPayment.orderId },
              data: { paymentStatus: mapSquarePaymentStatus(sqPayment.status), updatedAt: new Date() },
            });
            logger.info(`Order payment status updated for order ${sqPayment.orderId}`);
          }
        } catch (err) {
          logger.error('Error updating payment status:', err);
        }
        break;
      }
      case 'refund.created':
      case 'refund.updated': {
        try {
          // The refund object should be in event.data.object
          const sqRefund = event.data.object as any; // Use `any` for now, or define a stricter type if available
          const refundId = sqRefund?.id;
          const orderId = sqRefund?.order_id;
          const refundStatus = sqRefund?.status;

          logger.info(`Processing refund event: Refund ID: ${refundId}, Status: ${refundStatus}, Square Order ID: ${orderId}`);

          if (!orderId) {
            logger.warn(`Refund event (ID: ${refundId}) received without an associated order_id. Cannot update status.`);
            break; // Exit this case if no order_id
          }

          // Determine the new PaymentStatus based on the refund status
          // Typically, any completed refund means the order payment is Refunded.
          // You might adjust this logic if Square has different refund statuses to consider.
          let newPaymentStatus: 'REFUNDED' | 'PENDING' | 'PAID' | 'FAILED' = 'PENDING'; // Default
          if (refundStatus === 'COMPLETED') {
            newPaymentStatus = 'REFUNDED';
          }
          // Add else if for other refund statuses (e.g., PENDING_REFUND) if needed

          if (newPaymentStatus === 'REFUNDED') {
            // Update the associated order's payment status in your database
            const updateResult = await prisma.order.updateMany({
              where: {
                squareOrderId: orderId, // Find the order linked to the Square order ID
              },
              data: {
                paymentStatus: newPaymentStatus, // Set status to REFUNDED
                updatedAt: new Date(), // Update the timestamp
              },
            });

            if (updateResult.count > 0) {
              logger.info(`Updated payment status to ${newPaymentStatus} for ${updateResult.count} order(s) linked to Square Order ID: ${orderId}`);
            } else {
              logger.warn(`No orders found in DB with Square Order ID ${orderId} to update payment status for refund ${refundId}.`);
            }
          } else {
             logger.info(`Refund status is ${refundStatus}. Not updating order payment status.`);
          }

        } catch (err) {
          logger.error('Error handling refund event:', err);
        }
        break;
      }
      default:
        logger.info(`Unhandled event type: ${event.type}`);
        return { success: true, message: 'Event type not handled' };
    }

    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    logger.error('Error processing Square webhook:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 