import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let prisma: PrismaClient;

/**
 * Setup test database connection and configuration
 */
export const setupTestDatabase = async (): Promise<PrismaClient> => {
  if (!prisma) {
    // Use a separate test database URL
    const testDatabaseUrl = process.env.DATABASE_URL?.replace(
      /\/[^\/]+(\?|$)/,
      '/destino_sf_test$1'
    );

    if (!testDatabaseUrl) {
      throw new Error('DATABASE_URL environment variable is required for tests');
    }

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error'],
    });

    // Ensure connection is established
    await prisma.$connect();
  }

  return prisma;
};

/**
 * Reset database to clean state between tests
 */
export const resetTestDatabase = async (): Promise<void> => {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }

  // Delete all data in reverse order to handle foreign key constraints
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
  }
};

/**
 * Seed database with test data
 */
export const seedTestDatabase = async (): Promise<void> => {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }

  // Create test categories first (required for foreign key)
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Alfajores',
        description: 'Traditional Argentine cookies',
        order: 1,
        squareId: 'test-cat-alfajores',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Empanadas',
        description: 'Savory pastries with various fillings',
        order: 2,
        squareId: 'test-cat-empanadas',
      },
    }),
  ]);

  // Create test products
  await prisma.product.createMany({
    data: [
      {
        squareId: 'test-square-alfajores-dulce',
        name: 'Dulce de Leche Alfajores',
        price: 12.99,
        description: 'Traditional Argentine cookies with dulce de leche',
        categoryId: categories[0].id,
        active: true,
        images: ['/images/alfajores-dulce.jpg'],
      },
      {
        squareId: 'test-square-alfajores-chocolate',
        name: 'Chocolate Alfajores',
        price: 14.99,
        description: 'Rich chocolate alfajores',
        categoryId: categories[0].id,
        active: true,
        images: ['/images/alfajores-chocolate.jpg'],
      },
      {
        squareId: 'test-square-empanadas-beef',
        name: 'Beef Empanadas',
        price: 18.99,
        description: 'Traditional beef empanadas (6 pack)',
        categoryId: categories[1].id,
        active: true,
        images: ['/images/empanadas-beef.jpg'],
      },
    ],
  });

  // Create test user profile
  await prisma.profile.create({
    data: {
      id: 'test-admin-1',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });
};

/**
 * Cleanup and close database connection
 */
export const teardownTestDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
  }
};

/**
 * Create test order with specified parameters
 */
export const createTestOrder = async (overrides: Partial<any> = {}) => {
  if (!prisma) {
    throw new Error('Test database not initialized');
  }

  const defaultOrder = {
    customerName: 'Test Customer',
    email: 'test@example.com',
    phone: '+1234567890',
    total: 31.97,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    fulfillmentType: 'delivery',
    notes: 'Test order',
    ...overrides,
  };

  return await prisma.order.create({
    data: defaultOrder,
  });
};

export { prisma as testDb }; 