import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let prisma: PrismaClient | null = null;

/**
 * Get or create a Prisma client for testing with retry logic
 */
export async function getTestPrismaClient(): Promise<PrismaClient> {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Retry connection logic
    let retries = 3;
    while (retries > 0) {
      try {
        await prisma.$connect();
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to connect to test database after 3 attempts: ${error}`);
        }
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return prisma;
}

/**
 * Clean up test database connection
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Setup test database for integration tests
 */
export async function setupTestDatabase(): Promise<void> {
  const client = await getTestPrismaClient();
  
  // Optional: Clean up test data or run migrations
  // This can be expanded based on your needs
  console.log('Test database connected successfully');
}

/**
 * Cleanup test database after tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (prisma) {
    try {
      // Optional: Clean up test data
      // await prisma.order.deleteMany();
      // await prisma.product.deleteMany();
      // etc.
    } catch (error) {
      console.warn('Error cleaning up test database:', error);
    } finally {
      await disconnectTestDatabase();
    }
  }
}

// Alias for backwards compatibility
export const teardownTestDatabase = cleanupTestDatabase;

/**
 * Reset database to clean state between tests
 */
export const resetTestDatabase = async (): Promise<void> => {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }

  try {
    // Delete in proper order to handle foreign key constraints
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.profile.deleteMany({});
  } catch (error) {
    console.warn('Error during database reset:', error);
    // If individual deletes fail, try cascade truncate as fallback
    try {
      const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        }
      }
    } catch (truncateError) {
      console.error('Failed to reset database with truncate:', truncateError);
      throw truncateError;
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

  // Create test categories first (required for foreign key) - use upsert to avoid conflicts
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Alfajores' },
      update: {},
      create: {
        name: 'Alfajores',
        description: 'Traditional Argentine cookies',
        order: 1,
        squareId: 'test-cat-alfajores',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Empanadas' },
      update: {},
      create: {
        name: 'Empanadas',
        description: 'Savory pastries with various fillings',
        order: 2,
        squareId: 'test-cat-empanadas',
      },
    }),
  ]);

  // Create test products using upsert to avoid unique constraint violations
  await Promise.all([
    prisma.product.upsert({
      where: { squareId: 'test-square-alfajores-dulce' },
      update: {},
      create: {
        squareId: 'test-square-alfajores-dulce',
        name: 'Dulce de Leche Alfajores',
        price: 12.99,
        description: 'Traditional Argentine cookies with dulce de leche',
        categoryId: categories[0].id,
        active: true,
        images: ['/images/alfajores-dulce.jpg'],
      },
    }),
    prisma.product.upsert({
      where: { squareId: 'test-square-alfajores-chocolate' },
      update: {},
      create: {
        squareId: 'test-square-alfajores-chocolate',
        name: 'Chocolate Alfajores',
        price: 14.99,
        description: 'Rich chocolate alfajores',
        categoryId: categories[0].id,
        active: true,
        images: ['/images/alfajores-chocolate.jpg'],
      },
    }),
    prisma.product.upsert({
      where: { squareId: 'test-square-empanadas-beef' },
      update: {},
      create: {
        squareId: 'test-square-empanadas-beef',
        name: 'Beef Empanadas',
        price: 18.99,
        description: 'Traditional beef empanadas (6 pack)',
        categoryId: categories[1].id,
        active: true,
        images: ['/images/empanadas-beef.jpg'],
      },
    }),
  ]);

  // Create test user profile using upsert to avoid unique constraint violations
  await prisma.profile.upsert({
    where: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
    update: {},
    create: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });
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

/**
 * Get the test database client
 */
export const getTestDb = () => {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return prisma;
};

// Legacy export for backwards compatibility
export const testDb = getTestDb; 