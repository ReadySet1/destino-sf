/**
 * Payment Sync Service - Fallback Recovery System
 * 
 * This service acts as a fallback mechanism to catch payments that may have
 * been missed due to webhook failures. It periodically syncs payment data
 * from Square's API and updates local records accordingly.
 */

import { PaymentStatus } from '@prisma/client';
import { 
  type PaymentSyncRequest,
  type PaymentSyncResult,
  type SyncType,
  type MerchantId,
  type SquareEnvironment
} from '@/types/webhook';
import { 
  createPaymentSyncStatus,
  updatePaymentSyncStatus,
  findMissingPayments,
  findOrdersWithoutPayments,
  createPaymentFromSquareData,
  updateOrderPaymentStatus
} from '@/lib/db/queries/payments';
import { getSquareClient } from '@/lib/square';
import { trackMetric, sendWebhookAlert } from '@/lib/monitoring/webhook-metrics';
import { prisma, withRetry } from '@/lib/db-unified';

/**
 * Main payment sync service class
 */
export class PaymentSyncService {
  private environment: SquareEnvironment;

  constructor(environment: SquareEnvironment = 'production') {
    this.environment = environment;
  }

  /**
   * Execute payment sync operation
   */
  async syncPayments(request: PaymentSyncRequest): Promise<PaymentSyncResult> {
    const syncId = this.generateSyncId(request.syncType || 'manual');
    const startTime = new Date();
    
    console.log(`🔄 Starting payment sync: ${syncId}`, {
      lookbackMinutes: request.lookbackMinutes,
      merchantId: request.merchantId,
      forceSync: request.forceSync,
      environment: this.environment
    });

    // Create sync status entry
    const syncStatus = await createPaymentSyncStatus({
      syncId,
      syncType: request.syncType || 'manual',
      merchantId: request.merchantId,
      startTime,
      metadata: {
        environment: this.environment,
        lookbackMinutes: request.lookbackMinutes,
        forceSync: request.forceSync,
        batchSize: request.batchSize || 100
      }
    });

    const result: PaymentSyncResult = {
      success: false,
      syncId,
      paymentsFound: 0,
      paymentsProcessed: 0,
      paymentsFailed: 0,
      errors: [],
      duration: 0,
      startTime,
      endTime: new Date(),
      metadata: {
        merchantId: request.merchantId,
        environment: this.environment,
        syncType: request.syncType || 'manual'
      }
    };

    try {
      // Step 1: Get recent payments from Square API
      const squarePayments = await this.fetchRecentPayments(request.lookbackMinutes);
      result.paymentsFound = squarePayments.length;
      
      console.log(`📊 Found ${squarePayments.length} payments in Square from last ${request.lookbackMinutes} minutes`);

      // Step 2: Check which payments are missing from our database
      const squarePaymentIds = squarePayments.map(p => p.id);
      const { missing: missingIds, existing } = await findMissingPayments(squarePaymentIds);
      
      console.log(`📋 Analysis: ${existing.length} existing, ${missingIds.length} missing payments`);

      // Step 3: Process missing payments
      const processResults = await this.processMissingPayments(
        squarePayments.filter(p => missingIds.includes(p.id)),
        request.batchSize || 10
      );
      
      result.paymentsProcessed = processResults.processed;
      result.paymentsFailed = processResults.failed;
      result.errors = processResults.errors;

      // Step 4: Update existing payments if force sync is enabled
      if (request.forceSync) {
        const updateResults = await this.updateExistingPayments(
          squarePayments.filter(p => existing.some(e => e.squarePaymentId === p.id))
        );
        result.paymentsProcessed += updateResults.updated;
        result.errors.push(...updateResults.errors);
      }

      // Step 5: Find and process orders without payments
      const ordersWithoutPayments = await findOrdersWithoutPayments({
        since: new Date(Date.now() - request.lookbackMinutes * 60 * 1000),
        limit: 50
      });
      
      if (ordersWithoutPayments.length > 0) {
        console.log(`🔍 Found ${ordersWithoutPayments.length} orders without payment records`);
        const orphanResults = await this.processOrphanedOrders(ordersWithoutPayments, squarePayments);
        result.paymentsProcessed += orphanResults.processed;
        result.errors.push(...orphanResults.errors);
      }

      // Mark as successful if no critical errors
      result.success = result.errors.length === 0 || 
                      result.paymentsProcessed > result.paymentsFailed;
      
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      // Update sync status in database
      await updatePaymentSyncStatus(syncId, {
        endTime: result.endTime,
        paymentsFound: result.paymentsFound,
        paymentsProcessed: result.paymentsProcessed,
        paymentsFailed: result.paymentsFailed,
        errorDetails: result.errors.length > 0 ? { errors: result.errors } : undefined
      });

      // Track metrics
      await trackMetric({
        type: 'webhook_processed',
        environment: this.environment,
        valid: result.success,
        duration: result.duration
      });

      console.log(`✅ Payment sync completed: ${syncId}`, {
        success: result.success,
        found: result.paymentsFound,
        processed: result.paymentsProcessed,
        failed: result.paymentsFailed,
        duration: `${result.duration}ms`
      });

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.error(`❌ Payment sync failed: ${syncId}`, error);
      
      result.success = false;
      result.endTime = endTime;
      result.duration = duration;
      result.errors.push({
        paymentId: 'sync_error',
        error: error instanceof Error ? error.message : 'Unknown sync error'
      });

      // Update sync status with error
      await updatePaymentSyncStatus(syncId, {
        endTime,
        paymentsFailed: result.paymentsFailed + 1,
        errorDetails: {
          syncError: error instanceof Error ? error.message : 'Unknown error',
          errors: result.errors
        }
      });

      // Send alert for sync failures
      await sendWebhookAlert({
        severity: 'high',
        title: 'Payment Sync Failed',
        message: `Payment sync operation ${syncId} failed`,
        details: {
          syncId,
          environment: this.environment,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        }
      });

      return result;
    }
  }

