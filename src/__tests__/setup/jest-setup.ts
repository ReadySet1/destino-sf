// Jest setup for database tests - Phase 2 QA Implementation
import { setupTestDatabase, teardownTestDatabase, cleanupTestData, resetTestDatabase } from './test-db';

// Global test database setup
beforeAll(async () => {
  console.log('🚀 Setting up test database for Jest suite...');
  await setupTestDatabase();
}, 30000); // 30 second timeout for database setup

// Clean up between tests to ensure isolation
beforeEach(async () => {
  await cleanupTestData();
}, 10000); // 10 second timeout for cleanup

// Global teardown
afterAll(async () => {
  console.log('🧹 Tearing down test database...');
  await teardownTestDatabase();
}, 10000); // 10 second timeout for teardown

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set longer timeout for database operations
jest.setTimeout(30000);
