// Global database teardown for integration tests
module.exports = async () => {
  console.log('Tearing down test database...');

  // Clean up database connections and resources
  // Additional cleanup can be added here

  console.log('Test database teardown complete');
};
