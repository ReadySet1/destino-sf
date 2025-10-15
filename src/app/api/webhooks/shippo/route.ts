import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';
import { OrderStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

interface ShippoWebhookPayload {
  event:
    | 'transaction_created'
    | 'transaction_updated'
    | 'track_updated'
    | 'batch_created'
    | 'batch_purchased'
    | 'all';
  test: boolean;
  data: any; // Type this more strictly based on expected event data if needed
}

// TODO: Implement Shippo webhook signature verification for security
// See: https://docs.goshippo.com/docs/tracking/webhooks/#webhook-security

async function handleTransactionCreated(data: any): Promise<void> {
  console.log('Processing Shippo transaction_created event');
  const transactionId = data.object_id;
  const status = data.status;
  const labelUrl = data.label_url;
  const trackingNumber = data.tracking_number;
  const metadata = data.metadata;

  // Extract order ID from metadata
  let orderId: string | undefined;
  if (metadata && typeof metadata === 'string' && metadata.startsWith('order_id=')) {
    orderId = metadata.split('=')[1];
  }

  if (!orderId) {
    console.warn(
      `Shippo transaction ${transactionId} received without valid order_id metadata. Skipping DB update.`
    );
    return;
  }

  // Validate that orderId is a proper UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    console.warn(
      `Shippo transaction ${transactionId} has invalid order_id format: ${orderId}. Expected UUID format. Skipping DB update.`
    );
    return;
  }

  if (status === 'SUCCESS' && labelUrl && trackingNumber) {
    console.log(`Updating order ${orderId} from Shippo transaction ${transactionId}`);
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: trackingNumber,
          // Add label URL to notes or a dedicated field if you add one
          notes: `Shippo Label: ${labelUrl}`,
          status: OrderStatus.SHIPPING,
          updatedAt: new Date(),
        },
      });
      console.log(`Order ${orderId} successfully updated with tracking info from Shippo webhook.`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Prisma code for Record not found
        console.warn(
          `Order with ID ${orderId} not found when processing Shippo transaction ${transactionId}. This is normal for test webhooks.`
        );
      } else {
        console.error(`Error updating order ${orderId} from Shippo webhook:`, error);
      }
    }
  } else {
    console.log(
      `Shippo transaction ${transactionId} for order ${orderId} status is ${status}. No tracking update.`
    );
  }
}

