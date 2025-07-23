// Integration DB setup for Jest tests
import './database-mocks';

// Configure environment for integration tests using Object.assign to avoid readonly issues
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/destino_sf_test',
});

// Extend timeout for integration tests
jest.setTimeout(30000);

console.log('Integration DB setup loaded');
