/**
 * Database Connection Diagnostics
 *
 * Provides detailed analysis of database connection issues.
 * Use this to troubleshoot "Tenant or user not found" and other connection errors.
 */

import {
  validateDatabaseUrlFormat,
  type DatabaseUrlValidation,
} from './db-environment-validator';

export interface ConnectionDiagnostics {
  timestamp: string;
  environment: string;
  urlValidation: DatabaseUrlValidation;
  connectionTest: {
    attempted: boolean;
    connected: boolean;
    latencyMs: number | null;
    error: string | null;
    errorType: 'authentication' | 'connection' | 'timeout' | 'unknown' | null;
  };
  recommendations: string[];
}

/**
 * Run comprehensive database connection diagnostics
 */
export async function runConnectionDiagnostics(): Promise<ConnectionDiagnostics> {
  const diagnostics: ConnectionDiagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    urlValidation: validateDatabaseUrlFormat(),
    connectionTest: {
      attempted: false,
      connected: false,
      latencyMs: null,
      error: null,
      errorType: null,
    },
    recommendations: [],
  };

  // Add recommendations based on URL validation
  if (!diagnostics.urlValidation.isValid) {
    diagnostics.recommendations.push('Fix DATABASE_URL format before attempting connection');
    diagnostics.urlValidation.errors.forEach(err => {
      diagnostics.recommendations.push(err);
    });
    return diagnostics;
  }

  // Add warnings as recommendations
  diagnostics.urlValidation.warnings.forEach(warn => {
    diagnostics.recommendations.push(warn);
  });

  // Attempt connection test
  diagnostics.connectionTest.attempted = true;
  const startTime = Date.now();

  try {
    const { PrismaClient } = await import('@prisma/client');
    const testClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
      log: [],
    });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000);
    });

    await Promise.race([testClient.$connect(), timeout]);
    await Promise.race([testClient.$queryRaw`SELECT 1 as health_check`, timeout]);

    diagnostics.connectionTest.connected = true;
    diagnostics.connectionTest.latencyMs = Date.now() - startTime;

    await testClient.$disconnect();
  } catch (error: unknown) {
    diagnostics.connectionTest.latencyMs = Date.now() - startTime;
    diagnostics.connectionTest.error = (error as Error).message;

    const message = (error as Error).message.toLowerCase();

    if (message.includes('tenant or user not found') || message.includes('authentication')) {
      diagnostics.connectionTest.errorType = 'authentication';
      diagnostics.recommendations.push(
        'CRITICAL: Authentication failed. Check DATABASE_URL username format.'
      );
      diagnostics.recommendations.push(
        'Username must be "postgres.PROJECT_ID" for Supabase pooler connections.'
      );
      diagnostics.recommendations.push(
        'Valid project IDs: drrejylrcjbeldnzodjd (dev), ocusztulyiegeawqptrs (prod)'
      );
    } else if (message.includes('timeout')) {
      diagnostics.connectionTest.errorType = 'timeout';
      diagnostics.recommendations.push('Connection timed out. Check network connectivity.');
      diagnostics.recommendations.push('Verify Supabase project is active and not paused.');
    } else if (message.includes("can't reach") || message.includes('econnrefused')) {
      diagnostics.connectionTest.errorType = 'connection';
      diagnostics.recommendations.push('Cannot reach database server.');
      diagnostics.recommendations.push('Check Supabase status at status.supabase.com');
    } else {
      diagnostics.connectionTest.errorType = 'unknown';
      diagnostics.recommendations.push(`Unknown error: ${(error as Error).message}`);
    }
  }

  return diagnostics;
}

/**
 * Format diagnostics report as a string for logging
 */
export function formatDiagnosticsReport(diagnostics: ConnectionDiagnostics): string {
  const lines: string[] = [
    '='.repeat(60),
    'DATABASE CONNECTION DIAGNOSTICS',
    '='.repeat(60),
    '',
    `Timestamp: ${diagnostics.timestamp}`,
    `Environment: ${diagnostics.environment}`,
    '',
    '--- URL Validation ---',
    `Valid: ${diagnostics.urlValidation.isValid}`,
  ];

  if (diagnostics.urlValidation.parsed) {
    lines.push(`Host: ${diagnostics.urlValidation.parsed.host}`);
    lines.push(`Project ID: ${diagnostics.urlValidation.parsed.projectId || 'NOT FOUND'}`);
    lines.push(`Is Pooler: ${diagnostics.urlValidation.parsed.isPooler}`);
    lines.push(`Has pgbouncer: ${diagnostics.urlValidation.parsed.hasPgBouncer}`);
  }

  if (diagnostics.urlValidation.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    diagnostics.urlValidation.errors.forEach(e => lines.push(`  - ${e}`));
  }

  lines.push('');
  lines.push('--- Connection Test ---');
  lines.push(`Attempted: ${diagnostics.connectionTest.attempted}`);
  lines.push(`Connected: ${diagnostics.connectionTest.connected}`);

  if (diagnostics.connectionTest.latencyMs !== null) {
    lines.push(`Latency: ${diagnostics.connectionTest.latencyMs}ms`);
  }

  if (diagnostics.connectionTest.error) {
    lines.push(`Error Type: ${diagnostics.connectionTest.errorType}`);
    lines.push(`Error: ${diagnostics.connectionTest.error}`);
  }

  if (diagnostics.recommendations.length > 0) {
    lines.push('');
    lines.push('--- Recommendations ---');
    diagnostics.recommendations.forEach(r => lines.push(`  - ${r}`));
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Quick check if DATABASE_URL appears valid without full connection test
 */
export function quickDatabaseUrlCheck(): {
  valid: boolean;
  projectId: string | null;
  issues: string[];
} {
  const validation = validateDatabaseUrlFormat();

  return {
    valid: validation.isValid,
    projectId: validation.parsed?.projectId || null,
    issues: [...validation.errors, ...validation.warnings],
  };
}
