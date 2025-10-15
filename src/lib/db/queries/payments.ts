/**
 * Database queries for payment sync operations
 *
 * These queries handle payment_sync_status tracking and payment-related
 * operations for the webhook fallback system.
 */

import { Prisma, PrismaClient, PaymentStatus } from '@prisma/client';
import {
  type PaymentSyncStatusEntry,
  type PaymentSyncResult,
  type SyncType,
  type MerchantId,
} from '@/types/webhook';
import { prisma, withRetry } from '@/lib/db-unified';

/**
 * Create a new payment sync status entry
 */
export async function createPaymentSyncStatus(params: {
  syncId: string;
  syncType: SyncType;
  merchantId?: MerchantId;
  startTime: Date;
  metadata?: Record<string, unknown>;
}): Promise<PaymentSyncStatusEntry> {
  return withRetry(async () => {
    const entry = await prisma.paymentSyncStatus.create({
      data: {
        syncId: params.syncId,
        syncType: params.syncType,
        merchantId: params.merchantId,
        startTime: params.startTime,
        paymentsFound: 0,
        paymentsProcessed: 0,
        paymentsFailed: 0,
        metadata: (params.metadata as any) || null,
      },
    });

    return {
      id: entry.id,
      syncId: entry.syncId,
      syncType: entry.syncType as SyncType,
      merchantId: entry.merchantId as MerchantId | undefined,
      startTime: entry.startTime,
      endTime: entry.endTime || undefined,
      paymentsFound: entry.paymentsFound,
      paymentsProcessed: entry.paymentsProcessed,
      paymentsFailed: entry.paymentsFailed,
      errorDetails: entry.errorDetails as Record<string, unknown> | undefined,
      metadata: entry.metadata as Record<string, unknown> | undefined,
      createdAt: entry.createdAt,
    };
  });
}

/**
 * Update payment sync status with results
 */
export async function updatePaymentSyncStatus(
  syncId: string,
  updates: {
    endTime?: Date;
    paymentsFound?: number;
    paymentsProcessed?: number;
    paymentsFailed?: number;
    errorDetails?: Record<string, unknown>;
  }
): Promise<void> {
  return withRetry(
    async () => {
      await prisma.paymentSyncStatus.update({
        where: { syncId },
        data: {
          ...updates,
          errorDetails: (updates.errorDetails as any) || undefined,
        },
      });
    },
    2,
    'update-payment-sync-status'
  );
}

/**
 * Get recent payment sync history
 */
