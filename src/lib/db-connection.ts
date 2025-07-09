import { PrismaClient } from '@prisma/client';

/**
 * Database connection configuration with resilience patterns
 */
interface DatabaseConfig {
  url: string;
  directUrl?: string;
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  maxConnections: number;
}

/**
 * Enhanced Prisma client with connection resilience
 */
class ResilientPrismaClient extends PrismaClient {
  private static instance: ResilientPrismaClient;
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    const isProduction = process.env.NODE_ENV === 'production';

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });

    // Initialize connection state
    this.isConnected = false;
  }

  /**
   * Singleton pattern with connection validation
   */
  static getInstance(): ResilientPrismaClient {
    if (!ResilientPrismaClient.instance) {
      ResilientPrismaClient.instance = new ResilientPrismaClient();
    }
    return ResilientPrismaClient.instance;
  }

  /**
   * Connect with retry logic
   */
  async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Database connection attempt ${attempt}/${this.maxRetries}`);
        await this.$connect();
        this.isConnected = true;
        this.connectionAttempts = 0;
        console.log('✅ Database connected successfully');
        return;
      } catch (error) {
        this.connectionAttempts = attempt;
        console.error(`❌ Database connection attempt ${attempt} failed:`, error);

        if (attempt === this.maxRetries) {
          console.error('🚨 All database connection attempts exhausted');
          throw new Error(`Database connection failed after ${this.maxRetries} attempts: ${error}`);
        }

        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Health check with automatic reconnection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      this.isConnected = false;
      
      // Attempt reconnection
      try {
        await this.connectWithRetry();
        return true;
      } catch (reconnectError) {
        console.error('Database reconnection failed:', reconnectError);
        return false;
      }
    }
  }

  /**
   * Execute operation with automatic retry on connection failure
   */
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Check connection health before operation
        if (!this.isConnected) {
          await this.connectWithRetry();
        }

        return await operation();
      } catch (error: any) {
        console.error(`Operation attempt ${attempt} failed:`, error);

        // Check if it's a connection-related error
        const isConnectionError = 
          error.code === 'P1001' || // Can't reach database server
          error.code === 'P1008' || // Operations timed out
          error.code === 'P1017' || // Server has closed the connection
          error.message?.includes("Can't reach database server") ||
          error.message?.includes("Connection terminated unexpectedly") ||
          error.message?.includes("timeout");

        if (isConnectionError && attempt < this.maxRetries) {
          console.log(`🔄 Connection error detected, attempting reconnection...`);
          this.isConnected = false;
          
          const delay = this.retryDelay * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If not a connection error or max retries reached, throw
        throw error;
      }
    }

    throw new Error(`Operation failed after ${this.maxRetries} attempts`);
  }

  /**
   * Graceful disconnect
   */
  async gracefulDisconnect(): Promise<void> {
    try {
      await this.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected gracefully');
    } catch (error) {
      console.error('Error during database disconnect:', error);
    }
  }
}

// Export singleton instance
export const prisma = ResilientPrismaClient.getInstance();

// Connection status utilities
export const dbHealth = {
  async check(): Promise<boolean> {
    return await prisma.healthCheck();
  },

  async getConnectionInfo(): Promise<{
    isConnected: boolean;
    attempts: number;
    databaseUrl: string;
  }> {
    return {
      isConnected: (prisma as any).isConnected,
      attempts: (prisma as any).connectionAttempts,
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@') || 'Not configured'
    };
  }
};

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.gracefulDisconnect();
  });

  process.on('SIGINT', async () => {
    await prisma.gracefulDisconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.gracefulDisconnect();
    process.exit(0);
  });
}
