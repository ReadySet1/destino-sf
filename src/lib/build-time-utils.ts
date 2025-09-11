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
    (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') ||
    process.env.CI === 'true'
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
  if (isBuildTime()) {
    console.log(`🔧 Build-time detected: Using fallback for ${operationName}`);
    return fallback;
  }

  try {
    // Add timeout to prevent hanging during operations
    const operationPromise = operation();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timeout after 15 seconds`));
      }, 15000);
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
