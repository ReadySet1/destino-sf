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
  drrejylrcjbeldnzodjd: {
    host: 'db.drrejylrcjbeldnzodjd.supabase.co',
    projectId: 'drrejylrcjbeldnzodjd',
    name: 'destino-development',
    environment: 'development',
  },
  ocusztulyiegeawqptrs: {
    host: 'db.ocusztulyiegeawqptrs.supabase.co',
    projectId: 'ocusztulyiegeawqptrs',
    name: 'destino-production',
    environment: 'production',
  },
};

/**
 * Result of DATABASE_URL format validation
 */
export interface DatabaseUrlValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  parsed: {
    username: string;
    projectId: string | null;
    host: string;
    port: number;
    database: string;
    isPooler: boolean;
    hasPgBouncer: boolean;
    hasPreparedStatementsDisabled: boolean;
    hasStatementCacheDisabled: boolean;
  } | null;
}

/**
 * Validates DATABASE_URL format for Supabase pooler connections.
 * Detects common authentication issues BEFORE attempting connection.
 *
 * The Supabase pooler requires username format: postgres.PROJECT_ID
 * This catches "Tenant or user not found" errors early.
 */
export function validateDatabaseUrlFormat(databaseUrl?: string): DatabaseUrlValidation {
  const result: DatabaseUrlValidation = {
    isValid: true,
    warnings: [],
    errors: [],
    parsed: null,
  };

  const url = databaseUrl || process.env.DATABASE_URL;

  // Skip validation during build time
  if (!url) {
    if (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NEXT_PHASE === 'phase-development-build' ||
      process.env.NODE_ENV === 'test'
    ) {
      return result; // Skip validation during build/test
    }
    result.isValid = false;
    result.errors.push('DATABASE_URL environment variable is not defined');
    return result;
  }

  try {
    const parsed = new URL(url);
    const isPooler = parsed.hostname.includes('pooler.supabase.com');
    const port = parseInt(parsed.port) || 5432;

    // Extract project ID from username (format: postgres.PROJECT_ID)
    const usernameParts = decodeURIComponent(parsed.username).split('.');
    const hasProjectIdInUsername = usernameParts.length === 2 && usernameParts[0] === 'postgres';
    const projectIdFromUsername = hasProjectIdInUsername ? usernameParts[1] : null;

    result.parsed = {
      username: decodeURIComponent(parsed.username),
      projectId: projectIdFromUsername,
      host: parsed.hostname,
      port,
      database: parsed.pathname.replace('/', '') || 'postgres',
      isPooler,
      hasPgBouncer: parsed.searchParams.get('pgbouncer') === 'true',
      hasPreparedStatementsDisabled: parsed.searchParams.get('prepared_statements') === 'false',
      hasStatementCacheDisabled: parsed.searchParams.get('statement_cache_size') === '0',
    };

    // CRITICAL: Username must include project ID for pooler connections
    if (isPooler && !hasProjectIdInUsername) {
      result.isValid = false;
      result.errors.push(
        'AUTHENTICATION ERROR: Supabase pooler requires username format "postgres.PROJECT_ID". ' +
          `Current username: "${result.parsed.username}". ` +
          'Expected format: "postgres.drrejylrcjbeldnzodjd" (dev) or "postgres.ocusztulyiegeawqptrs" (prod). ' +
          'This will cause "Tenant or user not found" error.'
      );
    }

    // Validate project ID matches known databases
    if (isPooler && projectIdFromUsername) {
      const knownDb = KNOWN_DATABASES[projectIdFromUsername];
      if (!knownDb) {
        result.warnings.push(
          `Unknown project ID "${projectIdFromUsername}" in DATABASE_URL. ` +
            `Known project IDs: ${Object.keys(KNOWN_DATABASES).join(', ')}`
        );
      }
    }

    // Warn about missing pgbouncer parameters for pooler connections
    if (isPooler) {
      if (!result.parsed.hasPgBouncer) {
        result.warnings.push(
          'Missing pgbouncer=true parameter in DATABASE_URL (recommended for pooler connections)'
        );
      }
      if (!result.parsed.hasPreparedStatementsDisabled) {
        result.warnings.push(
          'Missing prepared_statements=false parameter in DATABASE_URL (recommended for pgbouncer)'
        );
      }
      if (!result.parsed.hasStatementCacheDisabled) {
        result.warnings.push(
          'Missing statement_cache_size=0 parameter in DATABASE_URL (recommended for pgbouncer)'
        );
      }
    }
  } catch (error) {
    result.isValid = false;
    result.errors.push(`Invalid DATABASE_URL format: ${(error as Error).message}`);
  }

  return result;
}

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
    errors: [],
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
      if (
        pathname.includes(db.projectId) ||
        fullUrl.searchParams.get('db')?.includes(db.projectId)
      ) {
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
        result.warnings.push(
          'Unable to determine specific database from pooler URL - this is normal for production deployments'
        );
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
    result.errors.push(`Expected: Production database (db.ocusztulyiegeawqptrs.supabase.co)`);
    result.errors.push(`Actual: ${databaseConfig.environment} database (${host})`);
  } else if (!isProduction && isProdDb) {
    result.warnings.push(
      `⚠️ WARNING: ${currentEnv} environment is using production database (${databaseConfig.name})`
    );
    result.warnings.push('This could affect production data. Consider using development database.');
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
      '='.repeat(50),
      ...validation.errors,
      '='.repeat(50),
      'Application startup aborted to prevent data corruption.',
      'Please fix the DATABASE_URL configuration and restart.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log successful validation
  if (validation.currentDatabase) {
    console.log(
      `✅ Database validation passed: ${validation.currentDatabase.name} (${validation.actualEnvironment})`
    );
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
    projectId: validation.currentDatabase.projectId,
  };
}

/**
 * Validates database connection at startup with detailed reporting
 */
export async function validateStartupDatabase(): Promise<void> {
  try {
    console.log('🔍 Validating database environment configuration...');

    // FIRST: Validate DATABASE_URL format to catch auth issues early
    const urlValidation = validateDatabaseUrlFormat();

    if (!urlValidation.isValid) {
      console.error('\n' + '='.repeat(60));
      console.error('DATABASE_URL FORMAT VALIDATION FAILED');
      console.error('='.repeat(60));
      urlValidation.errors.forEach(err => console.error(`ERROR: ${err}`));
      console.error('='.repeat(60) + '\n');
      throw new Error(`Database URL validation failed: ${urlValidation.errors.join('; ')}`);
    }

    // Log warnings in debug mode
    if (urlValidation.warnings.length > 0 && process.env.DB_DEBUG === 'true') {
      console.warn('DATABASE_URL warnings:');
      urlValidation.warnings.forEach(warn => console.warn(`  WARNING: ${warn}`));
    }

    // Log parsed URL info in debug mode
    if (urlValidation.parsed && process.env.DB_DEBUG === 'true') {
      console.log('📊 DATABASE_URL parsed:');
      console.log(`   Username: ${urlValidation.parsed.username}`);
      console.log(`   Project ID: ${urlValidation.parsed.projectId || 'not found'}`);
      console.log(`   Host: ${urlValidation.parsed.host}`);
      console.log(`   Is Pooler: ${urlValidation.parsed.isPooler}`);
    }

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
