import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: string | undefined;
};

// Version identifier for the current Prisma client
const CURRENT_PRISMA_VERSION = '2025-01-28-fix-prepared-statements';

// Optimized Prisma configuration for Vercel/Serverless with better connection handling
const prismaClientSingleton = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Get database URL and optimize for Supabase pooler
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    
    // Check if it's a Supabase pooler URL (already optimized for connection pooling)
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
    
    if (isSupabasePooler) {
      // For Supabase pooler, use optimized settings and don't override their pooling
      console.log('🔗 Using Supabase pooler with optimized configuration');
      
      // Only set timeouts for better error handling, let Supabase handle pooling
      url.searchParams.set('statement_timeout', '30000'); // 30 seconds
      url.searchParams.set('idle_in_transaction_session_timeout', '30000'); // 30 seconds
      
      // CRITICAL: Disable prepared statements for pgBouncer transaction mode
      // This prevents "prepared statement does not exist" and "already exists" errors
      url.searchParams.set('prepare', 'false');
      
      // Remove any connection_limit parameters that might conflict with Supabase pooler
      url.searchParams.delete('connection_limit');
      url.searchParams.delete('pool_timeout');
      url.searchParams.delete('pgbouncer');
      
      databaseUrl = url.toString();
    } else if (isProduction) {
      // For non-Supabase databases in production, use custom pooling
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('connection_limit', '1');
      url.searchParams.set('pool_timeout', '20');
      url.searchParams.set('statement_timeout', '30000'); // 30 seconds
      url.searchParams.set('idle_in_transaction_session_timeout', '30000'); // 30 seconds
      databaseUrl = url.toString();
    } else if (isDevelopment) {
      // For development, use longer timeouts for debugging
      url.searchParams.set('statement_timeout', '60000'); // 60 seconds for development
      url.searchParams.set('idle_in_transaction_session_timeout', '60000');
      databaseUrl = url.toString();
    }
  }
  
  return new PrismaClient({
    log: isDevelopment ? [
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event', 
        level: 'warn',
      }
    ] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

// Force regenerate client if version doesn't match (to fix caching issues)
const shouldRegenerateClient = () => {
  return !globalForPrisma.prisma || globalForPrisma.prismaVersion !== CURRENT_PRISMA_VERSION;
};

// Initialize Prisma client
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
  
  prismaClient = prismaClientSingleton();
  globalForPrisma.prisma = prismaClient;
  globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
} else {
  prismaClient = globalForPrisma.prisma!;
}

// Export the base Prisma client
export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Function to force client regeneration (for emergency use)
export async function forceRegenerateClient(): Promise<void> {
  try {
    if (globalForPrisma.prisma) {
      await globalForPrisma.prisma.$disconnect();
    }
  } catch (error) {
    console.warn('Error during client disconnect:', error);
  }
  
  const newClient = prismaClientSingleton();
  globalForPrisma.prisma = newClient;
  globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
  
  // Update the exported prisma instance
  Object.assign(prismaClient, newClient);
  
  console.log('Prisma client regenerated successfully');
}

// Simple connection check function
export async function ensureConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.warn('Connection test failed, attempting to reconnect...');
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection re-established');
    } catch (reconnectError) {
      console.error('❌ Failed to reconnect to database:', reconnectError);
      throw reconnectError;
    }
  }
}

// Initialize database connection explicitly
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔌 Initializing database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    throw error;
  }
}

// Startup function to ensure database is ready
export async function startupDatabase(): Promise<void> {
  try {
    console.log('🚀 Starting database connection...');
    await initializeDatabase();
    console.log('✅ Database startup completed successfully');
  } catch (error) {
    console.error('❌ Database startup failed:', error);
    throw error;
  }
}

// Function to handle serverless function cleanup
export async function cleanupForServerless(): Promise<void> {
  try {
    // In serverless, we don't want to disconnect the client
    // as it might be reused, but we can clean up any prepared statements
    await prisma.$executeRaw`DISCARD ALL`;
    
    // Also try to explicitly deallocate all prepared statements
    try {
      await prisma.$executeRaw`DEALLOCATE ALL`;
    } catch (deallocateError) {
      // This might fail in some PostgreSQL configurations, but that's okay
      console.debug('DEALLOCATE ALL failed (this is often expected):', deallocateError);
    }
  } catch (error) {
    console.warn('Error during serverless cleanup:', error);
  }
}

