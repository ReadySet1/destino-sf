import { resilientPrisma } from './db-connection-fix';

/**
 * Simple, robust webhook queue implementation for fixing Vercel webhook issues
 * Based on the critical fix plan
 */

export interface WebhookQueueEntry {
  eventId: string;
  eventType: string;
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
}

/**
 * Queue webhook for background processing with resilient database connection
 */
export async function queueWebhook(payload: any): Promise<void> {
  console.log('📥 Queuing webhook for background processing:', payload.type, payload.event_id);
  
  try {
    await resilientPrisma.executeWithRetry(async (prisma) => {
      // Use upsert to handle potential duplicate events
      await prisma.webhookQueue.upsert({
        where: {
          eventId: payload.event_id
        },
        update: {
          payload: payload,
          status: 'PENDING',
          attempts: 0,
          errorMessage: null,
        },
        create: {
          eventId: payload.event_id,
          eventType: payload.type,
          payload: payload,
          status: 'PENDING',
          attempts: 0,
        }
      });
    });
    
    console.log('✅ Webhook queued successfully:', payload.event_id);
  } catch (error) {
    console.error('❌ Failed to queue webhook:', error);
    throw error;
  }
}

/**
 * Process queued webhooks with proper error handling and retry logic
 */
export async function processWebhookQueue(options: {
  maxItems?: number;
  timeout?: number;
} = {}): Promise<{ processed: number; failed: number; skipped: number }> {
  const { maxItems = 50, timeout = 55000 } = options;
  const stats = { processed: 0, failed: 0, skipped: 0 };
  
  console.log('🔄 Starting webhook queue processing...');
  
  try {
    // Get pending webhooks with retry logic
    const pendingWebhooks = await resilientPrisma.executeWithRetry(async (prisma) => {
      return await prisma.webhookQueue.findMany({
        where: {
          status: 'PENDING',
          attempts: { lt: 3 }, // Don't retry more than 3 times
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: maxItems
      });
    });
    
    if (pendingWebhooks.length === 0) {
      console.log('📭 No pending webhooks to process');
      return stats;
    }
    
    console.log(`🚀 Processing ${pendingWebhooks.length} pending webhooks`);
    
    // Process each webhook with timeout protection
    for (const webhook of pendingWebhooks) {
      try {
        // Cast database result to our interface type
        const webhookEntry: WebhookQueueEntry = {
          eventId: webhook.eventId,
          eventType: webhook.eventType,
          payload: webhook.payload,
          status: webhook.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
          attempts: webhook.attempts
        };
        
        // Add timeout protection
        const processPromise = processWebhookEntry(webhookEntry);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Webhook processing timeout')), timeout);
        });
        
        await Promise.race([processPromise, timeoutPromise]);
        stats.processed++;
        
      } catch (error) {
        console.error(`❌ Failed to process webhook ${webhook.eventId}:`, error);
        await markWebhookFailed(webhook.eventId, error);
        stats.failed++;
      }
    }
    
    console.log(`✅ Queue processing completed. Processed: ${stats.processed}, Failed: ${stats.failed}`);
    return stats;
    
  } catch (error) {
    console.error('❌ Queue processing failed:', error);
    throw error;
  }
}

/**
 * Process a single webhook entry
 */
async function processWebhookEntry(webhook: WebhookQueueEntry): Promise<void> {
  console.log('⚙️ Processing webhook:', webhook.eventType, webhook.eventId);
  
  // Mark as processing
  await resilientPrisma.executeWithRetry(async (prisma) => {
    await prisma.webhookQueue.update({
      where: { eventId: webhook.eventId },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      }
    });
  });
  
  try {
    // Process the webhook based on type
    await processWebhookByType(webhook.payload);
    
    // Mark as completed
    await resilientPrisma.executeWithRetry(async (prisma) => {
      await prisma.webhookQueue.update({
        where: { eventId: webhook.eventId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          errorMessage: null,
        }
      });
    });
    
    console.log('✅ Webhook processed successfully:', webhook.eventId);
    
  } catch (error) {
    console.error(`❌ Webhook processing failed for ${webhook.eventId}:`, error);
    throw error;
  }
}

/**
 * Process webhook payload based on event type
 */
async function processWebhookByType(payload: any): Promise<void> {
  const eventType = payload.type;
  const eventId = payload.event_id;
  
  console.log(`🔧 Processing ${eventType} webhook (${eventId})`);
  
  switch (eventType) {
    case 'order.created':
    case 'order.updated':
      await processOrderWebhook(payload);
      break;
    
    case 'payment.created':
    case 'payment.updated':
      await processPaymentWebhook(payload);
      break;
    
    case 'refund.created':
    case 'refund.updated':
      await processRefundWebhook(payload);
      break;
    
    default:
      console.log(`⚠️ Unknown webhook type: ${eventType}, skipping processing`);
      break;
  }
}

/**
 * Process order-related webhooks with race condition handling
 */
