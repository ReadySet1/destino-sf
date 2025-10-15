import { PrismaClient } from '@prisma/client';

/**
 * Resilient Prisma Client for fixing serverless connection issues
 * Based on the critical fix plan for Vercel webhook failures
 */
class ResilientPrismaClient {
  private static instance: PrismaClient | null = null;
  private static connectionPromise: Promise<void> | null = null;
  private static isConnecting = false;

  /**
   * Get a properly connected Prisma client instance
   */
  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: this.buildOptimizedDatabaseUrl(),
          },
        },
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
        errorFormat: 'minimal',
      });

      // Force connection on first use
      this.connectionPromise = this.connectWithRetry();
    }

    // Always ensure connected before returning
    if (this.connectionPromise) {
      await this.connectionPromise;
    }

    return this.instance;
  }

  /**
   * Execute database operation with automatic retry on connection failures
   */
  static async executeWithRetry<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const client = await this.getInstance();
        return await operation(client);
      } catch (error: any) {
        const isConnectionError = this.isConnectionError(error);

        if (i === maxRetries - 1) {
          console.error(
            `❌ Database operation failed after ${maxRetries} attempts:`,
            error.message
          );
          throw error;
        }

        // Reset connection on connection failures
        if (isConnectionError) {
          console.warn(
            `🔄 Connection error (attempt ${i + 1}/${maxRetries}), resetting connection:`,
            error.message
          );
          this.instance = null;
          this.connectionPromise = null;
          this.isConnecting = false;
          await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        } else {
          // For non-connection errors, throw immediately
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Connect with retry logic
   */
  private static async connectWithRetry(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;
    const maxRetries = 3;

    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          if (!this.instance) {
            throw new Error('Prisma client instance not available');
          }

          await this.instance.$connect();

          // Verify connection with a simple query
          await this.instance.$queryRaw`SELECT 1 as connection_test`;

          console.log('✅ Prisma client connected successfully');
          return;
        } catch (error: any) {
          if (i === maxRetries - 1) throw error;

          console.warn(`Connection attempt ${i + 1}/${maxRetries} failed:`, error.message);
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Check if error is connection-related
   */
  private static isConnectionError(error: any): boolean {
    const connectionErrors = [
      'Engine is not yet connected',
      'Response from the Engine was empty',
      "Can't reach database server",
      'Connection terminated',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Socket timeout',
      'Connection pool timeout',
      'Timed out fetching a new connection',
    ];

    const connectionCodes = ['P1001', 'P1008', 'P2024'];

    return (
      connectionErrors.some(msg => error.message?.includes(msg)) ||
      connectionCodes.includes(error.code)
    );
  }

  /**
   * Build optimized database URL for serverless environment
   */
  private static buildOptimizedDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) throw new Error('DATABASE_URL environment variable is required');

    try {
      const url = new URL(baseUrl);
      const isProduction = process.env.NODE_ENV === 'production';
      const isSupabasePooler = url.hostname.includes('pooler.supabase.com');

      if (isSupabasePooler) {
        // Supabase pooler-specific optimizations for serverless
        url.searchParams.set('pgbouncer', 'true');
        url.searchParams.set('prepared_statements', 'false');
        url.searchParams.set('statement_cache_size', '0');

        if (isProduction) {
          // Optimized for Vercel production environment
          url.searchParams.set('pool_timeout', '240');
          url.searchParams.set('connection_timeout', '20');
          url.searchParams.set('statement_timeout', '45000');
          url.searchParams.set('idle_in_transaction_session_timeout', '45000');
        } else {
          // Development settings
          url.searchParams.set('pool_timeout', '120');
          url.searchParams.set('connection_timeout', '15');
          url.searchParams.set('statement_timeout', '60000');
        }

        // Remove connection_limit to let Supabase handle pooling
        url.searchParams.delete('connection_limit');
      } else {
        // Non-Supabase configuration with connection limits
        url.searchParams.set('connection_limit', isProduction ? '1' : '5');
        url.searchParams.set('pool_timeout', '10');
      }

      return url.toString();
    } catch (error) {
      console.error('Error building database URL:', error);
      return baseUrl; // Fallback to original URL
    }
  }

  /**
   * Disconnect and cleanup
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.$disconnect();
        console.log('✅ Database connection closed');
      } catch (error) {
        console.error('Error disconnecting:', error);
      } finally {
        this.instance = null;
        this.connectionPromise = null;
        this.isConnecting = false;
      }
    }
  }
}

export const resilientPrisma = ResilientPrismaClient;
