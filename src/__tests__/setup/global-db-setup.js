// Global database setup for integration tests
module.exports = async () => {
  console.log('Setting up test database...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/destino_sf_test';
  
  // Additional global setup can be added here
  console.log('Test database setup complete');
}; 