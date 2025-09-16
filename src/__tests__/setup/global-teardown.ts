/**
 * 🧹 Global Test Teardown
 * Runs once after all test suites complete
 */

import { disconnectTestDatabase } from './test-db';

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Disconnect from test database
    await disconnectTestDatabase();
    
    console.log('✅ Global test teardown complete');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
  }
}
