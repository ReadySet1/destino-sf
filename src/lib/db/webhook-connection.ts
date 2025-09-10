import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Singleton pattern for serverless
declare global {
  // eslint-disable-next-line no-var
  var webhookPrisma: PrismaClient | undefined;
}

// Configuration optimized for webhooks and Supabase pooler
const webhookPrismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal',
  });
};

// Ensure single instance per serverless invocation
export const webhookPrisma = globalThis.webhookPrisma ?? webhookPrismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.webhookPrisma = webhookPrisma;
}

// Connection management utilities
export async function ensureWebhookConnection(): Promise<void> {
  try {
    await webhookPrisma.$connect();
  } catch (error) {
    console.error('Failed to connect webhook Prisma client:', error);
    // Force reconnection on error
    await webhookPrisma.$disconnect();
    await webhookPrisma.$connect();
  }
}

// Graceful disconnect for cleanup
export async function disconnectWebhook(): Promise<void> {
  try {
    await webhookPrisma.$disconnect();
  } catch (error) {
    console.error('Error disconnecting webhook Prisma:', error);
  }
}

// Webhook-specific transaction with timeout
export async function webhookTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  return webhookPrisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000, // 5s max wait
    timeout: options?.timeout ?? 10000, // 10s timeout
    isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
  });
}
