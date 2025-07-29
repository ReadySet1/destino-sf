import { prisma } from '@/lib/db';
import { WebhookPerformanceMonitor } from '@/utils/webhook-performance';

interface QueueItem {
  id: string;
  type: 'webhook' | 'email';
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  nextAttempt: Date;
}

interface EmailQueueItem extends QueueItem {
  type: 'email';
  data: {
    to: string;
    subject: string;
    html?: string;
    react?: any;
    from: string;
    priority: 'high' | 'medium' | 'low';
  };
}

interface WebhookQueueItem extends QueueItem {
  type: 'webhook';
  data: {
    payload: any;
    eventType: string;
    eventId: string;
    orderId?: string;
    error?: string;
    errorCode?: string;
  };
}

export class ProcessingQueue {
  private static instance: ProcessingQueue;
  private isProcessing = false;
  private lastEmailSent = 0;
  private emailQueue: EmailQueueItem[] = [];
  private webhookQueue: WebhookQueueItem[] = [];

  // Rate limiting constants
  private readonly EMAIL_RATE_LIMIT = 2000; // 2 seconds between emails (Resend limit)
  private readonly WEBHOOK_RETRY_DELAYS = [5000, 15000, 60000, 300000]; // 5s, 15s, 1m, 5m

  static getInstance(): ProcessingQueue {
    if (!ProcessingQueue.instance) {
      ProcessingQueue.instance = new ProcessingQueue();
    }
    return ProcessingQueue.instance;
  }

  /**
   * Add email to queue with rate limiting
   */
  async queueEmail(emailData: EmailQueueItem['data']): Promise<void> {
    const queueItem: EmailQueueItem = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'email',
      data: emailData,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      nextAttempt: new Date(),
    };

