import { PrismaClient } from '@prisma/client';

// Add runtime directive to ensure this only runs on the server
// prettier-ignore

// Prevent multiple instances of Prisma Client in development
declare global {
  var __globalPrisma: PrismaClient | undefined;
}

// Create a function to get or create the Prisma client
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    // Add connection pooling configuration to prevent connection issues
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Configure transaction settings to avoid conflicts
    transactionOptions: {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
    },
  });
}

// Use singleton pattern with more specific global variable name
const globalForPrisma = globalThis as unknown as {
  __globalPrisma: PrismaClient | undefined;
};

// Check if we're in a build environment and create a mock if needed
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

// Create a comprehensive mock Prisma client for build time
const createMockPrismaClient = () => ({
  // Connection methods
  $disconnect: async () => {},
  $connect: async () => {},
  $queryRaw: async () => [],
  $executeRaw: async () => 0,

  // Category model methods
  category: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // Product model methods
  product: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // Order model methods
  order: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // ShippingConfiguration model methods
  shippingConfiguration: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // StoreSettings model methods
  storeSettings: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // User model methods
  user: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // SpotlightPick model methods
  spotlightPick: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // BusinessHour model methods
  businessHour: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // CateringOrder model methods
  cateringOrder: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // CateringItem model methods
  cateringItem: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // CateringPackage model methods
  cateringPackage: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // Variant model methods
  variant: {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  },

  // Add other models as needed...
  // This mock ensures that all Prisma operations during build time return empty/default values
  // instead of throwing "Cannot read properties of undefined" errors
});

// Create the singleton instance
let prismaInstance: PrismaClient | undefined;

export const prisma = isBuildTime 
  ? (createMockPrismaClient() as any)
  : (() => {
      if (!prismaInstance) {
        if (globalForPrisma.__globalPrisma) {
          prismaInstance = globalForPrisma.__globalPrisma;
        } else {
          prismaInstance = createPrismaClient();
          if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.__globalPrisma = prismaInstance;
          }
        }
      }
      return prismaInstance;
    })();

export const db = prisma;

// Cleanup function for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (prismaInstance && !isBuildTime) {
      await prismaInstance.$disconnect();
    }
  });
} 