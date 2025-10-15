/**
 * Legacy database client (DEPRECATED)
 *
 * This file is maintained for backward compatibility only.
 * For new code, use @/lib/db-unified instead.
 *
 * This file now simply re-exports the unified client to prevent
 * dual initialization conflicts that were causing connection issues.
 */

import { validateDatabaseEnvironment } from './db-environment-validator';

// Validate database environment before initialization (skip during build/tests)
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-development-build' ||
  process.env.NODE_ENV === 'test';

if (!isBuildPhase) {
  try {
    const validation = validateDatabaseEnvironment();
    if (!validation.isValid) {
      console.error('🚨 Database environment validation failed:', validation.errors);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Critical database configuration error: ${validation.errors.join(', ')}`);
      }
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => console.warn(warning));
    }
  } catch (error) {
    console.error('Database environment validation error:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

// Import and re-export everything from the unified client
import { getHealthStatus as getHealthStatusInternal } from './db-unified';

export {
  prisma,
  withRetry,
  withWebhookRetry,
  withTransaction,
  ensureConnection,
  getHealthStatus,
  checkConnection,
  shutdown,
  forceResetConnection,
} from './db-unified';

// Legacy aliases for backward compatibility
export {
  prisma as unifiedPrisma,
  withRetry as unifiedWithRetry,
  withTransaction as unifiedWithTransaction,
  ensureConnection as unifiedEnsureConnection,
  checkConnection as unifiedCheckConnection,

  // Legacy exports for existing code
  prisma as db,
  withRetry as executeWithConnectionManagement,
  withRetry as withConnectionManagement,
  withRetry as withPreparedStatementHandling,
  withRetry as simpleWithRetry,
} from './db-unified';

// Legacy functions for backward compatibility (now using unified client)
export async function forceRegenerateClient(): Promise<void> {
  console.log('forceRegenerateClient is deprecated - use unified client auto-reconnection instead');
}

export async function initializeDatabase(): Promise<void> {
  console.log(
    'initializeDatabase is deprecated - unified client handles initialization automatically'
  );
}

export async function startupDatabase(): Promise<void> {
  console.log('startupDatabase is deprecated - unified client handles startup automatically');
}

export async function cleanupForServerless(): Promise<void> {
  console.log('cleanupForServerless is deprecated - unified client handles cleanup automatically');
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latency: number;
  error?: string;
}> {
  const health = await getHealthStatusInternal();
  return {
    connected: health.connected,
    latency: health.latency,
    error: health.error,
  };
}
