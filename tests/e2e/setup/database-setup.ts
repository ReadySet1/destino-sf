import { PrismaClient } from '@prisma/client';
import { seedTestDatabase, cleanTestDatabase } from './database-seeder';

let testPrisma: PrismaClient | null = null;

export async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');

  // Create a test-specific Prisma client with connection pooling disabled
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
      },
    },
    log: ['error'], // Only log errors during testing
  });

  try {
    // Connect to database
    await testPrisma.$connect();
    console.log('✅ Test database connected successfully');

    // Check if test data already exists
    const existingProducts = await testPrisma.product.count();

    if (existingProducts > 0) {
      console.log('🔄 Test data exists, cleaning and reseeding...');
      await cleanTestDatabase(testPrisma);
    }

    // Seed test data using the new seeder
    await seedTestDatabase(testPrisma, {
      includeUsers: true,
      includeProducts: true,
      includeOrders: false,
      minimal: false, // Use full product catalog
    });

    return testPrisma;
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  if (!testPrisma) return;

  console.log('🧹 Cleaning up test database...');

  try {
    // Clean up test data using the seeder
    await cleanTestDatabase(testPrisma);

    // Disconnect from database
    await testPrisma.$disconnect();
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    testPrisma = null;
  }
}

export function getTestPrismaClient() {
  return testPrisma;
}
