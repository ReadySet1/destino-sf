import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { safeQuery, safeTransaction } from '@/lib/db-utils';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AlertService } from '@/lib/alerts';
import { errorMonitor } from '@/lib/error-monitoring';
import { purchaseShippingLabel } from '@/app/actions/labels';
import { SquareClient, SquareEnvironment } from 'square';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { RequestDeduplicator, resourceKey } from '@/lib/concurrency/request-deduplicator';

// Deduplicator for payment webhook processing - prevents concurrent processing of same payment
// Uses longer TTL (2 minutes) to match the label purchase retry window
const paymentWebhookDeduplicator = new RequestDeduplicator({
  ttl: 120000, // 2 minutes
  logDuplicates: true,
});

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
      return OrderStatus.PENDING; // FIXED: OPEN means "awaiting payment", not "processing"
    case 'COMPLETED':
      return OrderStatus.COMPLETED;
    case 'CANCELED':
    case 'CANCELLED':
      return OrderStatus.CANCELLED;
    case 'DRAFT':
      return OrderStatus.PENDING;
    default:
      return OrderStatus.PENDING; // FIXED: Default to PENDING instead of PROCESSING
  }
}

/**
 * Helper function to get Square client instance
 * Respects sandbox/production configuration from environment variables
 */
function getSquareClient(): SquareClient {
  // Check if we're using sandbox mode
  const useSandbox =
    process.env.USE_SQUARE_SANDBOX === 'true' || process.env.SQUARE_ENVIRONMENT === 'sandbox';

  // Select the appropriate token and environment
  const accessToken = useSandbox
    ? process.env.SQUARE_SANDBOX_TOKEN
    : process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;

  const environment = useSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production;

  if (!accessToken) {
    const tokenName = useSandbox ? 'SQUARE_SANDBOX_TOKEN' : 'SQUARE_PRODUCTION_TOKEN';
    throw new Error(
      `Square access token not configured. Set ${tokenName} for ${environment} environment.`
    );
  }

  console.log(`🔧 [SQUARE-CLIENT] Creating Square client for ${environment} environment`);

  return new SquareClient({
    token: accessToken,
    environment: environment,
  });
}

/**
 * Fetch order from Square API and create it in our database
 * This handles orders created through Square POS or other external sources
 */
