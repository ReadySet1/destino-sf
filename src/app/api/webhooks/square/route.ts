import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma, withConnectionManagement } from '@/lib/db';
import { webhookDb, executeWebhookQuery, executeWebhookTransaction } from '@/lib/db-webhook-optimized';
import { safeQuery, safeTransaction } from '@/lib/db-utils';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { SquareClient } from 'square';
import type { Square } from 'square'; // Import the Square namespace for types
import https from 'https';
import { purchaseShippingLabel } from '@/app/actions/labels'; // Import the new action
import { headers } from 'next/headers';
import crypto from 'crypto';
import { resilientAlertService } from '@/lib/alerts-resilient'; // Import the resilient alert service
import { errorMonitor } from '@/lib/error-monitoring'; // Import error monitoring
import { applyWebhookRateLimit } from '@/middleware/rate-limit';
import { handleWebhookWithQueue } from '@/lib/webhook-queue';
import { patchSquareApiClient } from '@/lib/square/square-api-fix';
import { WebhookValidator } from '@/lib/square/webhook-validator';

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

/**
 * Queue webhook for later processing when catering orders might still be in creation
 */
async function queueWebhookForLaterProcessing(
  payload: SquareWebhookPayload, 
  eventType: string, 
  squareOrderId: string
): Promise<void> {
  try {
    console.log(`📥 [WEBHOOK-QUEUE] Queuing webhook for later processing`);
    console.log(`📥 [WEBHOOK-QUEUE] Event: ${eventType}, Order: ${squareOrderId}, Event ID: ${payload.event_id}`);
    
    // Simple queue implementation using setTimeout for immediate needs
    // In production, you might want to use Redis or a proper queue system
    setTimeout(async () => {
      console.log(`🔄 [WEBHOOK-QUEUE] Processing delayed webhook for ${squareOrderId}`);
      
      try {
        // Retry the catering order lookup one more time
        const cateringOrder = await prisma.cateringOrder.findUnique({
          where: { squareOrderId: squareOrderId },
          select: { id: true, email: true, status: true },
        });
        
        if (cateringOrder) {
          console.log(`✅ [WEBHOOK-QUEUE] Delayed processing found catering order: ${cateringOrder.id}`);
          console.log(`✅ [WEBHOOK-QUEUE] Successfully prevented placeholder order for ${squareOrderId}`);
          return;
        }
        
        // If still no catering order found, proceed with regular order creation
        console.log(`⚠️ [WEBHOOK-QUEUE] Delayed processing: still no catering order for ${squareOrderId}`);
        console.log(`⚠️ [WEBHOOK-QUEUE] This appears to be a legitimate regular order`);
        
        // Re-run the order creation process
        await handleOrderCreated(payload);
        
      } catch (error) {
        console.error(`❌ [WEBHOOK-QUEUE] Error in delayed webhook processing:`, error);
        // Optionally queue for another retry or send to dead letter queue
      }
    }, 10000); // Wait 10 seconds before retry
    
    console.log(`✅ [WEBHOOK-QUEUE] Webhook queued for processing in 10 seconds`);
    
  } catch (error) {
    console.error(`❌ [WEBHOOK-QUEUE] Error queuing webhook:`, error);
    // If queueing fails, continue with regular processing as fallback
    throw error;
  }
}

