import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Production-safe debug endpoint for Square API token issues
 * This endpoint safely analyzes token configuration without exposing sensitive data
 */
export async function GET() {
  try {
    // Token validation functions
    function sanitizeToken(token: string): string {
      if (!token) return '';
      // Remove any whitespace, newlines, or invisible characters
      return token.trim().replace(/[\r\n\t\s]/g, '');
    }

    function validateToken(token: string): boolean {
      if (!token) return false;
      // Square tokens should be alphanumeric with hyphens and underscores
      const tokenPattern = /^[A-Za-z0-9_-]+$/;
      return tokenPattern.test(token);
    }

    function analyzeToken(token: string | undefined, tokenName: string) {
      if (!token) {
        return {
          name: tokenName,
          exists: false,
          length: 0,
          isValid: false,
          hasInvalidChars: false,
          preview: 'NOT_SET',
        };
      }

      const original = token;
      const sanitized = sanitizeToken(token);
      const isValid = validateToken(sanitized);

      return {
        name: tokenName,
        exists: true,
        length: original.length,
        sanitizedLength: sanitized.length,
        isValid,
        hasInvalidChars: original.length !== sanitized.length,
        startsWithEAAA: original.startsWith('EAAA'),
        preview: original.substring(0, 8) + '...',
        invalidCharsFound: original.length !== sanitized.length ? 'YES' : 'NO',
      };
    }

    // Analyze all Square tokens
    const tokenAnalysis = {
      SQUARE_ACCESS_TOKEN: analyzeToken(process.env.SQUARE_ACCESS_TOKEN, 'SQUARE_ACCESS_TOKEN'),
      SQUARE_PRODUCTION_TOKEN: analyzeToken(
        process.env.SQUARE_PRODUCTION_TOKEN,
        'SQUARE_PRODUCTION_TOKEN'
      ),
      SQUARE_SANDBOX_TOKEN: analyzeToken(process.env.SQUARE_SANDBOX_TOKEN, 'SQUARE_SANDBOX_TOKEN'),
    };

    // Analyze environment configuration
    const envConfig = {
      NODE_ENV: process.env.NODE_ENV,
      USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
      SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
      SQUARE_CATALOG_USE_PRODUCTION: process.env.SQUARE_CATALOG_USE_PRODUCTION,
      SQUARE_TRANSACTIONS_USE_SANDBOX: process.env.SQUARE_TRANSACTIONS_USE_SANDBOX,
    };

    // Determine current token selection logic
    const forceCatalogProduction = process.env.SQUARE_CATALOG_USE_PRODUCTION === 'true';
    const forceTransactionSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';
    const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';

    let catalogEnvironment: 'sandbox' | 'production';
    let selectedToken: string | undefined;
    let tokenSource: string;

    if (forceCatalogProduction || (!useSandbox && !forceTransactionSandbox)) {
      catalogEnvironment = 'production';
      selectedToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
      tokenSource = process.env.SQUARE_PRODUCTION_TOKEN
        ? 'SQUARE_PRODUCTION_TOKEN'
        : 'SQUARE_ACCESS_TOKEN';
    } else {
      catalogEnvironment = 'sandbox';
      selectedToken = process.env.SQUARE_SANDBOX_TOKEN;
      tokenSource = 'SQUARE_SANDBOX_TOKEN';
    }

    const selectedTokenAnalysis = analyzeToken(selectedToken, tokenSource);

    // Configuration conflicts detection
    const conflicts = [];

    if (
      envConfig.USE_SQUARE_SANDBOX === 'true' &&
      envConfig.SQUARE_CATALOG_USE_PRODUCTION === 'true'
    ) {
      conflicts.push('USE_SQUARE_SANDBOX=true conflicts with SQUARE_CATALOG_USE_PRODUCTION=true');
    }

    if (
      envConfig.SQUARE_ENVIRONMENT === 'sandbox' &&
      envConfig.SQUARE_CATALOG_USE_PRODUCTION === 'true'
    ) {
      conflicts.push(
        'SQUARE_ENVIRONMENT=sandbox conflicts with SQUARE_CATALOG_USE_PRODUCTION=true'
      );
    }

    // Recommended fixes
    const recommendations = [];

    if (selectedTokenAnalysis.hasInvalidChars) {
      recommendations.push(
        `Token ${tokenSource} contains invalid characters - regenerate this token in Square Dashboard`
      );
    }

    if (!selectedTokenAnalysis.isValid) {
      recommendations.push(
        `Token ${tokenSource} has invalid format - verify it's a valid Square API token`
      );
    }

    if (conflicts.length > 0) {
      recommendations.push(
        'Fix environment variable conflicts - set USE_SQUARE_SANDBOX=false for production catalog operations'
      );
    }

    if (!selectedTokenAnalysis.exists) {
      recommendations.push(
        `Missing token: ${tokenSource} - add this token to your environment variables`
      );
    }

    return NextResponse.json({
      status: 'analysis_complete',
      timestamp: new Date().toISOString(),
      environment: {
        deployment: process.env.NODE_ENV,
        ...envConfig,
      },
      tokenAnalysis,
      selectedToken: {
        environment: catalogEnvironment,
        source: tokenSource,
        ...selectedTokenAnalysis,
      },
      conflicts,
      recommendations,
      nextSteps:
        recommendations.length === 0
          ? [
              'Configuration appears correct',
              'Test Square API connection',
              'Check network connectivity',
            ]
          : [
              'Fix the issues listed in recommendations',
              'Update environment variables in Vercel',
              'Redeploy and test',
            ],
    });
  } catch (error) {
    logger.error('Error in Square production debug:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
