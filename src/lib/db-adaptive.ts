/**
 * Adaptive Database Connection Management
 * 
 * Provides database connection utilities that automatically adapt to the current
 * environment (local Docker, local PostgreSQL, Supabase cloud, production).
 * 
 * Features:
 * - Automatic environment detection
 * - Connection health checks
 * - Fallback logic
 * - Migration support
 * - Connection pooling optimization
 */

import { PrismaClient } from '@prisma/client';
import { environmentDetection, type DatabaseEnvironment, type EnvironmentConfig } from './env-check';
import { logger } from '../utils/logger';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  enableLogging: boolean;
  ssl: boolean;
  directUrl?: string;
}

/**
 * Connection health status
 */
export interface ConnectionHealth {
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  errors: string[];
  warnings: string[];
  metadata: {
    host: string;
    database: string;
    version?: string;
    connection_count?: number;
  };
}

/**
 * Database connection manager with environment adaptation
 */
export class AdaptiveDatabaseManager {
  private static instance: AdaptiveDatabaseManager;
  private prismaClient: PrismaClient | null = null;
  private currentConfig: DatabaseConfig | null = null;
  private environment: EnvironmentConfig | null = null;
  private lastHealthCheck: ConnectionHealth | null = null;

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AdaptiveDatabaseManager {
    if (!AdaptiveDatabaseManager.instance) {
      AdaptiveDatabaseManager.instance = new AdaptiveDatabaseManager();
    }
    return AdaptiveDatabaseManager.instance;
  }

  /**
   * Initialize the database manager
   */
  private async initialize() {
    try {
      this.environment = environmentDetection.detect();
      this.currentConfig = this.generateDatabaseConfig(this.environment);
      logger.debug('Adaptive database manager initialized', {
        database: this.environment.database,
        provider: this.environment.config.databaseProvider,
      });
    } catch (error) {
      logger.error('Failed to initialize adaptive database manager:', error);
    }
  }

  /**
   * Generate database configuration based on environment
   */
  private generateDatabaseConfig(env: EnvironmentConfig): DatabaseConfig {
    const isProduction = env.features.isProduction;
    const isLocal = env.features.isLocalDocker;
    
    // Base configuration
    const config: DatabaseConfig = {
      url: process.env.DATABASE_URL || '',
      maxConnections: isProduction ? 20 : isLocal ? 5 : 10,
      connectionTimeout: isLocal ? 5000 : 10000,
      queryTimeout: isLocal ? 5000 : 15000,
      enableLogging: env.features.enableDebugLogging,
      ssl: !isLocal && env.features.isProduction,
    };

    // Add direct URL for Supabase
    if (env.database.includes('supabase') && process.env.DIRECT_URL) {
      config.directUrl = process.env.DIRECT_URL;
    }

    // Optimize for local Docker
    if (isLocal) {
      config.maxConnections = 3; // Lower for local development
      config.connectionTimeout = 3000;
      config.ssl = false;
    }

    // Optimize for cloud
    if (env.infra === 'cloud') {
      config.maxConnections = isProduction ? 25 : 15;
      config.connectionTimeout = 15000;
      config.ssl = true;
    }

    return config;
  }

  /**
   * Get or create Prisma client with current configuration
   */
  async getClient(): Promise<PrismaClient> {
    if (!this.prismaClient || !this.currentConfig) {
      await this.initialize();
      this.prismaClient = this.createPrismaClient();
    }
    
    return this.prismaClient;
  }

  /**
   * Create Prisma client with optimized configuration
   */
  private createPrismaClient(): PrismaClient {
    if (!this.currentConfig) {
      throw new Error('Database configuration not initialized');
    }

    const config = this.currentConfig;
    
    const prismaOptions: any = {
      log: config.enableLogging ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ] : ['error'],
    };

    // Only set datasources if we need to override the URL
    if (config.url !== process.env.DATABASE_URL || (config.directUrl && config.directUrl !== config.url)) {
      prismaOptions.datasources = {
        db: {
          url: config.url,
        },
      };
      
      // Add direct URL for connection pooling if available and different from main URL
      if (config.directUrl && config.directUrl !== config.url) {
        prismaOptions.datasources.db.directUrl = config.directUrl;
      }
    }

    const client = new PrismaClient(prismaOptions);

    // Set up logging if enabled
    if (config.enableLogging) {
      client.$on('query', (e) => {
        logger.debug(`[DB Query] ${e.query} - Duration: ${e.duration}ms`);
      });

      client.$on('error', (e) => {
        logger.error('[DB Error]', e);
      });

      client.$on('warn', (e) => {
        logger.warn('[DB Warning]', e);
      });
    }

