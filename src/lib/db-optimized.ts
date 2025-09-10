import { PrismaClient, PaymentStatus } from '@prisma/client';

/**
 * Optimized database client for webhook processing on Vercel
 * Implements connection pooling optimization and timeout management
 */

// Singleton with connection pooling optimization
class OptimizedPrismaClient {
  private static instance: PrismaClient;
  private static connectionCount = 0;
  private static lastActivity = Date.now();
  
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = this.createClient();
      this.startConnectionMonitor();
    }
    
    this.lastActivity = Date.now();
    return this.instance;
  }
  
  private static createClient(): PrismaClient {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) throw new Error('DATABASE_URL environment variable is required');
    
    const url = new URL(baseUrl);
    
    // Check if using Supabase pooler
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
    
    // Vercel-specific optimizations
    if (process.env.VERCEL) {
      if (process.env.DB_DEBUG === 'true') {
        console.log('🚀 Configuring database for Vercel environment');
      }
      
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('prepared_statements', 'false');
      url.searchParams.set('statement_cache_size', '0');
      
      if (isSupabasePooler) {
        // For Supabase pooler, let Supabase handle connection pooling
        // Remove connection_limit to avoid conflicts with Supabase pooler
        url.searchParams.delete('connection_limit');
        url.searchParams.set('pool_timeout', '60'); // 60 second timeout for webhook processing
        url.searchParams.set('statement_timeout', '30000'); // 30 second query timeout
        if (process.env.DB_DEBUG === 'true') {
          console.log('🔧 Supabase pooler detected: Using pooler-optimized settings');
        }
      } else {
        // For non-Supabase databases, use modest connection limits
        url.searchParams.set('connection_limit', '3'); // Allow a few concurrent connections
        url.searchParams.set('pool_timeout', '30'); // 30 second timeout
        url.searchParams.set('statement_timeout', '15000'); // 15 second query timeout
        if (process.env.DB_DEBUG === 'true') {
          console.log('🔧 Non-Supabase database: Using connection-limited settings');
        }
      }
    }
    
    return new PrismaClient({
      datasources: { db: { url: url.toString() } },
      log: ['error', 'warn'],
    });
  }
  
  private static startConnectionMonitor(): void {
    // Auto-disconnect after 5 seconds of inactivity on Vercel
    if (process.env.VERCEL) {
      setInterval(() => {
        if (Date.now() - this.lastActivity > 5000) {
          this.instance.$disconnect().catch(console.error);
        }
      }, 5000);
    }
  }
  
  static async withConnection<T>(
    operation: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.getInstance();
    try {
      this.connectionCount++;
      return await operation(client);
    } finally {
      this.connectionCount--;
      if (this.connectionCount === 0 && process.env.VERCEL) {
        // Disconnect immediately when no active operations on Vercel
        await client.$disconnect();
      }
    }
  }
}

export const prismaOptimized = OptimizedPrismaClient.getInstance();
export const withConnection = async <T>(
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  return OptimizedPrismaClient.withConnection(operation);
};

/**
 * Optimized queries for webhook processing
 * Uses selective fields and batch operations to minimize database load
 */
export const webhookQueries = {
  // Use select to minimize data transfer
  findCateringOrderForPayment: (squareOrderId: string) => 
    prismaOptimized.cateringOrder.findUnique({
      where: { squareOrderId },
      select: {
        id: true,
        paymentStatus: true,
        status: true,
      }
    }),
  
  findOrderForPayment: (squareOrderId: string) => 
    prismaOptimized.order.findUnique({
      where: { squareOrderId },
      select: {
        id: true,
        paymentStatus: true,
        status: true,
      }
    }),
  
  // Batch updates to reduce round trips
  updatePaymentStatus: async (updates: Array<{id: string, status: PaymentStatus}>) => {
    const queries = updates.map(u => 
      prismaOptimized.order.update({
        where: { id: u.id },
        data: { paymentStatus: u.status }
      })
    );
    return prismaOptimized.$transaction(queries);
  },
  
  // Use raw queries for complex operations
  checkOrderExists: (squareOrderId: string) =>
    prismaOptimized.$queryRaw<{exists: boolean}[]>`
      SELECT EXISTS(
        SELECT 1 FROM "Order" WHERE "squareOrderId" = ${squareOrderId}
        UNION ALL
        SELECT 1 FROM "CateringOrder" WHERE "squareOrderId" = ${squareOrderId}
      ) as exists
    `,

  // Webhook queue operations
  storeWebhookInQueue: (eventId: string, eventType: string, payload: any) =>
    prismaOptimized.webhookQueue.upsert({
      where: { eventId },
      update: {
        payload,
        status: 'PENDING',
      },
      create: {
        eventId,
        eventType,
        payload,
        status: 'PENDING',
        attempts: 0,
      }
    }),

  getNextWebhook: () =>
    prismaOptimized.webhookQueue.findFirst({
      where: {
        status: 'PENDING',
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
    }),

  updateWebhookStatus: (id: string, status: string, errorMessage?: string) =>
    prismaOptimized.webhookQueue.update({
      where: { id },
      data: { 
        status,
        lastAttemptAt: new Date(),
        attempts: { increment: 1 },
        errorMessage,
        ...(status === 'COMPLETED' && { processedAt: new Date() })
      }
    }),
};