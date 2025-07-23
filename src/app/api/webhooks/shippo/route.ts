import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { WebhookValidator } from '@/lib/square/webhook-validator';
import { errorMonitor } from '@/lib/error-monitoring';

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
        console.error(
          `Order with ID ${orderId} not found when processing Shippo transaction ${transactionId}.`
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
          `Order with tracking number ${trackingNumber} not found for track_updated event.`
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
  try {
    const payload: ShippoWebhookPayload = await request.json();
    console.log('Shippo Webhook Payload:', JSON.stringify(payload, null, 2));

    // Enhanced Shippo webhook signature validation
    const signature = request.headers.get('X-Shippo-Signature');
    const shippoSecret = process.env.SHIPPO_WEBHOOK_SECRET;

    if (shippoSecret && signature) {
      const validator = new WebhookValidator(shippoSecret);

      const isValid = await validator.validateShippoSignature(
        signature,
        JSON.stringify(payload),
        payload.data?.object_id || `shippo-${Date.now()}`
      );

      if (!isValid) {
        console.error('🔒 Invalid Shippo webhook signature - request rejected');
        await errorMonitor.captureWebhookError(
          new Error('Invalid Shippo webhook signature'),
          'signature_validation',
          payload.data?.object_id,
          payload.event
        );
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      console.log('✅ Shippo webhook signature verified with enhanced security');
    } else {
      console.warn('⚠️ Shippo webhook signature verification skipped - missing secret or headers');
      if (process.env.NODE_ENV === 'production') {
        console.error('🔒 Shippo webhook signature verification is required in production');
        return NextResponse.json({ error: 'Signature verification required' }, { status: 401 });
      }
    }

    // Respond quickly before processing
    // Defer actual processing to avoid Shippo timeouts
    // (For simplicity here, we process inline, but for production consider queues)
    // processShippoWebhook(payload); // Hypothetical async processing function

    // Handle supported event types inline for now
    switch (payload.event) {
      case 'transaction_created':
        await handleTransactionCreated(payload.data);
        break;
      case 'track_updated':
        await handleTrackUpdated(payload.data);
        break;
      // Add other cases like transaction_updated if needed
      default:
        console.log(`Unhandled Shippo event type: ${payload.event}`);
    }

    // Acknowledge receipt to Shippo
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error processing Shippo webhook:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON payload';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Return 2xx even on processing errors so Shippo doesn't retry indefinitely
    // Log the error thoroughly for investigation.
    return NextResponse.json(
      { error: `Webhook processing failed: ${errorMessage}` },
      { status: 200 }
    );
  }
}
