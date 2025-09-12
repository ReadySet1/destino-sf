/**
 * Build-time utility functions to handle database access during Vercel builds
 */

/**
 * Detects if we're currently in a build environment where database access
 * might not be available (e.g., Vercel build phase)
 */
export function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-production-server' ||
    // Only during CI builds, not production runtime
    (process.env.CI === 'true' && !process.env.VERCEL_ENV) ||
    // Vercel build phase specifically
    (process.env.VERCEL === '1' && process.env.VERCEL_ENV === undefined)
  );
}

/**
 * Safely executes a database operation with build-time detection
 * Returns fallback data during build time, attempts database operation during runtime
 */
export async function safeBuildTimeOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  operationName: string = 'database operation'
): Promise<T> {
  const isActualBuildTime = isBuildTime();
  
  // Debug logging for production troubleshooting
  if (process.env.NODE_ENV === 'production' || process.env.DB_DEBUG === 'true') {
    console.log(`[BUILD-TIME-CHECK] ${operationName}:`, {
      isBuildTime: isActualBuildTime,
      NEXT_PHASE: process.env.NEXT_PHASE,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI
    });
  }
  
  if (isActualBuildTime) {
    console.log(`🔧 Build-time detected: Using fallback for ${operationName}`);
    return fallback;
  }

  try {
    // Enhanced timeout for production database operations
    const timeoutMs = process.env.NODE_ENV === 'production' ? 30000 : 15000;
    const operationPromise = operation();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timeout after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });

    const result = await Promise.race([operationPromise, timeoutPromise]);
    console.log(`✅ ${operationName} completed successfully`);
    return result;
  } catch (error) {
    console.error(`Failed ${operationName}:`, error);
    console.log(`🔄 Using fallback for ${operationName}`);
    return fallback;
  }
}

/**
 * Build-time safe generateStaticParams wrapper
 */
export async function safeBuildTimeStaticParams<T>(
  databaseOperation: () => Promise<T[]>,
  fallbackParams: T[],
  operationName: string = 'generateStaticParams'
): Promise<T[]> {
  return safeBuildTimeOperation(
    databaseOperation,
    fallbackParams,
    operationName
  );
}
