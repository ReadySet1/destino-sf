/**
 * Safety checks for database sync operations.
 * These checks help prevent accidental data loss during sync operations.
 */

export interface SafetyCheckResult {
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SyncSafetyConfig {
  requireConfirmationFlag: boolean;
  confirmationFlag: string;
  minSourceProductsRequired: number;
  productionKeywords: string[];
}

export const DEFAULT_SYNC_SAFETY_CONFIG: SyncSafetyConfig = {
  requireConfirmationFlag: true,
  confirmationFlag: '--confirm-sync',
  minSourceProductsRequired: 1,
  productionKeywords: ['production', 'prod'],
};

/**
 * Check if the confirmation flag is present in command line arguments.
 */
export function checkConfirmationFlag(
  args: string[],
  config: SyncSafetyConfig = DEFAULT_SYNC_SAFETY_CONFIG
): SafetyCheckResult {
  if (!config.requireConfirmationFlag) {
    return { passed: true };
  }

  const hasConfirmation = args.includes(config.confirmationFlag);

  if (!hasConfirmation) {
    return {
      passed: false,
      error: 'Confirmation flag required',
      details: {
        requiredFlag: config.confirmationFlag,
        message: `This script will DELETE ALL products from the database before syncing. Run with ${config.confirmationFlag} to proceed.`,
      },
    };
  }

  return { passed: true };
}

/**
 * Check if the database URL appears to be a production database.
 */
export function checkNotProductionDatabase(
  databaseUrl: string | undefined,
  config: SyncSafetyConfig = DEFAULT_SYNC_SAFETY_CONFIG
): SafetyCheckResult {
  if (!databaseUrl) {
    return {
      passed: false,
      error: 'Database URL not provided',
      details: {
        message: 'DATABASE_URL environment variable is not set.',
      },
    };
  }

  const lowerUrl = databaseUrl.toLowerCase();
  const isProduction = config.productionKeywords.some(keyword =>
    lowerUrl.includes(keyword)
  );

  if (isProduction) {
    return {
      passed: false,
      error: 'Production environment detected',
      details: {
        message:
          'This script should NOT be run against a production database. Aborting to prevent data loss.',
        detectedKeywords: config.productionKeywords.filter(keyword =>
          lowerUrl.includes(keyword)
        ),
      },
    };
  }

  return { passed: true };
}

/**
 * Check if the source has enough products to proceed with sync.
 * This prevents syncing from an empty source which would delete all products.
 */
export function checkMinimumSourceProducts(
  sourceProductCount: number,
  config: SyncSafetyConfig = DEFAULT_SYNC_SAFETY_CONFIG
): SafetyCheckResult {
  if (sourceProductCount < config.minSourceProductsRequired) {
    return {
      passed: false,
      error: 'Insufficient source products',
      details: {
        sourceProductCount,
        minimumRequired: config.minSourceProductsRequired,
        message: `Source returned only ${sourceProductCount} products. Minimum required: ${config.minSourceProductsRequired}. This may indicate an API error or empty source.`,
      },
    };
  }

  return { passed: true };
}

/**
 * Run all safety checks for a sync operation.
 */
export function runAllSafetyChecks(params: {
  args: string[];
  databaseUrl: string | undefined;
  sourceProductCount: number;
  config?: SyncSafetyConfig;
}): SafetyCheckResult {
  const config = params.config || DEFAULT_SYNC_SAFETY_CONFIG;

  // Check 1: Confirmation flag
  const confirmationCheck = checkConfirmationFlag(params.args, config);
  if (!confirmationCheck.passed) {
    return confirmationCheck;
  }

  // Check 2: Not production database
  const productionCheck = checkNotProductionDatabase(params.databaseUrl, config);
  if (!productionCheck.passed) {
    return productionCheck;
  }

  // Check 3: Minimum source products
  const minProductsCheck = checkMinimumSourceProducts(
    params.sourceProductCount,
    config
  );
  if (!minProductsCheck.passed) {
    return minProductsCheck;
  }

  return { passed: true };
}