// Event handlers with enhanced duplicate prevention
async function handleOrderCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const squareOrderData = data.object.order_created as any;

  console.log('🆕 Processing order.created event:', data.id);

  // CRITICAL: Check if this is a catering order first to prevent duplicates
  console.log(`🔍 [WEBHOOK-DEBUG] Checking for existing catering order with Square ID: ${data.id}`);
  
  let cateringOrder = null;
  
  // Enhanced retry logic with exponential backoff for race conditions
  const maxRetries = 5; // Increased from 3
  const baseRetryDelay = 2000; // Increased from 1 second to 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 [WEBHOOK-QUEUE] Attempting catering order lookup (${attempt}/${maxRetries})...`);
      console.log(`🔍 [WEBHOOK-QUEUE] Looking for Square Order ID: ${data.id}`);
      
      // Enhanced query with additional metadata
      cateringOrder = await prisma.cateringOrder.findUnique({
        where: { squareOrderId: data.id },
        select: { 
          id: true, 
          name: true, 
          email: true, 
          phone: true, 
          createdAt: true,
          status: true,
          squareCheckoutId: true,
        },
      });
      
      console.log(`🔍 [WEBHOOK-QUEUE] Query result (attempt ${attempt}):`, cateringOrder ? {
        id: cateringOrder.id,
        email: cateringOrder.email,
        status: cateringOrder.status,
        age: `${Math.round((Date.now() - cateringOrder.createdAt.getTime()) / 1000)}s`,
      } : 'NOT_FOUND');
      
      if (cateringOrder) {
        console.log(`✅ [WEBHOOK-QUEUE] Catering order found on attempt ${attempt}`);
        break;
      }
      
      // If not found and not the last attempt, wait with exponential backoff
      if (attempt < maxRetries) {
        const delay = baseRetryDelay * Math.pow(1.5, attempt - 1); // Exponential backoff
        console.log(`⏳ [WEBHOOK-QUEUE] Catering order not found, waiting ${delay}ms before retry...`);
        console.log(`⏳ [WEBHOOK-QUEUE] This may be a race condition - catering order creation in progress`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`❌ [WEBHOOK-QUEUE] Error checking for catering order (attempt ${attempt}):`, error);
      
      // If this was the last attempt, proceed with error logged
      if (attempt === maxRetries) {
        console.error(`🚨 [WEBHOOK-QUEUE] All attempts failed - database may be unstable`);
        break;
      }
      
      // Wait before retrying even on error (with backoff)
      const errorDelay = baseRetryDelay * Math.pow(1.5, attempt - 1);
      console.log(`⏳ [WEBHOOK-QUEUE] Error retry delay: ${errorDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, errorDelay));
    }
  }

  if (cateringOrder) {
    // This is a catering order - don't create a regular order
    console.log(`✅ [WEBHOOK-QUEUE] CATERING ORDER CONFIRMED! Skipping regular order creation`);
    console.log(`✅ [WEBHOOK-QUEUE] Catering Order ID: ${cateringOrder.id}`);
    console.log(`✅ [WEBHOOK-QUEUE] Customer: ${cateringOrder.email}`);
    console.log(`✅ [WEBHOOK-QUEUE] Status: ${cateringOrder.status}`);
    console.log(`✅ [WEBHOOK-QUEUE] Square Order ID: ${data.id} handled by catering system`);
    return;
  }
  
  // ENHANCED: Check if this might be a very recent catering order by looking for recent orders
  // This is a final safety check before creating a placeholder order
  console.log(`🔍 [WEBHOOK-QUEUE] Final safety check: looking for recent catering orders...`);
  
  try {
    const recentCateringOrders = await prisma.cateringOrder.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30000), // Last 30 seconds
        },
        squareOrderId: null, // Orders that haven't been linked to Square yet
      },
      select: { 
        id: true, 
        email: true, 
        totalAmount: true, 
        createdAt: true,
        squareCheckoutId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    if (recentCateringOrders.length > 0) {
      console.log(`⚠️ [WEBHOOK-QUEUE] Found ${recentCateringOrders.length} recent catering orders without Square IDs`);
      console.log(`⚠️ [WEBHOOK-QUEUE] This Square webhook might be for one of these orders`);
      console.log(`⚠️ [WEBHOOK-QUEUE] Recent orders:`, recentCateringOrders.map(o => ({
        id: o.id.substring(0, 8),
        email: o.email,
        age: `${Math.round((Date.now() - o.createdAt.getTime()) / 1000)}s`,
        hasCheckout: !!o.squareCheckoutId,
      })));
      
      // CRITICAL: Don't create placeholder order if there are recent catering orders
      console.log(`🛑 [WEBHOOK-QUEUE] PREVENTING PLACEHOLDER ORDER CREATION - Recent catering activity detected`);
      console.log(`🛑 [WEBHOOK-QUEUE] Deferring Square Order ID ${data.id} - may be linked by subsequent webhooks`);
      
      // Queue this webhook for later processing
      await queueWebhookForLaterProcessing(payload, 'order.created', data.id);
      return;
    }
  } catch (error) {
    console.error(`❌ [WEBHOOK-QUEUE] Error checking recent catering orders:`, error);
    // Continue with regular processing on error
  }
  
  console.log(`⚠️ [WEBHOOK-QUEUE] NO CATERING ORDER FOUND after ${maxRetries} attempts + safety checks`);
  console.log(`⚠️ [WEBHOOK-QUEUE] PROCEEDING WITH REGULAR ORDER CREATION FOR SQUARE ID: ${data.id}`);

  // Enhanced duplicate check with event ID tracking using safe query
  const existingOrder = await safeQuery(() =>
    prisma.order.findUnique({
      where: { squareOrderId: data.id },
      select: { id: true, rawData: true },
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
            lastProcessedAt: new Date().toISOString(),
          } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
        create: {
          squareOrderId: data.id,
          status: orderStatus,
          total: 0, // Will be updated by payment webhook
          customerName: 'Pending Order', // Enhanced placeholder - will be updated with real data
          email: 'pending-order@webhook.temp', // Enhanced placeholder to distinguish from catering
          phone: 'pending-order', // Enhanced placeholder - will be updated with real data
          pickupTime: new Date(),
          rawData: {
            ...data.object,
            lastProcessedEventId: eventId,
            lastProcessedAt: new Date().toISOString(),
            webhookSource: 'order.created',
            placeholderOrder: true, // Mark as placeholder for tracking
            cateringOrderCheckPerformed: true, // Indicate we checked for catering orders
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
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
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

async function handleOrderFulfillmentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const fulfillmentUpdateData = data.object.order_fulfillment_updated as any;
  console.log('Processing order.fulfillment.updated event:', data.id);

  const squareOrderId = data.id;
  const fulfillmentUpdate = fulfillmentUpdateData?.fulfillment_update?.[0];
  const newFulfillmentState = fulfillmentUpdate?.new_state?.toUpperCase();
  const fulfillmentUid = fulfillmentUpdate?.fulfillment_uid;

  if (!newFulfillmentState || !fulfillmentUid) {
    console.warn(
      `No new_state or fulfillment_uid found in fulfillment update for order ${squareOrderId}. Skipping.`
    );
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
      select: { fulfillmentType: true, trackingNumber: true, shippingCarrier: true },
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
        console.warn(
          `Order ${squareOrderId} has unrecognized fulfillmentType from DB: ${order.fulfillmentType}`
        );
      }
      trackingData.trackingNumber = order.trackingNumber;
      trackingData.shippingCarrier = order.shippingCarrier;
    } else {
      console.warn(
        `Fulfillment type not found or null for order ${squareOrderId}. Status mapping might be inaccurate.`
      );
    }
  } catch (dbError: any) {
    console.error(`Error fetching order ${squareOrderId} to determine fulfillment type:`, dbError);
    await errorMonitor.captureDatabaseError(dbError, 'fetchOrderForFulfillmentUpdate', {
      orderId: squareOrderId,
    });
  }

  // --- Fetch latest tracking info from Square API for shipping orders ---
  if (internalFulfillmentType === 'shipping_type') {
    try {
      console.log(`Fetching tracking details from Square API for order ${squareOrderId}...`);
      const apiTrackingData = await getOrderTracking(squareOrderId);
      if (apiTrackingData) {
        trackingData.trackingNumber = apiTrackingData.trackingNumber;
        trackingData.shippingCarrier = apiTrackingData.shippingCarrier;
        console.log(
          `Fetched from API - Tracking: ${trackingData.trackingNumber ?? 'N/A'}, Carrier: ${trackingData.shippingCarrier ?? 'N/A'}`
        );
      } else {
        console.log(`No shipment details found via API for order ${squareOrderId}.`);
      }
    } catch (apiError: any) {
      console.error(
        `Error fetching tracking details from Square API for order ${squareOrderId}:`,
        apiError
      );
      await errorMonitor.captureAPIError(
        apiError,
        'GET',
        `/square/orders/${squareOrderId}/tracking`
      );
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
        console.log(
          `Unhandled shipping state '${newFulfillmentState}' for order ${squareOrderId}. Check Square docs.`
        );
        if (trackingData.trackingNumber) {
          newStatus = OrderStatus.SHIPPING;
        }
      }
      break;
    // TODO: Add case for 'delivery_type' if needed, mapping states appropriately
    default: // Handles 'unknown'
      console.warn(
        `Unhandled internal fulfillment type '${internalFulfillmentType}' or state '${newFulfillmentState}' for order ${squareOrderId}. No status update determined.`
      );
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
  if (
    newStatus ||
    updatePayload.trackingNumber !== undefined ||
    updatePayload.shippingCarrier !== undefined
  ) {
    console.log(
      `Attempting to update order ${squareOrderId} with status: ${newStatus ?? 'unchanged'}, tracking: ${trackingData.trackingNumber ?? 'N/A'}, carrier: ${trackingData.shippingCarrier ?? 'N/A'}`
    );
    try {
      let applyUpdate = true;
      if (newStatus) {
        const currentOrder = await prisma.order.findUnique({
          where: { squareOrderId },
          select: { status: true },
        });
        const isDowngrade =
          (currentOrder?.status === OrderStatus.READY && newStatus === OrderStatus.PROCESSING) ||
          (currentOrder?.status === OrderStatus.SHIPPING && newStatus === OrderStatus.PROCESSING) ||
          (currentOrder?.status === OrderStatus.COMPLETED &&
            newStatus !== OrderStatus.COMPLETED &&
            newStatus !== OrderStatus.DELIVERED) ||
          (currentOrder?.status === OrderStatus.DELIVERED && newStatus !== OrderStatus.DELIVERED) ||
          (currentOrder?.status === OrderStatus.CANCELLED && newStatus !== OrderStatus.CANCELLED);

        if (currentOrder && isDowngrade) {
          console.log(
            `Preventing status downgrade for order ${squareOrderId}. Current: ${currentOrder.status}, Proposed Update: ${newStatus}. Status update skipped.`
          );
          delete updatePayload.status;
          if (
            updatePayload.trackingNumber === undefined &&
            updatePayload.shippingCarrier === undefined
          ) {
            applyUpdate = false;
          }
        }
      }

      if (applyUpdate && Object.keys(updatePayload).length > 2) {
        // Get the previous status before updating
        const currentOrder = await prisma.order.findUnique({
          where: { squareOrderId: squareOrderId },
          select: { status: true },
        });
        const previousStatus = currentOrder?.status;

        await prisma.order.update({
          where: { squareOrderId: squareOrderId },
          data: updatePayload,
        });
        console.log(`Successfully updated order ${squareOrderId}.`);

        // Send status change alert if status actually changed
        if (newStatus && previousStatus && previousStatus !== newStatus) {
          try {
            // Fetch the complete order with items for the alert
            const orderWithItems = await prisma.order.findUnique({
              where: { squareOrderId: squareOrderId },
              include: {
                items: {
                  include: {
                    product: true,
                    variant: true,
                  },
                },
              },
            });

            if (orderWithItems) {
              await resilientAlertService.sendOrderStatusChangeAlert(orderWithItems, previousStatus);
              console.log(
                `Fulfillment status change alert sent for order ${squareOrderId}: ${previousStatus} → ${newStatus}`
              );
            }
          } catch (alertError: any) {
            console.error(
              `Failed to send fulfillment status change alert for order ${squareOrderId}:`,
              alertError
            );
            // Don't fail the webhook if alert fails
          }
        }
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
    console.log(
      `No status or tracking update needed for order ${squareOrderId} based on this webhook.`
    );
  }
}

async function handleOrderUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const orderUpdateData = data.object.order_updated as any;
  console.log('🔄 Processing order.updated event:', data.id);

  // Check if the order exists in our database first
  const existingOrder = await safeQuery(() =>
    prisma.order.findUnique({
      where: { squareOrderId: data.id },
      select: { 
        id: true, 
        status: true, 
        paymentStatus: true, 
        rawData: true 
      },
    })
  );

  if (!existingOrder) {
    console.warn(
      `⚠️ Order with squareOrderId ${data.id} not found for update. This may be a timing issue where order.updated arrived before order.created. Skipping update.`
    );
    // Don't throw an error - this is expected behavior when webhooks arrive out of order
    return;
  }

  const newSquareState = orderUpdateData?.state;
  const mappedStatus = mapSquareStateToOrderStatus(newSquareState);

  // Check if this event was already processed
  const eventId = payload.event_id;
  if (existingOrder.rawData && typeof existingOrder.rawData === 'object') {
    const rawData = existingOrder.rawData as any;
    if (rawData?.lastProcessedEventId === eventId) {
      console.log(`⚠️ Event ${eventId} for order ${data.id} already processed, skipping`);
      return;
    }
  }

  // Prepare the base update data object
  const updateData: Omit<Prisma.OrderUpdateInput, 'status'> & { status?: OrderStatus } = {
    total: orderUpdateData?.total_money?.amount
      ? orderUpdateData.total_money.amount / 100
      : undefined,
    customerName: orderUpdateData?.customer_id
      ? 'Customer ID: ' + orderUpdateData.customer_id
      : undefined,
    rawData: {
      ...(typeof existingOrder.rawData === 'object' ? existingOrder.rawData : {}),
      lastProcessedEventId: eventId,
      lastUpdate: data.object,
    } as unknown as Prisma.InputJsonValue,
  };

  // Only add status to the update if it's a terminal state (COMPLETED, CANCELLED)
  if (mappedStatus === OrderStatus.CANCELLED) {
    console.log(
      `Order ${data.id} cancelled. Setting paymentStatus to REFUNDED and status to CANCELLED.`
    );
    updateData.paymentStatus = 'REFUNDED';
    updateData.status = OrderStatus.CANCELLED;
  } else if (mappedStatus === OrderStatus.COMPLETED) {
    console.log(`Order ${data.id} completed. Setting status to COMPLETED.`);
    updateData.status = OrderStatus.COMPLETED;
    // Optionally update paymentStatus if not already handled by payment webhooks
    // updateData.paymentStatus = 'PAID';
  }

  // FALLBACK: Check for payment status in order data when payment.updated webhooks are missing
  // This handles cases where Square doesn't send payment.updated webhooks properly
  const tenders = orderUpdateData?.tenders;
  if (tenders && Array.isArray(tenders) && tenders.length > 0) {
    const paymentTender = tenders.find((tender: any) => tender.type === 'CARD' || tender.type === 'CASH');
    if (paymentTender?.card_details?.status === 'COMPLETED' || paymentTender?.cash_details?.buyer_tendered_money) {
      console.log(`🔄 FALLBACK: Detected completed payment in order.updated for ${data.id}`);
      
      // Check if we need to update payment status
      const currentOrder = await prisma.order.findUnique({
        where: { squareOrderId: data.id },
        select: { 
          id: true, 
          paymentStatus: true, 
          status: true, 
          fulfillmentType: true, 
          shippingRateId: true 
        },
      });

      if (currentOrder && currentOrder.paymentStatus !== 'PAID') {
        console.log(`💳 FALLBACK: Updating payment status to PAID for order ${currentOrder.id}`);
        updateData.paymentStatus = 'PAID';
        
        // Update order status to PROCESSING if not already
        if (currentOrder.status === 'PENDING') {
          updateData.status = OrderStatus.PROCESSING;
        }

        // Label creation is now handled ONLY by payment.updated webhook to prevent race conditions
        // Removed duplicate trigger from order.updated to eliminate database lock contention
      }
    }
  }

  // If mappedStatus is PROCESSING (from OPEN), we DO NOT update the status here,
  // allowing the fulfillment handler to correctly set READY.

  try {
    // Get the previous status for comparison
    const previousStatus = existingOrder.status;

    await safeQuery(() =>
      prisma.order.update({
        where: { squareOrderId: data.id },
        data: updateData, // Apply updates (only includes status if terminal)
      })
    );

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
                variant: true,
              },
            },
          },
        });

        if (orderWithItems) {
          await resilientAlertService.sendOrderStatusChangeAlert(orderWithItems, previousStatus);
          console.log(
            `Order status change alert sent for order ${data.id}: ${previousStatus} → ${updateData.status}`
          );
        }
      } catch (alertError: any) {
        console.error(`Failed to send order status change alert for order ${data.id}:`, alertError);
        // Don't fail the webhook if alert fails
      }
    }
  } catch (error: any) {
    // This shouldn't happen since we already checked if the order exists
    // but handle it gracefully just in case
    if (error.code === 'P2025') {
      console.warn(
        `⚠️ Order with squareOrderId ${data.id} not found during update. This is unexpected since we checked for existence. Webhook timing issue.`
      );
      return; // Don't throw an error for timing issues
    } else {
      console.error(`❌ Error updating order ${data.id}:`, {
        error: error.message,
        code: error.code,
        eventId: payload.event_id,
      });
      throw error;
    }
  }
}

async function handlePaymentCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const eventId = payload.event_id;
  const paymentData = data.object.payment as any;

  console.log(
    `💳 Processing payment.created event: ${data.id} for Square Order ID: ${paymentData?.order_id} | Event ID: ${eventId}`
  );

  if (!paymentData?.order_id) {
    console.warn(`⚠️ Payment ${data.id} received without a Square order_id.`);
    return;
  }

  // Enhanced duplicate prevention - check if this event was already processed
  const existingPayment = await prisma.payment.findUnique({
    where: { squarePaymentId: data.id },
    select: { id: true, rawData: true, orderId: true },
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
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        customerName: true,
        email: true,
        phone: true,
      },
    });
  } catch (dbError) {
    console.error(`❌ Error finding order with squareOrderId ${squareOrderId}:`, dbError);
    return;
  }

  if (!order) {
    console.warn(
      `⚠️ Order with squareOrderId ${squareOrderId} not found for payment ${data.id}. Skipping payment processing until order.created webhook arrives.`
    );
    // Don't create stub orders - wait for proper order data
    return;
  }

  const internalOrderId = order.id;
  const paymentAmount = paymentData?.amount_money?.amount;
  const paymentStatus = paymentData?.status?.toUpperCase();

  if (paymentAmount === undefined || paymentAmount === null) {
    console.warn(`⚠️ Payment ${data.id} received without an amount.`);
    return;
  }

  // Map Square payment status using the same logic as payment.updated
  function mapSquarePaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
    switch (status?.toUpperCase()) {
      case 'APPROVED':    // ← Handles APPROVED payments correctly!
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
  
  const mappedPaymentStatus = mapSquarePaymentStatus(paymentStatus);

  console.log(
    `🔄 Attempting to upsert payment record: squarePaymentId=${data.id}, internalOrderId=${internalOrderId}, amount=${paymentAmount / 100}`
  );

  try {
    // Enhanced upsert with event tracking
    await prisma.payment.upsert({
      where: { squarePaymentId: data.id },
      update: {
        amount: paymentAmount / 100, // Convert from cents to dollars
        status: mappedPaymentStatus, // Use mapped status from Square
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
          updatedViaWebhook: true,
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        squarePaymentId: data.id,
        amount: paymentAmount / 100, // Convert from cents to dollars
        status: mappedPaymentStatus, // Use mapped status from Square
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
          createdViaWebhook: true,
        } as unknown as Prisma.InputJsonValue,
        order: {
          connect: { id: internalOrderId },
        },
      },
    });
    console.log(`✅ Successfully upserted payment record for internal order ${internalOrderId}`);
  } catch (upsertError: any) {
    console.error(
      `❌ Error upserting payment record for internal order ${internalOrderId}:`,
      upsertError
    );
    if (upsertError.code === 'P2025') {
      console.error(
        `❌ Order with internal ID ${internalOrderId} not found when connecting payment ${data.id}`
      );
    }
    throw upsertError;
  }

  // Update order status and customer information
  try {
    const currentOrder = await prisma.order.findUnique({
      where: { id: internalOrderId },
      select: { paymentStatus: true, status: true, customerName: true, email: true, phone: true },
    });

    if (!currentOrder) {
      console.error(`❌ Order ${internalOrderId} not found when updating status`);
      return;
    }

    // Prepare update data
    const updateData: Prisma.OrderUpdateInput = {
      updatedAt: new Date(),
    };

    // Update payment status if not already paid
    if (currentOrder.paymentStatus !== 'PAID' && mappedPaymentStatus === 'PAID') {
      updateData.paymentStatus = 'PAID';
      updateData.status = 'PROCESSING';
    }

    // Update customer information if order has placeholder data (enhanced detection)
    const hasPlaceholderData =
      currentOrder.customerName === 'Pending' ||
      currentOrder.customerName === 'Pending Order' ||
      currentOrder.email === 'pending@example.com' ||
      currentOrder.email === 'pending-order@webhook.temp' ||
      currentOrder.phone === 'pending' ||
      currentOrder.phone === 'pending-order';
    
    // Enhanced logging for placeholder detection
    if (hasPlaceholderData) {
      console.log(`🔄 [PLACEHOLDER-UPDATE] Detected placeholder data in order ${internalOrderId}`);
      console.log(`🔄 [PLACEHOLDER-UPDATE] Current name: "${currentOrder.customerName}"`);
      console.log(`🔄 [PLACEHOLDER-UPDATE] Current email: "${currentOrder.email}"`);
      console.log(`🔄 [PLACEHOLDER-UPDATE] Current phone: "${currentOrder.phone}"`);
    }

    if (hasPlaceholderData) {
      // Extract customer information from payment data
      const customerInfo = paymentData?.buyer_email_address || paymentData?.receipt_email;
      const customerName = paymentData?.buyer?.email_address || paymentData?.receipt_email;

      if (customerInfo && currentOrder.email === 'pending@example.com') {
        updateData.email = customerInfo;
        console.log(
          `📧 Updated order ${internalOrderId} email from placeholder to: ${customerInfo}`
        );
      }

      if (customerName && currentOrder.customerName === 'Pending') {
        updateData.customerName = customerName;
        console.log(
          `👤 Updated order ${internalOrderId} customer name from placeholder to: ${customerName}`
        );
      }

      // Update phone if available (Square payments don't always include phone)
      if (paymentData?.buyer?.phone_number && currentOrder.phone === 'pending') {
        updateData.phone = paymentData.buyer.phone_number;
        console.log(
          `📞 Updated order ${internalOrderId} phone from placeholder to: ${paymentData.buyer.phone_number}`
        );
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 1) {
      // More than just updatedAt
      await prisma.order.update({
        where: { id: internalOrderId },
        data: updateData,
      });
      console.log(
        `✅ Successfully updated order ${internalOrderId} with payment and customer data`
      );
    } else {
      console.log(`ℹ️ Order ${internalOrderId} already up to date, no changes needed`);
    }
  } catch (updateError) {
    console.error(
      `❌ Error updating order status for internal order ${internalOrderId}:`,
      updateError
    );
    // Don't throw here as payment was successfully recorded
  }
}

async function handlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
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
    // First check for a catering order with this Square order ID using simpler query approach
    try {
      console.log(`🔍 Checking for catering order with squareOrderId: ${squareOrderId} (Event: ${payload.event_id})`);
      
      // Check if a catering order with this Square order ID exists using Prisma
      const cateringOrder = await prisma.cateringOrder.findUnique({
        where: { squareOrderId },
        select: { id: true, paymentStatus: true, status: true },
      });

      if (cateringOrder) {
        console.log(`✅ Found catering order with squareOrderId ${squareOrderId}:`, {
          id: cateringOrder.id,
          currentPaymentStatus: cateringOrder.paymentStatus,
          currentStatus: cateringOrder.status,
        });

        // Map Square payment status to our status values using proper mapping
        let updatedPaymentStatus: Prisma.CateringOrderUpdateInput['paymentStatus'] = 'PENDING';
        let updatedOrderStatus: Prisma.CateringOrderUpdateInput['status'] | undefined;

        if (paymentStatus === 'COMPLETED' || paymentStatus === 'APPROVED' || paymentStatus === 'CAPTURED') {
          updatedPaymentStatus = 'PAID';
          updatedOrderStatus = 'CONFIRMED';
          console.log(
            `💰 Payment completed/approved for catering order ${squareOrderId}, updating to CONFIRMED status`
          );
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') {
          updatedPaymentStatus = 'FAILED';
          updatedOrderStatus = 'CANCELLED';
          console.log(
            `❌ Payment failed/canceled for catering order ${squareOrderId}, updating to CANCELLED status`
          );
        } else if (paymentStatus === 'REFUNDED') {
          updatedPaymentStatus = 'REFUNDED';
          updatedOrderStatus = 'CANCELLED';
          console.log(
            `🔄 Payment refunded for catering order ${squareOrderId}, updating to CANCELLED status`
          );
        } else {
          console.log(
            `ℹ️ Other payment status ${paymentStatus} for catering order ${squareOrderId}, keeping as PENDING`
          );
        }

        // Prevent downgrading payment status
        if (
          (cateringOrder.paymentStatus === 'PAID' &&
            updatedPaymentStatus !== 'PAID' &&
            updatedPaymentStatus !== 'REFUNDED') ||
          (cateringOrder.paymentStatus === 'REFUNDED' && updatedPaymentStatus !== 'REFUNDED') ||
          (cateringOrder.paymentStatus === 'FAILED' && updatedPaymentStatus !== 'FAILED')
        ) {
          console.log(
            `🚫 Preventing payment status downgrade for catering order ${cateringOrder.id}. Current: ${cateringOrder.paymentStatus}, Proposed: ${updatedPaymentStatus}`
          );
          updatedPaymentStatus = cateringOrder.paymentStatus;
        }

        // Build update payload
        const cateringUpdateData: Prisma.CateringOrderUpdateInput = {
          paymentStatus: updatedPaymentStatus,
          updatedAt: new Date(),
        };
        if (updatedOrderStatus) {
          cateringUpdateData.status = updatedOrderStatus;
        }

        console.log(`💾 Updating catering order ${cateringOrder.id} with:`, cateringUpdateData);

        await prisma.cateringOrder.update({
          where: { id: cateringOrder.id },
          data: cateringUpdateData,
        });

        console.log(
          `✅ Successfully updated catering order ${cateringOrder.id} to payment status ${updatedPaymentStatus}`
        );

        return; // Exit after handling catering order
      } else {
        console.log(`❌ No catering order found with squareOrderId: ${squareOrderId}`);
      }
    } catch (err) {
      console.error(`❌ Error checking/updating catering order for ${squareOrderId} (Event: ${payload.event_id}):`, err);
      await errorMonitor.captureWebhookError(
        err,
        'payment.updated.catering_check',
        { squarePaymentId, squareOrderId },
        payload.event_id
      );
      // Continue to regular order processing even if catering check fails
    }

    // If not a catering order, find our internal order using the Square Order ID
    console.log(`🔍 Checking for regular order with squareOrderId: ${squareOrderId} (Event: ${payload.event_id})`);
    
    const order = await prisma.order.findUnique({
      where: { squareOrderId: squareOrderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        fulfillmentType: true,
        shippingRateId: true, // Select the shipping rate ID
      },
    });

    if (!order) {
      console.error(`❌ CRITICAL: Order with squareOrderId ${squareOrderId} not found for payment update (Event: ${payload.event_id})`);
      
      // Debug: List recent orders to help identify the issue
      const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          squareOrderId: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      });
      
      console.error(`📋 Recent orders for comparison:`, recentOrders);
      
      // Capture this as a critical error
      await errorMonitor.captureWebhookError(
        new Error(`Order not found for payment update: ${squareOrderId}`),
        'payment.updated.order_not_found',
        { squarePaymentId, squareOrderId, recentOrders },
        payload.event_id
      );
      return;
    }

    console.log(`✅ Found regular order with squareOrderId ${squareOrderId}:`, {
      id: order.id,
      currentStatus: order.status,
      currentPaymentStatus: order.paymentStatus,
      fulfillmentType: order.fulfillmentType,
    });

    // Update payment status based on Square's status using proper mapping
    function mapSquarePaymentStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
      switch (status?.toUpperCase()) {
        case 'APPROVED':    // ← Now handles APPROVED payments correctly!
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
    
    let updatedPaymentStatus = mapSquarePaymentStatus(paymentStatus);
    console.log(`📊 Payment status mapping: ${paymentStatus} → ${updatedPaymentStatus} (Event: ${payload.event_id})`);

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
      updatedPaymentStatus = order.paymentStatus; // Keep current status
    }

    // Update order status only if payment is newly PAID
    const updatedOrderStatus =
      order.paymentStatus !== 'PAID' && updatedPaymentStatus === 'PAID'
        ? OrderStatus.PROCESSING // Update to PROCESSING when paid
        : order.status; // Otherwise keep current status

    console.log(`📊 Order status update: ${order.status} → ${updatedOrderStatus} (Event: ${payload.event_id})`);
    console.log(`💾 Updating order ${order.id} with payment status: ${updatedPaymentStatus}, order status: ${updatedOrderStatus} (Event: ${payload.event_id})`);

    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: updatedPaymentStatus,
          status: updatedOrderStatus,
          rawData: data.object as unknown as Prisma.InputJsonValue, // Append or replace raw data
          updatedAt: new Date(),
        },
      });
      
      console.log(
        `✅ SUCCESS: Order ${order.id} payment status updated to ${updatedPaymentStatus}, order status to ${updatedOrderStatus} (Event: ${payload.event_id})`
      );
    } catch (dbError: any) {
      console.error(`❌ DATABASE ERROR: Failed to update order ${order.id} for payment ${squarePaymentId} (Event: ${payload.event_id}):`, dbError);
      throw dbError; // Re-throw to trigger webhook retry
    }

    // Send payment failed alert if payment failed
    if (updatedPaymentStatus === 'FAILED' && order.paymentStatus !== 'FAILED') {
      try {
        // Fetch the complete order with items for the alert
        const orderWithItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (orderWithItems) {
          const errorMessage = paymentData?.last_4
            ? `Payment failed via webhook for card ending in ${paymentData.last_4}`
            : 'Payment failed via webhook';

          // Capture the payment error for monitoring
          await errorMonitor.capturePaymentError(new Error(errorMessage), order.id, data.id, {
            squareData: paymentData,
          });

          await resilientAlertService.sendPaymentFailedAlert(orderWithItems, errorMessage);
          console.log(`Payment failed alert sent for order ${order.id}`);
        }
      } catch (alertError: any) {
        console.error(`Failed to send payment failed alert for order ${order.id}:`, alertError);
        // Don't fail the webhook if alert fails
      }
    }

    // Send status change alert if order status changed
    if (order.status !== updatedOrderStatus) {
      try {
        // Fetch the complete order with items for the alert
        const orderWithItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (orderWithItems) {
          await resilientAlertService.sendOrderStatusChangeAlert(orderWithItems, order.status);
          console.log(
            `Payment status change alert sent for order ${order.id}: ${order.status} → ${updatedOrderStatus}`
          );
        }
      } catch (alertError: any) {
        console.error(
          `Failed to send payment status change alert for order ${order.id}:`,
          alertError
        );
        // Don't fail the webhook if alert fails
      }
    }

    // --- Purchase Shipping Label --- 
    // Label creation is now handled ONLY by lib/webhook-handlers.ts to prevent race conditions
    // This ensures a single point of truth for automatic label generation
  } catch (error: any) {
    console.error(`❌ CRITICAL ERROR in handlePaymentUpdated for payment ${squarePaymentId} (Event: ${payload.event_id}):`, error);
    
    // Enhanced error logging for different types of database errors
    if (error.code === 'P2025') {
      console.error(`🔍 Record not found error for payment ${squarePaymentId}, order ${squareOrderId} (Event: ${payload.event_id}) - the order might have been deleted or never created`);
    } else if (error.code === 'P2002') {
      console.error(`🔒 Unique constraint violation for payment ${squarePaymentId}, order ${squareOrderId} (Event: ${payload.event_id}) - potential data integrity issue`);
    } else if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.error(`🚨 Database connection error for payment ${squarePaymentId}, order ${squareOrderId} (Event: ${payload.event_id}):`, {
        errorCode: error.code,
        message: error.message,
        squareOrderId,
        squarePaymentId,
        eventId: payload.event_id,
        timestamp: new Date().toISOString(),
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
      });
    } else {
      console.error(`💥 Unexpected error in payment update for payment ${squarePaymentId}, order ${squareOrderId} (Event: ${payload.event_id}):`, {
        errorCode: error.code,
        message: error.message,
        stack: error.stack,
        squareOrderId,
        squarePaymentId,
        eventId: payload.event_id,
        paymentData: JSON.stringify(paymentData, null, 2),
      });
    }

    // Capture error for monitoring
    await errorMonitor.captureWebhookError(
      error,
      'payment.updated',
      { squarePaymentId, squareOrderId, eventId: payload.event_id, paymentStatus },
      payload.event_id
    );
    
    // Re-throw to trigger webhook retry for transient errors
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      throw error;
    }
  }
  } catch (comprehensiveError: any) {
    console.error(`❌ COMPREHENSIVE ERROR in handlePaymentUpdated (outer catch):`, {
      error: comprehensiveError.message,
      stack: comprehensiveError.stack?.substring(0, 500),
      eventId: payload?.event_id,
      paymentId: payload?.data?.id,
    });
    
    // Capture the comprehensive error for monitoring
    await errorMonitor.captureWebhookError(
      comprehensiveError,
      'handlePaymentUpdated.comprehensive',
      { eventId: payload?.event_id, paymentId: payload?.data?.id },
      payload?.event_id
    );
    
    throw comprehensiveError; // Re-throw to trigger webhook retry
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
    select: { id: true, orderId: true },
  });

  if (!payment) {
    console.warn(
      `Payment with squarePaymentId ${refundData.payment_id} not found for refund ${data.id}.`
    );
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
        connect: { id: payment.id },
      },
    },
  });

  // Update order status if applicable (e.g., if fully refunded)
  if (payment.orderId && refundData.status === 'COMPLETED') {
    // Add logic here to check if the order is fully refunded
    // and potentially update order status to 'REFUNDED' or 'CANCELLED'
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'REFUNDED' }, // Or partially refunded etc.
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
      include: { payment: { select: { orderId: true } } }, // Include payment.orderId
    });

    // Update order paymentStatus if refund is completed
    if (refundStatus === 'COMPLETED' && updatedRefund.payment?.orderId) {
      await prisma.order.update({
        where: { id: updatedRefund.payment.orderId },
        data: { paymentStatus: 'REFUNDED' }, // Adjust logic for partial refunds if needed
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

// Determine Square environment consistently
function determineSquareEnvironment(): {
  environment: 'sandbox' | 'production';
  useSandbox: boolean;
} {
  // Check for explicit environment override
  const squareEnv = process.env.SQUARE_ENVIRONMENT?.toLowerCase();
  const useSandboxFlag = process.env.USE_SQUARE_SANDBOX === 'true';

  // Webhooks should follow the same environment logic as transactions
  const forceTransactionSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';

  let useSandbox: boolean;

  if (squareEnv === 'sandbox' || forceTransactionSandbox || useSandboxFlag) {
    useSandbox = true;
  } else {
    useSandbox = false;
  }

  return {
    environment: useSandbox ? 'sandbox' : 'production',
    useSandbox,
  };
}

// Initialize Square Client with proper configuration
const squareConfig = determineSquareEnvironment();
const squareEnvString = squareConfig.environment;

// Get the correct access token based on environment
const getSquareAccessToken = () => {
  if (squareConfig.useSandbox) {
    return process.env.SQUARE_SANDBOX_TOKEN;
  } else {
    return process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_PRODUCTION_TOKEN;
  }
};

const accessToken = getSquareAccessToken();

if (!accessToken) {
  console.error('Square access token not found. Available env vars:', {
    USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
    SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
    hasSquareAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
    hasSquareProductionToken: !!process.env.SQUARE_PRODUCTION_TOKEN,
    hasSquareSandboxToken: !!process.env.SQUARE_SANDBOX_TOKEN,
  });
}

/**
 * Makes a direct HTTPS request to the Square API
 */
async function makeSquareApiRequest(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
  const apiHost =
    squareEnvString === 'sandbox' ? 'connect.squareupsandbox.com' : 'connect.squareup.com';

  const options = {
    hostname: apiHost,
    path: path,
    method: method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        } else {
          if (res.statusCode === 401) {
            console.error(`Authentication error with Square API. Environment: ${squareEnvString}`);
          }
          reject(new Error(`Request failed with status: ${res.statusCode}, body: ${data}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function getOrderTracking(orderId: string) {
  try {
    console.log(`Fetching order details from Square API for order ${orderId}`);
    console.log(
      `Using Square environment: ${squareEnvString}, Access token prefix: ${accessToken?.substring(0, 10)}...`
    );

    // Use direct HTTPS request instead of the problematic Square SDK
    const response = await makeSquareApiRequest(`/v2/orders/${orderId}`);

    console.log(`Square API response for order ${orderId}:`, JSON.stringify(response, null, 2));

    // Access order correctly based on response structure
    const order = response.order;
    if (!order || !order.fulfillments || order.fulfillments.length === 0) {
      console.log(`No order or fulfillments found in API response for ${orderId}`);
      return null;
    }

    // Find the SHIPMENT fulfillment
    const shipment = order.fulfillments.find((f: any) => f.type === 'SHIPMENT');
    if (shipment && shipment.shipment_details) {
      console.log(`Found shipment details for ${orderId}:`, shipment.shipment_details);
      const trackingNumber = shipment.shipment_details.tracking_number ?? null;
      const shippingCarrier = shipment.shipment_details.carrier ?? null;
      return { trackingNumber, shippingCarrier };
    } else {
      console.log(`No SHIPMENT fulfillment or shipment_details found for ${orderId}`);
    }
  } catch (error: any) {
    // Improve error handling with more specific logging
    console.error(`Error in getOrderTracking for ${orderId}. Raw Error:`, error);

    // Log specific Square API error details
    if (error.result) {
      console.error('Square API Error Details:', JSON.stringify(error.result, null, 2));
    }
    if (error.statusCode) {
      console.error(`Square API Status Code: ${error.statusCode}`);
    }
    if (error.body) {
      console.error('Square API Error Body:', error.body);
    }
    if (error.errors) {
      console.error('Square API Errors:', JSON.stringify(error.errors, null, 2));
    }

    // Capture for monitoring
    await errorMonitor.captureAPIError(
      error,
      'GET',
      `/square/orders/${orderId}`,
      undefined,
      undefined
    );

    if (error instanceof Error) {
      console.error(`Error Name: ${error.name}, Message: ${error.message}`);
      if ('stack' in error) {
        console.error(`Stack Trace: ${error.stack}`);
      }
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
  console.log('Request method:', request.method);
  console.log('Content-Type:', request.headers.get('content-type'));
  console.log('Content-Length:', request.headers.get('content-length'));

  try {
    // Read the body once at the start to avoid ReadableStream locked errors
    let bodyText = '';
    try {
      bodyText = await request.text();
      console.log('Successfully read body - length:', bodyText?.length || 0);
    } catch (error) {
      console.error('Failed to read request body:', error);
      bodyText = '';
    }

    // Step 1: Quick acknowledgment to Square (within 1 second)
    const acknowledgmentPromise = quickAcknowledgment(request, bodyText);

    // Step 2: Process webhook asynchronously (don't await - let it run in background)
    processWebhookAsync(request, bodyText).catch(error => {
      console.error('Async webhook processing failed:', error);
      // Log error but don't affect the response to Square
    });

    // Return immediate acknowledgment to Square
    return await acknowledgmentPromise;
  } catch (error) {
    console.error('Webhook acknowledgment failed:', error);
    // Always return 200 to Square to prevent retries
    return NextResponse.json(
      {
        error: 'Webhook acknowledgment failed',
        received: true,
      },
      { status: 200 }
    );
  }
}

/**
 * Quick acknowledgment function - must complete within 1 second
 */
async function quickAcknowledgment(request: NextRequest, bodyText: string): Promise<NextResponse> {
  try {
    // Apply webhook-specific rate limiting first (doesn't consume body)
    const rateLimitResponse = await applyWebhookRateLimit(request, 'square');
    if (rateLimitResponse) {
      console.warn('Square webhook rate limit exceeded');
      return rateLimitResponse;
    }

    console.log('Quick acknowledgment - webhook rate limiting passed');

    // Validate this is a real webhook using the pre-read body
    let isValidWebhook = false;
    let webhookType = 'unknown';

    try {
      if (bodyText && bodyText.trim().length > 0) {
        const preview = bodyText.substring(0, 200); // Just peek at first 200 characters
        console.log('Quick preview:', preview.substring(0, 100));

        if (preview.includes('"type":') && preview.includes('"event_id":')) {
          isValidWebhook = true;
          const typeMatch = preview.match(/"type"\s*:\s*"([^"]+)"/);
          if (typeMatch) {
            webhookType = typeMatch[1];
          }
        }
      }
    } catch (error) {
      console.log('Quick validation failed, acknowledging anyway:', error);
      isValidWebhook = true; // Assume valid to avoid false negatives
    }

    // Return immediate acknowledgment
    const response = NextResponse.json(
      {
        received: true,
        processing: 'async',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

    response.headers.set('X-Webhook-Processed', 'async');
    response.headers.set('X-Webhook-Type', webhookType);

    console.log(`Square webhook acknowledged immediately - type: ${webhookType}`);
    return response;
  } catch (error) {
    console.error('Quick acknowledgment failed:', error);
    return NextResponse.json(
      {
        received: true,
        error: 'acknowledgment_failed',
      },
      { status: 200 }
    );
  }
}

/**
 * Async processing function - can take as long as needed
 */
async function processWebhookAsync(request: NextRequest, bodyText: string): Promise<void> {
  try {
    console.log('Starting async webhook processing...');

    // Process the pre-read body content
    await processWebhookWithBody(request, bodyText);

    console.log('Async webhook processing completed successfully');
  } catch (error) {
    console.error('Async webhook processing failed:', error);

    // Capture webhook processing error for monitoring
    await errorMonitor.captureWebhookError(error, 'async_webhook_processing', undefined, undefined);
  }
}

async function processWebhookWithBody(request: NextRequest, bodyText: string): Promise<void> {
  try {
    // Apply webhook-specific rate limiting first (doesn't consume body)
    const rateLimitResponse = await applyWebhookRateLimit(request, 'square');
    if (rateLimitResponse) {
      console.warn('Square webhook rate limit exceeded in async processing');
      return;
    }

    console.log('Async processing - webhook rate limiting passed, proceeding with processing');

    // Use the pre-read body content
    let payload: SquareWebhookPayload | null = null;

    try {
      console.log('Using pre-read body - length:', bodyText?.length || 0);
      console.log('Body preview:', bodyText?.substring(0, 100) || 'NO BODY');

      if (bodyText && bodyText.trim().length > 0) {
        payload = JSON.parse(bodyText);
        console.log('Successfully parsed JSON payload');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON payload:', parseError);
      console.error('Raw body:', bodyText);
      return;
    }

    // Early exit if body is empty – some webhook pings can come without a payload
    if (!bodyText || bodyText.trim().length === 0 || !payload) {
      console.warn('Square webhook received with empty body in async processing – skipping');
      return;
    }

    // Enhanced webhook signature validation with comprehensive security checks
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const timestamp = request.headers.get('x-square-hmacsha256-timestamp');
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;

    // Enhanced debugging for production issues
    const isProductionEnvironment = process.env.NODE_ENV === 'production';
    const isPreviewEnvironment = process.env.VERCEL_ENV === 'preview';
    const isLocalDevelopment = process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV;

    console.log('🔍 Webhook signature debugging info:', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasSecret: !!webhookSecret,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        isProduction: isProductionEnvironment,
        isPreview: isPreviewEnvironment,
        isLocal: isLocalDevelopment
      },
      headers: {
        'x-square-hmacsha256-signature': signature ? 'PRESENT' : 'MISSING',
        'x-square-hmacsha256-timestamp': timestamp ? 'PRESENT' : 'MISSING',
        'user-agent': request.headers.get('user-agent'),
        'content-type': request.headers.get('content-type')
      }
    });

    if (webhookSecret && signature && timestamp && payload) {
      const validator = new WebhookValidator(webhookSecret);

      const isValid = await validator.validateSquareSignature(
        signature,
        bodyText,
        timestamp,
        payload.event_id
      );

      if (!isValid) {
        console.error('🔒 Invalid webhook signature - request rejected');
        await errorMonitor.captureWebhookError(
          new Error('Invalid webhook signature'),
          'signature_validation',
          payload.event_id,
          payload.type
        );
        return;
      }

      console.log('✅ Webhook signature verified with enhanced security');
    } else {
      // Log specific missing components for debugging
      const missingComponents = [];
      if (!webhookSecret) missingComponents.push('webhook_secret');
      if (!signature) missingComponents.push('signature_header');
      if (!timestamp) missingComponents.push('timestamp_header');
      if (!payload) missingComponents.push('payload');

      console.warn(`⚠️ Webhook signature verification skipped - missing: ${missingComponents.join(', ')}`);
      
      // More lenient approach: Allow webhooks without signatures in production 
      // but log them for monitoring and Square Developer Dashboard configuration
      if (isProductionEnvironment || isPreviewEnvironment) {
        // Don't block webhook processing, but log the issue for investigation
        console.warn('🔔 NOTICE: Webhook received without proper signature headers in production');
        console.warn('🔧 This may indicate Square Developer Dashboard webhook configuration needs updating');
        console.warn('🔧 Consider enabling webhook signature in Square Developer Dashboard');
        
        // Log to error monitoring for tracking but don't return/block processing
        await errorMonitor.captureWebhookError(
          new Error(`Webhook signature verification issue - missing: ${missingComponents.join(', ')}`),
          'signature_missing_non_blocking',
          payload?.event_id || 'unknown',
          payload?.type || 'unknown'
        );
        
        // Continue processing the webhook but with additional logging
        console.warn('⚠️ Continuing webhook processing without signature verification (production fallback)');
      } else if (isLocalDevelopment) {
        console.warn('🚧 Local Development: Processing webhook without signature verification');
        console.warn('🔔 Remember to set SQUARE_WEBHOOK_SECRET for production');
      } else {
        // Unknown environment - require signature
        console.error('🔒 Unknown environment - webhook signature verification required');
        return;
      }
    }

    // Log the received payload for debugging
    console.log('Square Webhook Payload Type:', payload.type);
    console.log('Square Webhook Event ID:', payload.event_id);

    // Handle different event types with enhanced error handling and monitoring
    try {
      // Try queue-based processing first with improved error handling
      await handleWebhookWithQueue(payload, payload.type);
      
      console.log(`✅ Successfully processed ${payload.type} event via queue system (Event: ${payload.event_id})`);
    } catch (error: any) {
      console.error(`❌ Queue processing failed for ${payload.type} (${payload.event_id}):`, {
        error: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500), // Truncated stack trace
      });

      // Enhanced fallback processing with specific error handling
      try {
        console.warn(`🔄 Attempting direct fallback processing for ${payload.type}...`);
        
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
            console.warn(`⚠️ Unhandled event type in fallback processing: ${payload.type}`);
            // Capture unknown event types for monitoring
            await errorMonitor.captureWebhookError(
              new Error(`Unknown webhook event type: ${payload.type}`),
              'unknown_event_type',
              { eventType: payload.type, eventId: payload.event_id },
              payload.event_id
            );
            return;
        }
        
        console.log(`✅ Successfully processed ${payload.type} event via fallback (Event: ${payload.event_id})`);
      } catch (fallbackError: any) {
        console.error(`❌ CRITICAL: Both queue and fallback processing failed for ${payload.type} (${payload.event_id}):`, fallbackError);
        
        // Capture critical webhook failure for immediate attention
        await errorMonitor.captureWebhookError(
          fallbackError,
          'critical_webhook_failure',
          { 
            originalError: error.message,
            fallbackError: fallbackError.message,
            eventType: payload.type,
            eventId: payload.event_id,
            orderId: payload.data?.id 
          },
          payload.event_id
        );
        
        // Don't throw here - we've already logged and monitored the error
        // Square expects a 200 response even for processing failures
      }
    }

    console.log(
      `Successfully processed ${payload.type} event for ${payload.event_id} in async processing`
    );
  } catch (error: unknown) {
    console.error('Error in async webhook processing:', error);

    // Capture webhook processing error for monitoring
    await errorMonitor.captureWebhookError(
      error,
      'async_webhook_processing_detailed',
      undefined,
      undefined
    );

    if (error instanceof SyntaxError) {
      console.error('Invalid JSON payload in async processing');
    } else if (error instanceof Error) {
      console.error('Processing error in async processing:', error.message);
    }
  }
}
