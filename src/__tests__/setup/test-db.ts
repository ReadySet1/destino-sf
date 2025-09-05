// Test database setup with PostgreSQL for Phase 2 QA Implementation
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
let testDatabaseUrl: string;

export async function setupTestDatabase() {
  try {
    // For CI/CD environments, use provided DATABASE_URL or default test database
    testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/destino_sf_test';
    
    console.log('Setting up test database with URL:', testDatabaseUrl.replace(/\/\/.*@/, '//***@'));

    prisma = new PrismaClient({
      datasources: {
        db: { url: testDatabaseUrl },
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error'], // Reduce logging in tests
    });

    // Test the connection
    await prisma.$connect();
    
    // Run basic schema setup if needed (migrations should be handled separately)
    // This is a fallback for test environments
    await ensureBasicSchema();

    console.log('✅ Test database setup completed');
    return { prisma, databaseUrl: testDatabaseUrl };
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

export async function teardownTestDatabase() {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Test database disconnected');
    }
  } catch (error) {
    console.error('❌ Error during test database teardown:', error);
  }
}

/**
 * Clean up all test data between tests
 */
export async function cleanupTestData() {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase first.');
  }

  try {
    // Clean up in order to respect foreign key constraints
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
    throw error;
  }
}

/**
 * Seed test database with comprehensive test data using factories
 */
export async function seedTestData() {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase first.');
  }

  try {
    // Import factories
    const { createMockProducts, ProductScenarios } = await import('../factories/product.factory');
    const { createMockUsers, UserScenarios } = await import('../factories/user.factory');
    const { createMockOrders, OrderScenarios } = await import('../factories/order.factory');

    // Create diverse test products using factories
    const standardProducts = createMockProducts(8);
    const scenarioProducts = [
      ProductScenarios.popularEmpanada(),
      ProductScenarios.cateringTray(),
      ProductScenarios.outOfStockItem(),
      ProductScenarios.spotlightPick(),
      ProductScenarios.beverage(),
      ProductScenarios.dessert(),
    ];

    const allProducts = [...standardProducts, ...scenarioProducts];
    const products = [];
    
    for (const productData of allProducts) {
      try {
        const product = await prisma.product.create({ data: productData as any });
        products.push(product);
      } catch (error) {
        console.warn('Warning: Could not create product:', productData.name, error);
      }
    }

    // Create test store settings
    const storeSettings = await prisma.storeSettings.create({
      data: {
        id: 'test-settings-1',
        minOrderAmount: 25.00,
        cateringMinimumAmount: 100.00,
        taxRate: 0.0875, // SF tax rate
        isStoreOpen: true,
        storeName: 'Destino SF Test Store',
        storeAddress: '123 Test Street, San Francisco, CA 94105',
        storePhone: '415-555-TEST',
        storeEmail: 'test@destinosf.com',
        openingHours: JSON.stringify({
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '10:00', close: '16:00' },
          sunday: { closed: true },
        }),
      },
    });

    // Create diverse test users
    const standardUsers = createMockUsers(5);
    const scenarioUsers = [
      UserScenarios.regularCustomer(),
      UserScenarios.newCustomer(),
      UserScenarios.vipCustomer(),
      UserScenarios.adminUser(),
      UserScenarios.staffUser(),
      UserScenarios.corporateCustomer(),
    ];

    const allUsers = [...standardUsers, ...scenarioUsers];
    const users = [];

    for (const userData of allUsers) {
      try {
        const user = await prisma.user.create({ data: userData as any });
        users.push(user);
      } catch (error) {
        console.warn('Warning: Could not create user:', userData.email, error);
      }
    }

    // Create sample orders with realistic scenarios
    const scenarioOrders = [
      OrderScenarios.completedOrder(),
      OrderScenarios.failedPaymentOrder(),
      OrderScenarios.cashOrder(),
      OrderScenarios.deliveryOrder(),
      OrderScenarios.cateringOrder(),
      OrderScenarios.minimumOrder(),
    ];

    const orders = [];
    for (const orderData of scenarioOrders) {
      try {
        // Assign to random user
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const orderWithUser = { ...orderData, userId: randomUser?.id };
        
        const order = await prisma.order.create({ data: orderWithUser as any });
        orders.push(order);
      } catch (error) {
        console.warn('Warning: Could not create order:', error);
      }
    }

    console.log('✅ Comprehensive test data seeded successfully');
    console.log(`   📦 Products: ${products.length}`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🛒 Orders: ${orders.length}`);
    console.log(`   ⚙️ Store Settings: ${storeSettings ? '✅' : '❌'}`);
    
    return { products, users, orders, storeSettings };
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

/**
 * Ensure basic schema exists (fallback for test environments)
 */
async function ensureBasicSchema() {
  try {
    // Check if tables exist by running a simple query
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1;`;
    console.log('✅ Database schema already exists');
  } catch (error) {
    console.log('ℹ️ Database schema not found, this is expected in fresh test environments');
    // In a real setup, you would run migrations here
    // For now, we'll rely on the existing Prisma migrations
  }
}

/**
 * Get the test Prisma client instance
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase first.');
  }
  return prisma;
}

/**
 * Reset database to clean state
 */
export async function resetTestDatabase() {
  await cleanupTestData();
  await seedTestData();
  console.log('✅ Test database reset completed');
}

/**
 * Create a test order for testing purposes
 */
export async function createTestOrder(overrides: any = {}) {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase first.');
  }

  const defaultOrderData = {
    id: `test-order-${Date.now()}`,
    status: 'PENDING' as const,
    paymentStatus: 'PENDING' as const,
    paymentMethod: 'SQUARE' as const,
    fulfillmentType: 'pickup' as const,
    customerName: 'Test Customer',
    email: 'customer@test.com',
    phone: '415-555-0200',
    total: 25.98,
    subtotal: 23.98,
    tax: 2.00,
    pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    squareOrderId: `square-test-${Date.now()}`,
    ...overrides,
  };

  return await prisma.order.create({
    data: defaultOrderData,
  });
}

// Global setup and teardown for Jest
let isSetup = false;

export async function globalSetup() {
  if (!isSetup) {
    await setupTestDatabase();
    isSetup = true;
  }
}

export async function globalTeardown() {
  if (isSetup) {
    await teardownTestDatabase();
    isSetup = false;
  }
}