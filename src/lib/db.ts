import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Configure logging based on environment
function getLogConfig(): Prisma.LogLevel[] {
  switch (process.env.NODE_ENV) {
    case 'development':
      return ['query', 'error', 'warn'];
    case 'production':
      return ['error'];
    case 'test':
    default:
      return ['error'];
  }
}

// Create Prisma client with proper configuration
function createPrismaClient() {
  return new PrismaClient({
    log: getLogConfig(),
    // Removed manual datasource configuration - let Prisma handle this automatically
    // from the schema.prisma file which uses env("DATABASE_URL")
  });
}

// Use singleton pattern for non-production environments
let db: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  db = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  db = global.prisma;
}

export { db };
export const prisma = db;

// Cleanup function for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect();
  });
} 