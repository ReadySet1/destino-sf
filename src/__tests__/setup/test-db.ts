/**
 * 🧪 Enhanced Test Database Setup and Management
 * Provides comprehensive utilities for setting up and managing test database instances
 * with proper PrismaClient mocking, transaction handling, and test isolation
 */

import { PrismaClient } from '@prisma/client';
import { createMockPrismaClient, type MockPrismaClient } from './database-mocks';
import type { 
  PrismaTransactionClient, 
  TransactionOptions,
  DatabaseOperationResult,
  DatabaseError 
} from '@/types/database';

// Enhanced Test Database Configuration
export interface TestDatabaseConfig {
  useRealDatabase: boolean;
  isolation: 'test' | 'suite' | 'none';
  cleanup: 'auto' | 'manual';
  logging: boolean;
  timeout: number;
  retryAttempts: number;
}

export const DEFAULT_TEST_CONFIG: TestDatabaseConfig = {
  useRealDatabase: false,
  isolation: 'test',
  cleanup: 'auto',
  logging: false,
  timeout: 10000,
  retryAttempts: 3,
};

// Global test database instance
let testDatabaseInstance: PrismaClient | MockPrismaClient | null = null;
let testConfig: TestDatabaseConfig = DEFAULT_TEST_CONFIG;

/**
 * Enhanced test database setup with configuration options
 */
export async function setupTestDatabase(config: Partial<TestDatabaseConfig> = {}): Promise<void> {
  testConfig = { ...DEFAULT_TEST_CONFIG, ...config };
  
  console.log('🔧 Setting up enhanced test database environment...');
  
  // Setup environment variables
  process.env.NODE_ENV = 'test';
  process.env.SKIP_ENV_VALIDATION = 'true';
  
  if (testConfig.useRealDatabase) {
    // Setup real test database (for integration tests)
    await setupRealTestDatabase();
  } else {
    // Setup mock database (for unit tests)
    setupMockTestDatabase();
  }
  
  if (testConfig.logging) {
    console.log('✅ Enhanced test database setup complete');
    console.log('📊 Configuration:', testConfig);
  }
}

/**
 * Setup real test database for integration tests
 */
async function setupRealTestDatabase(): Promise<void> {
  try {
    // Ensure we have a test database URL
    if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for real database tests');
    }
    
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    
    testDatabaseInstance = new PrismaClient({
      log: testConfig.logging ? ['query', 'info', 'warn', 'error'] : [],
      errorFormat: 'pretty',
    });
    
    await testDatabaseInstance.$connect();
    
    if (testConfig.logging) {
      console.log('🔗 Connected to real test database');
    }
  } catch (error) {
    console.error('❌ Failed to setup real test database:', error);
    throw error;
  }
}

/**
 * Setup mock test database for unit tests
 */
function setupMockTestDatabase(): void {
  testDatabaseInstance = createMockPrismaClient();
  
  if (testConfig.logging) {
    console.log('🎭 Mock test database setup complete');
  }
}

/**
 * Get the current test database instance
 */
export function getTestDatabase(): PrismaClient | MockPrismaClient {
  if (!testDatabaseInstance) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDatabaseInstance;
}

/**
 * Enhanced test database reset with isolation options
 */
export async function resetTestDatabase(): Promise<void> {
  if (!testDatabaseInstance) {
    return;
  }
  
  try {
    if (testConfig.useRealDatabase) {
      await resetRealTestDatabase();
    } else {
      resetMockTestDatabase();
    }
    
    if (testConfig.logging) {
      console.log('🧹 Test database reset complete');
    }
  } catch (error) {
    console.error('❌ Failed to reset test database:', error);
    throw error;
  }
}

/**
 * Reset real test database by truncating tables
 */
async function resetRealTestDatabase(): Promise<void> {
  if (!testDatabaseInstance || testConfig.useRealDatabase === false) {
    return;
  }
  
  const prisma = testDatabaseInstance as PrismaClient;
  
  // Get all table names
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  
  // Truncate all tables except migration tables
  for (const { tablename } of tablenames) {
    if (!tablename.startsWith('_prisma') && !tablename.startsWith('_Migration')) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
  }
}

/**
 * Reset mock test database by clearing all mocks
 */
function resetMockTestDatabase(): void {
  if (!testDatabaseInstance || testConfig.useRealDatabase === true) {
    return;
  }
  
  const mockPrisma = testDatabaseInstance as MockPrismaClient;
  
  // Reset all mock functions
  Object.values(mockPrisma).forEach(table => {
    if (typeof table === 'object' && table !== null) {
      Object.values(table).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    } else if (jest.isMockFunction(table)) {
      table.mockReset();
    }
  });
}

/**
 * Seed test database with required test data
 */