async function processOrderWebhook(payload: any): Promise<void> {
  const squareOrderId = payload.data.id;
  const maxAttempts = 10;
  
  console.log(`🛒 Processing order webhook for order: ${squareOrderId}`);
  
  // Handle race conditions - retry to find the order
  let order = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    order = await resilientPrisma.executeWithRetry(async (prisma) => {
      return await prisma.order.findUnique({
        where: { squareOrderId },
        include: { items: true }
      });
    });
    
    if (order) break;
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    console.log(`⏳ Order not found (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
  }
  
  if (!order) {
    console.warn(`⚠️ Order ${squareOrderId} not found after ${maxAttempts} attempts, storing for later processing`);
    return;
  }
  
  // Update order status based on Square data
  const squareOrder = payload.data.object;
  const newStatus = mapSquareStateToOrderStatus(squareOrder.state);
  
  await resilientPrisma.executeWithRetry(async (prisma) => {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        rawData: squareOrder,
        updatedAt: new Date(),
      }
    });
  });
  
  console.log(`✅ Order ${squareOrderId} updated to status: ${newStatus}`);
}

/**
 * Process payment-related webhooks
 */
async function processPaymentWebhook(payload: any): Promise<void> {
  const squarePaymentId = payload.data.id;
  const squarePayment = payload.data.object;
  
  console.log(`💳 Processing payment webhook for payment: ${squarePaymentId}`);
  
  await resilientPrisma.executeWithRetry(async (prisma) => {
    // Find the order associated with this payment
    const orderId = squarePayment.order_id;
    const order = await prisma.order.findUnique({
      where: { squareOrderId: orderId }
    });
    
    if (!order) {
      console.warn(`⚠️ Order ${orderId} not found for payment ${squarePaymentId}`);
      return;
    }
    
    // Update or create payment record
    await prisma.payment.upsert({
      where: { squarePaymentId },
      update: {
        status: mapSquarePaymentStatus(squarePayment.status),
        rawData: squarePayment,
        updatedAt: new Date(),
      },
      create: {
        squarePaymentId,
        orderId: order.id,
        amount: parseFloat(squarePayment.amount_money?.amount || '0') / 100,
        status: mapSquarePaymentStatus(squarePayment.status),
        rawData: squarePayment,
      }
    });
    
    // Update order payment status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: mapSquarePaymentStatus(squarePayment.status),
        updatedAt: new Date(),
      }
    });
  });
  
  console.log(`✅ Payment ${squarePaymentId} processed successfully`);
}

/**
 * Process refund-related webhooks
 */
async function processRefundWebhook(payload: any): Promise<void> {
  const squareRefundId = payload.data.id;
  const squareRefund = payload.data.object;
  
  console.log(`🔄 Processing refund webhook for refund: ${squareRefundId}`);
  
  await resilientPrisma.executeWithRetry(async (prisma) => {
    const payment = await prisma.payment.findUnique({
      where: { squarePaymentId: squareRefund.payment_id }
    });
    
    if (!payment) {
      console.warn(`⚠️ Payment ${squareRefund.payment_id} not found for refund ${squareRefundId}`);
      return;
    }
    
    await prisma.refund.upsert({
      where: { squareRefundId },
      update: {
        status: squareRefund.status,
        rawData: squareRefund,
        updatedAt: new Date(),
      },
      create: {
        squareRefundId,
        paymentId: payment.id,
        amount: parseFloat(squareRefund.amount_money?.amount || '0') / 100,
        reason: squareRefund.reason,
        status: squareRefund.status,
        rawData: squareRefund,
      }
    });
  });
  
  console.log(`✅ Refund ${squareRefundId} processed successfully`);
}

/**
 * Mark webhook as failed with error message
 */
async function markWebhookFailed(eventId: string, error: any): Promise<void> {
  try {
    await resilientPrisma.executeWithRetry(async (prisma) => {
      await prisma.webhookQueue.update({
        where: { eventId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          lastAttemptAt: new Date(),
        }
      });
    });
  } catch (updateError) {
    console.error('❌ Failed to mark webhook as failed:', updateError);
  }
}

/**
 * Map Square order state to our OrderStatus enum
 */
function mapSquareStateToOrderStatus(squareState: string | undefined) {
  switch (squareState?.toUpperCase()) {
    case 'OPEN':
      return 'PENDING' as const;
    case 'COMPLETED':
      return 'COMPLETED' as const;
    case 'CANCELED':
      return 'CANCELLED' as const;
    default:
      return 'PROCESSING' as const;
  }
}

/**
 * Map Square payment status to our PaymentStatus enum
 */
function mapSquarePaymentStatus(squareStatus: string | undefined) {
  switch (squareStatus?.toUpperCase()) {
    case 'COMPLETED':
      return 'PAID' as const;
    case 'CANCELED':
    case 'FAILED':
      return 'FAILED' as const;
    default:
      return 'PENDING' as const;
  }
}
