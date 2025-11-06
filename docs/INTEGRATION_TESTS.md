# Integration Tests Setup

**Related**: DES-76 - Fix Critical Path Test Failures

## Overview

Integration tests use a **REAL PostgreSQL database** (not mocks) to test actual database behavior including:
- Transaction isolation and pessimistic locking
- Database constraints (unique, foreign key)
- Complex queries with JOINs and aggregations
- Concurrent operations and race conditions

This approach ensures tests catch real-world database issues that mocks cannot simulate.

## Prerequisites

### Local Development

1. **PostgreSQL 15+** must be running
2. **Test database** must exist

```bash
# Install PostgreSQL (if not already installed)
brew install postgresql@15  # macOS
# or
sudo apt-get install postgresql-15  # Linux

# Start PostgreSQL
brew services start postgresql@15  # macOS
# or
sudo systemctl start postgresql  # Linux

# Create test database
createdb test_db

# Or using psql
psql -U postgres -c "CREATE DATABASE test_db;"
```

### Environment Variables

Set the test database URL in your environment:

```bash
# Add to .env.local or .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test_db"
```

Or export it:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test_db"
```

### CI/CD (GitHub Actions)

CI is already configured with PostgreSQL service in `.github/workflows/pre-deployment.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: destino_sf_test
```

## Test Configuration

### Jest Projects

We have **3 Jest projects**:

1. **`integration`** - Uses REAL database for integration/concurrency tests
   - Setup: `jest.setup.integration.js` (NO Prisma mocks)
   - Directories: `src/__tests__/integration/`, `src/__tests__/concurrency/`
   - Database cleanup between tests

2. **`node`** - Uses MOCKS for unit tests
   - Setup: `jest.setup.enhanced.js` (WITH Prisma mocks)
   - Directories: All other test files (excluding integration/concurrency)
   - Fast, no database needed

3. **`jsdom`** - React component tests
   - Setup: `jest.setup.enhanced.js`
   - Directories: `*.test.tsx` files

### Running Tests

```bash
# Run ALL critical tests (unit + integration)
pnpm test:critical

# Run ONLY integration tests
jest --selectProjects integration

# Run ONLY unit tests
jest --selectProjects node

# Run specific integration test file
jest --selectProjects integration src/__tests__/integration/checkout-flow-concurrency.test.ts

# Run with verbose output
DEBUG_TESTS=true pnpm test:critical
```

## How It Works

### Database Lifecycle

```
┌─────────────────────────────────────┐
│ beforeAll: Setup database connection │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ beforeEach: Clean all tables        │  ← Ensures test isolation
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ Test 1: Create order, verify DB     │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ beforeEach: Clean all tables        │  ← Clean slate for test 2
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ Test 2: Concurrent operations       │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│ afterAll: Disconnect from database   │
└─────────────────────────────────────┘
```

### Database Cleanup

**Before each test**, all tables are truncated:

```typescript
beforeEach(async () => {
  await cleanDatabase(); // Truncates all tables
});
```

This ensures:
- ✅ Tests don't affect each other
- ✅ Each test starts with a clean database
- ✅ Tests can run in any order
- ✅ No leftover test data

### What's Mocked vs Real

**REAL (not mocked)**:
- ✅ Prisma Client
- ✅ PostgreSQL database
- ✅ Transactions and locking
- ✅ Database constraints
- ✅ Complex queries

**MOCKED (external services)**:
- ✅ Square API (payments, orders)
- ✅ Supabase Auth
- ✅ Resend (email)
- ✅ Upstash Redis
- ✅ Shippo (shipping)

This gives us the best of both worlds: real database behavior without hitting external APIs.

## Writing Integration Tests

### Example Test Structure

```typescript
describe('Payment Processing', () => {
  // Database is cleaned before each test automatically

  it('should process payment with transaction locking', async () => {
    // 1. Create test data
    const order = await prisma.order.create({
      data: {
        status: 'PENDING',
        total: 100.0,
        // ... other fields
      },
    });

    // 2. Test the actual code (uses real database)
    const result = await processPayment(order.id, 'card-nonce-123');

    // 3. Verify database state
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    expect(updatedOrder.status).toBe('PROCESSING');
    expect(updatedOrder.paymentStatus).toBe('PAID');
  });

  it('should prevent concurrent payments on same order', async () => {
    const order = await prisma.order.create({
      data: { status: 'PENDING', total: 100.0 },
    });

    // Test concurrent operations (uses real DB locking)
    const results = await Promise.allSettled([
      processPayment(order.id, 'nonce-1'),
      processPayment(order.id, 'nonce-2'),
      processPayment(order.id, 'nonce-3'),
    ]);

    // One should succeed, others should fail with lock error
    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBe(1);
  });
});
```

### Using Test Utilities

```typescript
import {
  cleanDatabase,
  createCommonTestData,
  countTableRows,
  waitForDatabaseOperation,
} from '@/__tests__/utils/database-test-utils';