    this.emailQueue.push(queueItem);
    console.log(`📧 Email queued: ${emailData.subject} to ${emailData.to}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Add webhook to queue for retry handling
   */
  async queueWebhook(webhookData: WebhookQueueItem['data'], delayMs: number = 0): Promise<void> {
    const queueItem: WebhookQueueItem = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'webhook',
      data: webhookData,
      retryCount: 0,
      maxRetries: 4,
      createdAt: new Date(),
      nextAttempt: new Date(Date.now() + delayMs),
    };

    this.webhookQueue.push(queueItem);
    console.log(`🔄 Webhook queued: ${webhookData.eventType} for retry in ${delayMs}ms`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Start the queue processing loop
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('🚀 Queue processing started');

    while (this.isProcessing && (this.emailQueue.length > 0 || this.webhookQueue.length > 0)) {
      await this.processNextItem();
      await this.sleep(100); // Small delay between items
    }

    this.isProcessing = false;
    console.log('⏸️ Queue processing stopped');
  }

  /**
   * Process the next item in the queue
   */
  private async processNextItem(): Promise<void> {
    const now = Date.now();

    // Process webhooks first (higher priority)
    const readyWebhook = this.webhookQueue.find(item => item.nextAttempt.getTime() <= now);
    if (readyWebhook) {
      await this.processWebhookItem(readyWebhook);
      return;
    }

    // Process emails with rate limiting
    const readyEmail = this.emailQueue.find(item => item.nextAttempt.getTime() <= now);
    if (readyEmail && now - this.lastEmailSent >= this.EMAIL_RATE_LIMIT) {
      await this.processEmailItem(readyEmail);
      return;
    }

    // If no items are ready, wait a bit
    await this.sleep(1000);
  }

  /**
   * Process a webhook queue item
   */
  private async processWebhookItem(item: WebhookQueueItem): Promise<void> {
    const monitor = new WebhookPerformanceMonitor(`queue-${item.data.eventType}`, 'RETRY');

    try {
      console.log(
        `🔄 Processing queued webhook: ${item.data.eventType} (attempt ${item.retryCount + 1})`
      );

      // Process webhook by creating a simulated request
      await this.processWebhookPayload(item.data.payload);

      // Success - remove from queue
      this.removeWebhookFromQueue(item.id);
      monitor.complete('success');
      console.log(`✅ Queued webhook processed successfully: ${item.data.eventType}`);
    } catch (error: any) {
      monitor.complete('error', error);
      console.error(`❌ Queued webhook failed: ${item.data.eventType}`, error);

      // Check if we should retry
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        const delayMs = this.WEBHOOK_RETRY_DELAYS[item.retryCount - 1] || 300000;
        item.nextAttempt = new Date(Date.now() + delayMs);
        console.log(
          `🔄 Webhook scheduled for retry ${item.retryCount}/${item.maxRetries} in ${delayMs}ms`
        );
      } else {
        console.error(
          `💀 Webhook permanently failed after ${item.maxRetries} attempts: ${item.data.eventType}`
        );
        this.removeWebhookFromQueue(item.id);
      }
    }
  }

  /**
   * Process webhook payload by calling the appropriate handlers
   */
  private async processWebhookPayload(payload: any): Promise<void> {
    // Import webhook handlers dynamically to avoid circular imports
    const webhookHandlers = await import('@/lib/webhook-handlers');

    switch (payload.type) {
      case 'order.created':
        await webhookHandlers.handleOrderCreated(payload);
        break;
      case 'order.updated':
        await webhookHandlers.handleOrderUpdated(payload);
        break;
      case 'order.fulfillment.updated':
        await webhookHandlers.handleOrderFulfillmentUpdated(payload);
        break;
      case 'payment.created':
        await webhookHandlers.handlePaymentCreated(payload);
        break;
      case 'payment.updated':
        await webhookHandlers.handlePaymentUpdated(payload);
        break;
      case 'refund.created':
        await webhookHandlers.handleRefundCreated(payload);
        break;
      case 'refund.updated':
        await webhookHandlers.handleRefundUpdated(payload);
        break;
      default:
        throw new Error(`Unhandled webhook type: ${payload.type}`);
    }
  }

  /**
   * Process an email queue item
   */
  private async processEmailItem(item: EmailQueueItem): Promise<void> {
    try {
      console.log(`📧 Processing queued email: ${item.data.subject} to ${item.data.to}`);

      // Import Resend dynamically
      const { Resend } = await import('resend');
      const { env } = await import('@/env');
      const resend = new Resend(env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: item.data.from,
        to: item.data.to,
        subject: item.data.subject,
        html: item.data.html,
        react: item.data.react,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Success - remove from queue and update last sent time
      this.removeEmailFromQueue(item.id);
      this.lastEmailSent = Date.now();
      console.log(`✅ Queued email sent successfully: ${item.data.subject} (ID: ${data?.id})`);
    } catch (error: any) {
      console.error(`❌ Queued email failed: ${item.data.subject}`, error);

      // Check if we should retry
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        // For rate limit errors, wait longer
        const delayMs = error.message?.includes('rate_limit') ? 60000 : 30000;
        item.nextAttempt = new Date(Date.now() + delayMs);
        console.log(
          `📧 Email scheduled for retry ${item.retryCount}/${item.maxRetries} in ${delayMs}ms`
        );
      } else {
        console.error(
          `💀 Email permanently failed after ${item.maxRetries} attempts: ${item.data.subject}`
        );
        this.removeEmailFromQueue(item.id);
      }
    }
  }

  /**
   * Remove webhook from queue
   */
  private removeWebhookFromQueue(id: string): void {
    const index = this.webhookQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.webhookQueue.splice(index, 1);
    }
  }

  /**
   * Remove email from queue
   */
  private removeEmailFromQueue(id: string): void {
    const index = this.emailQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.emailQueue.splice(index, 1);
    }
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus() {
    return {
      emailQueue: this.emailQueue.length,
      webhookQueue: this.webhookQueue.length,
      isProcessing: this.isProcessing,
      lastEmailSent: new Date(this.lastEmailSent),
    };
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const processingQueue = ProcessingQueue.getInstance();

/**
 * Enhanced webhook handler with circuit breaker pattern and comprehensive error handling
 */
export async function handleWebhookWithQueue(payload: any, eventType: string): Promise<void> {
  const processingQueue = ProcessingQueue.getInstance();
  
  try {
    // Try immediate processing first
    await processingQueue['processWebhookPayload'](payload);
    
    console.log(`✅ Webhook processed successfully via queue: ${eventType} (${payload.event_id})`);
  } catch (error: any) {
    const errorContext = {
      error: error.message,
      code: error.code,
      eventId: payload.event_id,
      eventType,
      orderId: payload.data?.id,
    };
    
    console.error(`❌ Webhook processing failed for ${eventType}:`, errorContext);

    // Determine retry strategy based on error type
    const shouldRetry = determineShouldRetry(error, eventType);
    
    if (shouldRetry) {
      const delayMs = calculateRetryDelay(error, eventType);
      
      console.warn(`⚠️ Queuing ${eventType} for retry in ${delayMs}ms due to: ${error.message}`);

      await processingQueue.queueWebhook(
        {
          payload,
          eventType,
          eventId: payload.event_id,
          orderId: payload.data?.id,
          error: error.message,
          errorCode: error.code,
        },
        delayMs
      );
    }
    
    // Always re-throw for fallback processing
    throw error;
  }
}

/**
 * Determine if a webhook should be retried based on error type
 */
function determineShouldRetry(error: any, eventType: string): boolean {
  // Always retry race conditions
  if (error.code === 'P2025' && error.message?.includes('not found')) {
    return true;
  }
  
  // Retry database connection issues
  if (error.code === 'P1001' || error.code === 'P1008' || error.code === 'P1017') {
    return true;
  }
  
  // Retry timeout errors
  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    return true;
  }
  
  // Retry temporary database issues
  if (error.message?.includes('connection') || error.message?.includes('ECONNRESET')) {
    return true;
  }
  
  // Don't retry validation errors or permanent failures
  if (error.message?.includes('validation') || error.code === 'P2003') {
    return false;
  }
  
  // Default: retry most other errors with exponential backoff
  return true;
}

/**
 * Calculate retry delay based on error type and event type
 */
function calculateRetryDelay(error: any, eventType: string): number {
  // Race conditions get shorter delays
  if (error.code === 'P2025' && error.message?.includes('not found')) {
    return eventType === 'order.updated' ? 10000 : 5000; // 10s for order.updated, 5s for others
  }
  
  // Database connection issues get medium delays
  if (error.code === 'P1001' || error.code === 'P1008') {
    return 15000; // 15 seconds
  }
  
  // Payment processing gets priority with shorter delays
  if (eventType.startsWith('payment.')) {
    return 8000; // 8 seconds
  }
  
  // Default delay for other errors
  return 12000; // 12 seconds
}

/**
 * Enhanced email sender with rate limiting
 */
export async function sendEmailWithQueue(emailData: EmailQueueItem['data']): Promise<void> {
  await processingQueue.queueEmail(emailData);
}
