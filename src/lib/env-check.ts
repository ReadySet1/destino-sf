/**
 * Environment Detection and Validation Utility
 * 
 * Provides comprehensive environment detection, validation, and safe configuration
 * access for development, staging, and production environments.
 */

import { z } from 'zod';

/**
 * Environment types the application can run in
 */
export type AppEnvironment = 'development' | 'production' | 'test' | 'staging';

/**
 * Infrastructure environment types
 */
export type InfraEnvironment = 'local' | 'cloud' | 'hybrid';

/**
 * Database environment types
 */
export type DatabaseEnvironment = 'local-docker' | 'local-postgres' | 'supabase-cloud' | 'production';

/**
 * Square environment types
 */
export type SquareEnvironment = 'sandbox' | 'production';

/**
 * Comprehensive environment configuration interface
 */
export interface EnvironmentConfig {
  // Core environment
  app: AppEnvironment;
  infra: InfraEnvironment;
  database: DatabaseEnvironment;
  square: SquareEnvironment;
  
  // Feature flags
  features: {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    isStaging: boolean;
    isLocalDocker: boolean;
    isCloudDatabase: boolean;
    useSandboxSquare: boolean;
    enableDebugLogging: boolean;
    enableHotReload: boolean;
  };
  
  // Connection info
  connections: {
    hasLocalDocker: boolean;
    hasSupabaseCloud: boolean;
    hasSquareProduction: boolean;
    hasSquareSandbox: boolean;
    hasRedis: boolean;
    hasShippo: boolean;
  };
  
  // Safe configuration values (non-sensitive)
  config: {
    squareApiHost: string;
    databaseProvider: string;
    baseUrl: string;
    apiVersion: string;
  };
}

/**
 * Schema for validating critical environment variables
 */
const criticalEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
});

/**
 * Schema for optional environment variables
 */