// Clean specific tables (faster than cleaning all)
await cleanTables(['orders', 'order_items']);

// Create common test data
const { userId, productId } = await createCommonTestData();

// Count rows for verification
const orderCount = await countTableRows('orders');
expect(orderCount).toBe(1);

// Wait for async operation
await waitForDatabaseOperation(
  async () => {
    const order = await prisma.order.findUnique({ where: { id } });
    return order?.status === 'COMPLETED';
  },
  5000 // timeout
);
```

## Troubleshooting

### "Test database not accessible"

**Problem**: Can't connect to PostgreSQL

**Solutions**:
```bash
# 1. Check if PostgreSQL is running
pg_isready

# 2. Check if database exists
psql -U postgres -l | grep test_db

# 3. Create database if missing
createdb test_db

# 4. Verify DATABASE_URL
echo $DATABASE_URL

# 5. Test connection manually
psql $DATABASE_URL -c "SELECT 1"
```

### "Jest did not exit one second after the test run"

**Problem**: Database connections not closed properly

**Solution**: The `afterAll` hook should handle this, but if you see this:

```typescript
afterAll(async () => {
  await disconnectTestDatabase();
});
```

### "Tests are flaky / failing randomly"

**Problem**: Tests aren't properly isolated

**Solutions**:
1. Ensure `cleanDatabase()` runs before each test
2. Use `--runInBand` to run tests serially
3. Check for race conditions in test code
4. Verify database constraints are properly defined

### "Prisma schema out of sync"

**Problem**: Database schema doesn't match Prisma schema

**Solution**:
```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to test database
pnpm prisma db push --skip-generate --accept-data-loss

# Or reset everything
dropdb test_db && createdb test_db
pnpm prisma db push --skip-generate
```

## Performance Considerations

### Test Speed

- **Integration tests**: ~100-300ms per test (real database)
- **Unit tests**: ~5-20ms per test (mocks)

Integration tests are slower but catch real issues. Use both!

### Running Tests in Parallel

**DO NOT** run integration tests in parallel - they share a database!

```bash
# ✅ Correct (serial)
jest --selectProjects integration --runInBand

# ❌ Wrong (parallel - will cause conflicts)
jest --selectProjects integration --maxWorkers=4
```

Jest config already sets `maxWorkers: 1` for integration project.

### Cleanup Performance

For faster cleanup in tests that only use specific tables:

```typescript
beforeEach(async () => {
  // Instead of cleanDatabase() (cleans all tables)
  await cleanTables(['orders', 'order_items']); // Just what you need
});
```

## Migration from Mocks

If you're converting an existing test from mocks to real database:

### Before (with mocks)

```typescript
// jest.setup.enhanced.js provides mocked Prisma
describe('Order Creation', () => {
  it('creates order', async () => {
    const order = await prisma.order.create({ data: {...} });
    // Mock doesn't enforce constraints
    expect(order.id).toBeDefined();
  });
});
```

### After (with real database)

```typescript
// jest.setup.integration.js provides REAL Prisma
describe('Order Creation', () => {
  beforeEach(async () => {
    await cleanDatabase(); // Clean database before each test
  });

  it('creates order', async () => {
    const order = await prisma.order.create({ data: {...} });
    // Real database enforces constraints!
    expect(order.id).toBeDefined();

    // Can verify in database
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder).toEqual(order);
  });
});
```

## Best Practices

### ✅ DO

- Clean database between tests
- Test real database features (transactions, locking, constraints)
- Use integration tests for critical flows (payments, orders)
- Mock external APIs (Square, Supabase, email)
- Run integration tests serially (`--runInBand`)

### ❌ DON'T

- Use real external APIs in tests
- Run integration tests in parallel
- Forget to clean database between tests
- Test simple logic that doesn't need a database
- Skip unit tests in favor of only integration tests

## Related Files

- `jest.config.ts` - Jest configuration with 3 projects
- `jest.setup.integration.js` - Setup for integration tests (NO Prisma mocks)
- `jest.setup.enhanced.js` - Setup for unit tests (WITH Prisma mocks)
- `src/__tests__/utils/database-test-utils.ts` - Database utilities
- `.github/workflows/pre-deployment.yml` - CI configuration with PostgreSQL

## Further Reading

- [Jest Projects Configuration](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig)
- [Prisma Testing Best Practices](https://www.prisma.io/docs/guides/testing/integration-testing)
- [PostgreSQL Test Database Setup](https://www.postgresql.org/docs/current/app-createdb.html)

---

*Generated as part of DES-76 implementation*
