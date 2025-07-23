import { cleanupTestDatabase } from './database-setup';

async function globalTeardown() {
  console.log('🧹 Starting global teardown for Destino SF E2E tests...');

  // Cleanup test database
  try {
    await cleanupTestDatabase();
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
