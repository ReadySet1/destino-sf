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

// Enhanced connection configuration for production resilience
function createPrismaClient() {
  return new PrismaClient({
    log: getLogConfig(),
    errorFormat: 'pretty',
  });
}

// Enhanced connection health monitoring
async function validateConnection(client: PrismaClient): Promise<boolean> {
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection validation failed:', error);
    return false;
  }
}

// Use singleton pattern for non-production environments
let db: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  db = createPrismaClient();
  
  // Validate connection on startup in production
  validateConnection(db).then(isValid => {
    if (isValid) {
      console.log('✅ Production database connection validated');
    } else {
      console.error('🚨 Production database connection failed validation');
    }
  });
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  db = global.prisma;
}

// Remove the problematic $on event handler to avoid TypeScript errors
// Instead, we'll handle errors directly in try/catch blocks where operations are performed

export { db };
export const prisma = db;

// Enhanced cleanup function for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    console.log('🔄 Disconnecting from database...');
    await db.$disconnect();
  });

  process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received, gracefully shutting down...');
    await db.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, gracefully shutting down...');
    await db.$disconnect();
    process.exit(0);
  });
} 