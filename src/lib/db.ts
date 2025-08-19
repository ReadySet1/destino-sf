import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: string | undefined;
};

// Version identifier for the current Prisma client
const CURRENT_PRISMA_VERSION = '2025-01-28-fix-prepared-statements';

// Optimized Prisma configuration for Vercel/Serverless with better connection handling
const prismaClientSingleton = () => {
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Add connection pooling parameters to prevent prepared statement conflicts
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    
    // Check if it's a Supabase pooler URL (already has pgbouncer)
    const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
    
    if (!isSupabasePooler && isServerless) {
      // Only add these parameters for non-Supabase databases in serverless environment
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('connection_limit', '1');
      url.searchParams.set('pool_timeout', '20');
      url.searchParams.set('statement_timeout', '30000'); // 30 seconds
      url.searchParams.set('idle_in_transaction_session_timeout', '30000'); // 30 seconds
      databaseUrl = url.toString();
    }
    
    // For development, ensure we have proper timeouts
    if (isDevelopment && !isSupabasePooler) {
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

if (shouldRegenerateClient()) {
  // Disconnect old client if it exists
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch (error) {
      console.warn('Error disconnecting old Prisma client:', error);
    }
  }
  
  globalForPrisma.prisma = prismaClientSingleton();
  globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
}

export const prisma = globalForPrisma.prisma!;

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
  
  globalForPrisma.prisma = prismaClientSingleton();
  globalForPrisma.prismaVersion = CURRENT_PRISMA_VERSION;
  console.log('Prisma client regenerated successfully');
}

// Serverless-specific connection management
export async function ensureConnection(): Promise<void> {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.warn('Connection test failed, regenerating client...');
    await forceRegenerateClient();
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
         (error as any).code === 'P1001' ||
         (error as any).code === 'P1008' ||
         (error as any).code === 'P1017');
      
      // Check for PostgreSQL prepared statement errors
      const isPreparedStatementError = 
        error instanceof Error && 
        (error.message.includes("prepared statement") ||
         (error as any).code === '42P05');
      
      if ((isConnectionError || isPreparedStatementError) && i < maxRetries - 1) {
        console.log(`Database operation attempt ${i + 1} failed, retrying in ${delay}ms...`);
        console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // For prepared statement errors, try to clean up and regenerate client
        if (isPreparedStatementError) {
          try {
            await cleanupForServerless();
            await forceRegenerateClient();
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
    await prisma.$queryRaw`SELECT 1`;
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
      
      // Enhanced error classification
      const isPreparedStatementError = 
        error instanceof Error && 
        (error.message.includes("prepared statement") ||
         error.message.includes("already exists") ||
         (error as any).code === '42P05');
      
      const isConnectionError = 
        error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("Connection terminated") ||
         error.message.includes("ECONNRESET") ||
         error.message.includes("ECONNREFUSED") ||
         error.message.includes("ETIMEDOUT") ||
         error.message.includes("timeout") ||
         error.message.includes("Connection pool timeout") ||
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
