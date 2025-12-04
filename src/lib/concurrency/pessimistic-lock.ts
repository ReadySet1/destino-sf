/**
 * Pessimistic Locking Utility
 *
 * Provides row-level database locking for critical operations.
 * Part of DES-60 Phase 4: Concurrent Operations & Race Conditions
 *
 * Pessimistic locking uses SELECT ... FOR UPDATE to lock rows during a transaction.
 * It prevents other transactions from modifying the locked rows until the transaction completes.
 *
 * Use pessimistic locking for:
 * - Payment processing (prevent double charges)
 * - Inventory updates (prevent overselling)
 * - Financial transactions (ensure consistency)
 *
 * @example
 * ```typescript
 * import { withRowLock } from '@/lib/concurrency/pessimistic-lock';
 *
 * const result = await withRowLock<Order>(
 *   'orders',
 *   orderId,
 *   async (lockedOrder) => {
 *     // Process payment with locked order
 *     const payment = await processPayment(lockedOrder);
 *
 *     // Update order status
 *     await prisma.order.update({
 *       where: { id: orderId },
 *       data: { status: 'PROCESSING', paymentStatus: 'PAID' }
 *     });
 *
 *     return { order: lockedOrder, payment };
 *   }
 * );
 * ```
 */

import { prisma } from '@/lib/db-unified';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

/**
 * Error thrown when a pessimistic lock cannot be acquired
 */
export class LockAcquisitionError extends Error {
  constructor(
    public readonly table: string,
    public readonly id: string,
    public readonly reason: 'timeout' | 'not_found' | 'deadlock' | 'unknown',
    public readonly originalError?: string
  ) {
    const reasonDetail =
      reason === 'timeout'
        ? 'Another transaction is holding the lock. Please try again.'
        : reason === 'not_found'
          ? 'Record not found.'
          : reason === 'deadlock'
            ? 'Deadlock detected. Transaction was rolled back.'
            : originalError
              ? `Unknown error: ${originalError}`
              : 'Unknown error.';

    super(`Failed to acquire lock on ${table} with id ${id}: ${reasonDetail}`);
    this.name = 'LockAcquisitionError';
  }
}

/**
 * Type guard to check if an error is a LockAcquisitionError
 */
export function isLockAcquisitionError(error: unknown): error is LockAcquisitionError {
  return error instanceof LockAcquisitionError;
}

/**
 * Options for pessimistic locking
 */
export interface PessimisticLockOptions {
  /** Transaction timeout in milliseconds (default: 30000ms = 30 seconds) */
  timeout?: number;
  /** Transaction isolation level (default: ReadCommitted) */
  isolationLevel?: Prisma.TransactionIsolationLevel;
  /** Whether to use NOWAIT (fail immediately if lock unavailable) */
  noWait?: boolean;
  /** Whether to skip locked rows (FOR UPDATE SKIP LOCKED) */
  skipLocked?: boolean;
}

/**
 * Lock a single row and execute a function within a transaction
 *
 * @param table - Table name to lock
 * @param id - Record ID to lock
 * @param fn - Function to execute with the locked record
 * @param options - Lock options
 * @returns Result of the function
 * @throws LockAcquisitionError if lock cannot be acquired
 *
 * @example
 * ```typescript
 * const result = await withRowLock<Order>(
 *   'orders',
 *   orderId,
 *   async (order) => {
 *     if (order.status !== 'PENDING') {
 *       throw new Error('Order already processed');
 *     }
 *
 *     // Process payment
 *     const payment = await createPayment(order);
 *
 *     // Update order
 *     await prisma.order.update({
 *       where: { id: order.id },
 *       data: { status: 'PROCESSING' }
 *     });
 *
 *     return payment;
 *   },
 *   { timeout: 5000, noWait: true }
 * );
 * ```
 */
