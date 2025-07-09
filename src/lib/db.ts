import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Optimized connection configuration for serverless
function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    errorFormat: 'pretty',
    // Connection timeout optimizations via URL parameters
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Connection management for serverless
let db: PrismaClient;
let disconnectTimer: NodeJS.Timeout | null = null;

// Auto-disconnect function
const scheduleDisconnect = () => {
  if (disconnectTimer) clearTimeout(disconnectTimer);
  
  disconnectTimer = setTimeout(async () => {
    try {
      await db.$disconnect();
      console.log('🔄 Auto-disconnected from database due to inactivity');
    } catch (error) {
      console.error('Error during auto-disconnect:', error);
    }
  }, 30000); // 30 seconds
};

if (process.env.NODE_ENV === 'production') {
  db = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  db = global.prisma;
}

// Helper function to execute queries with connection management
export async function executeWithConnectionManagement<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    
    // Schedule auto-disconnect for serverless
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      scheduleDisconnect();
    }
    
    return result;
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

export { db };
export const prisma = db;

// Enhanced cleanup for serverless
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    await db.$disconnect();
  });

  process.on('SIGINT', async () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    await db.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    await db.$disconnect();
    process.exit(0);
  });
} 