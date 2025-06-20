import { PrismaClient } from '@prisma/client';

// Add runtime directive to ensure this only runs on the server
// prettier-ignore

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export as prisma as well for consistency with tests
export const prisma = db;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db; 