export async function getPaymentSyncHistory(params: {
  limit?: number;
  syncType?: SyncType;
  since?: Date;
}): Promise<PaymentSyncStatusEntry[]> {
  const { limit = 20, syncType, since } = params;

  return withRetry(
    async () => {
      const entries = await prisma.paymentSyncStatus.findMany({
        where: {
          ...(syncType && { syncType }),
          ...(since && { createdAt: { gte: since } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return entries.map(entry => ({
        id: entry.id,
        syncId: entry.syncId,
        syncType: entry.syncType as SyncType,
        merchantId: entry.merchantId as MerchantId | undefined,
        startTime: entry.startTime,
        endTime: entry.endTime || undefined,
        paymentsFound: entry.paymentsFound,
        paymentsProcessed: entry.paymentsProcessed,
        paymentsFailed: entry.paymentsFailed,
        errorDetails: entry.errorDetails as Record<string, unknown> | undefined,
        metadata: entry.metadata as Record<string, unknown> | undefined,
        createdAt: entry.createdAt,
      }));
    },
    2,
    'get-payment-sync-history'
  );
}

/**
 * Find payments that exist in Square but not in our database
 */
export async function findMissingPayments(squarePaymentIds: string[]): Promise<{
  missing: string[];
  existing: Array<{ squarePaymentId: string; orderId: string; status: PaymentStatus }>;
}> {
  return withRetry(
    async () => {
      const existingPayments = await prisma.payment.findMany({
        where: {
          squarePaymentId: { in: squarePaymentIds },
        },
        select: {
          squarePaymentId: true,
          orderId: true,
          status: true,
        },
      });

      const existingIds = new Set(existingPayments.map(p => p.squarePaymentId));
      const missing = squarePaymentIds.filter(id => !existingIds.has(id));

      return {
        missing,
        existing: existingPayments,
      };
    },
    2,
    'find-missing-payments'
  );
}

/**
 * Find orders that might be missing payment records
 */
export async function findOrdersWithoutPayments(params: { since?: Date; limit?: number }): Promise<
  Array<{
    id: string;
    squareOrderId: string | null;
    paymentStatus: PaymentStatus;
    total: number;
    createdAt: Date;
  }>
> {
  const { since = new Date(Date.now() - 24 * 60 * 60 * 1000), limit = 100 } = params;

  return withRetry(
    async () => {
      // Find orders that should have payments but don't
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: since },
          paymentStatus: { in: ['PENDING', 'PAID'] },
          squareOrderId: { not: null },
          payments: { none: {} }, // No associated payments
        },
        select: {
          id: true,
          squareOrderId: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return orders.map(order => ({
        id: order.id,
        squareOrderId: order.squareOrderId,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        createdAt: order.createdAt,
      }));
    },
    2,
    'find-orders-without-payments'
  );
}

/**
 * Create payment record from Square API data
 */
export async function createPaymentFromSquareData(params: {
  squarePaymentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  rawData: Record<string, unknown>;
}): Promise<void> {
  return withRetry(
    async () => {
      await prisma.payment.upsert({
        where: { squarePaymentId: params.squarePaymentId },
        update: {
          status: params.status,
          rawData: params.rawData as any,
          updatedAt: new Date(),
        },
        create: {
          squarePaymentId: params.squarePaymentId,
          orderId: params.orderId,
          amount: params.amount,
          status: params.status,
          rawData: params.rawData as any,
        },
      });
    },
    2,
    'create-payment-from-square-data'
  );
}

/**
 * Update order payment status based on Square payment data
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<void> {
  return withRetry(
    async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus,
          updatedAt: new Date(),
        },
      });
    },
    2,
    'update-order-payment-status'
  );
}

/**
 * Get payment sync metrics for monitoring
 */
export async function getPaymentSyncMetrics(since?: Date): Promise<{
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalPaymentsFound: number;
  totalPaymentsProcessed: number;
  averageDuration: number;
  syncsByType: Record<SyncType, number>;
}> {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  return withRetry(
    async () => {
      const syncs = await prisma.paymentSyncStatus.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: {
          syncType: true,
          paymentsFound: true,
          paymentsProcessed: true,
          paymentsFailed: true,
          startTime: true,
          endTime: true,
        },
      });

      const totalSyncs = syncs.length;
      const successfulSyncs = syncs.filter(s => s.endTime && s.paymentsFailed === 0).length;
      const failedSyncs = totalSyncs - successfulSyncs;

      const totalPaymentsFound = syncs.reduce((sum, s) => sum + s.paymentsFound, 0);
      const totalPaymentsProcessed = syncs.reduce((sum, s) => sum + s.paymentsProcessed, 0);

      // Calculate average duration for completed syncs
      const completedSyncs = syncs.filter(s => s.endTime);
      const averageDuration =
        completedSyncs.length > 0
          ? completedSyncs.reduce((sum, s) => {
              const duration = s.endTime!.getTime() - s.startTime.getTime();
              return sum + duration;
            }, 0) / completedSyncs.length
          : 0;

      // Group by sync type
      const syncsByType = syncs.reduce(
        (acc, sync) => {
          const type = sync.syncType as SyncType;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<SyncType, number>
      );

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        totalPaymentsFound,
        totalPaymentsProcessed,
        averageDuration: Math.round(averageDuration),
        syncsByType,
      };
    },
    2,
    'get-payment-sync-metrics'
  );
}