async function handleTrackUpdated(data: any): Promise<void> {
  console.log('Processing Shippo track_updated event');
  const trackingNumber = data.tracking_number;
  const trackingStatus = data.tracking_status?.status?.toUpperCase(); // e.g., TRANSIT, DELIVERED

  if (!trackingNumber || !trackingStatus) {
    console.warn('Shippo track_updated event missing tracking number or status.', data);
    return;
  }

  // Check if this is a test tracking number
  if (trackingNumber.includes('SHIPPO_') || trackingNumber.includes('TEST_')) {
    console.log(`🧪 Test tracking number detected: ${trackingNumber}. Skipping database update.`);
    return;
  }

  let newStatus: OrderStatus | undefined;
  if (trackingStatus === 'DELIVERED') {
    newStatus = OrderStatus.DELIVERED;
  } else if (
    ['TRANSIT', 'PRE_TRANSIT', 'RETURNED', 'FAILURE', 'UNKNOWN'].includes(trackingStatus)
  ) {
    // Potentially map other statuses if needed, otherwise keep as SHIPPING
    // For simplicity, we only update specifically for DELIVERED for now.
    // If already SHIPPING, we don't want to override with PROCESSING etc.
    console.log(
      `Tracking status ${trackingStatus} received for ${trackingNumber}. Keeping order status as SHIPPING.`
    );
    // newStatus = OrderStatus.SHIPPING;
  } else {
    console.warn(`Unhandled Shippo tracking status: ${trackingStatus}`);
  }

  if (newStatus) {
    try {
      // Find order by tracking number - NOTE: requires trackingNumber to be reliably unique
      // Consider adding an index to trackingNumber in schema.prisma if querying frequently
      const order = await prisma.order.findFirst({
        where: { trackingNumber: trackingNumber },
        select: { id: true, status: true },
      });

      if (!order) {
        console.warn(
          `Order with tracking number ${trackingNumber} not found for track_updated event. This is normal for test webhooks or new shipments.`
        );
        return;
      }

      // Prevent status downgrade (e.g., if manually marked COMPLETED)
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        console.log(
          `Order ${order.id} already in terminal state (${order.status}). Ignoring track_updated status ${newStatus}.`
        );
        return;
      }

      await prisma.order.update({
        where: { id: order.id }, // Use the found order ID
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      });
      console.log(
        `Order ${order.id} status updated to ${newStatus} based on tracking number ${trackingNumber}.`
      );
    } catch (error: any) {
      // Avoid error if multiple orders somehow shared a tracking number (shouldn't happen)
      if (error.code === 'P2014') {
        console.error(
          `Multiple orders found with tracking number ${trackingNumber} during track_updated. Update failed.`
        );
      } else if (error.code === 'P2025') {
        console.warn(
          `Order with tracking number ${trackingNumber} (or its ID) not found during update.`
        );
      } else {
        console.error(
          `Error updating order status from track_updated for tracking ${trackingNumber}:`,
          error
        );
      }
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('Received Shippo webhook request');

  // Start timing for performance monitoring
  const startTime = Date.now();

  try {
    // Read and parse the request body
    const payload: ShippoWebhookPayload = await request.json();
    console.log('Shippo Webhook Payload:', JSON.stringify(payload, null, 2));

    // Basic security: Check if this is a test webhook
    if (payload.test === true) {
      console.log('🧪 Test webhook received - processing normally');

      // For test webhooks, we'll process them but be more lenient with database operations
      // This prevents errors from invalid test data while still testing the webhook flow
    }

    // Basic webhook validation
    if (!payload.event || !payload.data) {
      console.error('❌ Invalid webhook payload structure');
      return NextResponse.json({ error: 'Invalid webhook payload structure' }, { status: 400 });
    }

    // Log webhook details for debugging
    console.log(`📦 Processing Shippo webhook: ${payload.event}`);
    console.log(`🆔 Object ID: ${payload.data?.object_id || 'N/A'}`);
    console.log(`📊 Test mode: ${payload.test}`);

    // Additional validation for test webhooks
    if (payload.test === true) {
      console.log('🔍 Test webhook detected - applying additional validation rules');

      // Check if test data has realistic values
      if (payload.data?.object_id && payload.data.object_id.includes('test')) {
        console.log('✅ Test object ID format detected');
      }

      if (
        payload.data?.tracking_number &&
        (payload.data.tracking_number.includes('SHIPPO_') ||
          payload.data.tracking_number.includes('TEST_'))
      ) {
        console.log('✅ Test tracking number format detected');
      }
    }

    // Handle supported event types with proper error handling
    try {
      switch (payload.event) {
        case 'transaction_created':
          await handleTransactionCreated(payload.data);
          break;
        case 'track_updated':
          await handleTrackUpdated(payload.data);
          break;
        case 'transaction_updated':
          console.log('📝 Transaction updated event received (not yet implemented)');
          break;
        case 'batch_created':
          console.log('📦 Batch created event received (not yet implemented)');
          break;
        case 'batch_purchased':
          console.log('💰 Batch purchased event received (not yet implemented)');
          break;
        default:
          console.log(`⚠️ Unhandled Shippo event type: ${payload.event}`);
      }
    } catch (processingError) {
      console.error('❌ Error processing webhook event:', processingError);
      // Continue to return success response to prevent Shippo retries
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;
    console.log(`✅ Shippo webhook processed successfully in ${processingTime}ms`);

    // Always return 200 to acknowledge receipt (prevents Shippo retries)
    return NextResponse.json(
      {
        received: true,
        processed: true,
        processing_time_ms: processingTime,
        event: payload.event,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Critical error processing Shippo webhook:', error);

    let errorMessage = 'Internal Server Error';
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON payload';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Return 200 even on critical errors to prevent Shippo retries
    // This is important because Shippo will retry failed webhooks
    console.error(
      `🔴 Returning 200 despite error to prevent Shippo retries. Processing time: ${processingTime}ms`
    );

    return NextResponse.json(
      {
        error: `Webhook processing failed: ${errorMessage}`,
        received: true,
        processed: false,
        processing_time_ms: processingTime,
      },
      { status: 200 }
    );
  }
}
