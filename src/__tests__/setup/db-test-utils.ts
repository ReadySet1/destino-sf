/**
 * Database Testing Utilities
 * Provides transaction management and isolation for database tests
 */

import { PrismaClient, Prisma } from '@prisma/client';

let prisma: PrismaClient;
let transactionClient: Prisma.TransactionClient | null = null;
let rollbackFn: (() => void) | null = null;

/**
 * Initialize test database connection
 */
export function initTestDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

/**
 * Start a database transaction for test isolation
 * All database operations within the transaction will be rolled back after the test
 *
 * This uses a special error-based rollback mechanism to ensure isolation
 *
 * @example
 * beforeEach(async () => {
 *   await startTransaction();
 * });
 *
 * afterEach(async () => {
 *   await rollbackTransaction();
 * });
 */
export async function startTransaction(): Promise<Prisma.TransactionClient> {
  const db = initTestDb();

  // Create a promise that will be used to control transaction rollback
  let rollbackPromise: Promise<void>;
  let doRollback: () => void;

  rollbackPromise = new Promise<void>((resolve) => {
    doRollback = resolve;
  });

  // Start an interactive transaction that will wait until we explicitly rollback
  const transactionPromise = db.$transaction(
    async (tx) => {
      transactionClient = tx;

      // Wait for rollback signal
      await rollbackPromise;

      // Throw error to force rollback
      throw new Error('ROLLBACK');
    },
    {
      maxWait: 10000, // 10 seconds max wait
      timeout: 60000, // 60 seconds transaction timeout
    }
  ).catch((error) => {
    // Expected rollback error
    if (error.message !== 'ROLLBACK') {
      console.error('Transaction error:', error);
      throw error;
    }
  });

  // Store the rollback function
  rollbackFn = doRollback!;

  // Wait a bit for the transaction to start
  await new Promise(resolve => setTimeout(resolve, 10));

  return transactionClient!;
}

/**
 * Rollback the current transaction
 * This ensures test isolation by undoing all database changes
 */
export async function rollbackTransaction(): Promise<void> {
  if (rollbackFn) {
    // Trigger the rollback
    rollbackFn();

    // Wait a bit for the transaction to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clean up
    transactionClient = null;
    rollbackFn = null;
  }
}

/**
 * Get the current database client
 * Returns transaction client if in a transaction, otherwise returns main client
 */
export function getTestDb(): Prisma.TransactionClient | PrismaClient {
  return transactionClient || initTestDb();
}

/**
 * Clean up database after tests
 */
export async function cleanupTestDb() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined as any;
  }
}

/**
 * Clear specific tables in the test database
 * Use with caution - only in test environment
 *
 * @param tables - Array of table names to clear
 */
export async function clearTables(tables: string[]) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearTables can only be used in test environment');
  }

  const db = getTestDb();

  for (const table of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

/**
 * Seed test database with minimal required data
 */
export async function seedMinimalData() {
  const db = getTestDb();

  // Add minimal seed data here if needed
  // For example, required lookup tables, default settings, etc.

  return {
    // Return any created data that tests might need
  };
}

/**
 * Wait for database to be ready
 * Useful for CI/CD environments where database might not be immediately available
 */
export async function waitForDatabase(maxAttempts = 10, delayMs = 1000): Promise<void> {
  const db = initTestDb();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('✅ Database connection established');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Failed to connect to database after ${maxAttempts} attempts`);
      }
      console.log(
        `⏳ Database not ready, attempt ${attempt}/${maxAttempts}. Retrying in ${delayMs}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Create a test database snapshot
 * Useful for restoring to a known state
 */
export async function createDbSnapshot(): Promise<any> {
  const db = getTestDb();

  // This is a simplified version - in production you might want to actually snapshot data
  const snapshot = {
    timestamp: Date.now(),
  };

  return snapshot;
}

/**
 * Restore database to a snapshot
 */
export async function restoreDbSnapshot(snapshot: any): Promise<void> {
  // Implementation depends on your snapshot strategy
  // For now, this is a placeholder
  console.log('Restoring database snapshot:', snapshot.timestamp);
}

/**
 * Run a function within a transaction that automatically rolls back
 * Useful for testing database operations without affecting the database
 *
 * @example
 * const result = await withTransactionRollback(async (tx) => {
 *   const user = await tx.user.create({ data: { email: 'test@example.com' } });
 *   return user;
 * });
 * // user was created and then rolled back
 */
export async function withTransactionRollback<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  const db = initTestDb();
  let result: T;

  try {
    await db.$transaction(async tx => {
      result = await fn(tx);
      // Throw error to force rollback
      throw new Error('ROLLBACK');
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROLLBACK') {
      // Expected rollback
      return result!;
    }
    throw error;
  }

  return result!;
}

/**
 * Count records in a table
 * Useful for verifying test assertions
 */
export async function countRecords(model: string): Promise<number> {
  const db = getTestDb();
  return await (db as any)[model].count();
}

/**
 * Find all records in a table
 * Use sparingly in tests - prefer specific queries
 */
export async function findAll(model: string): Promise<any[]> {
  const db = getTestDb();
  return await (db as any)[model].findMany();
}

/**
 * Check if a record exists
 */
export async function recordExists(model: string, where: any): Promise<boolean> {
  const db = getTestDb();
  const count = await (db as any)[model].count({ where });
  return count > 0;
}
