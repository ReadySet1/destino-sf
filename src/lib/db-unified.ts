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
 * Get the best database URL with fallback strategy
 */
function getBestDatabaseUrl(): string {
  const directUrl = process.env.DIRECT_DATABASE_URL;
  const poolerUrl = process.env.DATABASE_URL;

  // During build time, static analysis, or test environment, return a placeholder URL
  // This prevents errors when DATABASE_URL isn't needed or mocked
  if (!poolerUrl) {
    if (process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.NEXT_PHASE === 'phase-development-build' ||
        process.env.NODE_ENV === 'test') {
      return 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
    }
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Force pooler connection if explicitly requested (for public networks)
  if (process.env.FORCE_POOLER_CONNECTION === 'true') {
    if (process.env.DB_DEBUG === 'true') {
      console.log('🔗 Forcing pooler connection (FORCE_POOLER_CONNECTION=true)');
    }
    return buildOptimizedPoolerUrl(poolerUrl);
  }
  
  // For local development, prefer direct connection if available
  const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
  
  if (isLocal && directUrl) {
    if (process.env.DB_DEBUG === 'true') {
      console.log('🔗 Using direct database connection for local development');
    }
    return directUrl;
  }
  
  // For production/Vercel, use optimized pooler connection
  return buildOptimizedPoolerUrl(poolerUrl);
}

/**
 * Build optimized pooler URL with proper connection parameters
 */
function buildOptimizedPoolerUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
    
    // Debug logging only when explicitly enabled
    if (process.env.DB_DEBUG === 'true') {
      console.log(`🔗 Building optimized pooler URL for ${process.env.NODE_ENV} environment`);
      console.log(`🔗 Supabase pooler: ${isSupabasePooler}`);
    }
    
    if (isSupabasePooler) {
      // Supabase pooler-specific optimizations
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('prepared_statements', 'false');
      url.searchParams.set('statement_cache_size', '0');
      
      // Optimized timeouts for webhook processing and Vercel cold starts
      if (isProduction) {
        url.searchParams.set('pool_timeout', '300'); // 5 minutes for high load
        url.searchParams.set('connection_timeout', '30'); // 30 seconds to connect (increased for cold starts)
        url.searchParams.set('statement_timeout', '60000'); // 60 seconds for queries
        url.searchParams.set('idle_in_transaction_session_timeout', '60000');
        url.searchParams.set('socket_timeout', '120'); // 2 minutes socket timeout
        
        if (process.env.DB_DEBUG === 'true') {
          console.log('🚀 Production Supabase pooler: 300s pool timeout, 60s statement timeout, 120s socket timeout');
        }
      } else {
        url.searchParams.set('pool_timeout', '120');
        url.searchParams.set('connection_timeout', '15');
        url.searchParams.set('statement_timeout', '60000');
        url.searchParams.set('idle_in_transaction_session_timeout', '60000');
        url.searchParams.set('socket_timeout', '60');
        
        if (process.env.DB_DEBUG === 'true') {
          console.log('🔧 Development Supabase pooler: 120s pool timeout, 60s statement timeout');
        }
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
    console.error('Error building pooler URL:', error);
    return baseUrl; // Fallback to original URL
  }
}

/**
 * Create optimized Prisma client with explicit connection and enhanced retry logic
 */
async function createPrismaClient(retryAttempt: number = 0): Promise<PrismaClient> {
  // In test environment, return dummy client immediately
  if (process.env.NODE_ENV === 'test') {
    return {
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $queryRaw: () => Promise.resolve([]),
      $transaction: (fn: any) => Promise.resolve(fn({} as any)),
    } as any as PrismaClient;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = getBestDatabaseUrl();

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

  // CRITICAL: Explicitly connect the client to start the engine with enhanced timeout handling
  try {
    if (process.env.DB_DEBUG === 'true') {
      console.log(`🔌 Connecting Prisma client... (attempt ${retryAttempt + 1})`);
    }
    
    // Progressive timeout: Start with 30s, increase for retries, max 60s
    const baseTimeout = 30000;
    const maxTimeout = 60000;
    const timeoutMs = Math.min(baseTimeout + (retryAttempt * 10000), maxTimeout);
    
    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Prisma client connection timeout after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
    
    await Promise.race([client.$connect(), connectTimeout]);
    
    if (process.env.DB_DEBUG === 'true') {
      console.log('✅ Prisma client connected successfully');
    }
    
    // Verify connection with a simple query (also with progressive timeout)
    const queryTimeoutMs = Math.min(20000 + (retryAttempt * 5000), 30000);
    const queryTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Prisma connection verification timeout after ${queryTimeoutMs / 1000} seconds`));
      }, queryTimeoutMs);
    });
    
    await Promise.race([
      client.$queryRaw`SELECT 1 as connection_test`,
      queryTimeout
    ]);
    
    if (process.env.DB_DEBUG === 'true') {
      console.log('✅ Prisma connection verified');
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`❌ Failed to connect Prisma client (attempt ${retryAttempt + 1}):`, errorMessage);
    
    try {
      await client.$disconnect();
    } catch (disconnectError) {
      console.warn('Error disconnecting failed client:', disconnectError);
    }
    
    // Enhanced retry logic for Vercel deployments
    const isRetryableError = isConnectionError(error as Error) || 
                           errorMessage.includes('timeout') ||
                           errorMessage.includes('ECONNRESET') ||
                           errorMessage.includes('ENOTFOUND');
                           
    if (isRetryableError && retryAttempt < 2) {
      const delayMs = Math.pow(2, retryAttempt) * 2000; // 2s, 4s exponential backoff
      console.log(`⏳ Retrying connection in ${delayMs / 1000}s...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return createPrismaClient(retryAttempt + 1);
    }
    
    throw error;
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
 * Initialize the singleton Prisma client with proper connection management
 */
let prismaClient: PrismaClient | null = null;
let isInitializing = false;
let initPromise: Promise<PrismaClient> | null = null;

async function initializePrismaClient(): Promise<PrismaClient> {
  if (isInitializing && initPromise) {
    return initPromise;
  }

  if (prismaClient && !shouldRegenerateClient()) {
    if (process.env.DB_DEBUG === 'true') {
      console.log('♻️ Reusing existing Prisma client');
    }
    return prismaClient;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      // Disconnect old client if it exists
      if (globalForPrisma.prisma) {
        try {
          await globalForPrisma.prisma.$disconnect();
        } catch (error) {
          console.warn('Error disconnecting old Prisma client:', error);
        }
      }
      
      const client = await createPrismaClient();
      
      // Store in global and local references
      globalForPrisma.prisma = client;
      globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
      prismaClient = client;
      
      if (process.env.DB_DEBUG === 'true') {
        console.log('✅ Unified Prisma client initialized successfully');
      }
      return client;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

// Initialize client immediately if needed (skip during build and tests)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
                     process.env.NEXT_PHASE === 'phase-development-build' ||
                     process.env.NODE_ENV === 'test';

if (!isBuildPhase) {
  if (shouldRegenerateClient()) {
    initializePrismaClient().catch(error => {
      console.error('Failed to initialize Prisma client:', error);
    });
  } else if (globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
    if (process.env.DB_DEBUG === 'true') {
      console.log('♻️ Using existing global Prisma client');
    }
  }
}

/**
 * Get the Prisma client, ensuring it's properly initialized
 */
async function getPrismaClient(): Promise<PrismaClient> {
  if (prismaClient && !shouldRegenerateClient()) {
    return prismaClient;
  }
  
  return await initializePrismaClient();
}

/**
 * Create a basic Prisma client without complex async initialization
 */
function createBasicPrismaClient(): PrismaClient {
  // In test environment, don't create a real Prisma client
  // Tests should use mocked clients
  if (process.env.NODE_ENV === 'test') {
    // Return a dummy client that won't try to connect
    // This prevents "Authentication failed" errors in tests
    return {
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      $queryRaw: () => Promise.resolve([]),
      $transaction: (fn: any) => Promise.resolve(fn({} as any)),
    } as any as PrismaClient;
  }

  const databaseUrl = getBestDatabaseUrl();
  const isProduction = process.env.NODE_ENV === 'production';

  return new PrismaClient({
    log: isProduction ? ['error'] : [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ],
    errorFormat: 'minimal',
    datasources: {
      db: { url: databaseUrl }
    },
  });
}

/**
 * Get the current Prisma client, creating one if needed
 */
function getCurrentPrismaClient(): PrismaClient {
  // Check if we have a valid global client
  if (globalForPrisma.prisma && globalForPrisma.prismaVersion === CURRENT_PRISMA_VERSION) {
    prismaClient = globalForPrisma.prisma;
    return prismaClient;
  }
  
  // Create a new client if needed
  if (!prismaClient || shouldRegenerateClient()) {
    prismaClient = createBasicPrismaClient();
    
    // Store in global for reuse
    globalForPrisma.prisma = prismaClient;
    globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
    
    if (process.env.DB_DEBUG === 'true') {
      console.log('✅ Created new Prisma client');
    }
  }
  
  return prismaClient;
}

// Initialize the client at module load time (skip during build)
if (!isBuildPhase && (!prismaClient || shouldRegenerateClient())) {
  prismaClient = getCurrentPrismaClient();
}

// Enhanced proxy with better error handling and proper method binding
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    try {
      const client = getCurrentPrismaClient();
      const property = client[prop as keyof PrismaClient];
      
      // For direct client methods (like $queryRaw, $connect, etc.), wrap with retry
      if (typeof property === 'function') {
        return (...args: any[]) => {
          return withRetry(async () => {
            const freshClient = getCurrentPrismaClient();
            const freshMethod = freshClient[prop as keyof PrismaClient] as any;
            
            if (typeof freshMethod !== 'function') {
              throw new Error(`Direct method ${String(prop)} is not a function`);
            }
            
            return freshMethod.apply(freshClient, args);
          }, 3, String(prop));
        };
      }
      
      // For model objects, add retry wrapper only to methods
      if (typeof property === 'object' && property !== null && !Array.isArray(property)) {
        return new Proxy(property, {
          get(modelTarget, modelProp) {
            const method = (modelTarget as any)[modelProp];
            
            if (typeof method === 'function') {
              return (...args: any[]) => {
                return withRetry(async () => {
                  // Always get fresh client to avoid stale references
                  const freshClient = getCurrentPrismaClient();
                  const freshModel = freshClient[prop as keyof PrismaClient] as any;
                  const freshMethod = freshModel[modelProp];
                  
                  if (typeof freshMethod !== 'function') {
                    throw new Error(`Method ${String(prop)}.${String(modelProp)} is not a function`);
                  }
                  
                  return freshMethod.apply(freshModel, args);
                }, 3, `${String(prop)}.${String(modelProp)}`);
              };
            }
            
            return method;
          }
        });
      }
      
      // Return other properties as-is
      return property;
    } catch (error) {
      console.error(`[DB-UNIFIED] Error accessing ${String(prop)}:`, error);
      throw error;
    }
  }
});

/**
 * Enhanced connection health check
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await getPrismaClient();
    await client.$queryRaw`SELECT 1 as health_check`;
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
      // Ensure we have a properly initialized client
      const client = await getPrismaClient();
      
      // Test the connection directly with the client (not through proxy)
      await client.$queryRaw`SELECT 1 as health_check`;
      return; // Success
    } catch (error) {
      lastError = error as Error;
      
      const isRetryableError = isConnectionError(error as Error);
      
      if (isRetryableError && attempt < maxRetries) {
        console.warn(`Connection attempt ${attempt}/${maxRetries} failed, retrying...`);
        
        try {
          // Force client reinitialization on connection errors
          if (prismaClient) {
            await prismaClient.$disconnect();
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          
          // Reset client to force reinitialization
          prismaClient = null;
          globalForPrisma.prisma = undefined;
          initPromise = null;
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
      // Ensure we have a properly initialized client before each attempt
      const client = await getPrismaClient();
      
      // On retry attempts, verify connection using the actual client
      if (attempt > 1) {
        await client.$queryRaw`SELECT 1 as retry_check`;
      }
      
      const result = await operation();
      
      // Log successful recoveries
      if (attempt > 1 && process.env.DB_DEBUG === 'true') {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (isConnectionError(lastError) && attempt < maxRetries) {
        if (process.env.DB_DEBUG === 'true') {
          console.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        }
        
        // For connection errors, force client reinitialization
        try {
          if (prismaClient) {
            await prismaClient.$disconnect();
          }
          prismaClient = null;
          globalForPrisma.prisma = undefined;
          initPromise = null;
        } catch (cleanupError) {
          if (process.env.DB_DEBUG === 'true') {
            console.warn('Error during client cleanup:', cleanupError);
          }
        }
        
        // Progressive backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500; // Add 0-500ms jitter
        const delay = Math.min(baseDelay + jitter, 5000);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry non-connection errors or if max retries reached
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
      // Add timeout to the operation with proper error handling
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const error = new Error(`${operationName} timeout after ${timeoutMs}ms`);
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs);
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
    const client = await getPrismaClient();
    await client.$queryRaw`SELECT version() as version`;
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
    if (prismaClient) {
      await prismaClient.$disconnect();
      console.log('✅ Database client disconnected gracefully');
    }
  } catch (error) {
    console.error('Error during database shutdown:', error);
  }
}

/**
 * Force reset database connection to clear cached plans
 * This is useful after schema changes that cause "cached plan must not change result type" errors
 */
export async function forceResetConnection(): Promise<void> {
  console.log('🔄 Forcing database connection reset to clear cached query plans...');

  if (prismaClient) {
    try {
      await prismaClient.$disconnect();
      console.log('✅ Old database connection closed');
    } catch (error) {
      console.warn('Error disconnecting old client:', error);
    }
  }

  // Force recreation of the client by clearing the global reference
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaVersion = undefined;

  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));

  // Get a fresh client instance
  prismaClient = await getPrismaClient();
  console.log('✅ Database connection reset complete');
}

// Handle process termination
if (process.env.VERCEL === '1') {
  process.on('beforeExit', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