// Helper function for safe database operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Ensure connection before each attempt
      await ensureConnection();
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error or prepared statement error
      const isConnectionError = 
        error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("Connection terminated") ||
         error.message.includes("ECONNRESET") ||
         error.message.includes("ECONNREFUSED") ||
         error.message.includes("ETIMEDOUT") ||
         error.message.includes("prepared statement") ||
         error.message.includes("Engine is not yet connected") ||
         (error as any).code === 'P1001' ||
         (error as any).code === 'P1008' ||
         (error as any).code === 'P1017');
      
      // Check for PostgreSQL prepared statement errors
      const isPreparedStatementError = 
        error instanceof Error && 
        (error.message.includes("prepared statement") ||
         error.message.includes("does not exist") ||
         error.message.includes("already exists") ||
         (error as any).code === '42P05' || // prepared statement already exists
         (error as any).code === '26000'); // prepared statement does not exist
      
      if ((isConnectionError || isPreparedStatementError) && i < maxRetries - 1) {
        console.log(`Database operation attempt ${i + 1} failed, retrying in ${delay}ms...`);
        console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // For prepared statement errors, try to clean up
        if (isPreparedStatementError) {
          try {
            await cleanupForServerless();
          } catch (cleanupError) {
            console.warn('Error during cleanup:', cleanupError);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff
        delay = delay * 2;
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Database transaction wrapper with retry logic
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  return withRetry(async () => {
    return await prisma.$transaction(operation, {
      maxWait: 5000, // 5 seconds
      timeout: 30000, // 30 seconds
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }, maxRetries);
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await ensureConnection();
    return {
      connected: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Improved connection management with better error handling and monitoring
export async function withConnectionManagement<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation',
  timeoutMs: number = 30000
): Promise<T> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    
    try {
      // Ensure connection before operation
      await ensureConnection();
      
      // Add timeout wrapper for the operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      
      const operationPromise = operation();
      
      const result = await Promise.race([operationPromise, timeoutPromise]);
      
      // Log slow queries
      const duration = Date.now() - startTime;
      if (duration > 5000) { // 5 seconds
        console.warn(`🐌 Slow ${operationName}: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      const duration = Date.now() - startTime;
      
      // Enhanced error classification for prepared statement issues
      const isPreparedStatementError = 
        error instanceof Error && 
        (error.message.includes("prepared statement") ||
         error.message.includes("already exists") ||
         error.message.includes("does not exist") ||
         (error as any).code === '42P05' || // prepared statement already exists
         (error as any).code === '26000'); // prepared statement does not exist
      
      const isConnectionError = 
        error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("Connection terminated") ||
         error.message.includes("ECONNRESET") ||
         error.message.includes("ECONNREFUSED") ||
         error.message.includes("ETIMEDOUT") ||
         error.message.includes("timeout") ||
         error.message.includes("Connection pool timeout") ||
         error.message.includes("Engine is not yet connected") ||
         (error as any).code === 'P1001' ||
         (error as any).code === 'P1008' ||
         (error as any).code === 'P1017' ||
         (error as any).code === 'P2024');
      
      const isRetryableError = isPreparedStatementError || isConnectionError;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ ${operationName} attempt ${attempt} failed (${duration}ms):`, {
          error: (error as Error).message,
          code: (error as any).code,
          retryable: isRetryableError,
          attempt,
          maxRetries,
        });
      }
      
      if (isRetryableError && attempt < maxRetries) {
        try {
          // Attempt to disconnect and clean up
          await prisma.$disconnect();
        } catch (disconnectError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Non-fatal disconnect error:', disconnectError);
          }
        }
        
        // Progressive backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

// Alias for backward compatibility
export const withPreparedStatementHandling = withConnectionManagement;

// Legacy exports for backward compatibility
export const db = prisma;
export const executeWithConnectionManagement = withRetry;