    return client;
  }

  /**
   * Test database connection health
   */
  async checkHealth(forceRefresh = false): Promise<ConnectionHealth> {
    const now = new Date();
    
    // Return cached result if recent and not forced
    if (!forceRefresh && this.lastHealthCheck && 
        (now.getTime() - this.lastHealthCheck.lastChecked.getTime()) < 30000) {
      return this.lastHealthCheck;
    }

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let isHealthy = false;
    let metadata: any = {};

    try {
      const client = await this.getClient();
      
      // Basic connection test
      await client.$queryRaw`SELECT 1 as test`;
      
      // Get database info
      const versionResult = await client.$queryRaw`SELECT version() as version` as any[];
      const dbResult = await client.$queryRaw`SELECT current_database() as database` as any[];
      
      // Get connection info
      try {
        const connectionResult = await client.$queryRaw`
          SELECT count(*) as connection_count 
          FROM pg_stat_activity 
          WHERE state = 'active'
        ` as any[];
        
        metadata.connection_count = Number(connectionResult[0]?.connection_count || 0);
      } catch {
        // Ignore if unable to get connection count
      }

      metadata = {
        host: this.extractHostFromUrl(this.currentConfig?.url || ''),
        database: dbResult[0]?.database || 'unknown',
        version: versionResult[0]?.version?.split(' ')[1] || 'unknown',
        ...metadata,
      };

      isHealthy = true;

      // Check for warnings
      if (this.environment?.app === 'production' && this.environment?.database.includes('local')) {
        warnings.push('Production app using local database');
      }

      if (metadata.connection_count > (this.currentConfig?.maxConnections || 10) * 0.8) {
        warnings.push('High connection usage detected');
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown database error');
    }

    const responseTime = Date.now() - startTime;
    
    this.lastHealthCheck = {
      isHealthy,
      responseTime,
      lastChecked: now,
      errors,
      warnings,
      metadata,
    };

    return this.lastHealthCheck;
  }

  /**
   * Switch to a different database environment
   */
  async switchEnvironment(targetEnvironment: DatabaseEnvironment): Promise<boolean> {
    try {
      logger.info(`Switching database environment to: ${targetEnvironment}`);
      
      // Disconnect current client
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
      }

      // Update environment variable based on target
      const newUrl = await this.getUrlForEnvironment(targetEnvironment);
      if (!newUrl) {
        throw new Error(`No configuration available for environment: ${targetEnvironment}`);
      }

      // Update process.env for the session
      process.env.DATABASE_URL = newUrl;
      
      // Re-initialize with new configuration
      await this.initialize();
      
      // Test new connection
      const health = await this.checkHealth(true);
      if (!health.isHealthy) {
        throw new Error(`Failed to connect to ${targetEnvironment}: ${health.errors.join(', ')}`);
      }

      logger.info(`Successfully switched to ${targetEnvironment} database`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to switch to ${targetEnvironment}:`, error);
      return false;
    }
  }

  /**
   * Get database URL for specific environment
   */
  private async getUrlForEnvironment(environment: DatabaseEnvironment): Promise<string | null> {
    switch (environment) {
      case 'local-docker':
        return process.env.LOCAL_DATABASE_URL || 
               'postgresql://postgres:password@localhost:5432/destino_sf';
      
      case 'local-postgres':
        return process.env.LOCAL_DATABASE_URL || 
               'postgresql://postgres:password@localhost:5432/destino_sf';
      
      case 'supabase-cloud':
        return process.env.SUPABASE_DATABASE_URL || 
               process.env.DATABASE_URL;
      
      case 'production':
        return process.env.DATABASE_URL;
      
      default:
        return null;
    }
  }

  /**
   * Run database migrations for current environment
   */
  async runMigrations(force = false): Promise<boolean> {
    try {
      if (!this.environment) {
        throw new Error('Environment not initialized');
      }

      // Check if migrations are safe to run
      if (this.environment.app === 'production' && !force) {
        logger.warn('Refusing to run migrations in production without force flag');
        return false;
      }

      logger.info(`Running migrations for ${this.environment.database} environment`);
      
      // Use Prisma CLI for migrations
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const migration = spawn('npx', ['prisma', 'migrate', 'deploy'], {
          stdio: 'inherit',
          env: { ...process.env },
        });

        migration.on('close', (code) => {
          if (code === 0) {
            logger.info('Migrations completed successfully');
            resolve(true);
          } else {
            logger.error(`Migrations failed with code ${code}`);
            resolve(false);
          }
        });

        migration.on('error', (error) => {
          logger.error('Migration process error:', error);
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Failed to run migrations:', error);
      return false;
    }
  }

  /**
   * Get available database environments
   */
  async getAvailableEnvironments(): Promise<DatabaseEnvironment[]> {
    const available: DatabaseEnvironment[] = [];
    
    // Check each environment
    const environments: DatabaseEnvironment[] = [
      'local-docker',
      'local-postgres', 
      'supabase-cloud',
      'production'
    ];

    for (const env of environments) {
      const url = await this.getUrlForEnvironment(env);
      if (url) {
        available.push(env);
      }
    }

    return available;
  }

  /**
   * Extract host from database URL
   */
  private extractHostFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    current: DatabaseEnvironment | null;
    config: DatabaseConfig | null;
    health: ConnectionHealth | null;
    available: DatabaseEnvironment[];
  }> {
    return {
      current: this.environment?.database || null,
      config: this.currentConfig,
      health: this.lastHealthCheck,
      available: await this.getAvailableEnvironments(),
    };
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
    }
    logger.debug('Database manager disconnected');
  }
}

// Export singleton instance
export const adaptiveDatabase = AdaptiveDatabaseManager.getInstance();

// Export utility functions
export async function getDatabaseClient(): Promise<PrismaClient> {
  return adaptiveDatabase.getClient();
}

export async function checkDatabaseHealth(forceRefresh = false): Promise<ConnectionHealth> {
  return adaptiveDatabase.checkHealth(forceRefresh);
}

export async function switchDatabaseEnvironment(environment: DatabaseEnvironment): Promise<boolean> {
  return adaptiveDatabase.switchEnvironment(environment);
}

export async function runDatabaseMigrations(force = false): Promise<boolean> {
  return adaptiveDatabase.runMigrations(force);
}

export async function getDatabaseStats() {
  return adaptiveDatabase.getConnectionStats();
}

// Default export
export default adaptiveDatabase;