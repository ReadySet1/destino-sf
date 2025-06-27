import { PrismaClient } from '@prisma/client';

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

    // Optionally seed test data
    await seedTestData();
    
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
    // Clean up test data (optional - depends on your test strategy)
    // await cleanupTestData();
    
    // Disconnect from database
    await testPrisma.$disconnect();
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    testPrisma = null;
  }
}

async function seedTestData() {
  if (!testPrisma) return;
  
  console.log('🌱 Seeding test data...');
  
  try {
    // Check if test products already exist
    const existingProducts = await testPrisma.product.count();
    
    if (existingProducts > 0) {
      console.log('✅ Test data already exists, skipping seed');
      return;
    }

    // Seed minimal test data
    const testCategory = await testPrisma.category.upsert({
      where: { slug: 'empanadas' },
      update: {},
      create: {
        name: 'Empanadas',
        slug: 'empanadas',
        description: 'Authentic Argentine empanadas',
        squareId: 'test-category-empanadas',
        isActive: true,
      },
    });

    const testProduct = await testPrisma.product.upsert({
      where: { slug: 'empanadas-argentine-beef-frozen-4-pack' },
      update: {},
      create: {
        name: 'Empanadas- Argentine Beef (frozen- 4 pack)',
        slug: 'empanadas-argentine-beef-frozen-4-pack',
        description: 'Authentic Argentine beef empanadas, frozen for freshness',
        price: 1899, // $18.99 in cents
        squareId: 'test-product-empanada-beef',
        categoryId: testCategory.id,
        active: true,
        images: ['https://destino-sf.square.site/uploads/1/3/4/5/134556177/s153623720258963617_p9_i1_w1000.jpeg'],
      },
    });

    console.log('✅ Test data seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    // Don't throw here - tests can still run without seed data
  }
}

export function getTestPrismaClient() {
  return testPrisma;
} 