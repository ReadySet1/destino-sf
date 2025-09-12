/**
 * Webhook Retry Queue System
 * Handles webhook processing with retry logic, dead letter queue, and monitoring
 */

import { performanceMonitor } from '../monitoring/performance';
import { prisma } from '../db-unified';

interface WebhookJob {
  id: string;
  type: 'square_webhook' | 'shippo_webhook' | 'custom_webhook';
  payload: any;
  headers: Record<string, string>;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  nextAttempt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  error?: string;
  metadata?: Record<string, any>;
}

interface WebhookProcessor {
  process(job: WebhookJob): Promise<void>;
}

interface RetryStrategy {
  calculateDelay(attempt: number): number;
  shouldRetry(error: Error, attempt: number): boolean;
}

class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(
    private baseDelay = 1000,
    private maxDelay = 30000,
    private jitterMax = 1000
  ) {}

  calculateDelay(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.jitterMax;
    
    return cappedDelay + jitter;
  }

  shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry certain types of errors
    const nonRetryableErrors = [
      'INVALID_SIGNATURE',
      'MALFORMED_PAYLOAD',
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR'
    ];

    if (nonRetryableErrors.some(type => error.message.includes(type))) {
      return false;
    }

    // Retry network and temporary errors
    return error.message.includes('NETWORK_ERROR') ||
           error.message.includes('TIMEOUT') ||
           error.message.includes('SERVICE_UNAVAILABLE') ||
           error.message.includes('RATE_LIMITED');
  }
}

export class WebhookRetryQueue {
  private queue: Map<string, WebhookJob> = new Map();
  private processors: Map<string, WebhookProcessor> = new Map();
  private retryStrategy: RetryStrategy = new ExponentialBackoffStrategy();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private readonly processingIntervalMs = 5000; // Process every 5 seconds
  private readonly maxConcurrentJobs = 5;
  private currentlyProcessing = new Set<string>();

  constructor() {
    this.startProcessing();
  }

  /**
   * Add a webhook job to the queue
   */
  async add(job: Omit<WebhookJob, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const webhookJob: WebhookJob = {
      ...job,
      id: this.generateJobId(),
      createdAt: new Date(),
      status: 'pending'
    };

    // Store in memory queue
    this.queue.set(webhookJob.id, webhookJob);

    // Persist to database for durability
    await this.persistJob(webhookJob);

    // Log the job addition
    await performanceMonitor.trackBusinessMetric(
      'webhook_job_added',
      1,
      {
        type: webhookJob.type,
        retries: webhookJob.retries.toString()
      }
    );

    console.log(`📥 Webhook job added to queue: ${webhookJob.id} (${webhookJob.type})`);

    return webhookJob.id;
  }

  /**
   * Register a webhook processor for a specific type
   */
  registerProcessor(type: string, processor: WebhookProcessor): void {
    this.processors.set(type, processor);
    console.log(`🔧 Registered webhook processor for type: ${type}`);
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(
      () => this.processQueue(),
      this.processingIntervalMs
    );

    console.log('🚀 Webhook retry queue processing started');
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    console.log('⏹️ Webhook retry queue processing stopped');
  }

