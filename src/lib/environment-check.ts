/**
 * Environment validation for webhook system
 * Ensures all required environment variables are present for the fixes to work
 */

export function validateWebhookEnvironment(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = ['DATABASE_URL', 'SQUARE_WEBHOOK_SECRET'];

  const optional = [
    'SQUARE_WEBHOOK_SECRET_SANDBOX',
    'DIRECT_DATABASE_URL',
    'CRON_SECRET',
    'NODE_ENV',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional but recommended variables
  for (const envVar of optional) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar} not set (optional but recommended)`);
    }
  }

  // Specific validations
  if (process.env.NODE_ENV === 'production' && !process.env.DIRECT_DATABASE_URL) {
    warnings.push('DIRECT_DATABASE_URL recommended for production database connections');
  }

  if (!process.env.CRON_SECRET) {
    warnings.push('CRON_SECRET not set - cron endpoints will be unprotected');
  }

  if (!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX) {
    warnings.push(
      'SQUARE_WEBHOOK_SECRET_SANDBOX not set - sandbox webhooks will use production secret'
    );
  }

  const valid = missing.length === 0;

  if (!valid) {
    console.error('❌ Missing required environment variables:', missing);
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Environment warnings:', warnings);
  }

  if (valid && warnings.length === 0) {
    console.log('✅ All webhook environment variables configured correctly');
  }

  return { valid, missing, warnings };
}

export function logWebhookEnvironmentStatus(): void {
  const status = validateWebhookEnvironment();

  console.log('\n🔧 Webhook System Environment Status:');
  console.log('=====================================');

  if (status.valid) {
    console.log('✅ Environment validation: PASSED');
  } else {
    console.log('❌ Environment validation: FAILED');
    console.log('Missing required variables:', status.missing);
  }

  if (status.warnings.length > 0) {
    console.log('⚠️ Warnings:', status.warnings.length);
    status.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`🔗 Database URL configured: ${!!process.env.DATABASE_URL}`);
  console.log(`🔐 Production webhook secret: ${!!process.env.SQUARE_WEBHOOK_SECRET}`);
  console.log(`🔐 Sandbox webhook secret: ${!!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX}`);
  console.log('=====================================\n');
}