export async function seedTestData(): Promise<void> {
  if (!testDatabaseInstance) {
    throw new Error('Test database not initialized');
  }
  
  try {
    if (testConfig.useRealDatabase) {
      await seedRealTestData();
    } else {
      await seedMockTestData();
    }
    
    if (testConfig.logging) {
      console.log('🌱 Test data seeding complete');
    }
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

/**
 * Seed real test database with minimal required data
 */
async function seedRealTestData(): Promise<void> {
  if (!testDatabaseInstance || testConfig.useRealDatabase === false) {
    return;
  }
  
  const prisma = testDatabaseInstance as PrismaClient;
  
  // Create test categories
  await prisma.category.createMany({
    data: [
      {
        id: 'test-category-1',
        name: 'Test Alfajores',
        description: 'Test category for alfajores',
        order: 1,
        active: true,
      },
      {
        id: 'test-category-2',
        name: 'Test Empanadas',
        description: 'Test category for empanadas',
        order: 2,
        active: true,
      },
    ],
    skipDuplicates: true,
  });
  
  // Create test products
  await prisma.product.createMany({
    data: [
      {
        id: 'test-product-1',
        squareId: 'square-alfajor-1',
        name: 'Test Alfajores',
        description: 'Delicious test alfajores',
        price: 12.99,
        images: ['test-image-1.jpg'],
        categoryId: 'test-category-1',
        featured: false,
        active: true,
      },
      {
        id: 'test-product-2',
        squareId: 'square-empanada-1',
        name: 'Test Empanadas',
        description: 'Tasty test empanadas',
        price: 4.50,
        images: ['test-image-2.jpg'],
        categoryId: 'test-category-2',
        featured: false,
        active: true,
      },
    ],
    skipDuplicates: true,
  });
}

/**
 * Setup mock test data for unit tests
 */
async function seedMockTestData(): Promise<void> {
  if (!testDatabaseInstance || testConfig.useRealDatabase === true) {
    return;
  }
  
  const mockPrisma = testDatabaseInstance as MockPrismaClient;
  
  // Setup default mock responses for categories
  mockPrisma.category.findMany.mockResolvedValue([
    {
      id: 'test-category-1',
      name: 'Test Alfajores',
      description: 'Test category for alfajores',
      order: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  
  // Setup default mock responses for products
  mockPrisma.product.findMany.mockResolvedValue([
    {
      id: 'test-product-1',
      squareId: 'square-alfajor-1',
      name: 'Test Alfajores',
      description: 'Delicious test alfajores',
      price: 12.99,
      images: ['test-image-1.jpg'],
      categoryId: 'test-category-1',
      featured: false,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}

/**
 * Enhanced transaction helper for tests with proper typing
 */
export async function runTestTransaction<T>(
  callback: (tx: PrismaTransactionClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<DatabaseOperationResult<T>> {
  if (!testDatabaseInstance) {
    throw new Error('Test database not initialized');
  }
  
  try {
    if (testConfig.useRealDatabase) {
      const prisma = testDatabaseInstance as PrismaClient;
      const result = await prisma.$transaction(callback, {
        maxWait: options.maxWait || 5000,
        timeout: options.timeout || testConfig.timeout,
        isolationLevel: options.isolationLevel,
      });
      
      return {
        success: true,
        data: result,
        metrics: {
          queryTime: 0, // Would be measured in real implementation
          connectionAcquisitionTime: 0,
          totalTime: 0,
          preparedStatementCached: false,
        },
      };
    } else {
      // For mocked database, just call the callback with the mock client
      const mockPrisma = testDatabaseInstance as MockPrismaClient;
      const result = await callback(mockPrisma as any);
      
      return {
        success: true,
        data: result,
      };
    }
  } catch (error) {
    const dbError: DatabaseError = {
      type: 'TRANSACTION_ROLLBACK',
      reason: error instanceof Error ? error.message : 'Unknown error',
      operation: 'test_transaction',
    };
    
    return {
      success: false,
      error: dbError,
      shouldRetry: false,
    };
  }
}

/**
 * Test isolation helper - ensures each test runs in clean state
 */
export async function withTestIsolation<T>(
  testFn: () => Promise<T>
): Promise<T> {
  if (testConfig.isolation === 'none') {
    return testFn();
  }
  
  // Setup clean state before test
  await resetTestDatabase();
  await seedTestData();
  
  try {
    const result = await testFn();
    
    if (testConfig.cleanup === 'auto') {
      await resetTestDatabase();
    }
    
    return result;
  } catch (error) {
    if (testConfig.cleanup === 'auto') {
      await resetTestDatabase();
    }
    throw error;
  }
}

/**
 * Cleanup test database connection
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (!testDatabaseInstance) {
    return;
  }
  
  try {
    if (testConfig.useRealDatabase) {
      const prisma = testDatabaseInstance as PrismaClient;
      await prisma.$disconnect();
    }
    
    testDatabaseInstance = null;
    
    if (testConfig.logging) {
      console.log('🔌 Test database disconnected');
    }
  } catch (error) {
    console.error('❌ Failed to disconnect test database:', error);
    throw error;
  }
}

/**
 * Health check for test database
 */
export async function checkTestDatabaseHealth(): Promise<{
  healthy: boolean;
  error?: string;
  type: 'real' | 'mock';
}> {
  if (!testDatabaseInstance) {
    return {
      healthy: false,
      error: 'Test database not initialized',
      type: testConfig.useRealDatabase ? 'real' : 'mock',
    };
  }
  
  try {
    if (testConfig.useRealDatabase) {
      const prisma = testDatabaseInstance as PrismaClient;
      await prisma.$queryRaw`SELECT 1`;
      return { healthy: true, type: 'real' };
    } else {
      // Mock database is always "healthy"
      return { healthy: true, type: 'mock' };
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: testConfig.useRealDatabase ? 'real' : 'mock',
    };
  }
}

// Export test database configuration
export { testConfig, DEFAULT_TEST_CONFIG };

// Legacy exports for backward compatibility
export const testPrisma = getTestDatabase;