const optionalEnvSchema = z.object({
  // Infrastructure detection
  USE_LOCAL_DOCKER: z.string().optional(),
  USE_SUPABASE_CLOUD: z.string().optional(),
  
  // Database URLs for environment detection
  LOCAL_DATABASE_URL: z.string().optional(),
  SUPABASE_DATABASE_URL: z.string().optional(),
  
  // Square configuration
  USE_SQUARE_SANDBOX: z.string().optional(),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_SANDBOX_TOKEN: z.string().optional(),
  SQUARE_PRODUCTION_TOKEN: z.string().optional(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Redis
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Shipping
  SHIPPO_API_KEY: z.string().optional(),
  
  // Debug flags
  DEBUG: z.string().optional(),
  VERBOSE_LOGGING: z.string().optional(),
  ENABLE_DEBUG_LOGGING: z.string().optional(),
  
  // Vercel detection
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

/**
 * Combined environment schema
 */
const fullEnvSchema = criticalEnvSchema.merge(optionalEnvSchema);

/**
 * Parse and validate environment variables
 */
function parseEnvironment() {
  try {
    const critical = criticalEnvSchema.parse(process.env);
    const optional = optionalEnvSchema.parse(process.env);
    return { ...critical, ...optional };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Environment validation failed:\n${missingFields.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Detect the application environment
 */
function detectAppEnvironment(env: any): AppEnvironment {
  // Explicit staging detection
  if (env.NODE_ENV === 'staging' || env.VERCEL_ENV === 'preview') {
    return 'staging';
  }
  
  // Standard environment detection
  if (env.NODE_ENV === 'test') return 'test';
  if (env.NODE_ENV === 'production') return 'production';
  
  return 'development';
}

/**
 * Detect infrastructure environment (local vs cloud)
 */
function detectInfraEnvironment(env: any): InfraEnvironment {
  // Explicit local docker detection
  if (env.USE_LOCAL_DOCKER === 'true') {
    return 'local';
  }
  
  // Explicit cloud detection
  if (env.USE_SUPABASE_CLOUD === 'true' || env.VERCEL === '1') {
    return 'cloud';
  }
  
  // Hybrid detection (local app with cloud services)
  const hasLocalDatabase = env.DATABASE_URL?.includes('localhost') || 
                           env.DATABASE_URL?.includes('127.0.0.1') ||
                           env.DATABASE_URL?.includes('host.docker.internal');
  
  const hasCloudServices = env.NEXT_PUBLIC_SUPABASE_URL || 
                          env.UPSTASH_REDIS_REST_URL ||
                          env.VERCEL_URL;
  
  if (hasLocalDatabase && hasCloudServices) {
    return 'hybrid';
  }
  
  if (hasLocalDatabase) {
    return 'local';
  }
  
  return 'cloud';
}

/**
 * Detect database environment
 */
function detectDatabaseEnvironment(env: any): DatabaseEnvironment {
  const dbUrl = env.DATABASE_URL;
  
  if (!dbUrl) {
    return 'local-docker'; // Default fallback
  }
  
  // Supabase cloud detection
  if (dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com')) {
    return 'supabase-cloud';
  }
  
  // Local detection
  if (dbUrl.includes('localhost') || 
      dbUrl.includes('127.0.0.1') || 
      dbUrl.includes('host.docker.internal')) {
    
    // Check if it's docker (common docker ports and hosts)
    if (dbUrl.includes('host.docker.internal') || 
        env.USE_LOCAL_DOCKER === 'true') {
      return 'local-docker';
    }
    
    return 'local-postgres';
  }
  
  // Production cloud detection
  if (env.NODE_ENV === 'production') {
    return 'production';
  }
  
  return 'supabase-cloud'; // Default for cloud URLs
}

/**
 * Detect Square environment
 */
function detectSquareEnvironment(env: any): SquareEnvironment {
  // Explicit sandbox flag
  if (env.USE_SQUARE_SANDBOX === 'true') {
    return 'sandbox';
  }
  
  // Explicit environment variable
  if (env.SQUARE_ENVIRONMENT === 'sandbox') {
    return 'sandbox';
  }
  
  if (env.SQUARE_ENVIRONMENT === 'production') {
    return 'production';
  }
  
  // Token-based detection
  if (env.SQUARE_SANDBOX_TOKEN && !env.SQUARE_PRODUCTION_TOKEN) {
    return 'sandbox';
  }
  
  // Default based on app environment
  if (env.NODE_ENV === 'production') {
    return 'production';
  }
  
  return 'sandbox'; // Default for development
}

/**
 * Check if various services are available/configured
 */
function detectConnections(env: any) {
  return {
    hasLocalDocker: env.USE_LOCAL_DOCKER === 'true' || 
                   env.DATABASE_URL?.includes('host.docker.internal'),
    
    hasSupabaseCloud: !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    
    hasSquareProduction: !!(env.SQUARE_PRODUCTION_TOKEN || 
                           (env.SQUARE_ACCESS_TOKEN && env.SQUARE_ENVIRONMENT === 'production')),
    
    hasSquareSandbox: !!(env.SQUARE_SANDBOX_TOKEN || 
                        (env.SQUARE_ACCESS_TOKEN && env.SQUARE_ENVIRONMENT === 'sandbox')),
    
    hasRedis: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
    
    hasShippo: !!env.SHIPPO_API_KEY,
  };
}

/**
 * Generate safe configuration values
 */
function generateSafeConfig(env: any, environments: {
  app: AppEnvironment;
  infra: InfraEnvironment;
  database: DatabaseEnvironment;
  square: SquareEnvironment;
}) {
  return {
    squareApiHost: environments.square === 'sandbox' 
      ? 'connect.squareupsandbox.com' 
      : 'connect.squareup.com',
    
    databaseProvider: environments.database.includes('supabase') 
      ? 'supabase' 
      : environments.database.includes('docker') 
        ? 'docker-postgres' 
        : 'postgres',
    
    baseUrl: env.NEXT_PUBLIC_APP_URL || env.VERCEL_URL || 'http://localhost:3000',
    
    apiVersion: 'v1',
  };
}

/**
 * Main environment detection function
 */
export function detectEnvironment(): EnvironmentConfig {
  const env = parseEnvironment();
  
  // Detect environments
  const app = detectAppEnvironment(env);
  const infra = detectInfraEnvironment(env);
  const database = detectDatabaseEnvironment(env);
  const square = detectSquareEnvironment(env);
  
  // Detect connections
  const connections = detectConnections(env);
  
  // Generate safe config
  const config = generateSafeConfig(env, { app, infra, database, square });
  
  // Generate feature flags
  const features = {
    isDevelopment: app === 'development',
    isProduction: app === 'production',
    isTest: app === 'test',
    isStaging: app === 'staging',
    isLocalDocker: infra === 'local' || database === 'local-docker',
    isCloudDatabase: database.includes('supabase') || database === 'production',
    useSandboxSquare: square === 'sandbox',
    enableDebugLogging: env.DEBUG === 'true' || 
                       env.VERBOSE_LOGGING === 'true' || 
                       env.ENABLE_DEBUG_LOGGING === 'true' || 
                       app === 'development',
    enableHotReload: app === 'development' && !env.VERCEL,
  };
  
  return {
    app,
    infra,
    database,
    square,
    features,
    connections,
    config,
  };
}

/**
 * Validate environment for specific requirements
 */
export function validateEnvironment(requirements?: {
  requireDatabase?: boolean;
  requireSquare?: boolean;
  requireRedis?: boolean;
  requireShippo?: boolean;
}): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const env = detectEnvironment();
    const reqs = requirements || {};
    
    // Check database requirement
    if (reqs.requireDatabase && !env.connections.hasSupabaseCloud && !env.connections.hasLocalDocker) {
      errors.push('Database connection required but not found');
    }
    
    // Check Square requirement
    if (reqs.requireSquare && !env.connections.hasSquareProduction && !env.connections.hasSquareSandbox) {
      errors.push('Square payment integration required but not configured');
    }
    
    // Check Redis requirement
    if (reqs.requireRedis && !env.connections.hasRedis) {
      warnings.push('Redis not configured - rate limiting and caching will be limited');
    }
    
    // Check Shippo requirement
    if (reqs.requireShippo && !env.connections.hasShippo) {
      warnings.push('Shippo shipping integration not configured');
    }
    
    // Environment-specific warnings
    if (env.app === 'production' && env.square === 'sandbox') {
      warnings.push('Production app is using Square sandbox - payments will not be processed');
    }
    
    if (env.app === 'development' && env.database === 'production') {
      warnings.push('Development app is using production database - be careful with data changes');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [`Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Get environment information suitable for logging/debugging
 */
export function getEnvironmentInfo(includeSensitive = false): Record<string, any> {
  try {
    const env = detectEnvironment();
    
    const info = {
      // Environment types
      environments: {
        app: env.app,
        infrastructure: env.infra,
        database: env.database,
        square: env.square,
      },
      
      // Feature flags
      features: env.features,
      
      // Connection status
      connections: env.connections,
      
      // Safe configuration
      config: env.config,
      
      // Validation status
      validation: validateEnvironment({
        requireDatabase: true,
        requireSquare: true,
        requireRedis: false,
        requireShippo: false,
      }),
    };
    
    if (includeSensitive && env.features.isDevelopment) {
      // Only include sensitive info in development
      const sensitiveEnv = fullEnvSchema.parse(process.env);
      (info as any).sensitive = {
        databaseUrl: sensitiveEnv.DATABASE_URL ? 
          sensitiveEnv.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 'Not configured',
        hasSquareToken: !!sensitiveEnv.SQUARE_ACCESS_TOKEN,
        hasSupabaseKeys: !!(sensitiveEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY && sensitiveEnv.SUPABASE_SERVICE_ROLE_KEY),
        hasRedisKeys: !!(sensitiveEnv.UPSTASH_REDIS_REST_URL && sensitiveEnv.UPSTASH_REDIS_REST_TOKEN),
      };
    }
    
    return info;
    
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to detect environment',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create environment-specific logger
 */
export function createEnvironmentLogger() {
  const env = detectEnvironment();
  
  return {
    debug: (...args: any[]) => {
      if (env.features.enableDebugLogging) {
        console.log('[ENV-DEBUG]', ...args);
      }
    },
    info: (...args: any[]) => {
      console.log('[ENV-INFO]', ...args);
    },
    warn: (...args: any[]) => {
      console.warn('[ENV-WARN]', ...args);
    },
    error: (...args: any[]) => {
      console.error('[ENV-ERROR]', ...args);
    },
    envInfo: () => {
      const info = getEnvironmentInfo();
      console.log('[ENV-INFO] Current Environment:', JSON.stringify(info, null, 2));
    },
  };
}

/**
 * Check if environment switching is available
 */
export function canSwitchEnvironment(): {
  canSwitchDatabase: boolean;
  canSwitchSquare: boolean;
  availableTargets: {
    database: DatabaseEnvironment[];
    square: SquareEnvironment[];
  };
} {
  const env = detectEnvironment();
  
  // Check available database targets
  const availableDatabases: DatabaseEnvironment[] = [];
  if (env.connections.hasLocalDocker) availableDatabases.push('local-docker');
  if (env.connections.hasSupabaseCloud) availableDatabases.push('supabase-cloud');
  
  // Check available Square targets
  const availableSquareEnvs: SquareEnvironment[] = [];
  if (env.connections.hasSquareSandbox) availableSquareEnvs.push('sandbox');
  if (env.connections.hasSquareProduction) availableSquareEnvs.push('production');
  
  return {
    canSwitchDatabase: availableDatabases.length > 1,
    canSwitchSquare: availableSquareEnvs.length > 1,
    availableTargets: {
      database: availableDatabases,
      square: availableSquareEnvs,
    },
  };
}

// Export singleton instance for easy access
export const environmentDetection = {
  detect: detectEnvironment,
  validate: validateEnvironment,
  getInfo: getEnvironmentInfo,
  createLogger: createEnvironmentLogger,
  canSwitch: canSwitchEnvironment,
};

// Default export
export default environmentDetection;