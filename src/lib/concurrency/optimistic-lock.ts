/**
 * Optimistic Locking Utility
 *
 * Provides version-based optimistic locking for database operations.
 * Part of DES-60 Phase 4: Concurrent Operations & Race Conditions
 *
 * Optimistic locking uses a version field to detect concurrent modifications.
 * It's ideal for operations where conflicts are rare and you want to avoid
 * holding database locks.
 *
 * @example
 * ```typescript
 * import { updateWithOptimisticLock, OptimisticLockError } from '@/lib/concurrency/optimistic-lock';
 *
 * try {
 *   const updated = await updateWithOptimisticLock(
 *     prisma.order,
 *     orderId,
 *     currentVersion,
 *     { status: 'PROCESSING' }
 *   );
 * } catch (error) {
 *   if (error instanceof OptimisticLockError) {
 *     // Handle version conflict - order was modified by another request
 *     console.log('Order was updated by another request, please retry');
 *   }
 * }
 * ```
 */

import { logger } from '@/utils/logger';

/**
 * Error thrown when an optimistic lock version conflict occurs
 */
export class OptimisticLockError extends Error {
  constructor(
    public readonly modelName: string,
    public readonly id: string,
    public readonly expectedVersion: number,
    public readonly actualVersion?: number
  ) {
    super(
      `Optimistic lock conflict: ${modelName} with id ${id} was modified. ` +
        `Expected version ${expectedVersion}` +
        (actualVersion ? `, but found version ${actualVersion}` : '')
    );
    this.name = 'OptimisticLockError';
  }
}

/**
 * Type guard to check if an error is an OptimisticLockError
 */
export function isOptimisticLockError(error: unknown): error is OptimisticLockError {
  return error instanceof OptimisticLockError;
}

/**
 * Options for optimistic lock update
 */
export interface OptimisticLockOptions {
  /** Maximum number of retry attempts on version conflict */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to automatically retry on version conflict */
  autoRetry?: boolean;
}

/**
 * Update a record with optimistic locking
 *
 * @param model - Prisma model delegate (e.g., prisma.order)
 * @param id - Record ID to update
 * @param currentVersion - Expected current version of the record
 * @param data - Data to update (can include version increment)
 * @param options - Optimistic lock options
 * @returns Updated record
 * @throws OptimisticLockError if version conflict occurs
 *
 * @example
 * ```typescript
 * const order = await prisma.order.findUnique({ where: { id } });
 *
 * const updated = await updateWithOptimisticLock(
 *   prisma.order,
 *   order.id,
 *   order.version,
 *   {
 *     status: 'PROCESSING',
 *     paymentStatus: 'PAID'
 *   }
 * );
 * ```
 */
export async function updateWithOptimisticLock<T extends { id: string; version: number }>(
  model: any,
  id: string,
  currentVersion: number,
  data: Partial<T>,
  options: OptimisticLockOptions = {}
): Promise<T> {
  const { maxRetries = 0, retryDelay = 100, autoRetry = false } = options;
  const modelName = model.name || 'Unknown';

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Try to update with version check
      const updated = await model.update({
        where: {
          id,
          version: currentVersion + attempt, // Adjust for retry attempts
        },
        data: {
          ...data,
          version: {
            increment: 1,
          },
        },
      });

      if (!updated) {
        // Record not found or version mismatch
        // Fetch current version for better error message
        const current = await model.findUnique({ where: { id } });

        if (!current) {
          throw new Error(`${modelName} with id ${id} not found`);
        }

        throw new OptimisticLockError(modelName, id, currentVersion + attempt, current.version);
      }

      // Log successful update
      logger.debug(`Optimistic lock update successful`, {
        model: modelName,
        id,
        version: currentVersion,
        newVersion: updated.version,
        attempt: attempt > 0 ? attempt : undefined,
      });

      return updated as T;
    } catch (error) {
      // Check if it's a Prisma "Record not found" error (version mismatch)
      const isPrismaNotFound =
        error instanceof Error && error.message.includes('Record to update not found');

      if (isPrismaNotFound || error instanceof OptimisticLockError) {
        // Version conflict detected
        if (autoRetry && attempt < maxRetries) {
          attempt++;
          logger.warn(`Optimistic lock conflict, retrying (attempt ${attempt}/${maxRetries})`, {
            model: modelName,
            id,
            expectedVersion: currentVersion + attempt - 1,
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // No more retries, throw the error
        if (error instanceof OptimisticLockError) {
          throw error;
        }

        // Fetch current version for error message
        const current = await model.findUnique({ where: { id } }).catch(() => null);

        throw new OptimisticLockError(modelName, id, currentVersion + attempt, current?.version);
      }

      // Other error, rethrow
      throw error;
    }
  }

  // Should never reach here
  throw new Error('Unexpected error in optimistic lock update');
}

/**
 * Retry a function with optimistic locking
 *
 * Useful for operations that read, modify, and update a record.
 *
 * @param fn - Function to retry (receives current attempt number)
 * @param options - Retry options
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await retryWithOptimisticLock(
 *   async () => {
 *     const order = await prisma.order.findUnique({ where: { id } });
 *     if (!order) throw new Error('Order not found');
 *
 *     return await updateWithOptimisticLock(
 *       prisma.order,
 *       order.id,
 *       order.version,
 *       { status: 'PROCESSING' }
 *     );
 *   },
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function retryWithOptimisticLock<T>(
  fn: (attempt: number) => Promise<T>,
  options: OptimisticLockOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        lastError = error;

        if (attempt < maxRetries) {
          logger.warn(`Optimistic lock conflict, retrying (attempt ${attempt + 1}/${maxRetries})`, {
            error: error.message,
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      } else {
        // Non-optimistic-lock error, don't retry
        throw error;
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Optimistic lock retry failed');
}
