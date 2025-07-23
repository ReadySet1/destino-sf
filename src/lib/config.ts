/**
 * Application Configuration
 *
 * Centralizes configuration management to prevent scattered env variable access
 * and improves type safety for configuration values.
 */

import { logger } from '../utils/logger';

export interface AppConfig {
  square: {
    environment: 'sandbox' | 'production';
    accessToken: string;
    applicationId?: string;
    apiHost: string;
    useSandbox: boolean;
  };
  database: {
    url: string;
  };
  app: {
    environment: 'development' | 'production' | 'test';
    isProduction: boolean;
    isBuildTime: boolean;
  };
}

// Determine if we're in a build context
const isBuildTime =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE === 'phase-production-build';

// Determine Square-specific configurations
const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
const squareAccessToken = useSandbox
  ? process.env.SQUARE_SANDBOX_TOKEN
  : process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;

// Centralized configuration object
export const config: AppConfig = {
  square: {
    environment: useSandbox ? 'sandbox' : 'production',
    accessToken: squareAccessToken || '',
    applicationId: process.env.SQUARE_APPLICATION_ID,
    apiHost: useSandbox ? 'sandbox.squareup.com' : 'connect.squareup.com',
    useSandbox,
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  app: {
    environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isBuildTime,
  },
};

/**
 * Validates critical configuration parameters
 * @throws Error if required configuration is missing
 */
export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.square.accessToken && !config.app.isBuildTime) {
    errors.push('Square access token is required');
  }

  if (!config.database.url) {
    errors.push('Database URL is required');
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed: ${errors.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  return true;
};

/**
 * Returns a safe copy of the configuration, suitable for client-side use
 * with sensitive values removed
 */
export const getPublicConfig = (): Partial<AppConfig> => {
  return {
    square: {
      environment: config.square.environment,
      applicationId: config.square.applicationId,
      apiHost: config.square.apiHost,
      useSandbox: config.square.useSandbox,
      // Omit accessToken and other sensitive data
      accessToken: '',
    },
    app: {
      environment: config.app.environment,
      isProduction: config.app.isProduction,
      isBuildTime: config.app.isBuildTime,
    },
  };
};