export async function withRowLock<T, R = unknown>(
  table: string,
  id: string,
  fn: (record: T) => Promise<R>,
  options: PessimisticLockOptions = {}
): Promise<R> {
  const {
    timeout = 30000, // 30 seconds default
    isolationLevel = Prisma.TransactionIsolationLevel.ReadCommitted,
    noWait = true, // Fail fast by default
    skipLocked = false,
  } = options;

  const startTime = Date.now();

  try {
    return await prisma.$transaction(
      async tx => {
        // Build lock query (cast to uuid for PostgreSQL compatibility)
        let lockQuery = `SELECT * FROM ${table} WHERE id = $1::uuid FOR UPDATE`;

        if (noWait) {
          lockQuery += ' NOWAIT';
        } else if (skipLocked) {
          lockQuery += ' SKIP LOCKED';
        }

        // Execute lock query
        const records = await tx.$queryRawUnsafe<T[]>(lockQuery, id);

        if (!records || records.length === 0) {
          throw new LockAcquisitionError(table, id, 'not_found');
        }

        const record = records[0];

        logger.debug(`Pessimistic lock acquired`, {
          table,
          id,
          duration: Date.now() - startTime,
        });

        // Execute the function with the locked record
        const result = await fn(record);

        logger.debug(`Pessimistic lock released`, {
          table,
          id,
          duration: Date.now() - startTime,
        });

        return result;
      },
      {
        timeout,
        isolationLevel,
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof LockAcquisitionError) {
      throw error;
    }

    // Check for specific PostgreSQL errors
    if (error instanceof Error) {
      // Lock timeout (NOWAIT failed)
      if (error.message.includes('could not obtain lock') || error.message.includes('NOWAIT')) {
        logger.warn(`Lock acquisition timeout`, {
          table,
          id,
          duration,
        });
        throw new LockAcquisitionError(table, id, 'timeout');
      }

      // Deadlock detected
      if (error.message.includes('deadlock')) {
        logger.error(`Deadlock detected`, {
          table,
          id,
          duration,
          error: error.message,
        });
        throw new LockAcquisitionError(table, id, 'deadlock');
      }

      // Transaction timeout
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        logger.warn(`Transaction timeout`, {
          table,
          id,
          duration,
          timeout,
        });
        throw new LockAcquisitionError(table, id, 'timeout');
      }
    }

    // Unknown error - preserve original error message for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to acquire lock`, {
      table,
      id,
      duration,
      error: errorMessage,
    });

    throw new LockAcquisitionError(table, id, 'unknown', errorMessage);
  }
}

/**
 * Lock multiple rows and execute a function within a transaction
 *
 * @param table - Table name to lock
 * @param ids - Record IDs to lock
 * @param fn - Function to execute with the locked records
 * @param options - Lock options
 * @returns Result of the function
 * @throws LockAcquisitionError if any lock cannot be acquired
 *
 * @example
 * ```typescript
 * const result = await withRowLocks<Order>(
 *   'orders',
 *   [order1Id, order2Id],
 *   async (orders) => {
 *     // Process both orders atomically
 *     for (const order of orders) {
 *       await processOrder(order);
 *     }
 *     return orders.length;
 *   }
 * );
 * ```
 */
export async function withRowLocks<T, R = unknown>(
  table: string,
  ids: string[],
  fn: (records: T[]) => Promise<R>,
  options: PessimisticLockOptions = {}
): Promise<R> {
  const {
    timeout = 30000,
    isolationLevel = Prisma.TransactionIsolationLevel.ReadCommitted,
    noWait = true,
    skipLocked = false,
  } = options;

  const startTime = Date.now();

  try {
    return await prisma.$transaction(
      async tx => {
        // Build lock query for multiple IDs (cast to uuid[] for PostgreSQL compatibility)
        let lockQuery = `SELECT * FROM ${table} WHERE id = ANY($1::uuid[]) FOR UPDATE`;

        if (noWait) {
          lockQuery += ' NOWAIT';
        } else if (skipLocked) {
          lockQuery += ' SKIP LOCKED';
        }

        // Execute lock query
        const records = await tx.$queryRawUnsafe<T[]>(lockQuery, ids);

        if (!records || records.length === 0) {
          throw new LockAcquisitionError(table, ids.join(','), 'not_found');
        }

        // Check if all records were locked
        if (records.length < ids.length && !skipLocked) {
          logger.warn(`Only ${records.length} of ${ids.length} records locked`, {
            table,
            requestedIds: ids,
            lockedCount: records.length,
          });
        }

        logger.debug(`Pessimistic locks acquired`, {
          table,
          count: records.length,
          duration: Date.now() - startTime,
        });

        // Execute the function with the locked records
        const result = await fn(records);

        logger.debug(`Pessimistic locks released`, {
          table,
          count: records.length,
          duration: Date.now() - startTime,
        });

        return result;
      },
      {
        timeout,
        isolationLevel,
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof LockAcquisitionError) {
      throw error;
    }

    // Similar error handling as withRowLock
    if (error instanceof Error) {
      if (error.message.includes('could not obtain lock') || error.message.includes('NOWAIT')) {
        throw new LockAcquisitionError(table, ids.join(','), 'timeout');
      }

      if (error.message.includes('deadlock')) {
        throw new LockAcquisitionError(table, ids.join(','), 'deadlock');
      }

      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw new LockAcquisitionError(table, ids.join(','), 'timeout');
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to acquire locks`, {
      table,
      ids,
      duration,
      error: errorMessage,
    });

    throw new LockAcquisitionError(table, ids.join(','), 'unknown', errorMessage);
  }
}
