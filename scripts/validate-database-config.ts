#!/usr/bin/env ts-node

/**
 * Database Configuration Validation Script
 *
 * This script validates that the database configuration is correct for the current environment.
 * Run this script before deploying or when troubleshooting database connection issues.
 *
 * Usage:
 *   npx ts-node scripts/validate-database-config.ts
 *   or
 *   pnpm exec ts-node scripts/validate-database-config.ts
 */

import { config } from 'dotenv';
import {
  validateStartupDatabase,
  getDatabaseInfo,
  validateDatabaseEnvironment,
} from '../src/lib/db-environment-validator';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  console.log('🔍 Database Configuration Validation');
  console.log('='.repeat(60));

  try {
    // Basic environment info
    console.log('📋 Environment Information:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   VERCEL: ${process.env.VERCEL || 'not set'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);
    console.log();

    // Validate database environment
    console.log('🔧 Database Environment Validation:');
    const validation = validateDatabaseEnvironment();

    if (validation.isValid) {
      console.log('✅ Database environment validation passed');
    } else {
      console.log('❌ Database environment validation failed');
      validation.errors.forEach(error => console.log(`   Error: ${error}`));
    }

    validation.warnings.forEach(warning => console.log(`   Warning: ${warning}`));
    console.log();

    // Database information
    const dbInfo = getDatabaseInfo();
    if (dbInfo) {
      console.log('📊 Database Configuration:');
      console.log(`   Environment: ${dbInfo.environment}`);
      console.log(`   Database Name: ${dbInfo.databaseName}`);
      console.log(`   Host: ${dbInfo.host}`);
      console.log(`   Project ID: ${dbInfo.projectId}`);
      console.log();
    }

    // Test database connection
    console.log('🔌 Testing Database Connection:');
    await validateStartupDatabase();

    console.log();
    console.log('✅ All validations passed successfully!');
    console.log('🚀 Database is properly configured and accessible.');
  } catch (error) {
    console.error();
    console.error('❌ Validation failed:');
    console.error(error instanceof Error ? error.message : error);
    console.error();

    // Provide helpful suggestions
    console.log('💡 Troubleshooting Tips:');

    if (!process.env.DATABASE_URL) {
      console.log('   - Set the DATABASE_URL environment variable');
    } else if (error instanceof Error && error.message.includes('development database')) {
      console.log('   - Update DATABASE_URL to point to the production database:');
      console.log(
        '     postgresql://postgres:[PASSWORD]@db.ocusztulyiegeawqptrs.supabase.co:5432/postgres'
      );
    } else if (error instanceof Error && error.message.includes('production database')) {
      console.log('   - Update DATABASE_URL to point to the development database:');
      console.log(
        '     postgresql://postgres:[PASSWORD]@db.drrejylrcjbeldnzodjd.supabase.co:5432/postgres'
      );
    } else {
      console.log('   - Check your DATABASE_URL format');
      console.log('   - Verify database credentials');
      console.log('   - Ensure the database server is accessible');
      console.log('   - Check network connectivity');
    }

    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n\n🛑 Validation interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Validation terminated');
  process.exit(0);
});

// Run the validation
main().catch(error => {
  console.error('💥 Unexpected error during validation:', error);
  process.exit(1);
});
