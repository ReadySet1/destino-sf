import { withConnection, webhookQueries } from './db-optimized';

/**
 * Background webhook processor for handling queued webhooks
 * Implements concurrency control, timeout management, and retry logic
 */
export class WebhookProcessor {
  private processing = false;
  private readonly maxConcurrent = 2; // Process 2 at a time
  private activeProcessing = 0;
  
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    
    try {
      while (this.processing) {
        if (this.activeProcessing >= this.maxConcurrent) {
          await this.sleep(1000);
          continue;
        }
        
        // Get next pending webhook
        const webhook = await this.getNextWebhook();
        if (!webhook) {
          await this.sleep(5000); // Wait 5 seconds if queue empty
          continue;
        }
        
        // Process without blocking
        this.processWebhook(webhook).catch(console.error);
      }
    } finally {
      this.processing = false;
    }
  }
  
  stop(): void {
    this.processing = false;
  }
  
  private async getNextWebhook() {
    return withConnection(async (prisma) => {
      return await webhookQueries.getNextWebhook();
    });
  }
  
  private async processWebhook(webhook: any): Promise<void> {
    this.activeProcessing++;
    
    try {
      // Mark as processing
      await withConnection(async (prisma) => {
        return await webhookQueries.updateWebhookStatus(webhook.id, 'PROCESSING');
      });
      
      // Process with timeout
      await this.processWithTimeout(webhook.payload, 30000);
      
      // Mark as completed
      await withConnection(async (prisma) => {
        return await webhookQueries.updateWebhookStatus(webhook.id, 'COMPLETED');
      });
      
      console.log(`✅ Webhook processed successfully: ${webhook.eventType} (${webhook.eventId})`);
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`❌ Webhook processing failed: ${webhook.eventType} (${webhook.eventId}):`, errorMessage);
      
      // Mark as failed or pending for retry
      const status = webhook.attempts >= 4 ? 'FAILED' : 'PENDING';
      await withConnection(async (prisma) => {
        return await webhookQueries.updateWebhookStatus(webhook.id, status, errorMessage);
      });
    } finally {
      this.activeProcessing--;
    }
  }
  
  private async processWithTimeout(payload: any, timeout: number): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), timeout);
    });
    
    const processingPromise = this.handleWebhookPayload(payload);
    
    await Promise.race([processingPromise, timeoutPromise]);
  }
  
  private async handleWebhookPayload(payload: any): Promise<void> {
    // Import webhook handlers dynamically to avoid circular imports
    const { handleWebhookEvent } = await import('./webhook-handlers-optimized');
    
    await handleWebhookEvent(payload);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
