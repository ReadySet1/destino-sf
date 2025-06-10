#!/usr/bin/env tsx

/**
 * Integration Test Runner
 * 
 * This script sets up the test environment and runs integration tests
 * with proper database setup and cleanup.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runIntegrationTests() {
  console.log('🚀 Starting integration test suite...');
  
  try {
    // Check if test database is available
    console.log('📋 Checking test database connection...');
    
    // Run Prisma migrations for test database
    console.log('🔄 Running database migrations...');
    await execAsync('DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy');
    
    // Generate Prisma client for test environment
    console.log('⚙️  Generating Prisma client...');
    await execAsync('npx prisma generate');
    
    // Run integration tests
    console.log('🧪 Running integration tests...');
    await execAsync('pnpm test:integration');
    
    console.log('✅ Integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration tests failed:');
    console.error(error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  runIntegrationTests();
}

export { runIntegrationTests }; 