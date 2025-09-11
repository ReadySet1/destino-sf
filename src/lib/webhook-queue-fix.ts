import { prisma, withRetry } from '@/lib/db-unified';

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
    await withRetry(async () => {
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
    const pendingWebhooks = await withRetry(async () => {
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
    }, 3, 'getPendingWebhooks');
    
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
  await withRetry(async () => {
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
    await withRetry(async () => {
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
 * Process webhook payload based on event type using comprehensive handlers
 */
async function processWebhookByType(payload: any): Promise<void> {
  const eventType = payload.type;
  const eventId = payload.event_id;
  
  console.log(`🔧 Processing ${eventType} webhook (${eventId}) using comprehensive handlers`);
  
  // Import the comprehensive handlers
  const { 
    handleOrderCreated, 
    handleOrderUpdated, 
    handlePaymentCreated, 
    handlePaymentUpdated 
  } = await import('./webhook-handlers');
  
  switch (eventType) {
    case 'order.created':
      await handleOrderCreated(payload);
      break;
      
    case 'order.updated':
      // Use enhanced order processing with re-queuing for race conditions
      await processOrderWebhookWithRetry(payload);
      break;
    
    case 'payment.created':
      await handlePaymentCreated(payload);
      break;
      
    case 'payment.updated':
      await handlePaymentUpdated(payload);
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
 * Process order-related webhooks with enhanced race condition handling and re-queuing
 */
async function processOrderWebhookWithRetry(payload: any): Promise<void> {
  const squareOrderId = payload.data.id;
  const maxAttempts = 5;
  
  console.log(`🛒 Processing order webhook for order: ${squareOrderId}`);
  
  // Handle race conditions - retry to find the order with exponential backoff
  let order = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    order = await withRetry(async () => {
      return await prisma.order.findUnique({
        where: { squareOrderId },
        include: { items: true }
      });
    }, 2, `findOrder-attempt-${attempt + 1}`);
    
    if (order) break;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000);
    const jitter = Math.random() * 500;
    const delay = baseDelay + jitter;
    
    console.log(`⏳ Order ${squareOrderId} not found (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
  }
  
  if (!order) {
    // Instead of just warning, re-queue this webhook for later processing
    console.log(`🔄 Order ${squareOrderId} not found after ${maxAttempts} attempts, re-queuing webhook for later processing`);
    
    // Re-queue the webhook with a delay to allow the order.created event to be processed first
    await withRetry(async () => {
      await prisma.webhookQueue.create({
        data: {
          eventId: `${payload.event_id}-retry-${Date.now()}`,
          eventType: payload.type,
          payload: payload,
          status: 'PENDING',
          attempts: 0,
          // Schedule for 30 seconds later to give order.created time to process
          createdAt: new Date(Date.now() + 30000)
        }
      });
    }, 2, 'requeue-order-webhook');
    
    console.log(`✅ Order webhook ${payload.event_id} re-queued for later processing`);
    return;
  }
  
  // Process the order update using comprehensive handlers
  const { handleOrderUpdated } = await import('./webhook-handlers');
  await handleOrderUpdated(payload);
  
  console.log(`✅ Order ${squareOrderId} processed successfully`);
}

/**
 * NOTE: Payment webhooks are now handled by comprehensive handlers in webhook-handlers.ts
 * The processPaymentWebhook function has been removed in favor of handlePaymentCreated and handlePaymentUpdated
 * which provide better support for catering orders, duplicate detection, and comprehensive error handling.
 */

/**
 * Process refund-related webhooks
 */
async function processRefundWebhook(payload: any): Promise<void> {
  const squareRefundId = payload.data.id;
  const squareRefund = payload.data.object;
  
  console.log(`🔄 Processing refund webhook for refund: ${squareRefundId}`);
  
  await withRetry(async () => {
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
    await withRetry(async () => {
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
 * NOTE: Mapping functions are now handled by comprehensive handlers in webhook-handlers.ts
 * mapSquareStateToOrderStatus and mapSquarePaymentStatus functions moved there for consistency.
 */
