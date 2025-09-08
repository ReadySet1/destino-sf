import { PrismaClient, Prisma } from '@prisma/client';
import { withConnectionManagement } from '@/lib/db';

/**
 * Webhook-optimized database client with aggressive connection pooling
 * and circuit breaker patterns specifically designed for high-volume webhook traffic
 */
class WebhookOptimizedDatabaseClient {
  private static instance: WebhookOptimizedDatabaseClient;
  private prismaClient: PrismaClient;
  private isConnected = false;
  private lastConnectionTest = 0;
  private readonly CONNECTION_TEST_INTERVAL = 60000; // 1 minute

  constructor() {
    this.prismaClient = this.createOptimizedClient();
  }

  static getInstance(): WebhookOptimizedDatabaseClient {
    if (!WebhookOptimizedDatabaseClient.instance) {
      WebhookOptimizedDatabaseClient.instance = new WebhookOptimizedDatabaseClient();
    }
    return WebhookOptimizedDatabaseClient.instance;
  }

  private createOptimizedClient(): PrismaClient {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    let optimizedUrl = databaseUrl;
    
    try {
      const url = new URL(databaseUrl);
      
      // Check if it's a Supabase pooler URL
      const isSupabasePooler = url.hostname.includes('pooler.supabase.com');
      
      if (isSupabasePooler) {
        // For Supabase pooler, use minimal configuration to avoid conflicts
        console.log('🚀 Creating webhook-optimized client for Supabase pooler');
        
        // Ensure pgbouncer is enabled for pooler connections
        url.searchParams.set('pgbouncer', 'true');
        url.searchParams.set('prepared_statements', 'false');
        
        // Set aggressive timeouts for webhook processing
        url.searchParams.set('statement_timeout', '20000'); // 20 seconds for webhooks
        url.searchParams.set('idle_in_transaction_session_timeout', '20000');
        
        // Remove any conflicting parameters but preserve pgbouncer
        url.searchParams.delete('connection_limit');
        url.searchParams.delete('pool_timeout');
        // Keep pgbouncer=true for Supabase pooler compatibility
        
        optimizedUrl = url.toString();
      } else {
        // For non-Supabase databases, use very conservative settings
        url.searchParams.set('connection_limit', '1');
        url.searchParams.set('pool_timeout', '15');
        url.searchParams.set('statement_timeout', '20000');
        url.searchParams.set('idle_in_transaction_session_timeout', '20000');
        optimizedUrl = url.toString();
      }
    } catch (error) {
      console.warn('Failed to optimize database URL for webhooks, using original:', error);
    }

    const client = new PrismaClient({
      datasources: {
        db: {
          url: optimizedUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'minimal',
    });

    return client;
  }

  /**
   * Test database connection health
   */
  async testConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Skip frequent connection tests
    if (this.isConnected && (now - this.lastConnectionTest) < this.CONNECTION_TEST_INTERVAL) {
      return true;
    }

    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      this.isConnected = true;
      this.lastConnectionTest = now;
      return true;
    } catch (error) {
      console.warn('Webhook database connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Execute a webhook database operation with optimized error handling
   */
  async executeWebhookOperation<T>(
    operation: (client: PrismaClient) => Promise<T>,
    operationName: string,
    timeoutMs: number = 20000
  ): Promise<T> {
    return withConnectionManagement(
      async () => {
        // Test connection first
        const isHealthy = await this.testConnection();
        if (!isHealthy) {
          throw new Error(`Database connection unhealthy for webhook operation: ${operationName}`);
        }

        return await operation(this.prismaClient);
      },
      `webhook-${operationName}`,
      timeoutMs
    );
  }

  /**
   * Execute a webhook transaction with optimized settings
   */
  async executeWebhookTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.executeWebhookOperation(
      (client) => client.$transaction(operation, {
        maxWait: 10000, // 10 seconds max wait
        timeout: 20000, // 20 seconds timeout
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }),
      `transaction-${operationName}`,
      25000 // 25 second total timeout
    );
  }

  /**
   * Graceful disconnect for webhook client
   */
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      await this.prismaClient.$disconnect();
      console.log('✅ Webhook database client disconnected successfully');
    } catch (error) {
      console.warn('Error disconnecting webhook database client:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get the underlying Prisma client (use with caution)
   */
  get client(): PrismaClient {
    return this.prismaClient;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      lastConnectionTest: this.lastConnectionTest,
      clientReady: !!this.prismaClient,
    };
  }
}

// Export singleton instance
export const webhookDb = WebhookOptimizedDatabaseClient.getInstance();

// Export commonly used operations
export async function executeWebhookQuery<T>(
  operation: (client: PrismaClient) => Promise<T>,
  operationName: string
): Promise<T> {
  return webhookDb.executeWebhookOperation(operation, operationName);
}

export async function executeWebhookTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  operationName: string
): Promise<T> {
  return webhookDb.executeWebhookTransaction(operation, operationName);
}

// Export for testing and monitoring
export { WebhookOptimizedDatabaseClient };