async function fetchAndCreateOrderFromSquare(squareOrderId: string): Promise<string | null> {
  try {
    console.log(`🔍 [ORDER-SYNC] Fetching order ${squareOrderId} from Square API...`);

    const squareClient = getSquareClient();
    const response = await squareClient.orders.get({ orderId: squareOrderId });

    if (!response.order) {
      console.error(`❌ [ORDER-SYNC] Order ${squareOrderId} not found in Square`);
      return null;
    }

    const squareOrder = response.order;
    console.log(`✅ [ORDER-SYNC] Retrieved order ${squareOrderId} from Square`, {
      state: squareOrder.state,
      totalMoney: squareOrder.totalMoney?.amount,
      source: squareOrder.source?.name || 'Unknown',
    });

    // Extract order details from Square order
    const orderStatus = mapSquareStateToOrderStatus(squareOrder.state || 'OPEN');
    const totalAmount = squareOrder.totalMoney?.amount
      ? Number(squareOrder.totalMoney.amount) / 100
      : 0;

    // Extract customer information
    const customerId = squareOrder.customerId || null;
    const customerName = squareOrder.source?.name || 'Square POS Customer';
    const customerEmail = 'pos-order@destinosf.com'; // Placeholder for POS orders
    const customerPhone = 'N/A'; // POS orders don't always have phone

    // Determine fulfillment type from order
    const fulfillmentType = squareOrder.fulfillments?.[0]?.type?.toLowerCase() || 'pickup';

    console.log(`📝 [ORDER-SYNC] Creating order in database...`, {
      squareOrderId,
      orderStatus,
      totalAmount,
      fulfillmentType,
      source: squareOrder.source?.name,
    });

    // Create the order in our database
    const createdOrder = await prisma.order.create({
      data: {
        squareOrderId: squareOrderId,
        status: orderStatus,
        total: totalAmount,
        customerName: customerName,
        email: customerEmail,
        phone: customerPhone,
        fulfillmentType: fulfillmentType,
        paymentStatus:
          squareOrder.state === 'COMPLETED' ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paymentMethod: 'SQUARE',
        rawData: {
          order: squareOrder,
          source: 'square_api',
          syncedAt: new Date().toISOString(),
          syncReason: 'order_not_found_in_webhook',
        } as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(`✅ [ORDER-SYNC] Successfully created order ${createdOrder.id} from Square API`);
    console.log(`📊 [ORDER-SYNC] Order source: ${squareOrder.source?.name || 'Unknown'}`);

    return createdOrder.id;
  } catch (error: any) {
    console.error(`❌ [ORDER-SYNC] Failed to fetch/create order ${squareOrderId} from Square:`, {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });

    // Don't throw - we'll retry via webhook queue
    return null;
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

  // FIXED: Check if this is likely a catering order by looking at recent activity
  const recentCateringCheck = await safeQuery(() =>
    prisma.cateringOrder.findFirst({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60000), // Last minute
        },
      },
      select: { id: true, squareOrderId: true },
    })
  );

  if (recentCateringCheck) {
    console.log(`⚠️ [WEBHOOK-HANDLERS] Recent catering activity detected.`);
    console.log(
      `⚠️ [WEBHOOK-HANDLERS] Skipping order creation for ${data.id} to prevent phantom orders.`
    );
    console.log(
      `⚠️ [WEBHOOK-HANDLERS] This webhook is likely for a catering order being processed.`
    );
    return;
  }

  // FIXED: For non-catering orders, only update if it exists - never create phantom orders
  if (existingOrder) {
    try {
      await safeQuery(() =>
        prisma.order.update({
          where: { squareOrderId: data.id },
          data: {
            status: orderStatus,
            rawData: {
              ...data.object,
              lastProcessedEventId: eventId,
              lastProcessedAt: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        })
      );
      console.log(`✅ Updated existing order ${data.id}`);
    } catch (updateError: any) {
      console.error(`❌ Error updating existing order ${data.id}:`, updateError);
      throw updateError;
    }
  } else {
    console.log(
      `⚠️ [WEBHOOK-HANDLERS] Order ${data.id} not found. Skipping creation to prevent phantom orders.`
    );
    console.log(
      `⚠️ [WEBHOOK-HANDLERS] Orders should only be created by the checkout flow, not webhooks.`
    );
    return;
  }

  try {
    // This block is now unreachable but preserved for reference

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
    total: orderUpdateData?.total_money?.amount
      ? orderUpdateData.total_money.amount / 100
      : undefined,
    customerName: orderUpdateData?.customer_id
      ? 'Customer ID: ' + orderUpdateData.customer_id
      : undefined,
    rawData: data.object as unknown as Prisma.InputJsonValue,
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
  }

  try {
    // First, check if the order exists to prevent race conditions
    const currentOrder = await withRetry(
      async () => {
        return await prisma.order.findUnique({
          where: { squareOrderId: data.id },
          select: { status: true },
        });
      },
      3,
      'findOrderForExistence'
    );

    // If order doesn't exist, skip processing and wait for order.created webhook
    if (!currentOrder) {
      console.warn(
        `⚠️ Order with squareOrderId ${data.id} not found for order update. Skipping processing until order.created webhook arrives.`
      );
      return;
    }

    // Get the previous status for status change alerts
    const previousStatus = currentOrder.status;

    await withRetry(
      async () => {
        return await prisma.order.update({
          where: { squareOrderId: data.id },
          data: updateData, // Apply updates (only includes status if terminal)
        });
      },
      3,
      'updateOrderData'
    );

    // Send status change alert for terminal states (COMPLETED, CANCELLED)
    if (updateData.status && previousStatus !== updateData.status) {
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
          const alertService = new AlertService();
          await alertService.sendOrderStatusChangeAlert(orderWithItems, previousStatus);
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
    console.error(`Error updating order ${data.id}:`, error);
    throw error;
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
    console.warn(
      `No new_state or fulfillment_uid found in fulfillment update for order ${squareOrderId}. Skipping.`
    );
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
  if (
    newStatus ||
    updatePayload.trackingNumber !== undefined ||
    updatePayload.shippingCarrier !== undefined
  ) {
    console.log(
      `Attempting to update order ${squareOrderId} with status: ${newStatus ?? 'unchanged'}`
    );
    try {
      await prisma.order.update({
        where: { squareOrderId: squareOrderId },
        data: updatePayload,
      });
      console.log(`✅ Successfully updated order ${squareOrderId} with fulfillment update.`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Order not found - this is likely a POS order or order from external source
        console.warn(`⚠️ [UPSERT-FIX] Order ${squareOrderId} not found in database.`);
        console.log(`🔄 [UPSERT-FIX] Attempting to fetch order from Square API and create it...`);

        // Fetch the order from Square API and create it in our database
        const createdOrderId = await fetchAndCreateOrderFromSquare(squareOrderId);

        if (createdOrderId) {
          // Successfully created the order, now apply the fulfillment update
          console.log(`✅ [UPSERT-FIX] Order created successfully. Applying fulfillment update...`);
          try {
            await prisma.order.update({
              where: { id: createdOrderId },
              data: updatePayload,
            });
            console.log(
              `✅ [UPSERT-FIX] Fulfillment update applied to newly created order ${createdOrderId}`
            );
          } catch (retryError: any) {
            console.error(
              `❌ [UPSERT-FIX] Failed to apply fulfillment update to created order:`,
              retryError
            );
            // Don't throw - at least we created the order
          }
        } else {
          console.error(
            `❌ [UPSERT-FIX] Failed to fetch/create order ${squareOrderId} from Square.`
          );
          console.error(
            `⚠️ [UPSERT-FIX] This fulfillment update will be retried via webhook queue.`
          );
          // Re-throw to trigger webhook retry
          throw new Error(
            `Order ${squareOrderId} not found and could not be fetched from Square API`
          );
        }
      } else {
        console.error(`❌ Error updating order ${squareOrderId}:`, error);
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
    select: { id: true, customerName: true, email: true, phone: true },
  });

  if (!order) {
    console.warn(
      `⚠️ Order with squareOrderId ${squareOrderId} not found for payment ${squarePaymentId}. Skipping payment processing until order.created webhook arrives.`
    );
    // Don't create stub orders - wait for proper order data
    return;
  }

  const internalOrderId = order.id;
  const paymentAmount = paymentData?.amount_money?.amount;
  const tipAmount = paymentData?.tip_money?.amount || 0; // Capture tip amount from Square

  if (paymentAmount === undefined || paymentAmount === null) {
    console.warn(`⚠️ Payment ${data.id} received without an amount.`);
    return;
  }

  console.log(
    `🔄 Attempting to upsert payment record: squarePaymentId=${data.id}, internalOrderId=${internalOrderId}, amount=${paymentAmount / 100}, tip=${tipAmount / 100}`
  );

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
          updatedViaWebhook: true,
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        squarePaymentId: data.id,
        amount: paymentAmount / 100, // Convert from cents to dollars
        status: 'PAID',
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
    if (currentOrder.paymentStatus !== 'PAID') {
      updateData.paymentStatus = 'PAID';
      updateData.status = 'PROCESSING';
    }

    // Update gratuity amount from Square payment tip
    if (tipAmount > 0) {
      updateData.gratuityAmount = tipAmount / 100; // Convert from cents to dollars
      console.log(`💵 Captured tip amount: $${tipAmount / 100} for order ${internalOrderId}`);
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

      // Send new order alert when payment is confirmed (DES-55)
      if (currentOrder.paymentStatus !== 'PAID' && updateData.paymentStatus === 'PAID') {
        console.log(`💳 Payment confirmed for order ${internalOrderId} - sending admin alert`);
        try {
          const orderWithItems = await prisma.order.findUnique({
            where: { id: internalOrderId },
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
            const alertService = new AlertService();
            await alertService.sendNewOrderAlert(orderWithItems);
            console.log(`✅ New order alert sent for paid order ${internalOrderId}`);

            // Send customer order confirmation email
            try {
              await sendOrderConfirmationEmail({
                ...orderWithItems,
                paymentMethod: 'SQUARE' as const,
              });
              console.log(`📧 Customer confirmation email sent for order ${internalOrderId}`);
            } catch (emailError: any) {
              console.error(
                `Failed to send customer confirmation email for order ${internalOrderId}:`,
                emailError
              );
              // Don't fail the webhook if email fails
            }
          }
        } catch (alertError: any) {
          console.error(`Failed to send new order alert for order ${internalOrderId}:`, alertError);
          // Don't fail the webhook if alert fails
        }
      }
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

/**
 * Handle payment.updated webhook events
 *
 * Uses request deduplication to prevent concurrent processing of the same payment,
 * which can occur when Square sends multiple payment.updated webhooks in rapid succession.
 */
export async function handlePaymentUpdated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const paymentData = data.object.payment as any;
  const squarePaymentId = data.id;
  const squareOrderId = paymentData?.order_id;
  const paymentStatus = paymentData?.status?.toUpperCase();
  const eventId = payload.event_id;
  const tipAmount = paymentData?.tip_money?.amount || 0; // Capture tip amount from Square

  console.log(`🔄 Processing payment.updated event: ${squarePaymentId} (Event: ${eventId})`);
  console.log(`📋 Payment data:`, {
    squarePaymentId,
    squareOrderId,
    paymentStatus,
    amount: paymentData?.amount_money?.amount,
    tip: tipAmount,
    eventId,
  });

  if (!squareOrderId) {
    console.error(
      `❌ CRITICAL: No order_id found in payment.updated payload for payment ${squarePaymentId}. Event ID: ${eventId}. Payload:`,
      JSON.stringify(paymentData, null, 2)
    );
    return;
  }

  // Use request deduplication to prevent concurrent processing of the same payment
  // Key is based on payment ID to deduplicate across different event IDs
  return await paymentWebhookDeduplicator.deduplicate(
    resourceKey('payment', squarePaymentId, 'webhook'),
    async () => {
      console.log(`🔍 [WEBHOOK-FIX] Starting payment.updated processing`);
      console.log(`🔍 [WEBHOOK-FIX] Looking for order with squareOrderId: ${squareOrderId}`);
      console.log(`🔍 [WEBHOOK-FIX] Payment status from Square: ${paymentStatus}`);

      try {
    // Check for catering order first with retry logic
    const cateringOrder = await withRetry(
      async () => {
        return await prisma.cateringOrder.findUnique({
          where: { squareOrderId },
          select: { id: true, paymentStatus: true, status: true },
        });
      },
      3,
      'findCateringOrder'
    );

    if (cateringOrder) {
      console.log(`🔍 [WEBHOOK-FIX] Detected catering order with squareOrderId ${squareOrderId}`);
      console.log(
        `🔍 [WEBHOOK-FIX] Current catering order status: ${cateringOrder.status}, payment status: ${cateringOrder.paymentStatus}`
      );

      let updatedPaymentStatus: Prisma.CateringOrderUpdateInput['paymentStatus'] = 'PENDING';
      let updatedOrderStatus: Prisma.CateringOrderUpdateInput['status'] | undefined;

      if (paymentStatus === 'COMPLETED') {
        updatedPaymentStatus = 'PAID';
        updatedOrderStatus = 'CONFIRMED';
        console.log(`🔍 [WEBHOOK-FIX] Mapping COMPLETED payment to PAID status for catering order`);
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELED') {
        updatedPaymentStatus = 'FAILED';
        updatedOrderStatus = 'CANCELLED';
        console.log(
          `🔍 [WEBHOOK-FIX] Mapping ${paymentStatus} payment to FAILED status for catering order`
        );
      } else if (paymentStatus === 'REFUNDED') {
        updatedPaymentStatus = 'REFUNDED';
        updatedOrderStatus = 'CANCELLED';
        console.log(
          `🔍 [WEBHOOK-FIX] Mapping REFUNDED payment to REFUNDED status for catering order`
        );
      }

      const cateringUpdateData: Prisma.CateringOrderUpdateInput = {
        paymentStatus: updatedPaymentStatus,
        updatedAt: new Date(),
      };
      if (updatedOrderStatus) {
        cateringUpdateData.status = updatedOrderStatus;
      }

      await withRetry(
        async () => {
          return await prisma.cateringOrder.update({
            where: { id: cateringOrder.id },
            data: cateringUpdateData,
          });
        },
        3,
        'updateCateringOrder'
      );

      console.log(
        `✅ Successfully updated catering order ${cateringOrder.id} to payment status ${updatedPaymentStatus} (Event: ${eventId})`
      );
      return;
    }

    // Find regular order with retry logic
    const order = await withRetry(
      async () => {
        return await prisma.order.findUnique({
          where: { squareOrderId: squareOrderId },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            fulfillmentType: true,
            shippingRateId: true,
            gratuityAmount: true, // Include for no-op detection
          },
        });
      },
      3,
      'findRegularOrder'
    );

    if (!order) {
      console.warn(
        `🔍 [WEBHOOK-FIX] Order with squareOrderId ${squareOrderId} not found for payment update.`
      );
      console.warn(
        `🔍 [WEBHOOK-FIX] This means the order creation webhook may not have been processed yet.`
      );
      return;
    }

    console.log(
      `🔍 [WEBHOOK-FIX] Found regular order ${order.id} for payment ${squarePaymentId} (Event: ${payload.event_id})`
    );
    console.log(
      `🔍 [WEBHOOK-FIX] Current regular order status: ${order.status}, payment status: ${order.paymentStatus}`
    );

    // Check if this event was already processed to prevent duplicates
    const existingPayment = await withRetry(
      async () => {
        return await prisma.payment.findUnique({
          where: { squarePaymentId: squarePaymentId },
          select: { id: true, rawData: true, status: true },
        });
      },
      3,
      'findExistingPayment'
    );

    if (existingPayment?.rawData && typeof existingPayment.rawData === 'object') {
      const rawData = existingPayment.rawData as any;
      if (rawData?.lastProcessedEventId === payload.event_id) {
        console.log(`⚠️ Event ${payload.event_id} already processed, skipping`);
        return;
      }
    }

    // Map payment status properly
    function mapSquarePaymentStatus(status: string): PaymentStatus {
      switch (status?.toUpperCase()) {
        case 'COMPLETED':
          return PaymentStatus.PAID;
        case 'FAILED':
        case 'CANCELED':
          return PaymentStatus.FAILED;
        case 'REFUNDED':
          return PaymentStatus.REFUNDED;
        case 'PENDING':
        case 'APPROVED':
        default:
          return PaymentStatus.PENDING;
      }
    }

    const updatedPaymentStatus = mapSquarePaymentStatus(paymentStatus);
    console.log(
      `🔍 [WEBHOOK-FIX] Payment status mapping: ${paymentStatus} → ${updatedPaymentStatus} (Event: ${payload.event_id})`
    );

    // CRITICAL FIX: Track if this is an actual payment transition (for label purchase decision)
    const wasNotPaid = order.paymentStatus !== 'PAID';

    // Update order status only if payment is newly PAID
    const updatedOrderStatus =
      wasNotPaid && updatedPaymentStatus === 'PAID' ? OrderStatus.PROCESSING : order.status;

    // CRITICAL FIX: Detect no-op updates to skip redundant processing
    const isPaymentTransition = order.paymentStatus !== updatedPaymentStatus;
    const isStatusTransition = order.status !== updatedOrderStatus;
    const hasTipToCapture =
      tipAmount > 0 && Number(order.gratuityAmount ?? 0) !== tipAmount / 100;

    // Skip processing if nothing will change (prevents duplicate label purchases)
    if (!isPaymentTransition && !isStatusTransition && !hasTipToCapture) {
      console.log(
        `⏭️ [WEBHOOK-DEDUP] Skipping no-op update for order ${order.id}: ` +
          `payment ${order.paymentStatus} → ${updatedPaymentStatus}, ` +
          `status ${order.status} → ${updatedOrderStatus} (Event: ${payload.event_id})`
      );
      return;
    }

    console.log(
      `🔍 [WEBHOOK-FIX] Order status update: ${order.status} → ${updatedOrderStatus} (Event: ${payload.event_id})`
    );
    console.log(
      `🔍 [WEBHOOK-FIX] Payment status update: ${order.paymentStatus} → ${updatedPaymentStatus} (Event: ${payload.event_id})`
    );

    if (wasNotPaid && updatedPaymentStatus === 'PAID') {
      console.log(
        `🎉 [WEBHOOK-FIX] *** CRITICAL FIX WORKING *** Payment status changing from ${order.paymentStatus} to PAID for order ${order.id}!`
      );
    }

    // Use transaction to update both order and payment atomically
    await withRetry(
      async () => {
        return await prisma.$transaction(async tx => {
          // Update the order with detailed logging
          console.log(`💾 Updating order ${order.id} in database...`);
          const orderUpdateData: Prisma.OrderUpdateInput = {
            paymentStatus: updatedPaymentStatus,
            status: updatedOrderStatus,
            updatedAt: new Date(),
          };

          // Include tip amount if present
          if (tipAmount > 0) {
            orderUpdateData.gratuityAmount = tipAmount / 100; // Convert from cents to dollars
            console.log(`💵 Capturing tip amount: $${tipAmount / 100} for order ${order.id}`);
          }

          await tx.order.update({
            where: { id: order.id },
            data: orderUpdateData,
          });
          console.log(
            `✅ Order ${order.id} updated in database with paymentStatus: ${updatedPaymentStatus}`
          );

          // Upsert the payment record with event deduplication
          await tx.payment.upsert({
            where: { squarePaymentId: squarePaymentId },
            update: {
              status: updatedPaymentStatus,
              rawData: {
                ...paymentData,
                lastProcessedEventId: payload.event_id,
                lastUpdated: new Date().toISOString(),
              } as unknown as Prisma.InputJsonValue,
              updatedAt: new Date(),
            },
            create: {
              squarePaymentId: squarePaymentId,
              orderId: order.id,
              amount: paymentData?.amount_money?.amount || 0,
              status: updatedPaymentStatus,
              rawData: {
                ...paymentData,
                lastProcessedEventId: payload.event_id,
                lastUpdated: new Date().toISOString(),
              } as unknown as Prisma.InputJsonValue,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        });
      },
      3,
      'updateOrderAndPayment'
    );

    console.log(
      `✅ [WEBHOOK-FIX] Order ${order.id} and Payment ${squarePaymentId} updated successfully!`
    );
    console.log(
      `✅ [WEBHOOK-FIX] Final status - Payment: ${updatedPaymentStatus}, Order: ${updatedOrderStatus} (Event: ${payload.event_id})`
    );

    if (updatedPaymentStatus === 'PAID') {
      console.log(
        `🎉 [WEBHOOK-FIX] *** FIX SUCCESSFUL *** Order ${order.id} is now PAID and will show as paid in admin!`
      );
    }

    // Send new order alert when payment is confirmed (DES-55)
    if (order.paymentStatus !== 'PAID' && updatedPaymentStatus === 'PAID') {
      console.log(`💳 Payment confirmed for order ${order.id} - sending admin alert`);
      try {
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
          const { AlertService } = await import('@/lib/alerts');
          const alertService = new AlertService();
          await alertService.sendNewOrderAlert(orderWithItems);
          console.log(`✅ New order alert sent for paid order ${order.id}`);

          // Send customer order confirmation email
          try {
            await sendOrderConfirmationEmail({
              ...orderWithItems,
              paymentMethod: 'SQUARE' as const,
            });
            console.log(`📧 Customer confirmation email sent for order ${order.id}`);
          } catch (emailError: any) {
            console.error(
              `Failed to send customer confirmation email for order ${order.id}:`,
              emailError
            );
            // Don't fail the webhook if email fails
          }
        }
      } catch (alertError: any) {
        console.error(`Failed to send new order alert for order ${order.id}:`, alertError);
        // Don't fail the webhook if alert fails
      }
    }

    // Purchase shipping label if applicable (PRIMARY trigger)
    // CRITICAL FIX: Only trigger on actual transition to PAID (wasNotPaid check prevents duplicate purchases)
    if (
      wasNotPaid &&
      updatedPaymentStatus === 'PAID' &&
      order.fulfillmentType === 'nationwide_shipping' &&
      order.shippingRateId
    ) {
      console.log(
        `🔄 Payment transition to PAID for shipping order ${order.id}. Triggering label purchase with rate ID: ${order.shippingRateId}`
      );
      try {
        const labelResult = await purchaseShippingLabel(order.id, order.shippingRateId);
        if (labelResult.success) {
          console.log(
            `✅ Successfully purchased label for order ${order.id}. Tracking: ${labelResult.trackingNumber}`
          );
        } else if (labelResult.blockedByConcurrent) {
          // Another process is handling label purchase - this is expected behavior in serverless
          console.log(
            `⏸️ [LABEL-CONCURRENT] Order ${order.id} being handled by concurrent process`
          );
          // Schedule verification to ensure label was created (non-blocking, fire-and-forget)
          verifyLabelCreation(order.id).catch(err =>
            console.error(`Label verification failed for ${order.id}:`, err)
          );
        } else {
          console.error(
            `❌ Failed to purchase label automatically for order ${order.id}: ${labelResult.error}`
          );
          // Note: Don't throw here to avoid webhook retry loops
        }
      } catch (labelError: any) {
        console.error(
          `❌ Unexpected error calling purchaseShippingLabel for order ${order.id}: ${labelError?.message}`
        );
        // Note: Don't throw here to avoid webhook retry loops
      }
    }
  } catch (error: any) {
    console.error(
      `❌ CRITICAL ERROR in handlePaymentUpdated for payment ${squarePaymentId} (Event: ${eventId}):`,
      error
    );

    // Enhanced error logging for different types of database errors
    if (error.code === 'P2025') {
      console.error(
        `🔍 Record not found error for payment ${squarePaymentId}, order ${squareOrderId} (Event: ${eventId}) - the order might have been deleted or never created`
      );
    } else if (error.code === 'P2002') {
      console.error(
        `🔍 Unique constraint violation for payment ${squarePaymentId} (Event: ${eventId}) - possible duplicate processing`
      );
    } else if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.error(
        `🔍 Database connection error for payment ${squarePaymentId} (Event: ${eventId}) - this will trigger webhook retry`
      );
    } else {
      console.error(`🔍 Unexpected error for payment ${squarePaymentId} (Event: ${eventId}):`, {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500),
      });
    }

        // Re-throw the error to trigger webhook retry
        throw error;
      }
    }
  ); // End of paymentWebhookDeduplicator.deduplicate
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
      payment: {
        connect: { id: payment.id },
      },
    },
  });

  if (payment.orderId && refundData.status === 'COMPLETED') {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'REFUNDED' },
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
      include: { payment: { select: { orderId: true } } },
    });

    if (refundStatus === 'COMPLETED' && updatedRefund.payment?.orderId) {
      await prisma.order.update({
        where: { id: updatedRefund.payment.orderId },
        data: { paymentStatus: 'REFUNDED' },
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

/**
 * Verify label creation after concurrent processing
 *
 * This function is called when a webhook discovers another process is already
 * handling label purchase. It waits and then verifies the label was created.
 * If not, it logs an error for manual intervention.
 */
async function verifyLabelCreation(orderId: string, delayMs = 15000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, delayMs));

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { trackingNumber: true, labelUrl: true, status: true },
  });

  if (!order?.trackingNumber) {
    console.error(
      `⚠️ [LABEL-VERIFY-FAIL] Order ${orderId} has no label after ${delayMs}ms - may need manual intervention`
    );
    // TODO: Could trigger admin alert here if needed
  } else {
    console.log(
      `✅ [LABEL-VERIFY-OK] Order ${orderId} label confirmed: ${order.trackingNumber}`
    );
  }
}
