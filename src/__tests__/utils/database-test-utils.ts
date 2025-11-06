/**
 * Database Test Utilities
 *
 * Utilities for managing test database state for integration tests.
 * These tests use a REAL PostgreSQL database (not mocks) to test
 * actual database behavior like transactions, constraints, and locking.
 *
 * Related: DES-76 - Fix Critical Path Test Failures
 */

import { PrismaClient } from '@prisma/client';

// Use a singleton pattern to ensure we only have one Prisma client
let testPrisma: PrismaClient | null = null;

/**
 * Get or create the test Prisma client
 * Uses the DATABASE_URL from environment (should point to test database)
 */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
        },
      },
      log: process.env.DEBUG_TESTS ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return testPrisma;
}

/**
 * Clean all tables in the database
 * WARNING: This will delete ALL data - only use in test environment!
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrismaClient();

  // Disable foreign key constraints temporarily
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

  try {
    // Get all table names from public schema
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    `;

    // Truncate each table
    for (const { tablename } of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
  } finally {
    // Re-enable foreign key constraints
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
  }
}

/**
 * Clean specific tables
 * More efficient than cleaning all tables if you know what you need
 */
export async function cleanTables(tableNames: string[]): Promise<void> {
  const prisma = getTestPrismaClient();

  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

  try {
    for (const tableName of tableNames) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tableName}" CASCADE;`);
    }
  } finally {
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
  }
}

/**
 * Disconnect from the test database
 * Call this in global teardown or afterAll
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Setup database for testing
 * Ensures database schema is up to date
 */
export async function setupTestDatabase(): Promise<void> {
  const prisma = getTestPrismaClient();

  // Check if database is accessible
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw new Error(
      'Test database not accessible. Make sure PostgreSQL is running and DATABASE_URL is set correctly.'
    );
  }
}

/**
 * Create common test data that many tests need
 * Returns IDs of created records for use in tests
 */
export interface TestDataSetup {
  userId: string;
  profileId: string;
  productId: string;
  categoryId: string;
}

export async function createCommonTestData(): Promise<TestDataSetup> {
  const prisma = getTestPrismaClient();

  // Create test category
  const category = await prisma.category.create({
    data: {
      name: 'Test Category',
      slug: 'test-category',
      displayOrder: 1,
    },
  });

  // Create test product
  const product = await prisma.product.create({
    data: {
      name: 'Test Product',
      slug: 'test-product',
      description: 'A test product',
      price: 10.0,
      categoryId: category.id,
      isAvailable: true,
      stripeProductId: 'test-stripe-product',
      stripePriceId: 'test-stripe-price',
    },
  });

  // Create test user and profile
  const profile = await prisma.profile.create({
    data: {
      id: 'test-user-id-' + Date.now(),
      email: `test-${Date.now()}@example.com`,
      role: 'CUSTOMER',
    },
  });

  return {
    userId: profile.id,
    profileId: profile.id,
    productId: product.id,
    categoryId: category.id,
  };
}

/**
 * Wait for database operation to complete
 * Useful for testing async operations
 */
export async function waitForDatabaseOperation(
  operation: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await operation()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Database operation timed out after ${timeout}ms`);
}

/**
 * Count rows in a table
 * Useful for verification in tests
 */
export async function countTableRows(tableName: string): Promise<number> {
  const prisma = getTestPrismaClient();
  const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) as count FROM "public"."${tableName}"`
  );
  return Number(result[0].count);
}
