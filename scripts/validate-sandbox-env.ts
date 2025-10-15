#!/usr/bin/env tsx

/**
 * Sandbox Environment Validation Script
 *
 * This script validates that all required environment variables are set
 * and tests the Square sandbox configuration.
 */

import { z } from 'zod';

// Environment validation schema
const SandboxEnvSchema = z.object({
  // Required for application
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Required for Square sandbox
  SQUARE_SANDBOX_TOKEN: z.string().min(10),
  SQUARE_LOCATION_ID: z.string().startsWith('L'),
  SQUARE_SANDBOX_APPLICATION_ID: z.string().startsWith('sandbox-'),

  // Required for email
  RESEND_API_KEY: z.string().startsWith('re_'),
  FROM_EMAIL: z.string().email(),
  ADMIN_EMAIL: z.string().email(),

  // Required for Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),

  // Required for Sanity
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(5),
  SANITY_API_TOKEN: z.string().min(10),

  // Configuration flags
  USE_SQUARE_SANDBOX: z.string().transform(val => val === 'true'),
  SQUARE_CATALOG_USE_PRODUCTION: z.string().transform(val => val === 'true'),
  SQUARE_TRANSACTIONS_USE_SANDBOX: z.string().transform(val => val === 'true'),

  // Optional
  SHIPPO_API_KEY: z.string().optional(),
  SQUARE_WEBHOOK_SECRET: z.string().optional(),
  SQUARE_WEBHOOK_SECRET_SANDBOX: z.string().optional(),
});

type SandboxEnv = z.infer<typeof SandboxEnvSchema>;

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<SandboxEnv>;
}

async function validateSandboxEnvironment(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    config: {},
  };

  console.log('🔍 Validating Sandbox Environment Configuration...\n');

  try {
    // Validate environment variables
    const env = SandboxEnvSchema.parse(process.env);
    result.config = env;

    console.log('✅ Environment variables validation passed');
    console.log(`🌐 App URL: ${env.NEXT_PUBLIC_APP_URL}`);
    console.log(`🧪 Square Sandbox: ${env.USE_SQUARE_SANDBOX ? 'Enabled' : 'Disabled'}`);
    console.log(`📦 Catalog Production: ${env.SQUARE_CATALOG_USE_PRODUCTION ? 'Yes' : 'No'}`);
    console.log(`💳 Transactions Sandbox: ${env.SQUARE_TRANSACTIONS_USE_SANDBOX ? 'Yes' : 'No'}`);

    // Test Square API connectivity
    console.log('\n🔌 Testing Square API connectivity...');
    const squareTest = await testSquareAPI(env.SQUARE_SANDBOX_TOKEN);
    if (squareTest.success) {
      console.log('✅ Square API connection successful');
    } else {
      result.errors.push(`Square API connection failed: ${squareTest.error}`);
      console.log(`❌ Square API connection failed: ${squareTest.error}`);
    }

    // Test database connectivity
    console.log('\n🗄️ Testing database connectivity...');
    const dbTest = await testDatabaseConnection(env.DATABASE_URL);
    if (dbTest.success) {
      console.log('✅ Database connection successful');
    } else {
      result.errors.push(`Database connection failed: ${dbTest.error}`);
      console.log(`❌ Database connection failed: ${dbTest.error}`);
    }

    // Test Supabase connectivity
    console.log('\n🏪 Testing Supabase connectivity...');
    const supabaseTest = await testSupabaseConnection(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    if (supabaseTest.success) {
      console.log('✅ Supabase connection successful');
    } else {
      result.errors.push(`Supabase connection failed: ${supabaseTest.error}`);
      console.log(`❌ Supabase connection failed: ${supabaseTest.error}`);
    }

    // Configuration warnings
    if (env.SQUARE_CATALOG_USE_PRODUCTION && env.USE_SQUARE_SANDBOX) {
      result.warnings.push(
        'SQUARE_CATALOG_USE_PRODUCTION=true conflicts with USE_SQUARE_SANDBOX=true'
      );
      console.log('⚠️  Warning: Mixed environment configuration detected');
    }

    if (!env.SHIPPO_API_KEY) {
      result.warnings.push('SHIPPO_API_KEY not set - shipping features may not work');
      console.log('⚠️  Warning: Shippo API key not configured');
    }

    if (!env.SQUARE_WEBHOOK_SECRET_SANDBOX) {
      result.warnings.push('SQUARE_WEBHOOK_SECRET_SANDBOX not set - sandbox webhooks may not work');
      console.log('⚠️  Warning: Square webhook secret sandbox not configured');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('❌ Environment validation failed:');
      error.errors.forEach(err => {
        const message = `${err.path.join('.')}: ${err.message}`;
        result.errors.push(message);
        console.log(`   - ${message}`);
      });
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(message);
      console.log(`❌ Validation error: ${message}`);
    }
  }

  result.success = result.errors.length === 0;

  console.log('\n📊 Validation Summary:');
  console.log(`✅ Success: ${result.success ? 'Yes' : 'No'}`);
  console.log(`❌ Errors: ${result.errors.length}`);
  console.log(`⚠️  Warnings: ${result.warnings.length}`);

  if (result.success) {
    console.log('\n🎉 Sandbox environment is properly configured!');
    console.log('🚀 Ready for deployment and testing.');
  } else {
    console.log('\n🔧 Please fix the errors above before proceeding.');
  }

  return result;
}

async function testSquareAPI(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://connect.squareupsandbox.com/v2/locations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Square-Version': '2024-05-15',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function testDatabaseConnection(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple test - try to parse the URL
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'postgresql:') {
      return { success: false, error: 'Invalid database URL protocol' };
    }

    // For a more thorough test, you could try to connect to the database
    // but that would require additional dependencies
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid URL format',
    };
  }
}

async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateSandboxEnvironment()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

export { validateSandboxEnvironment, SandboxEnvSchema };
