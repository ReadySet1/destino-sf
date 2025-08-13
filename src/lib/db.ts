import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: string | undefined;
};

// Version identifier for the current Prisma client
const CURRENT_PRISMA_VERSION = '2025-01-28-fix-prepared-statements';

// Optimized Prisma configuration for Vercel/Serverless
const prismaClientSingleton = () => {
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  
  // Add connection pooling parameters to prevent prepared statement conflicts
  let databaseUrl = process.env.DATABASE_URL;
  if (isServerless && databaseUrl) {
    const url = new URL(databaseUrl);
    // Add pgbouncer and connection pooling parameters for serverless
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('pool_timeout', '20');
    databaseUrl = url.toString();
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Serverless-specific configurations
    ...(isServerless && {
      // Disable query logging in production to reduce noise
      log: ['error'],
    }),
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

// Wrapper function for operations that might encounter prepared statement errors
export async function withPreparedStatementHandling<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a prepared statement error or connection error
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
         (error as any).code === 'P1001' ||
         (error as any).code === 'P1008' ||
         (error as any).code === 'P1017');
      
      if ((isPreparedStatementError || isConnectionError) && attempt < maxRetries) {
        console.warn(`${operationName} attempt ${attempt} failed, retrying... Error: ${error.message}`);
        
        try {
          if (isPreparedStatementError) {
            // Clean up prepared statements
            await cleanupForServerless();
            
            // Force regenerate client to ensure clean state
            await forceRegenerateClient();
          } else if (isConnectionError) {
            // Just regenerate client for connection errors
            await forceRegenerateClient();
          }
          
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (cleanupError) {
          console.warn(`Cleanup failed on attempt ${attempt}:`, cleanupError);
          // Continue to retry even if cleanup fails
        }
        
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error(`Operation ${operationName} failed after ${maxRetries} attempts`);
}

// Legacy exports for backward compatibility
export const db = prisma;
export const executeWithConnectionManagement = withRetry;
