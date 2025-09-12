/**
 * Vercel Production Database Connection Fix
 * 
 * This module provides Vercel-specific optimizations to ensure
 * database connections work reliably in production deployment.
 */

import { prisma } from './db-unified';

/**
 * Check if we're running in Vercel production environment
 */
export function isVercelProduction(): boolean {
  return (
    process.env.VERCEL === '1' && 
    process.env.VERCEL_ENV === 'production' &&
    process.env.NODE_ENV === 'production'
  );
}

/**
 * Check if we're running in Vercel development/preview
 */
export function isVercelPreview(): boolean {
  return (
    process.env.VERCEL === '1' && 
    (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development')
  );
}

/**
 * Get appropriate database configuration for Vercel environment
 */
export function getVercelDatabaseConfig() {
  if (isVercelProduction()) {
    return {
      connectionTimeout: 30000,
      queryTimeout: 60000,
      retryAttempts: 3,
      fallbackEnabled: false,
      logLevel: 'error'
    };
  }
  
  if (isVercelPreview()) {
    return {
      connectionTimeout: 20000,
      queryTimeout: 30000,
      retryAttempts: 2,
      fallbackEnabled: false,
      logLevel: 'warn'
    };
  }
  
  // Local development
  return {
    connectionTimeout: 15000,
    queryTimeout: 15000,
    retryAttempts: 2,
    fallbackEnabled: true,
    logLevel: 'info'
  };
}

/**
 * Enhanced database operation wrapper for Vercel production
 */
export async function withVercelOptimization<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback?: T
): Promise<T> {
  const config = getVercelDatabaseConfig();
  
  // Enhanced logging for production debugging
  if (isVercelProduction() || process.env.DB_DEBUG === 'true') {
    console.log(`[VERCEL-OPT] Starting ${operationName}`, {
      isVercelProduction: isVercelProduction(),
      isVercelPreview: isVercelPreview(),
      config
    });
  }
  
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operationName} timeout after ${config.connectionTimeout / 1000}s (attempt ${attempt})`));
        }, config.connectionTimeout);
      });
      
      // Race the operation against timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      if (isVercelProduction() || process.env.DB_DEBUG === 'true') {
        console.log(`[VERCEL-OPT] ✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      const isConnectionError = errorMessage.includes('timeout') || 
                               errorMessage.includes('connection') ||
                               errorMessage.includes('ECONNRESET') ||
                               errorMessage.includes('ENOTFOUND');
      
      console.warn(`[VERCEL-OPT] ❌ ${operationName} failed on attempt ${attempt}: ${errorMessage}`);
      
      // If this is the last attempt or not a connection error, throw or return fallback
      if (attempt === config.retryAttempts || !isConnectionError) {
        if (fallback !== undefined && config.fallbackEnabled) {
          console.log(`[VERCEL-OPT] 🔄 Using fallback for ${operationName}`);
          return fallback;
        }
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[VERCEL-OPT] ⏳ Retrying ${operationName} in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`${operationName} failed after ${config.retryAttempts} attempts`);
}

/**
 * Database health check optimized for Vercel
 */
export async function checkVercelDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  environment: string;
  error?: string;
}> {
  const start = Date.now();
  const environment = isVercelProduction() ? 'production' : 
                     isVercelPreview() ? 'preview' : 'local';
  
  try {
    await withVercelOptimization(
      () => prisma.$queryRaw`SELECT 1 as health_check`,
      'health-check'
    );
    
    return {
      healthy: true,
      latency: Date.now() - start,
      environment
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      environment,
      error: (error as Error).message
    };
  }
}
