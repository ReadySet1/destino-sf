/**
 * Database Environment Validator
 * 
 * Validates that the correct database is being used for each environment
 * and provides early detection of configuration issues.
 */

interface DatabaseEnvironmentConfig {
  host: string;
  projectId: string;
  name: string;
  environment: 'development' | 'production';
}

const KNOWN_DATABASES: Record<string, DatabaseEnvironmentConfig> = {
  'drrejylrcjbeldnzodjd': {
    host: 'db.drrejylrcjbeldnzodjd.supabase.co',
    projectId: 'drrejylrcjbeldnzodjd',
    name: 'destino-development', 
    environment: 'development'
  },
  'ocusztulyiegeawqptrs': {
    host: 'db.ocusztulyiegeawqptrs.supabase.co',
    projectId: 'ocusztulyiegeawqptrs',
    name: 'destino-production',
    environment: 'production'
  }
};

interface ValidationResult {
  isValid: boolean;
  currentDatabase: DatabaseEnvironmentConfig | null;
  expectedEnvironment: string;
  actualEnvironment: string;
  warnings: string[];
  errors: string[];
}

/**
 * Validates the database configuration against the current environment
 */
export function validateDatabaseEnvironment(): ValidationResult {
  const currentEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL;
  
  const result: ValidationResult = {
    isValid: true,
    currentDatabase: null,
    expectedEnvironment: currentEnv,
    actualEnvironment: 'unknown',
    warnings: [],
    errors: []
  };

  // Check if DATABASE_URL is defined
  if (!databaseUrl) {
    result.isValid = false;
    result.errors.push('DATABASE_URL environment variable is not defined');
    return result;
  }

  // Extract host from DATABASE_URL
  let host: string;
  try {
    const url = new URL(databaseUrl);
    host = url.hostname;
  } catch (error) {
    result.isValid = false;
    result.errors.push('DATABASE_URL is not a valid URL format');
    return result;
  }

  // Find matching database configuration
  // Handle both direct Supabase URLs and pooler URLs
  const databaseConfig = Object.values(KNOWN_DATABASES).find(db => {
    // Direct host match
    if (host === db.host) return true;
    
    // Project ID in host
    if (host.includes(db.projectId)) return true;
    
    // Handle Supabase pooler URLs (format: aws-0-us-west-1.pooler.supabase.com)
    if (host.includes('pooler.supabase.com')) {
      // Extract potential project ID from the pooled URL
      // The project ID might be in the database URL path or a separate parameter
      const fullUrl = new URL(databaseUrl);
      const pathname = fullUrl.pathname;
      // Check if project ID is in the path or database name
      if (pathname.includes(db.projectId) || fullUrl.searchParams.get('db')?.includes(db.projectId)) {
        return true;
      }
    }
    
    return false;
  });

  if (!databaseConfig) {
    // For pooler URLs, this might be expected - add as warning instead of error
    if (host.includes('pooler.supabase.com')) {
      // Only log pooler connection info in debug mode
      if (process.env.DB_DEBUG === 'true') {
        result.warnings.push(`Using Supabase pooler connection: ${host}`);
        result.warnings.push('Unable to determine specific database from pooler URL - this is normal for production deployments');
      }
      return result;
    } else {
      result.warnings.push(`Unknown database host: ${host}`);
      return result;
    }
  }

  result.currentDatabase = databaseConfig;
  result.actualEnvironment = databaseConfig.environment;

  // Validate environment match
  const isProduction = currentEnv === 'production';
  const isProdDb = databaseConfig.environment === 'production';

  if (isProduction && !isProdDb) {
    result.isValid = false;
    result.errors.push(
      `🚨 CRITICAL: Production environment is using ${databaseConfig.environment} database (${databaseConfig.name})!`
    );
    result.errors.push(
      `Expected: Production database (db.ocusztulyiegeawqptrs.supabase.co)`
    );
    result.errors.push(
      `Actual: ${databaseConfig.environment} database (${host})`
    );
  } else if (!isProduction && isProdDb) {
    result.warnings.push(
      `⚠️ WARNING: ${currentEnv} environment is using production database (${databaseConfig.name})`
    );
    result.warnings.push(
      'This could affect production data. Consider using development database.'
    );
  }

  return result;
}

/**
 * Validates database environment and throws error if critical issues found
 */
export function enforceEnvironmentValidation(): void {
  const validation = validateDatabaseEnvironment();
  
  // Log warnings only in debug mode or for critical issues
  if (process.env.DB_DEBUG === 'true') {
    validation.warnings.forEach(warning => {
      console.warn(warning);
    });
  }

  // Throw error for critical issues
  if (!validation.isValid) {
    const errorMessage = [
      '🚨 DATABASE ENVIRONMENT VALIDATION FAILED',
      '=' .repeat(50),
      ...validation.errors,
      '=' .repeat(50),
      'Application startup aborted to prevent data corruption.',
      'Please fix the DATABASE_URL configuration and restart.'
    ].join('\n');
    
    throw new Error(errorMessage);
  }

  // Log successful validation
  if (validation.currentDatabase) {
    console.log(`✅ Database validation passed: ${validation.currentDatabase.name} (${validation.actualEnvironment})`);
  }
}

/**
 * Gets information about the current database configuration
 */
export function getDatabaseInfo(): {
  environment: string;
  databaseName: string;
  host: string;
  projectId: string;
} | null {
  const validation = validateDatabaseEnvironment();
  
  if (!validation.currentDatabase) {
    return null;
  }

  return {
    environment: validation.actualEnvironment,
    databaseName: validation.currentDatabase.name,
    host: validation.currentDatabase.host,
    projectId: validation.currentDatabase.projectId
  };
}

/**
 * Validates database connection at startup with detailed reporting
 */
export async function validateStartupDatabase(): Promise<void> {
  try {
    console.log('🔍 Validating database environment configuration...');
    
    // Validate environment
    enforceEnvironmentValidation();
    
    // Get database info
    const dbInfo = getDatabaseInfo();
    if (dbInfo) {
      console.log('📊 Database Configuration:');
      console.log(`   Environment: ${dbInfo.environment}`);
      console.log(`   Database: ${dbInfo.databaseName}`);
      console.log(`   Host: ${dbInfo.host}`);
      console.log(`   Project ID: ${dbInfo.projectId}`);
    }
    
    // Test connection
    const { checkDatabaseHealth } = await import('./db-utils');
    const health = await checkDatabaseHealth();
    
    if (health.connected) {
      console.log(`✅ Database connection successful (${health.responseTime}ms)`);
    } else {
      throw new Error(`Database connection failed: ${health.error}`);
    }
    
  } catch (error) {
    console.error('❌ Database startup validation failed:', error);
    throw error;
  }
}

/**
 * Middleware to validate database environment on critical operations
 */
export function withEnvironmentValidation<T>(
  operation: () => Promise<T>,
  operationName: string = 'database operation'
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const validation = validateDatabaseEnvironment();
      
      if (!validation.isValid) {
        reject(new Error(`${operationName} aborted: ${validation.errors.join(', ')}`));
        return;
      }
      
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
