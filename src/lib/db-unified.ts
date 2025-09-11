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
    
    // Only log database URL building in verbose mode or if explicitly enabled
    if (process.env.DB_DEBUG === 'true') {
      console.log(`🔗 Building database URL for ${process.env.NODE_ENV} environment`);
      console.log(`🔗 Supabase pooler: ${isSupabasePooler}`);
    }
    
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
        
        if (process.env.DB_DEBUG === 'true') {
          console.log('🚀 Production Supabase pooler: 240s pool timeout, 45s statement timeout, 90s socket timeout');
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
    console.error('Error building database URL:', error);
    return baseUrl; // Fallback to original URL
  }
}

/**
 * Create optimized Prisma client with explicit connection
 */
async function createPrismaClient(): Promise<PrismaClient> {
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

  // CRITICAL: Explicitly connect the client to start the engine with timeout
  try {
    if (process.env.DB_DEBUG === 'true') {
      console.log('🔌 Connecting Prisma client...');
    }
    
    // Add timeout to prevent hanging
    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Prisma client connection timeout after 15 seconds'));
      }, 15000);
    });
    
    await Promise.race([client.$connect(), connectTimeout]);
    
    if (process.env.DB_DEBUG === 'true') {
      console.log('✅ Prisma client connected successfully');
    }
    
    // Verify connection with a simple query (also with timeout)
    const queryTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Prisma connection verification timeout after 10 seconds'));
      }, 10000);
    });
    
    await Promise.race([
      client.$queryRaw`SELECT 1 as connection_test`,
      queryTimeout
    ]);
    
    if (process.env.DB_DEBUG === 'true') {
      console.log('✅ Prisma connection verified');
    }
  } catch (error) {
    console.error('❌ Failed to connect Prisma client:', error);
    try {
      await client.$disconnect();
    } catch (disconnectError) {
      console.warn('Error disconnecting failed client:', disconnectError);
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

// Initialize client immediately if needed
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
  const databaseUrl = buildDatabaseUrl();
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

// Initialize the client at module load time
if (!prismaClient || shouldRegenerateClient()) {
  prismaClient = getCurrentPrismaClient();
}

// Simple export that ensures connection when needed
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getCurrentPrismaClient();
    const property = client[prop as keyof PrismaClient];
    
    // Debug logging for troubleshooting (temporarily always enabled for debugging)
    if (process.env.DB_DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      console.log(`[DB-UNIFIED] Accessing property: ${String(prop)}, type: ${typeof property}`);
    }
    
    // For model objects (like user, product, etc.), wrap with retry logic
    if (typeof property === 'object' && property !== null && !Array.isArray(property)) {
      return new Proxy(property, {
        get(modelTarget, modelProp) {
          const method = (modelTarget as any)[modelProp];
          
          // Debug logging (temporarily always enabled for debugging)
          if (process.env.DB_DEBUG === 'true' || process.env.NODE_ENV === 'development') {
            console.log(`[DB-UNIFIED] Accessing model method: ${String(prop)}.${String(modelProp)}, type: ${typeof method}`);
          }
          
          // Validate that we have a proper method
          if (typeof method === 'function') {
            return (...args: any[]) => {
              // Ensure connection before executing the operation
              return withRetry(async () => {
                // Try to ensure we have a connection
                try {
                  await client.$queryRaw`SELECT 1 as connection_test`;
                } catch (connectionError) {
                  if (isConnectionError(connectionError as Error)) {
                    // Force reconnection
                    try {
                      await client.$disconnect();
                      await client.$connect();
                    } catch (reconnectError) {
                      console.warn('Reconnection failed:', reconnectError);
                    }
                  }
                }
                
                // Execute the actual operation with proper context
                return method.apply(modelTarget, args);
              }, 3, `${String(prop)}.${String(modelProp)}`);
            };
          }
          
          // For non-function properties, try fallback mechanism
          if (method === undefined || method === null) {
            console.error(`[DB-UNIFIED] Undefined method: ${String(prop)}.${String(modelProp)}`);
            // Try fallback: access directly from client
            try {
              const fallbackMethod = (client[prop as keyof PrismaClient] as any)?.[modelProp];
              if (typeof fallbackMethod === 'function') {
                console.log(`[DB-UNIFIED] Using fallback method for ${String(prop)}.${String(modelProp)}`);
                return fallbackMethod.bind(client[prop as keyof PrismaClient]);
              }
            } catch (fallbackError) {
              console.error(`[DB-UNIFIED] Fallback failed for ${String(prop)}.${String(modelProp)}:`, fallbackError);
            }
          } else if (typeof method !== 'function' && typeof method !== 'object') {
            console.error(`[DB-UNIFIED] Unexpected method type for ${String(prop)}.${String(modelProp)}:`, typeof method, method);
            // If we get a corrupted value like 'c', try fallback
            try {
              const fallbackMethod = (client[prop as keyof PrismaClient] as any)?.[modelProp];
              if (typeof fallbackMethod === 'function') {
                console.log(`[DB-UNIFIED] Using fallback method for corrupted ${String(prop)}.${String(modelProp)}`);
                return (...args: any[]) => {
                  return withRetry(async () => {
                    return fallbackMethod.apply(client[prop as keyof PrismaClient], args);
                  }, 3, `${String(prop)}.${String(modelProp)} (fallback)`);
                };
              }
            } catch (fallbackError) {
              console.error(`[DB-UNIFIED] Fallback failed for corrupted ${String(prop)}.${String(modelProp)}:`, fallbackError);
            }
            // If fallback fails, return undefined to prevent crashes
            return undefined;
          }
          
          return method;
        }
      });
    }
    
    // For other properties (like $connect, $disconnect, etc.), return as-is
    return property;
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

// Handle process termination
if (process.env.VERCEL === '1') {
  process.on('beforeExit', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
