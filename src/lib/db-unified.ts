import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Unified database client that consolidates all database connection logic
 * and provides optimized handling for different use cases (webhooks, regular operations)
 */

// Global singleton storage
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: string | undefined;
};

// Version identifier for cache busting
const CURRENT_PRISMA_VERSION = '2025-09-09-unified-connection-fix';

/**
 * Build optimized database URL with proper connection parameters
 */
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL environment variable is required');
  
  try {
    const url = new URL(baseUrl);
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
    
    console.log(`🔗 Building database URL for ${process.env.NODE_ENV} environment`);
    console.log(`🔗 Supabase pooler: ${isSupabasePooler}`);
    
    if (isSupabasePooler) {
      // Supabase pooler-specific optimizations
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('prepared_statements', 'false');
      url.searchParams.set('statement_cache_size', '0');
      
      // Optimized timeouts for webhook processing
      if (isProduction) {
        url.searchParams.set('pool_timeout', '240'); // 4 minutes for high load
        url.searchParams.set('connection_timeout', '20'); // 20 seconds to connect
        url.searchParams.set('statement_timeout', '45000'); // 45 seconds for queries
        url.searchParams.set('idle_in_transaction_session_timeout', '45000');
        url.searchParams.set('socket_timeout', '90'); // 90 seconds socket timeout
        
        console.log('🚀 Production Supabase pooler: 240s pool timeout, 45s statement timeout, 90s socket timeout');
      } else {
        url.searchParams.set('pool_timeout', '120');
        url.searchParams.set('connection_timeout', '15');
        url.searchParams.set('statement_timeout', '60000');
        url.searchParams.set('idle_in_transaction_session_timeout', '60000');
        url.searchParams.set('socket_timeout', '60');
        
        console.log('🔧 Development Supabase pooler: 120s pool timeout, 60s statement timeout');
      }
      
      // Remove connection_limit to let Supabase handle pooling
      url.searchParams.delete('connection_limit');
    } else {
      // Non-Supabase database configuration
      if (isProduction) {
        url.searchParams.set('connection_limit', '20');
        url.searchParams.set('pool_timeout', '180');
        url.searchParams.set('statement_timeout', '45000');
        url.searchParams.set('idle_in_transaction_session_timeout', '45000');
      } else {
        url.searchParams.set('connection_limit', '10');
        url.searchParams.set('pool_timeout', '120');
        url.searchParams.set('statement_timeout', '60000');
        url.searchParams.set('idle_in_transaction_session_timeout', '60000');
      }
    }
    
    return url.toString();
  } catch (error) {
    console.error('Error building database URL:', error);
    return baseUrl; // Fallback to original URL
  }
}

/**
 * Create optimized Prisma client
 */
function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = buildDatabaseUrl();
  
  const client = new PrismaClient({
    log: isProduction ? ['error'] : [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ],
    errorFormat: 'minimal',
    datasources: {
      db: { url: databaseUrl }
    },
  });

  // Add error handling for production
  if (isProduction) {
    client.$on('error' as never, (e: any) => {
      console.error('Prisma error:', e);
    });
  }

  return client;
}

/**
 * Check if client needs regeneration
 */
function shouldRegenerateClient(): boolean {
  return !globalForPrisma.prisma || 
         globalForPrisma.prismaVersion !== CURRENT_PRISMA_VERSION;
}

/**
 * Initialize the singleton Prisma client
 */
let prismaClient: PrismaClient;

if (shouldRegenerateClient()) {
  // Disconnect old client if it exists
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch (error) {
      console.warn('Error disconnecting old Prisma client:', error);
    }
  }
  
  prismaClient = createPrismaClient();
  globalForPrisma.prisma = prismaClient;
  globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
  
  console.log('✅ Unified Prisma client created successfully');
} else {
  prismaClient = globalForPrisma.prisma!;
  console.log('♻️ Reusing existing Prisma client');
}

// Export the unified client
export const prisma = prismaClient;

// Keep global reference in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Enhanced connection health check
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 as health_check`;
    return true;
  } catch (error) {
    console.warn('Database connection check failed:', (error as Error).message);
    return false;
  }
}

/**
 * Ensure database connection with automatic recovery
 */
export async function ensureConnection(maxRetries: number = 3): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1 as health_check`;
      return; // Success
    } catch (error) {
      lastError = error as Error;
      
      const isRetryableError = isConnectionError(error as Error);
      
      if (isRetryableError && attempt < maxRetries) {
        console.warn(`Connection attempt ${attempt}/${maxRetries} failed, retrying...`);
        
        try {
          // Force reconnection
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          await prisma.$connect();
        } catch (reconnectError) {
          console.warn(`Reconnection attempt ${attempt} failed:`, (reconnectError as Error).message);
        }
      }
    }
  }
  
  throw lastError || new Error('Database connection failed after all retries');
}

/**
 * Check if error is connection-related
 */
function isConnectionError(error: Error): boolean {
  const connectionErrors = [
    "Can't reach database server",
    "Connection terminated",
    "ECONNRESET",
    "ECONNREFUSED", 
    "ETIMEDOUT",
    "Engine is not yet connected",
    "Socket timeout",
    "Connection pool timeout",
    "Timed out fetching a new connection",
    "Response from the Engine was empty"
  ];
  
  const connectionCodes = ['P1001', 'P1008', 'P2024'];
  
  return connectionErrors.some(msg => error.message.includes(msg)) ||
         connectionCodes.includes((error as any).code);
}

/**
 * Execute operation with automatic retry on connection errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'database operation'
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure connection before operation
      if (attempt > 1) {
        await ensureConnection(1); // Single attempt for retries
      }
      
      const result = await operation();
      
      // Log slow operations
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (isConnectionError(lastError) && attempt < maxRetries) {
        console.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        // Progressive backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry non-connection errors
      throw error;
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

/**
 * Execute transaction with retry logic
 */
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  return withRetry(
    async () => {
      return await prisma.$transaction(operation, {
        maxWait: 10000, // 10 seconds
        timeout: 30000, // 30 seconds
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    },
    maxRetries,
    'transaction'
  );
}

/**
 * Webhook-optimized database operation
 */
export async function withWebhookRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = 30000
): Promise<T> {
  return withRetry(
    async () => {
      // Add timeout to the operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      
      return await Promise.race([operation(), timeoutPromise]);
    },
    3, // Max 3 retries for webhooks
    `webhook-${operationName}`
  );
}

/**
 * Health check for monitoring
 */
export async function getHealthStatus(): Promise<{
  connected: boolean;
  latency: number;
  version: string;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT version() as version`;
    return {
      connected: true,
      latency: Date.now() - start,
      version: CURRENT_PRISMA_VERSION,
    };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - start,
      version: CURRENT_PRISMA_VERSION,
      error: (error as Error).message,
    };
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database client disconnected gracefully');
  } catch (error) {
    console.error('Error during database shutdown:', error);
  }
}

// Handle process termination
if (process.env.VERCEL === '1') {
  process.on('beforeExit', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
