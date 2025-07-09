import { prisma, executeWithConnectionManagement } from '@/lib/db';

/**
 * Execute database operation with automatic retry and connection management
 */
export async function withDatabaseConnection<T>(
  operation: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await executeWithConnectionManagement(operation);
      return result;
    } catch (error: any) {
      const isConnectionError = 
        error.code === 'P1008' || // Operations timed out
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P2024' || // Timed out fetching a new connection
        error.message?.includes('connection pool') ||
        error.message?.includes('Timed out fetching') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Connection terminated unexpectedly');

      if (isConnectionError && attempt < retries) {
        console.log(`🔄 Database connection attempt ${attempt} failed, retrying...`);
        
        // Disconnect and wait before retry
        try {
          await prisma.$disconnect();
        } catch (disconnectError) {
          console.log('Disconnect error (non-fatal):', disconnectError);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }

      // Log detailed error information
      console.error(`Database operation failed on attempt ${attempt}:`, {
        code: error.code,
        message: error.message,
        isConnectionError,
        attempt,
        maxRetries: retries
      });

      throw error;
    }
  }

  throw new Error(`Database operation failed after ${retries} attempts`);
}

/**
 * Safe query execution with connection management
 */
export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  return withDatabaseConnection(queryFn);
}

/**
 * Safe raw query execution with timeout handling
 */
export async function safeQueryRaw<T = unknown>(
  query: TemplateStringsArray | string,
  ...values: any[]
): Promise<T> {
  return withDatabaseConnection(async () => {
    if (typeof query === 'string') {
      // Handle string queries
      const result = await prisma.$queryRawUnsafe(query, ...values);
      return result as T;
    } else {
      // Handle template literal queries
      const result = await prisma.$queryRaw(query as any, ...values);
      return result as T;
    }
  });
}

/**
 * Safe transaction execution with retry logic
 */
export async function safeTransaction<T>(
  transactionFn: (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return withDatabaseConnection(async () => {
    return await prisma.$transaction(transactionFn, {
      timeout: 20000, // 20 second timeout
      maxWait: 10000, // 10 second max wait for transaction slot
    });
  });
}

/**
 * Connection health check with detailed diagnostics
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
  diagnostics?: any;
}> {
  const startTime = Date.now();
  
  try {
    const result = await safeQueryRaw`
      SELECT 
        version() as database_version,
        current_database() as database_name,
        current_user as database_user,
        now() as current_time,
        pg_postmaster_start_time() as server_start_time
    `;
    
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime,
      diagnostics: result
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      connected: false,
      responseTime,
      error: error.message,
      diagnostics: {
        code: error.code,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')
      }
    };
  }
}

/**
 * Graceful shutdown helper
 */
export async function gracefulDatabaseShutdown(): Promise<void> {
  try {
    console.log('🔄 Initiating graceful database shutdown...');
    await prisma.$disconnect();
    console.log('✅ Database connection closed successfully');
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
    throw error;
  }
} 