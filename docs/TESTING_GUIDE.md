# Destino SF Testing Guide

Comprehensive guide to testing infrastructure, patterns, and best practices for the Destino SF project.

## Table of Contents

1. [Overview](#overview)
2. [Test Data Management](#test-data-management)
3. [Test Factories](#test-factories)
4. [Database Seeding](#database-seeding)
5. [Test Isolation](#test-isolation)
6. [Cleanup Utilities](#cleanup-utilities)
7. [Validation Utilities](#validation-utilities)
8. [Running Tests](#running-tests)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The Destino SF project uses a comprehensive testing infrastructure that ensures:
- **Predictable test data** using Faker.js factories
- **Test isolation** through transaction-based rollbacks
- **Clean state** through automated cleanup utilities
- **Data integrity** through validation utilities
- **Comprehensive coverage** across unit, integration, and E2E tests

### Test Types

- **Unit Tests**: Test individual functions and utilities (`src/__tests__/lib/`, `src/__tests__/utils/`)
- **Component Tests**: Test React components in isolation (`src/__tests__/components/`)
- **API Tests**: Test API route handlers (`src/__tests__/app/api/`)
- **Integration Tests**: Test database interactions and business logic
- **E2E Tests**: Test complete user flows using Playwright (`tests/e2e/`)

## Test Data Management

### Philosophy

Our test data management follows these principles:

1. **Predictable**: Test data is generated consistently using factories
2. **Isolated**: Each test starts with a clean slate
3. **Realistic**: Generated data mimics production data patterns
4. **Maintainable**: Centralized factories make updates easy
5. **Safe**: Cleanup utilities prevent test data pollution

### Test Data Lifecycle

```
┌──────────────────┐
│ Test Starts      │
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Setup Phase      │
│ - Seed database  │
│ - Create fixtures│
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Test Execution   │
│ - Generate data  │
│ - Run assertions │
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Cleanup Phase    │
│ - Rollback txn   │
│ - Clean records  │
└──────────────────┘
```

## Test Factories

Test factories generate realistic data using `@faker-js/faker`. All factories are located in `tests/factories/`.

### Available Factories

#### User Factory (`user.factory.ts`)

```typescript
import { buildUser, buildAdminUser, buildCustomerUser } from 'tests/factories';

// Generate a random user
const user = buildUser();

// Generate a customer user
const customer = buildCustomerUser({
  email: 'customer@example.com',
  firstName: 'John',
});

// Generate an admin user
const admin = buildAdminUser({
  email: 'admin@example.com',
});

// Generate multiple users
const users = buildUsers(5);

// Generate test user (predictable data)
const testUser = buildTestUser('-1');
```

#### Product Factory (`product.factory.ts`)

```typescript
import { buildProduct, buildEmpanada, buildAlfajor } from 'tests/factories';

// Generate a random product
const product = buildProduct();

// Generate an empanada
const empanada = buildEmpanada({
  name: 'Beef Empanada',
  price: 1700, // $17.00 in cents
});

// Generate an alfajor
const alfajor = buildAlfajor({
  name: 'Classic Alfajor',
  price: 1400, // $14.00 in cents
});

// Generate catering package
const cateringPackage = buildCateringPackage();

// Generate test product (predictable)
const testProduct = buildTestProduct('-1');
```

#### Order Factory (`order.factory.ts`)

```typescript
import { buildOrder, buildOrderWithItems, buildPendingOrder } from 'tests/factories';

// Generate a random order
const order = buildOrder();

// Generate a pending order
const pendingOrder = buildPendingOrder({
  customerEmail: 'customer@example.com',
});

// Generate order with items
const { order, items } = buildOrderWithItems({
  itemCount: 3,
  fulfillmentType: 'PICKUP',
});

// Generate test order (predictable)
const testOrder = buildTestOrder('-1');
```

#### Address Factory (`address.factory.ts`)

```typescript
import { buildAddress, buildSanFranciscoAddress } from 'tests/factories';

// Generate a random address
const address = buildAddress();

// Generate SF address
const sfAddress = buildSanFranciscoAddress();

// Generate address for specific zone
const addressForZone = buildAddressForZone('sf'); // 'sf' | 'south_bay' | 'peninsula' | 'nationwide'

// Generate test address (predictable)
const testAddress = buildTestAddress('-1');
```

#### Category Factory (`category.factory.ts`)

```typescript
import { buildCategory, buildDestinoCategories } from 'tests/factories';

// Generate a random category
const category = buildCategory();

// Generate standard Destino categories
const categories = buildDestinoCategories(); // Returns [empanadas, alfajores, catering, sauces]

// Generate empanadas category
const empanadasCat = buildEmpanadasCategory();
```

#### Payment Factory (`payment.factory.ts`)

```typescript
import { buildPayment, buildSquareTestCard } from 'tests/factories';

// Generate a payment
const payment = buildSuccessfulPayment({
  orderId: 'order-123',
  amount: 5000, // $50.00
});

// Generate Square test card
const testCard = buildSquareTestCard(); // Returns valid Square sandbox card
```

### Factory Options

All factories support partial options, allowing you to specify only the fields you care about:

```typescript
// Minimal options
const user = buildUser({ email: 'test@example.com' });

// All options
const user = buildUser({
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '(555) 123-4567',
  role: 'CUSTOMER',
});
```

## Database Seeding

### E2E Test Seeding

E2E tests use the `DatabaseSeeder` class for comprehensive database seeding.

```typescript
import { seedTestDatabase } from 'tests/e2e/setup/database-seeder';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed with all options
await seedTestDatabase(prisma, {
  includeUsers: true,      // Create test users
  includeProducts: true,   // Create products
  includeOrders: false,    // Skip orders
  minimal: false,          // Full product catalog
});

// Minimal seeding (just what's needed for tests)
await seedTestDatabase(prisma, {
  minimal: true,
});
```

### What Gets Seeded

**Categories:**
- Empanadas
- Alfajores
- Catering
- Sauces

**Users:**
- Test Customer (`test.user@example.com`)
- Test Admin (`admin@destinosf.com`)

**Products (Full Catalog):**
- Empanadas: Beef, Vegetarian, Huacatay Chicken
- Alfajores: Classic, Chocolate, 6-pack combo
- Catering: Small and Medium packages
- Sauces: Chimichurri

**Shipping Configurations:**
- Alfajores: 0.5lb base + 0.4lb per unit
- Empanadas: 1.0lb base + 0.8lb per unit
- Sauces: 0.2lb base + 0.1lb per unit

### Manual Seeding

For integration tests, use the seeder class directly:

```typescript
import { DatabaseSeeder } from 'tests/e2e/setup/database-seeder';

const seeder = new DatabaseSeeder(prisma);

// Seed everything
await seeder.seed({
  includeUsers: true,
  includeProducts: true,
  includeOrders: true,
});

// Clean everything
await seeder.clean();
```

## Test Isolation

### Transaction-Based Isolation

Integration tests use transaction-based rollback for isolation:

```typescript
import { startTransaction, rollbackTransaction, getTestDb } from 'src/__tests__/setup/db-test-utils';

describe('User Service', () => {
  beforeEach(async () => {
    // Start a transaction - all changes will be rolled back
    await startTransaction();
  });

  afterEach(async () => {
    // Rollback the transaction - database is clean for next test
    await rollbackTransaction();
  });

  it('should create a user', async () => {
    const db = getTestDb(); // Returns transaction client

    const user = await db.profile.create({
      data: buildUser(),
    });

    expect(user).toBeDefined();
    // User will be automatically rolled back after this test
  });
});
```

### How It Works

1. `startTransaction()` opens a database transaction
2. `getTestDb()` returns the transaction client for use in tests
3. All database changes happen within the transaction
4. `rollbackTransaction()` rolls back the transaction
5. Next test starts with a clean database state

### Benefits

- ✅ **Fast**: No need to delete records manually
- ✅ **Isolated**: Tests don't affect each other
- ✅ **Safe**: Impossible to leak test data
- ✅ **Parallel-safe**: Each test has its own transaction

## Cleanup Utilities

The `CleanupUtilities` class provides comprehensive cleanup functions.

### Basic Usage

```typescript
import { CleanupUtilities } from 'tests/utils/cleanup-utilities';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cleaner = new CleanupUtilities(prisma);

// Clean all test data (safe - only deletes test records)
await cleaner.cleanAll({ testOnly: true });

// Clean specific tables
await cleaner.cleanTables(['Order', 'OrderItem']);

// Clean everything (dangerous!)
await cleaner.cleanAll({ full: true });
```

### Advanced Cleanup

```typescript
// Clean with preservation
await cleaner.cleanAll({
  testOnly: true,
  preserve: {
    userEmails: ['admin@destinosf.com'],
    productSlugs: ['empanadas-beef'],
  },
});

// Clean specific entity
await cleaner.cleanEntity('product', 'product-id-123');

// Clean with condition
await cleaner.cleanWhere('order', {
  status: 'CANCELLED',
  createdAt: {
    lt: new Date('2024-01-01'),
  },
});

// Verify cleanup
const isClean = await cleaner.verifyCleanup({
  product: 0,
  order: 0,
  profile: 2, // Only admin and test user remain
});
```

### What Gets Cleaned

When using `testOnly: true`, the cleaner removes:

- Orders with `TEST-` prefix in order number
- Orders with `test` in customer email
- Products with `test-` prefix in slug or squareId
- Categories with `test-` prefix
- Profiles with `test` in email

## Validation Utilities

The `ValidationUtilities` class ensures data integrity.

### Basic Usage

```typescript
import { ValidationUtilities } from 'tests/utils/validation-utilities';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const validator = new ValidationUtilities(prisma);

// Validate all data
const result = await validator.validateAll();

if (!result.valid) {
  console.error('Validation failed:', result.errors);
}

// Print report
validator.printReport(result);
```

### What Gets Validated

**Profiles:**
- No duplicate emails
- Complete names

**Products:**
- No duplicate slugs
- Positive prices
- Valid category references

**Orders:**
- No duplicate order numbers
- Positive totals
- Correct total calculations (subtotal + tax + shipping)

**Order Items:**
- Positive quantities
- Correct price calculations (unitPrice × quantity)
- Valid order references

**Payments:**
- Positive amounts
- Valid order references
- PAID orders have payment records

**Categories:**
- No duplicate slugs

**Orphaned Records:**
- Products without categories
- Order items without orders

### Entity Validation

```typescript
// Validate specific entity
const result = await validator.validateEntity('product', 'product-id-123');

if (!result.valid) {
  console.error('Product validation failed:', result.errors);
}
```

## Running Tests

### Test Commands

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit                  # Unit tests only
pnpm test:components            # Component tests
pnpm test:api                   # API tests
pnpm test:critical              # Critical path tests
pnpm test:e2e                   # E2E tests

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run a single test file
jest path/to/test.test.ts
```

### E2E Test Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run critical E2E tests only
pnpm test:e2e:critical

# Run with UI (interactive)
pnpm playwright test --ui

# Run in specific browser
pnpm playwright test --project=chromium

# Debug mode
pnpm playwright test --debug
```

### Test Environment

Tests run in the `test` environment with:
- `NODE_ENV=test`
- Separate test database (if configured)
- Disabled telemetry
- Square sandbox mode

## Best Practices

### 1. Use Factories for Test Data

✅ **Good:**
```typescript
const user = buildUser({ email: 'test@example.com' });
const product = buildEmpanada();
```

❌ **Bad:**
```typescript
const user = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  // Missing fields...
};
```

### 2. Always Clean Up

✅ **Good:**
```typescript
afterEach(async () => {
  await rollbackTransaction();
});
```

❌ **Bad:**
```typescript
// No cleanup - test data leaks
```

### 3. Use Transaction Isolation

✅ **Good:**
```typescript
beforeEach(async () => {
  await startTransaction();
});

afterEach(async () => {
  await rollbackTransaction();
});
```

❌ **Bad:**
```typescript
beforeEach(async () => {
  await prisma.order.deleteMany(); // Slow!
});
```

### 4. Test Predictably

✅ **Good:**
```typescript
const testUser = buildTestUser('-unique');
const testProduct = buildTestProduct('-test-1');
```

❌ **Bad:**
```typescript
const user = buildUser(); // Random data - hard to debug
```

### 5. Validate Assumptions

✅ **Good:**
```typescript
const result = await validateTestData(prisma);
expect(result.valid).toBe(true);
```

❌ **Bad:**
```typescript
// Assume data is valid
```

### 6. Use Descriptive Test Names

✅ **Good:**
```typescript
it('should create order with correct total when tax and shipping applied', async () => {
```

❌ **Bad:**
```typescript
it('test 1', async () => {
```

### 7. Test One Thing Per Test

✅ **Good:**
```typescript
it('should calculate tax correctly', () => {
  // Test only tax calculation
});

it('should calculate shipping correctly', () => {
  // Test only shipping calculation
});
```

❌ **Bad:**
```typescript
it('should do everything', () => {
  // Tests tax, shipping, total, payment, email...
});
```

### 8. Use data-testid for E2E Tests

✅ **Good:**
```tsx
<button data-testid="checkout-button">Checkout</button>

// In test:
await page.click('[data-testid="checkout-button"]');
```

❌ **Bad:**
```tsx
<button className="bg-blue-500">Checkout</button>

// In test:
await page.click('.bg-blue-500'); // Fragile!
```

## Troubleshooting

### Tests Fail with "Database Connection" Errors

**Problem:** Tests can't connect to the database.

**Solution:**
1. Check `DATABASE_URL` in `.env.test`
2. Ensure database is running
3. Run `pnpm prisma migrate deploy`

```bash
# Check connection
pnpm diagnose-db

# Reset database
pnpm db:reset
```

### Tests Pass Locally But Fail in CI

**Problem:** CI environment differences.

**Solution:**
1. Check environment variables in GitHub Actions
2. Ensure database service is running in CI
3. Add retry logic to flaky tests:

```typescript
test.describe('Flaky Test', () => {
  test.describe.configure({ retries: 2 });

  it('should eventually pass', async () => {
    // Test logic
  });
});
```

### Transaction Rollback Not Working

**Problem:** Changes persist between tests.

**Solution:**
1. Ensure `startTransaction()` is called in `beforeEach`
2. Ensure `rollbackTransaction()` is called in `afterEach`
3. Use `getTestDb()` instead of `prisma` directly

```typescript
// Correct:
const db = getTestDb();
await db.product.create({ data: buildProduct() });

// Incorrect:
const prisma = new PrismaClient();
await prisma.product.create({ data: buildProduct() }); // Not in transaction!
```

### Faker Data Not Realistic

**Problem:** Generated data doesn't match production patterns.

**Solution:**
Customize factory options:

```typescript
// Instead of:
const user = buildUser();

// Use:
const user = buildUser({
  email: faker.internet.email({ provider: 'destino-sf.com' }),
  phone: faker.phone.number('(###) ###-####'), // Match US format
});
```

### Cleanup Takes Too Long

**Problem:** `cleanAll()` is slow.

**Solution:**
Use transaction-based isolation instead:

```typescript
// Slow:
afterEach(async () => {
  await cleaner.cleanAll();
});

// Fast:
beforeEach(async () => {
  await startTransaction();
});

afterEach(async () => {
  await rollbackTransaction();
});
```

### Validation Fails with Orphaned Records

**Problem:** Foreign key violations.

**Solution:**
Clean in correct order (children first):

```typescript
await prisma.orderItem.deleteMany();  // 1. Children
await prisma.payment.deleteMany();    // 2. Children
await prisma.order.deleteMany();      // 3. Parent
```

Or use `CASCADE` in cleanup:

```typescript
await cleaner.cleanTables(['Order']); // Automatically cascades
```

---

## Additional Resources

- [E2E Test Setup](E2E_TEST_SETUP.md)
- [E2E Test Execution](E2E_TEST_EXECUTION.md)
- [E2E Test Selectors](E2E_TEST_SELECTORS.md)
- [CLAUDE.md](../CLAUDE.md) - Development guide

## Contributing

When adding new tests:

1. Use existing factories or create new ones
2. Follow transaction-based isolation pattern
3. Add validation checks if needed
4. Document complex test scenarios
5. Use descriptive test names
6. Add data-testid attributes for E2E tests

---

**Last Updated:** 2025-10-23
**Maintained by:** Destino SF Development Team
