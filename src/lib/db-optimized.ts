import { PrismaClient } from '@prisma/client';
import { performanceMonitor } from './performance-monitor';
import * as Sentry from '@sentry/nextjs';

/**
 * Enhanced database connection configuration with monitoring
 */
interface DatabaseConfig {
  // Connection pool settings
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxQueryExecutionTime: number;
  
  // Monitoring settings
  enableQueryLogging: boolean;
  enablePerformanceTracking: boolean;
  slowQueryThreshold: number;
}

/**
 * Production-optimized database configuration
 */
const DATABASE_CONFIG: DatabaseConfig = {
  maxConnections: process.env.NODE_ENV === 'production' ? 20 : 10,
  connectionTimeout: 30000, // 30 seconds
  idleTimeout: 30000, // 30 seconds
  maxQueryExecutionTime: 30000, // 30 seconds
  enableQueryLogging: process.env.NODE_ENV === 'development',
  enablePerformanceTracking: true,
  slowQueryThreshold: 500, // 500ms
};

/**
 * Enhanced Prisma client with connection pooling and monitoring
 */
const createPrismaClient = () => {
  const prisma = new PrismaClient({
    log: DATABASE_CONFIG.enableQueryLogging ? [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ] : ['error'],
    
    datasources: {
      db: {
        url: `${process.env.DATABASE_URL}?connection_limit=${DATABASE_CONFIG.maxConnections}&pool_timeout=${DATABASE_CONFIG.connectionTimeout / 1000}&connect_timeout=${DATABASE_CONFIG.connectionTimeout / 1000}&socket_timeout=${DATABASE_CONFIG.idleTimeout / 1000}`,
      },
    },
  });

  // Query performance monitoring
  if (DATABASE_CONFIG.enablePerformanceTracking) {
    prisma.$on('query' as never, (e: any) => {
      const duration = e.duration;
      const query = e.query;
      
      // Track query performance
      performanceMonitor.trackDatabaseQuery(query, duration, true);
      
      // Log slow queries
      if (duration > DATABASE_CONFIG.slowQueryThreshold) {
        console.warn(`🐌 Slow database query (${duration}ms): ${query.substring(0, 100)}...`);
        
        // Track in Sentry
        Sentry.withScope((scope) => {
          scope.setTag('db.query_type', 'slow');
          scope.setTag('db.duration', duration);
          scope.setContext('database_query', {
            query: query.substring(0, 200),
            duration,
            threshold: DATABASE_CONFIG.slowQueryThreshold,
          });
          
          if (duration > 2000) {
            Sentry.captureException(
              new Error(`Very slow database query: ${duration}ms`)
            );
          } else {
            Sentry.captureMessage(
              `Slow database query: ${duration}ms`,
              'warning'
            );
          }
        });
      }
    });
  }

  // Error monitoring
  prisma.$on('error' as never, (e: any) => {
    console.error('Database error:', e);
    
    // Track database errors
    performanceMonitor.trackDatabaseQuery(
      e.message || 'Unknown query',
      0,
      false
    );
    
    // Track in Sentry
    Sentry.withScope((scope) => {
      scope.setTag('db.error', true);
      scope.setContext('database_error', {
        message: e.message,
        timestamp: new Date().toISOString(),
      });
      
      Sentry.captureException(
        new Error(`Database error: ${e.message}`)
      );
    });
  });

  return prisma;
};

/**
 * Database connection manager with health monitoring
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private lastHealthCheck: Date = new Date();
  private connectionAttempts: number = 0;
  private maxRetries: number = 3;

  private constructor() {
    this.prisma = createPrismaClient();
    this.initializeConnection();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection with retry logic
   */
  private async initializeConnection(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.connectionStatus = 'connected';
      this.connectionAttempts = 0;
      console.log('✅ Database connected successfully');
    } catch (error) {
      this.connectionStatus = 'error';
      this.connectionAttempts++;
      
      console.error(`❌ Database connection failed (attempt ${this.connectionAttempts}):`, error);
      
      // Track connection errors in Sentry
      Sentry.withScope((scope) => {
        scope.setTag('db.connection_error', true);
        scope.setTag('db.attempt', this.connectionAttempts);
        scope.setContext('database_connection', {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: this.connectionAttempts,
          maxRetries: this.maxRetries,
        });
        
        Sentry.captureException(
          new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
      });

      // Retry connection with exponential backoff
      if (this.connectionAttempts < this.maxRetries) {
        const delay = Math.pow(2, this.connectionAttempts) * 1000;
        setTimeout(() => this.initializeConnection(), delay);
      }
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details: {
      connected: boolean;
      responseTime: number;
      connectionAttempts: number;
      lastHealthCheck: Date;
    };
  }> {
    const start = Date.now();
    
    try {
      // Simple health check query
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - start;
      this.lastHealthCheck = new Date();
      
      const status = responseTime > 1000 ? 'degraded' : 'healthy';
      
      return {
        status,
        details: {
          connected: this.connectionStatus === 'connected',
          responseTime,
          connectionAttempts: this.connectionAttempts,
          lastHealthCheck: this.lastHealthCheck,
        },
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          responseTime: Date.now() - start,
          connectionAttempts: this.connectionAttempts,
          lastHealthCheck: this.lastHealthCheck,
        },
      };
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    slowQueryThreshold: number;
    performanceTrackingEnabled: boolean;
  } {
    return {
      maxConnections: DATABASE_CONFIG.maxConnections,
      connectionTimeout: DATABASE_CONFIG.connectionTimeout,
      idleTimeout: DATABASE_CONFIG.idleTimeout,
      slowQueryThreshold: DATABASE_CONFIG.slowQueryThreshold,
      performanceTrackingEnabled: DATABASE_CONFIG.enablePerformanceTracking,
    };
  }

  /**
   * Execute query with timeout and retry logic
   */
  async executeWithRetry<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(this.prisma),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), DATABASE_CONFIG.maxQueryExecutionTime)
          ),
        ]);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (
          lastError.message.includes('Unique constraint') ||
          lastError.message.includes('Foreign key constraint') ||
          lastError.message.includes('Check constraint')
        ) {
          throw lastError;
        }
        
        // Retry on connection errors
        if (attempt < maxRetries && (
          lastError.message.includes('Connection') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('ECONNRESET')
        )) {
          console.warn(`Database operation failed (attempt ${attempt + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        throw lastError;
      }
    }
    
    throw lastError || new Error('Maximum retries exceeded');
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.connectionStatus = 'disconnected';
      console.log('✅ Database disconnected gracefully');
    } catch (error) {
      console.error('❌ Error during database disconnect:', error);
    }
  }
}

/**
 * Global database manager instance
 */
export const dbManager = DatabaseManager.getInstance();

/**
 * Optimized Prisma client with connection pooling
 */
export const prisma = dbManager.getClient();

/**
 * Helper function for database operations with monitoring
 */
export async function withDatabaseMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - start;
    
    // Track successful operation
    performanceMonitor.trackDatabaseQuery(operationName, duration, true);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    // Track failed operation
    performanceMonitor.trackDatabaseQuery(operationName, duration, false);
    
    throw error;
  }
}

/**
 * Database transaction wrapper with monitoring
 */
export async function withTransaction<T>(
  operation: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return dbManager.executeWithRetry(async (prisma) => {
    return await prisma.$transaction(operation);
  });
} 