import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Destino SF E2E tests...');
  
  // Ensure test environment variables are set
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
  }

  // Set test-specific environment variables using Object.assign to avoid readonly issues
  Object.assign(process.env, {
    NODE_ENV: 'test',
    NEXT_TELEMETRY_DISABLED: '1'
  });

  console.log('✅ Global setup completed');
}

export default globalSetup;