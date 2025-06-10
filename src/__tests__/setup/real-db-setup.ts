// Real database setup for integration tests
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

let testPrisma: PrismaClient;

export async function setupTestDatabase() {
  try {
    console.log('🔧 Setting up test database...');
    
    // Initialize Prisma client for test database
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Test connection
    await testPrisma.$connect();
    console.log('✅ Connected to test database');

    // Reset database schema (be careful - this drops all data!)
    console.log('🔄 Resetting database schema...');
    await testPrisma.$executeRawUnsafe('DROP SCHEMA public CASCADE;');
    await testPrisma.$executeRawUnsafe('CREATE SCHEMA public;');
    
    // Run Prisma migrations
    console.log('📊 Running migrations...');
    execSync('pnpm prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit'
    });

    // Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData();
    
    console.log('✅ Test database setup complete!');
    return testPrisma;
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  if (!testPrisma) return;
  
  try {
    console.log('🧹 Cleaning up test database...');
    
    // Clean up test data (preserve schema)
    await testPrisma.$executeRaw`TRUNCATE TABLE "ShippingConfiguration", "Order", "OrderItem" RESTART IDENTITY CASCADE`;
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    throw error;
  }
}

export async function disconnectTestDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
    console.log('🔌 Disconnected from test database');
  }
}

async function seedTestData() {
  if (!testPrisma) throw new Error('Test database not initialized');

  // Seed shipping configurations
  await testPrisma.shippingConfiguration.createMany({
    data: [
      {
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      },
      {
        productName: 'empanadas',
        baseWeightLb: 1.0,
        weightPerUnitLb: 0.8,
        isActive: true,
        applicableForNationwideOnly: true,
      },
      {
        productName: 'sauces',
        baseWeightLb: 0.2,
        weightPerUnitLb: 0.1,
        isActive: true,
        applicableForNationwideOnly: false,
      }
    ],
    skipDuplicates: true
  });

  console.log('✅ Seeded shipping configurations');
}

// Export the test Prisma instance
export { testPrisma };

// Utility function to get fresh test data
export const getTestData = () => ({
  cartItems: [
    {
      id: 'test-alfajor-1',
      name: 'Traditional Alfajores (6-pack)',
      quantity: 2,
      variantId: 'alfajor-traditional-6',
    },
    {
      id: 'test-empanada-1', 
      name: 'Beef Empanadas (4-pack)',
      quantity: 1,
      variantId: 'empanada-beef-4',
    },
  ],
  addresses: {
    nearby: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US',
    },
    distant: {
      street: '456 Oak Ave',
      city: 'Oakland', 
      state: 'CA',
      zipCode: '94601',
      country: 'US',
    },
  },
});