  /**
   * Fetch recent payments from Square API
   */
  private async fetchRecentPayments(lookbackMinutes: number): Promise<any[]> {
    try {
      const since = new Date(Date.now() - lookbackMinutes * 60 * 1000);
      const sinceString = since.toISOString();
      
      console.log(`🔍 Fetching Square payments since: ${sinceString}`);
      
      // Use Square API to list payments
      const squareClient = await getSquareClient();
      const paymentsClient = squareClient?.paymentsApi;
      
      if (!paymentsClient) {
        throw new Error('Square payments API client not available');
      }

      // Fetch payments with pagination
      let allPayments: any[] = [];
      let cursor: string | undefined;
      const maxPages = 10; // Prevent infinite loops
      let currentPage = 0;

      do {
        const request: any = {
          beginTime: sinceString,
          sortOrder: 'DESC',
          ...(cursor && { cursor })
        };

        const response = await paymentsClient.listPayments(request);
        
        if (response?.result?.payments) {
          allPayments.push(...response.result.payments);
        }
        
        cursor = response?.result?.cursor;
        currentPage++;
        
      } while (cursor && currentPage < maxPages);

      console.log(`📊 Fetched ${allPayments.length} payments from Square API`);
      return allPayments;

    } catch (error) {
      console.error('❌ Failed to fetch payments from Square:', error);
      throw new Error(`Failed to fetch Square payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process payments that are missing from our database
   */
  private async processMissingPayments(
    missingPayments: any[],
    batchSize: number
  ): Promise<{
    processed: number;
    failed: number;
    errors: Array<{ paymentId: string; error: string }>;
  }> {
    const result = { processed: 0, failed: 0, errors: [] as Array<{ paymentId: string; error: string }> };
    
    console.log(`🔧 Processing ${missingPayments.length} missing payments`);

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < missingPayments.length; i += batchSize) {
      const batch = missingPayments.slice(i, i + batchSize);
      
      for (const payment of batch) {
        try {
          await this.processSinglePayment(payment);
          result.processed++;
          
        } catch (error) {
          result.failed++;
          result.errors.push({
            paymentId: payment.id,
            error: error instanceof Error ? error.message : 'Unknown processing error'
          });
          
          console.error(`❌ Failed to process payment ${payment.id}:`, error);
        }
      }
      
      // Small delay between batches to prevent rate limiting
      if (i + batchSize < missingPayments.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return result;
  }

  /**
   * Process a single payment from Square data
   */
  private async processSinglePayment(squarePayment: any): Promise<void> {
    const paymentId = squarePayment.id;
    const orderId = squarePayment.order_id;
    
    if (!orderId) {
      throw new Error(`Payment ${paymentId} has no associated order ID`);
    }

    // Map Square payment status to our enum
    const paymentStatus = this.mapSquarePaymentStatus(squarePayment.status);
    const amount = squarePayment.amount_money?.amount ? 
      Number(squarePayment.amount_money.amount) / 100 : 0;

    // Find the local order
    const localOrder = await withRetry(async () => {
      return prisma.order.findFirst({
        where: { squareOrderId: orderId },
        select: { id: true, paymentStatus: true }
      });
    }, 2, 'find-order');

    if (!localOrder) {
      console.warn(`⚠️ No local order found for Square order ${orderId}`);
      return;
    }

    // Create payment record
    await createPaymentFromSquareData({
      squarePaymentId: paymentId,
      orderId: localOrder.id,
      amount,
      status: paymentStatus,
      rawData: squarePayment
    });

    // Update order payment status if needed
    if (localOrder.paymentStatus !== paymentStatus) {
      await updateOrderPaymentStatus(localOrder.id, paymentStatus);
    }

    console.log(`✅ Processed missing payment: ${paymentId} -> ${paymentStatus}`);
  }

  /**
   * Update existing payments with latest Square data
   */
  private async updateExistingPayments(payments: any[]): Promise<{
    updated: number;
    errors: Array<{ paymentId: string; error: string }>;
  }> {
    const result = { updated: 0, errors: [] as Array<{ paymentId: string; error: string }> };
    
    for (const payment of payments) {
      try {
        const paymentStatus = this.mapSquarePaymentStatus(payment.status);
        
        // Update payment record
        await withRetry(async () => {
          return prisma.payment.update({
            where: { squarePaymentId: payment.id },
            data: {
              status: paymentStatus,
              rawData: payment as any,
              updatedAt: new Date()
            }
          });
        }, 2, 'update-payment');
        
        result.updated++;
        
      } catch (error) {
        result.errors.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : 'Unknown update error'
        });
      }
    }
    
    return result;
  }

  /**
   * Process orders that should have payments but don't
   */
  private async processOrphanedOrders(
    orphanedOrders: any[],
    squarePayments: any[]
  ): Promise<{
    processed: number;
    errors: Array<{ paymentId: string; error: string }>;
  }> {
    const result = { processed: 0, errors: [] as Array<{ paymentId: string; error: string }> };
    
    for (const order of orphanedOrders) {
      try {
        if (!order.squareOrderId) continue;
        
        // Find corresponding Square payment
        const squarePayment = squarePayments.find(p => p.order_id === order.squareOrderId);
        
        if (squarePayment) {
          await this.processSinglePayment(squarePayment);
          result.processed++;
          console.log(`🔗 Linked orphaned order ${order.id} with payment ${squarePayment.id}`);
        } else {
          console.warn(`⚠️ No Square payment found for order ${order.squareOrderId}`);
        }
        
      } catch (error) {
        result.errors.push({
          paymentId: order.id,
          error: error instanceof Error ? error.message : 'Unknown orphan processing error'
        });
      }
    }
    
    return result;
  }

  /**
   * Map Square payment status to our internal enum
   */
  private mapSquarePaymentStatus(squareStatus: string): PaymentStatus {
    switch (squareStatus?.toUpperCase()) {
      case 'COMPLETED':
        return PaymentStatus.PAID;
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'FAILED':
      case 'CANCELED':
        return PaymentStatus.FAILED;
      default:
        console.warn(`Unknown Square payment status: ${squareStatus}, defaulting to PENDING`);
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Generate unique sync ID for tracking
   */
  private generateSyncId(syncType: SyncType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `sync_${syncType}_${timestamp}_${random}`;
  }
}

/**
 * Quick payment sync function for API endpoints
 */
export async function syncRecentPayments(params: {
  lookbackMinutes?: number;
  environment?: SquareEnvironment;
  syncType?: SyncType;
  forceSync?: boolean;
}): Promise<PaymentSyncResult> {
  const {
    lookbackMinutes = 60, // Default: last hour
    environment = 'production',
    syncType = 'manual',
    forceSync = false
  } = params;

  const syncService = new PaymentSyncService(environment);
  
  return syncService.syncPayments({
    lookbackMinutes,
    syncType,
    forceSync
  });
}

/**
 * Scheduled payment sync for cron jobs
 * Optimized for frequent execution with smaller lookback windows
 */
export async function scheduledPaymentSync(): Promise<PaymentSyncResult> {
  console.log('⏰ Starting scheduled payment sync');
  
  // Sync both environments
  const environments: SquareEnvironment[] = ['production', 'sandbox'];
  const results: PaymentSyncResult[] = [];
  
  for (const environment of environments) {
    try {
      const syncService = new PaymentSyncService(environment);
      const result = await syncService.syncPayments({
        lookbackMinutes: 15, // Short lookback for frequent syncs
        syncType: 'scheduled',
        forceSync: false,
        batchSize: 20
      });
      
      results.push(result);
      
    } catch (error) {
      console.error(`❌ Scheduled sync failed for ${environment}:`, error);
      
      await sendWebhookAlert({
        severity: 'medium',
        title: `Scheduled Payment Sync Failed (${environment})`,
        message: `Scheduled payment sync failed for ${environment} environment`,
        details: {
          environment,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  // Return combined result
  const combined: PaymentSyncResult = {
    success: results.every(r => r.success),
    syncId: `combined_${Date.now()}`,
    paymentsFound: results.reduce((sum, r) => sum + r.paymentsFound, 0),
    paymentsProcessed: results.reduce((sum, r) => sum + r.paymentsProcessed, 0),
    paymentsFailed: results.reduce((sum, r) => sum + r.paymentsFailed, 0),
    errors: results.flatMap(r => r.errors),
    duration: Math.max(...results.map(r => r.duration)),
    startTime: new Date(Math.min(...results.map(r => r.startTime.getTime()))),
    endTime: new Date(Math.max(...results.map(r => r.endTime.getTime()))),
    metadata: {
      environment: 'production' as SquareEnvironment,
      syncType: 'scheduled' as SyncType
    }
  };

  return combined;
}

/**
 * Emergency payment sync for webhook failures
 * Called when webhook processing fails to ensure no payments are lost
 */
export async function emergencyPaymentSync(params: {
  eventId: string;
  merchantId?: MerchantId;
  environment: SquareEnvironment;
}): Promise<PaymentSyncResult> {
  console.log(`🚨 Emergency payment sync triggered for event: ${params.eventId}`);
  
  const syncService = new PaymentSyncService(params.environment);
  
  // Broader lookback window for emergency syncs
  const result = await syncService.syncPayments({
    lookbackMinutes: 120, // 2 hours to be safe
    merchantId: params.merchantId,
    syncType: 'webhook_fallback',
    forceSync: true, // Force re-check of existing payments
    batchSize: 50
  });

  // Send alert if emergency sync also fails
  if (!result.success) {
    await sendWebhookAlert({
      severity: 'critical',
      title: 'Emergency Payment Sync Failed',
      message: `Emergency payment sync failed after webhook failure for event ${params.eventId}`,
      details: {
        eventId: params.eventId,
        environment: params.environment,
        syncResult: result
      }
    });
  }

  return result;
}

// Re-export for convenience
export { PaymentSyncService as default };
