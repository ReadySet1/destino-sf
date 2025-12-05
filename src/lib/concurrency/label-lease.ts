/**
 * Lease-Based Locking for Label Creation
 *
 * Replaces PostgreSQL row locks (SELECT ... FOR UPDATE) with application-level
 * leases that auto-expire. This prevents "ghost locks" when Vercel serverless
 * functions timeout but their database connections don't close immediately.
 *
 * Key benefits:
 * - No ghost locks - leases auto-expire after configured timeout
 * - Force retry actually works - can force-release without waiting for DB lock
 * - Better serverless compatibility - no long-running database transactions
 * - Admin visibility - can see lock status and manually release if needed
 *
 * @example
 * ```typescript
 * const lease = await acquireLabelLease(orderId);
 * if (!lease.acquired) {
 *   return { error: 'Label creation in progress by another process' };
 * }
 *
 * try {
 *   // Create label via Shippo API
 *   const label = await createShippingLabel(orderId);
 *   return { success: true, label };
 * } finally {
 *   await releaseLabelLease(orderId, lease.lockId);
 * }
 * ```
 */

import { prisma } from '@/lib/db-unified';
import { logger } from '@/utils/logger';
import { randomUUID } from 'crypto';

/** Default lease duration in seconds */
const DEFAULT_LEASE_SECONDS = 60;

/**
 * Result of attempting to acquire a lease
 */
export interface LeaseResult {
  /** Whether the lease was successfully acquired */
  acquired: boolean;
  /** Unique identifier for this lease (use to release) */
  lockId: string | null;
  /** If not acquired, reason why */
  reason?: 'already_locked' | 'order_not_found' | 'already_has_label';
  /** If already locked, when the current lease expires */
  expiresAt?: Date;
  /** If already locked, who holds the lease */
  holder?: string;
}

/**
 * Attempt to acquire a lease for label creation on an order.
 *
 * Uses an atomic UPDATE with WHERE clause to ensure only one process
 * can acquire the lease at a time. The lease auto-expires after
 * leaseSeconds, allowing other processes to acquire it if the holder
 * fails to release (e.g., due to serverless timeout).
 *
 * @param orderId - The order ID to lock
 * @param leaseSeconds - How long the lease should be held (default: 60s)
 * @returns LeaseResult indicating success or failure
 */
export async function acquireLabelLease(
  orderId: string,
  leaseSeconds: number = DEFAULT_LEASE_SECONDS
): Promise<LeaseResult> {
  const lockId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + leaseSeconds * 1000);

  try {
    // First, check the order state
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        trackingNumber: true,
        labelLockHolder: true,
        labelLockExpiresAt: true,
      },
    });

    if (!order) {
      logger.warn('Label lease: Order not found', { orderId });
      return { acquired: false, lockId: null, reason: 'order_not_found' };
    }

    // If order already has a label, no need to acquire lease
    if (order.trackingNumber) {
      logger.info('Label lease: Order already has label', {
        orderId,
        trackingNumber: order.trackingNumber,
      });
      return { acquired: false, lockId: null, reason: 'already_has_label' };
    }

    // Check if there's an active (non-expired) lease
    if (order.labelLockHolder && order.labelLockExpiresAt && order.labelLockExpiresAt > now) {
      logger.info('Label lease: Order is locked by another process', {
        orderId,
        holder: order.labelLockHolder,
        expiresAt: order.labelLockExpiresAt,
      });
      return {
        acquired: false,
        lockId: null,
        reason: 'already_locked',
        holder: order.labelLockHolder,
        expiresAt: order.labelLockExpiresAt,
      };
    }

    // Attempt to acquire the lease atomically
    // This UPDATE will only succeed if the conditions still match
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        trackingNumber: null, // Still no label
        OR: [
          { labelLockHolder: null }, // No current lock
          { labelLockExpiresAt: { lt: now } }, // Lock expired
        ],
      },
      data: {
        labelLockHolder: lockId,
        labelLockExpiresAt: expiresAt,
        lastRetryAt: now,
      },
    });

    if (result.count === 0) {
      // Race condition - another process got the lock first
      logger.info('Label lease: Failed to acquire (race condition)', { orderId });

      // Fetch current state to return accurate info
      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          trackingNumber: true,
          labelLockHolder: true,
          labelLockExpiresAt: true,
        },
      });

      if (currentOrder?.trackingNumber) {
        return { acquired: false, lockId: null, reason: 'already_has_label' };
      }

      return {
        acquired: false,
        lockId: null,
        reason: 'already_locked',
        holder: currentOrder?.labelLockHolder ?? undefined,
        expiresAt: currentOrder?.labelLockExpiresAt ?? undefined,
      };
    }

    logger.info('Label lease: Acquired successfully', {
      orderId,
      lockId,
      expiresAt,
    });

    return { acquired: true, lockId };
  } catch (error) {
    logger.error('Label lease: Error acquiring lease', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Release a label creation lease.
 *
 * Should be called in a finally block after label creation completes
 * (whether successful or not). Only releases if the lockId matches,
 * preventing accidental release of another process's lease.
 *
 * @param orderId - The order ID
 * @param lockId - The lock ID returned from acquireLabelLease
 */
export async function releaseLabelLease(orderId: string, lockId: string): Promise<void> {
  try {
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        labelLockHolder: lockId, // Only release if we hold the lock
      },
      data: {
        labelLockHolder: null,
        labelLockExpiresAt: null,
      },
    });

    if (result.count > 0) {
      logger.info('Label lease: Released successfully', { orderId, lockId });
    } else {
      logger.warn('Label lease: Release skipped (lock not held)', { orderId, lockId });
    }
  } catch (error) {
    logger.error('Label lease: Error releasing lease', {
      orderId,
      lockId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - release is best effort
  }
}

/**
 * Force release any lease on an order.
 *
 * Admin override that releases the lease regardless of who holds it.
 * Use when a lease is stuck (e.g., holder process crashed).
 * Also resets retry count for a clean slate.
 *
 * @param orderId - The order ID
 */
export async function forceReleaseLabelLease(orderId: string): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        labelLockHolder: null,
        labelLockExpiresAt: null,
        retryCount: 0,
        lastRetryAt: null,
      },
    });

    logger.info('Label lease: Force released', { orderId });
  } catch (error) {
    logger.error('Label lease: Error force releasing lease', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if an order has an active (non-expired) lease.
 *
 * @param orderId - The order ID
 * @returns true if there's an active lease, false otherwise
 */
export async function hasActiveLabelLease(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      labelLockHolder: true,
      labelLockExpiresAt: true,
    },
  });

  if (!order || !order.labelLockHolder || !order.labelLockExpiresAt) {
    return false;
  }

  return order.labelLockExpiresAt > new Date();
}

/**
 * Get lease information for an order.
 *
 * Useful for admin UI to show lock status.
 *
 * @param orderId - The order ID
 * @returns Lease info or null if no active lease
 */
export async function getLabelLeaseInfo(
  orderId: string
): Promise<{ holder: string; expiresAt: Date; isExpired: boolean } | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      labelLockHolder: true,
      labelLockExpiresAt: true,
    },
  });

  if (!order || !order.labelLockHolder || !order.labelLockExpiresAt) {
    return null;
  }

  return {
    holder: order.labelLockHolder,
    expiresAt: order.labelLockExpiresAt,
    isExpired: order.labelLockExpiresAt <= new Date(),
  };
}