  /**
   * Process pending jobs in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.currentlyProcessing.size >= this.maxConcurrentJobs) {
      return; // Already at max capacity
    }

    // Load pending jobs from database to ensure persistence
    await this.loadPendingJobsFromDatabase();

    const now = new Date();
    const pendingJobs = Array.from(this.queue.values())
      .filter(job => 
        job.status === 'pending' &&
        !this.currentlyProcessing.has(job.id) &&
        (!job.nextAttempt || job.nextAttempt <= now)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, this.maxConcurrentJobs - this.currentlyProcessing.size);

    // Process jobs concurrently
    await Promise.all(
      pendingJobs.map(job => this.processJob(job))
    );
  }

  /**
   * Process a single webhook job
   */
  private async processJob(job: WebhookJob): Promise<void> {
    if (this.currentlyProcessing.has(job.id)) {
      return; // Already being processed
    }

    this.currentlyProcessing.add(job.id);
    
    try {
      // Update job status to processing
      job.status = 'processing';
      await this.updateJobInDatabase(job);

      console.log(`🔄 Processing webhook job: ${job.id} (attempt ${job.retries + 1})`);

      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor registered for webhook type: ${job.type}`);
      }

      // Track processing time
      const startTime = Date.now();
      
      await processor.process(job);
      
      const processingTime = Date.now() - startTime;

      // Job completed successfully
      job.status = 'completed';
      await this.updateJobInDatabase(job);
      this.queue.delete(job.id);

      // Track success metrics
      await performanceMonitor.trackBusinessMetric(
        'webhook_job_completed',
        processingTime,
        {
          type: job.type,
          retries: job.retries.toString(),
          success: 'true'
        }
      );

      console.log(`✅ Webhook job completed: ${job.id} (${processingTime}ms)`);

    } catch (error) {
      await this.handleJobError(job, error);
    } finally {
      this.currentlyProcessing.delete(job.id);
    }
  }

  /**
   * Handle job processing errors
   */
  private async handleJobError(job: WebhookJob, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    job.error = errorMessage;
    job.retries++;

    console.error(`❌ Webhook job failed: ${job.id} (attempt ${job.retries})`, {
      type: job.type,
      error: errorMessage
    });

    // Check if we should retry
    if (job.retries < job.maxRetries && this.retryStrategy.shouldRetry(error, job.retries)) {
      // Schedule retry
      const delay = this.retryStrategy.calculateDelay(job.retries);
      job.nextAttempt = new Date(Date.now() + delay);
      job.status = 'pending';

      await this.updateJobInDatabase(job);

      console.log(`🔄 Webhook job scheduled for retry: ${job.id} (in ${Math.round(delay/1000)}s)`);

      // Track retry metrics
      await performanceMonitor.trackBusinessMetric(
        'webhook_job_retry',
        1,
        {
          type: job.type,
          attempt: job.retries.toString()
        }
      );

    } else {
      // Move to dead letter queue
      job.status = 'dead_letter';
      await this.updateJobInDatabase(job);
      await this.moveToDeadLetterQueue(job);

      // Track failure metrics
      await performanceMonitor.trackBusinessMetric(
        'webhook_job_failed',
        1,
        {
          type: job.type,
          retries: job.retries.toString(),
          error_type: this.categorizeError(errorMessage)
        }
      );

      console.error(`💀 Webhook job moved to dead letter queue: ${job.id}`);
    }
  }

  /**
   * Move failed job to dead letter queue for manual inspection
   */
  private async moveToDeadLetterQueue(job: WebhookJob): Promise<void> {
    try {
      // Log to webhook log table instead (dead letter queue table not available)
      await prisma.webhookLog.create({
        data: {
          webhookId: job.id,
          eventType: job.type,
          signatureValid: false, // Mark as failed
          payload: job.payload,
          headers: job.headers,
          validationError: {
            original_retries: job.retries,
            max_retries: job.maxRetries,
            final_error: job.error || 'Unknown error',
            failed_at: new Date().toISOString(),
            metadata: job.metadata || {}
          }
        }
      }).catch(() => {
        // If table doesn't exist, log to console for now
        console.error('Dead letter queue table not found, logging failed job:', {
          id: job.id,
          type: job.type,
          error: job.error,
          retries: job.retries
        });
      });

      // Remove from active queue
      this.queue.delete(job.id);

    } catch (error) {
      console.error('Failed to move job to dead letter queue:', error);
    }
  }

  /**
   * Persist job to database for durability
   */
  private async persistJob(job: WebhookJob): Promise<void> {
    try {
      await prisma.webhookQueue.create({
        data: {
          eventId: job.id,
          eventType: job.type,
          payload: job.payload,
          status: 'PENDING',
          attempts: job.retries,
          errorMessage: job.error,
          lastAttemptAt: job.nextAttempt
        }
      }).catch(() => {
        // If table doesn't exist, continue with in-memory processing
        console.warn('Webhook queue table not found, using in-memory processing only');
      });
    } catch (error) {
      console.error('Failed to persist webhook job:', error);
    }
  }

  /**
   * Update job in database
   */
  private async updateJobInDatabase(job: WebhookJob): Promise<void> {
    try {
      await prisma.webhookQueue.update({
        where: { eventId: job.id },
        data: {
          attempts: job.retries,
          status: job.status,
          lastAttemptAt: job.nextAttempt,
          errorMessage: job.error
        }
      }).catch(() => {
        // Continue if update fails
      });
    } catch (error) {
      // Silent fail - job will continue in memory
    }
  }

  /**
   * Load pending jobs from database on startup/restart
   */
  private async loadPendingJobsFromDatabase(): Promise<void> {
    try {
      const pendingJobs = await prisma.webhookQueue.findMany({
        where: {
          status: {
            in: ['pending', 'processing']
          }
        }
      }).catch(() => []);

      for (const dbJob of pendingJobs) {
        if (!this.queue.has(dbJob.id)) {
          const job: WebhookJob = {
            id: dbJob.eventId,
            type: dbJob.eventType as WebhookJob['type'],
            payload: dbJob.payload,
            headers: {}, // Headers not stored in WebhookQueue model
            retries: dbJob.attempts,
            maxRetries: 3, // Default since not stored in model
            createdAt: dbJob.createdAt,
            nextAttempt: dbJob.lastAttemptAt || undefined,
            status: dbJob.status as WebhookJob['status'],
            error: dbJob.errorMessage || undefined
          };

          this.queue.set(job.id, job);
        }
      }
    } catch (error) {
      // Continue without database persistence
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Categorize error for metrics
   */
  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('NETWORK') || errorMessage.includes('TIMEOUT')) {
      return 'network';
    }
    if (errorMessage.includes('SIGNATURE') || errorMessage.includes('AUTHENTICATION')) {
      return 'auth';
    }
    if (errorMessage.includes('MALFORMED') || errorMessage.includes('VALIDATION')) {
      return 'validation';
    }
    return 'unknown';
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const jobs = Array.from(this.queue.values());
    
    return {
      total_jobs: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      currently_processing: this.currentlyProcessing.size,
      max_concurrent: this.maxConcurrentJobs,
      registered_processors: Array.from(this.processors.keys()),
      is_processing: this.isProcessing
    };
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: WebhookJob['status']): WebhookJob[] {
    return Array.from(this.queue.values()).filter(job => job.status === status);
  }

  /**
   * Manually retry a specific job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.queue.get(jobId);
    if (!job) {
      return false;
    }

    job.status = 'pending';
    job.nextAttempt = new Date();
    await this.updateJobInDatabase(job);

    return true;
  }

  /**
   * Clear completed jobs from queue
   */
  async clearCompleted(): Promise<number> {
    const completedJobs = Array.from(this.queue.values())
      .filter(job => job.status === 'completed');

    for (const job of completedJobs) {
      this.queue.delete(job.id);
      
      // Also remove from database
      try {
        await prisma.webhookQueue.delete({
          where: { id: job.id }
        }).catch(() => {});
      } catch (error) {
        // Continue
      }
    }

    return completedJobs.length;
  }
}

// Singleton instance
export const webhookRetryQueue = new WebhookRetryQueue();
