/**
 * 🗄️ Test Database Setup for Jest
 * Runs before each test suite in the node environment
 */

import { resetTestDatabase, seedTestData } from './test-db';

// Setup environment for tests
beforeAll(async () => {
  // Ensure test environment
  process.env.NODE_ENV = 'test';
  process.env.SKIP_ENV_VALIDATION = 'true';
});

// Reset database before each test file
beforeEach(async () => {
  await resetTestDatabase();
  await seedTestData();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
