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
    // Reduce query logging to prevent build issues
  });
}

// Use singleton pattern with more specific global variable name
const globalForPrisma = globalThis as unknown as {
  __globalPrisma: PrismaClient | undefined;
};

// Check if we're in a build environment and create a mock if needed
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

export const prisma = isBuildTime 
  ? ({
      // Mock Prisma client for build time
      $disconnect: async () => {},
      $connect: async () => {},
    } as any)
  : (globalForPrisma.__globalPrisma ?? createPrismaClient());

export const db = prisma;

if (process.env.NODE_ENV !== 'production' && !isBuildTime) {
  globalForPrisma.__globalPrisma = prisma;
} 