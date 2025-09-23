/**
 * 🌍 Global Test Setup
 * Runs once before all test suites start
 */

import { setupTestDatabase } from './test-db';

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Ensure test environment
    process.env.NODE_ENV = 'test';
    process.env.SKIP_ENV_VALIDATION = 'true';
    
    // Setup test database
    await setupTestDatabase();
    
    console.log('✅ Global test setup complete');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    process.exit(1);
  }
}
