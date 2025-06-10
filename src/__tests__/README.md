# Testing Infrastructure Documentation

## Overview

This directory contains comprehensive testing infrastructure for the Destino SF application, including unit tests, integration tests, and testing utilities.

## Structure

```
src/__tests__/
├── README.md                 # This documentation
├── setup/                    # Test configuration and setup
│   ├── test-db.ts           # Database setup and seeding
│   └── mocks.ts             # External service mocks
├── fixtures/                 # Test data fixtures
│   └── index.ts             # Mock data and scenarios
├── utils/                    # Testing utilities
│   └── test-helpers.ts      # Helper functions for tests
├── integration/              # Integration test suites
│   ├── ordering-flow.test.ts # Complete ordering flow tests
│   └── admin-workflow.test.ts # Admin management tests
├── components/               # Component unit tests
├── utils/                    # Utility function tests
├── lib/                      # Library function tests
└── run-integration-tests.ts  # Test runner script
```

## Test Categories

### 1. Unit Tests
- Component testing with React Testing Library
- Utility function testing
- Individual function and class testing
- Located in respective directories (components/, utils/, lib/)

### 2. Integration Tests
- Complete user flow testing
- Database integration testing
- External service integration
- End-to-end workflow validation

## Setup and Configuration

### Test Database Setup

The test infrastructure uses a separate PostgreSQL database for integration tests:

```typescript
// Automatically creates/manages test database
import { setupTestDatabase, resetTestDatabase } from './setup/test-db';

// In your tests
beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(); // Clean state between tests
});
```

### Mock Services

All external services are mocked for consistent testing:

```typescript
import { setupAllMocks } from './setup/mocks';

// Provides mocks for:
const mocks = setupAllMocks();
// - Square API (payments, orders, catalog)
// - Supabase Auth
// - Sanity CMS
// - Google Maps API
// - Email service (Resend)
// - Next.js Router
```

### Test Fixtures

Predefined test data for consistent testing:

```typescript
import { mockCartItems, mockAddresses, mockOrders } from './fixtures';

// Available fixtures:
// - mockCartItems: Sample cart items
// - mockAddresses: Various delivery addresses
// - mockOrders: Sample orders in different states
// - mockProducts: Test products
// - mockProfiles: User profiles
// - mockScenarios: Complete test scenarios
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Clear Jest cache
pnpm test:clear
```

### Integration Test Commands

```bash
# Run all integration tests
pnpm test:integration

# Run specific integration test suites
pnpm test:integration:ordering
pnpm test:integration:admin

# Run test setup/infrastructure tests
pnpm test:setup
```

### Manual Test Runner

```bash
# Run with custom setup
npx tsx src/__tests__/run-integration-tests.ts
```

## Writing Tests

### Integration Test Example

```typescript
import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { setupTestDatabase, resetTestDatabase } from '../setup/test-db';
import { setupAllMocks } from '../setup/mocks';
import { createMockCartItem, waitForApiCall } from '../utils/test-helpers';

describe('My Integration Test', () => {
  let testDb: any;
  let mocks: any;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    mocks = setupAllMocks();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    jest.clearAllMocks();
  });

  test('should complete user flow', async () => {
    // Arrange
    const testItem = createMockCartItem({
      name: 'Test Product',
      price: 15.99,
    });

    // Act
    const result = await waitForApiCall(
      someAsyncOperation(testItem)
    );

    // Assert
    expect(result).toBeDefined();
    expect(mocks.email.emails.send).toHaveBeenCalled();
  });
});
```

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../components/MyComponent';

describe('MyComponent', () => {
  test('should render and handle user interaction', async () => {
    const user = userEvent.setup();
    const mockHandler = jest.fn();

    render(<MyComponent onAction={mockHandler} />);

    const button = screen.getByRole('button', { name: /submit/i });
    await user.click(button);

    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## Test Utilities

### Helper Functions

```typescript
import {
  createMockCartItem,
  createMockAddress,
  calculateCartTotals,
  waitForApiCall,
  retryOperation,
  generateTestEmail,
} from './utils/test-helpers';

// Create test data
const item = createMockCartItem({ price: 12.99 });
const address = createMockAddress('nearby');
const totals = calculateCartTotals([item], address);

// Async operations
const result = await waitForApiCall(apiCall, 5000);
const retryResult = await retryOperation(operation, 3);

// Generate test data
const email = generateTestEmail('customer');
```

### Validation Helpers

```typescript
import {
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  meetsMinimumOrder,
} from './utils/test-helpers';

// Validate data
expect(isValidEmail('test@example.com')).toBe(true);
expect(isValidPhone('+14155551234')).toBe(true);
expect(meetsMinimumOrder(items, address)).toBe(true);
```

## Testing Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 2. Descriptive Tests
- Use clear, descriptive test names
- Follow the "should do X when Y" pattern
- Group related tests with `describe` blocks

### 3. Comprehensive Coverage
- Test happy paths and edge cases
- Test error conditions
- Test user interactions
- Test async operations

### 4. Mock External Dependencies
- Always mock external APIs
- Use consistent mock data
- Verify mock interactions

### 5. Database Testing
- Use test database only
- Reset state between tests
- Seed with consistent test data

## Environment Variables

Required for testing:

```env
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost:5432/destino_sf_test
SQUARE_ACCESS_TOKEN=sandbox_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Verify DATABASE_URL is correct
   - Check database permissions

2. **Mock Not Working**
   - Ensure mocks are set up in `beforeEach`
   - Check mock function names match actual API
   - Verify jest.clearAllMocks() is called

3. **Async Test Failures**
   - Use `waitForApiCall` for timeouts
   - Properly await async operations
   - Check for race conditions

4. **Test Data Conflicts**
   - Ensure unique test data
   - Reset database between tests
   - Use dynamic test IDs

### Debugging Tests

```bash
# Run single test file
pnpm test ordering-flow.test.ts

# Run with verbose output
pnpm test --verbose

# Run specific test
pnpm test --testNamePattern="should complete order flow"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

The test suite is designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    pnpm install
    pnpm test:coverage
    pnpm test:integration

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Add appropriate documentation
3. Ensure tests are deterministic
4. Include both positive and negative test cases
5. Update this README if adding new test categories

## Performance Considerations

- Integration tests run with `--runInBand` for database consistency
- Use `waitForApiCall` with appropriate timeouts
- Mock external services to avoid network delays
- Clean up test data to prevent memory leaks

## Security Considerations

- Never commit real API keys or passwords
- Use test-specific credentials only
- Isolate test data from production
- Sanitize any logged test data 