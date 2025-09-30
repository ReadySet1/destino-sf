# QA Testing Guide - Destino SF

## Table of Contents
- [Overview](#overview)
- [Testing Strategy](#testing-strategy)
- [Running Tests](#running-tests)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

This guide outlines the QA testing process for Destino SF. Our testing strategy ensures code quality, prevents regressions, and maintains system reliability before deploying to production.

### Testing Pyramid

```
              /\
             /  \        E2E Tests (Critical paths)
            /____\
           /      \      Integration Tests (API, DB)
          /________\
         /          \    Unit Tests (Business logic)
        /____________\
```

## Testing Strategy

### 1. Unit Tests
**Purpose**: Test individual functions and utilities in isolation

**Location**: `src/__tests__/lib/`, `src/__tests__/utils/`

**Coverage Target**: 60-70%

**Run Command**:
```bash
pnpm test:unit
```

**Examples**:
- `shippingUtils.test.ts` - Shipping calculations
- `dateUtils.test.ts` - Date formatting and validation
- `cart-helpers.test.ts` - Cart manipulation logic

### 2. Integration Tests
**Purpose**: Test API routes and database interactions

**Location**: `src/__tests__/app/api/`, `src/__tests__/app/actions/`, `src/__tests__/integration/`

**Coverage Target**: 65-75%

**Run Command**:
```bash
pnpm test:api
pnpm test:integration  # Database integration tests
```

**Examples**:
- `checkout/payment/route.test.ts` - Payment API
- `orders.test.ts` - Order creation and management
- `webhooks.test.ts` - Square webhook handling
- `database-integration.test.ts` - Database operations with transaction isolation

**Test Utilities**:
- **Database Test Utils** (`src/__tests__/setup/db-test-utils.ts`):
  - Transaction management for test isolation
  - Automatic rollback after each test
  - Database cleanup and seeding
  - Record counting and existence checks

- **Test Data Factories** (`src/__tests__/factories/index.ts`):
  - `userFactory` - Create test users
  - `productFactory` - Create test products
  - `orderFactory` - Create test orders
  - `cateringOrderFactory` - Create catering orders
  - Helper functions: `createCompleteOrder()`, `createUserWithOrders()`

**Example Usage**:
```typescript
import { userFactory, createCompleteOrder } from '@/__tests__/factories';
import { startTransaction, rollbackTransaction } from '@/__tests__/setup/db-test-utils';

describe('Order Tests', () => {
  beforeEach(async () => {
    await startTransaction(); // Start transaction
  });

  afterEach(async () => {
    await rollbackTransaction(); // Rollback - no data persists
  });

  test('should create order with items', async () => {
    const user = await userFactory.create();
    const order = await createCompleteOrder({ userId: user.id });

    expect(order.order.userId).toBe(user.id);
    expect(order.orderItems.length).toBeGreaterThan(0);
    // All changes rolled back after test
  });
});
```

### 3. Component Tests
**Purpose**: Test React components in isolation

**Location**: `src/__tests__/components/`

**Coverage Target**: 50-60%

**Run Command**:
```bash
pnpm test:components
```

**Examples**:
- `CheckoutForm.test.tsx` - Checkout form validation
- `ProductForm.test.tsx` - Admin product management
- `button.test.tsx` - UI component behavior

### 4. E2E Tests
**Purpose**: Test complete user journeys

**Location**: `tests/e2e/`

**Coverage Target**: All critical paths

**Run Command**:
```bash
pnpm test:e2e:critical
```

**Critical Paths**:
- Complete purchase flow (cart → checkout → payment → confirmation)
- Catering inquiry submission
- User authentication
- Admin order management

### 5. Critical Path Tests
**Purpose**: Test revenue-critical functionality

**Location**:
- `src/__tests__/app/api/checkout/`
- `src/__tests__/lib/square/`
- `src/__tests__/app/actions/orders.test.ts`

**Coverage Target**: 75-80% (highest standard)

**Run Command**:
```bash
pnpm test:critical
```

**What's Included**:
- Payment processing (Square integration)
- Order creation and status updates
- Checkout flow validation
- Square webhook processing

### 6. Performance Tests
**Purpose**: Measure and enforce performance budgets

**Location**: Lighthouse CI configuration (`lighthouserc.json`)

**Run Command**:
```bash
pnpm test:performance:lighthouse          # Desktop performance
pnpm test:performance:lighthouse:mobile   # Mobile performance
```

**Performance Budgets**:
- **Performance Score**: ≥ 80%
- **Accessibility Score**: ≥ 90%
- **Best Practices**: ≥ 85%
- **SEO Score**: ≥ 90%

**Core Web Vitals**:
- **First Contentful Paint (FCP)**: < 2s
- **Largest Contentful Paint (LCP)**: < 3s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Total Blocking Time (TBT)**: < 500ms
- **Speed Index**: < 3.5s

**Pages Tested**:
- Homepage
- Product category pages (Empanadas, Alfajores)
- Catering page
- Cart page
- Checkout page

**Automated in CI/CD**: Yes - runs on PRs to main/development

## Running Tests

### Quick Reference

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit              # Unit tests only
pnpm test:api               # API integration tests
pnpm test:components        # React component tests
pnpm test:critical          # Critical path tests
pnpm test:e2e:critical      # E2E critical flows

# Coverage reports
pnpm test:coverage          # Generate coverage report
pnpm test:coverage:critical # Coverage for critical paths

# Watch mode (during development)
pnpm test:watch             # Watch all tests
pnpm test:unit:watch        # Watch unit tests only
pnpm test:components:watch  # Watch component tests only

# Staging environment
pnpm test:staging           # Run tests against staging
pnpm test:e2e:staging:critical  # E2E tests on staging

# Pre-deployment validation
pnpm test:pre-deploy        # Full validation before deployment
```

### Test Environments

#### Local Development
```bash
# Run tests with local database
pnpm test
```

#### CI/CD (GitHub Actions)
Tests run automatically on:
- Push to `main` or `development` branches
- Pull request creation/updates
- Manual workflow dispatch

#### Staging Environment
```bash
# Set staging URL
export PLAYWRIGHT_STAGING_URL="https://your-staging.vercel.app"

# Run E2E tests against staging
pnpm test:e2e:staging:critical
```

## Pre-Deployment Checklist

### Automated Checks (GitHub Actions)

When creating a PR to `main` or triggering manual deployment, the following automated checks run:

✅ **Code Quality**
- ESLint validation
- Prettier formatting check
- TypeScript type checking

✅ **Test Coverage**
- Unit tests (all passing)
- Critical path tests (all passing, 75%+ coverage)
- API tests (all passing)
- Component tests (all passing)

✅ **Security**
- Dependency vulnerability scan (moderate+ level)
- No high/critical security issues

✅ **Build**
- Production build successful
- No build errors or warnings

✅ **E2E Tests**
- Complete purchase flow
- Catering inquiry flow
- Mobile responsive tests

### Manual Verification (Production Only)

Before deploying to production, verify:

- [ ] Review recent commits for breaking changes
- [ ] Staging environment is stable (24h+ uptime)
- [ ] Database migrations tested on staging
- [ ] Monitoring dashboards reviewed (no anomalies)
- [ ] Rollback plan prepared
- [ ] Team notified of deployment window

### Running Pre-Deployment Checks Locally

```bash
# Full pre-deployment validation
pnpm test:pre-deploy

# This runs:
# 1. pnpm test:critical
# 2. pnpm test:e2e:critical
# 3. pnpm type-check
# 4. pnpm build
```

## Writing Tests

### Test Structure

Follow the AAA pattern: **Arrange, Act, Assert**

```typescript
describe('Feature Name', () => {
  test('should do something specific', () => {
    // Arrange - Set up test data and environment
    const testData = createTestUser();

    // Act - Execute the functionality
    const result = processUser(testData);

    // Assert - Verify the outcome
    expect(result.success).toBe(true);
    expect(result.user.id).toBeDefined();
  });
});
```

### Unit Test Example

```typescript
// src/__tests__/lib/priceUtils.test.ts
import { calculateTotal } from '@/lib/priceUtils';

describe('calculateTotal', () => {
  test('should calculate subtotal + tax correctly', () => {
    const subtotal = 100;
    const taxRate = 0.0825; // SF tax rate

    const result = calculateTotal(subtotal, taxRate);

    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(8.25);
    expect(result.total).toBe(108.25);
  });

  test('should handle zero subtotal', () => {
    const result = calculateTotal(0, 0.0825);

    expect(result.total).toBe(0);
  });
});
```

### API Test Example

```typescript
// src/__tests__/app/api/products/route.test.ts
import { GET } from '@/app/api/products/route';
import { mockRequest } from '@/__tests__/utils/mock-request';

describe('GET /api/products', () => {
  test('should return active products', async () => {
    const request = mockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.products.length).toBeGreaterThan(0);
  });

  test('should filter by category', async () => {
    const request = mockRequest({ searchParams: { category: 'empanadas' } });
    const response = await GET(request);
    const data = await response.json();

    expect(data.products.every(p => p.category === 'EMPANADAS')).toBe(true);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/purchase-flow.spec.ts
import { test, expect } from '@playwright/test';
import { testProducts, testCustomer, testPaymentInfo } from './fixtures/test-data';

test('should complete purchase flow', async ({ page }) => {
  // Add item to cart
  await page.goto(`/products/${testProducts.empanada.slug}`);
  await page.getByRole('button', { name: /Add to Cart/i }).click();

  // Go to checkout
  await page.goto('/cart');
  await page.getByRole('link', { name: /Checkout/i }).click();

  // Fill customer info
  await page.getByLabel('Email').fill(testCustomer.email);

  // Complete payment (use Square sandbox)
  const paymentFrame = page.frameLocator('iframe[title="Secure card payment"]');
  await paymentFrame.getByPlaceholder('Card number').fill(testPaymentInfo.number);

  // Submit order
  await page.getByRole('button', { name: /Place Order/i }).click();

  // Verify confirmation
  await expect(page).toHaveURL(/order-confirmation/);
  await expect(page.getByText(/Order Confirmed/i)).toBeVisible();
});
```

### Best Practices

1. **Test Names**: Use descriptive names that explain what is being tested
   - ✅ `should calculate shipping cost for 5 empanadas`
   - ❌ `test shipping`

2. **Test Isolation**: Each test should be independent
   ```typescript
   beforeEach(() => {
     // Reset state before each test
     resetDatabase();
     clearMocks();
   });
   ```

3. **Mock External Services**: Don't make real API calls in unit tests
   ```typescript
   jest.mock('square', () => ({
     paymentsApi: {
       createPayment: jest.fn().mockResolvedValue({ payment: { id: '123' } })
     }
   }));
   ```

4. **Test Edge Cases**: Don't just test the happy path
   ```typescript
   test('should handle invalid email format', () => {
     expect(() => validateEmail('not-an-email')).toThrow();
   });
   ```

5. **Avoid Test Interdependence**: Tests should not rely on execution order
   ```typescript
   // ❌ Bad - relies on previous test
   let userId;
   test('creates user', () => { userId = createUser(); });
   test('updates user', () => { updateUser(userId); });

   // ✅ Good - each test is independent
   test('creates user', () => {
     const userId = createUser();
     expect(userId).toBeDefined();
   });

   test('updates user', () => {
     const userId = createUser(); // Create fresh user
     const result = updateUser(userId);
     expect(result.success).toBe(true);
   });
   ```

## Coverage Requirements

### Coverage Thresholds

Coverage requirements are enforced in `jest.config.ts`:

| Scope | Branches | Functions | Lines | Statements |
|-------|----------|-----------|-------|------------|
| **Global** | 50% | 55% | 60% | 60% |
| **Critical Paths** (checkout, payments, orders) | 75% | 80% | 80% | 80% |
| **Square Integration** | 70% | 75% | 75% | 75% |
| **Business Logic** (lib/) | 60% | 65% | 65% | 65% |
| **Utilities** | 55% | 60% | 60% | 60% |

### Viewing Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report in browser
open coverage/index.html

# View summary in terminal
pnpm test:coverage --coverageReporters=text
```

### Coverage Report Interpretation

- **Branches**: All if/else paths tested
- **Functions**: All functions executed at least once
- **Lines**: All lines of code executed
- **Statements**: All statements executed

**Example**:
```typescript
// 100% coverage requires testing both branches
function isEligibleForDiscount(order) {
  if (order.total > 100) {  // Test both true and false cases
    return true;
  }
  return false;
}

// Tests needed:
test('eligible when total > 100', () => {
  expect(isEligibleForDiscount({ total: 150 })).toBe(true);
});

test('not eligible when total <= 100', () => {
  expect(isEligibleForDiscount({ total: 50 })).toBe(false);
});
```

## CI/CD Integration

### GitHub Actions Workflows

#### 1. Test Suite (`test-suite.yml`)
Runs on every push and PR:
- Linting and formatting
- Type checking
- Unit, API, and component tests
- Coverage reporting
- Security scanning

**Status**: Tests now BLOCK merging if they fail (no more `continue-on-error`)

#### 2. Pre-Deployment Checklist (`pre-deployment.yml`)
Runs on PRs to `main` and manual triggers:
- All quality checks from test suite
- E2E critical path tests
- Build verification
- Database schema validation
- Generates deployment report

**Manual Trigger**:
```bash
# Via GitHub UI: Actions → Pre-Deployment Checklist → Run workflow
# Select environment: staging or production
```

### Pre-Commit Hooks

Git hooks run automatically before each commit:

1. **Lint-staged**: Format and lint changed files
2. **Type checking**: Verify TypeScript types
3. **Critical tests**: Run tests if critical files modified

**Skip hooks** (for urgent fixes only):
```bash
SKIP_HOOKS=1 git commit -m "urgent: fix critical bug"
```

### Deployment Flow

```
┌─────────────────┐
│  Local Develop  │
│  (with hooks)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Push to Dev   │
│   Branch        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions │
│  Test Suite     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create PR to   │
│  main           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pre-Deployment │
│  Checklist      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Manual Review  │
│  & Approval     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy Staging │
│  (auto)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Staging Tests  │
│  (E2E)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy Prod    │
│  (manual)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Post-Deploy    │
│  Monitoring     │
└─────────────────┘
```

## Troubleshooting

### Common Issues

#### Tests Failing in CI but Passing Locally

**Cause**: Environment differences (database, env vars)

**Solution**:
1. Check GitHub Actions environment variables
2. Verify database setup in CI (see `test-suite.yml`)
3. Ensure `NODE_ENV=test` is set
4. Check for timezone-dependent tests

#### Test Timeout Errors

**Cause**: Long-running database queries or API calls

**Solution**:
```typescript
// Increase timeout for specific test
test('slow database operation', async () => {
  // ...
}, 30000); // 30 second timeout

// Or configure globally in jest.config.ts
testTimeout: 30000
```

#### Coverage Not Meeting Thresholds

**Cause**: New code not adequately tested

**Solution**:
1. Run coverage report: `pnpm test:coverage`
2. Open HTML report: `open coverage/index.html`
3. Find uncovered lines (red highlighting)
4. Write tests for uncovered code
5. Re-run coverage to verify

#### E2E Tests Failing on Playwright

**Cause**: Selectors changed, timing issues, or environment differences

**Solution**:
```bash
# Debug with headed browser
pnpm test:e2e:headed

# Debug with Playwright inspector
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report
```

#### Database Connection Errors in Tests

**Cause**: Database not available or wrong connection string

**Solution**:
1. Check `DATABASE_URL` in `.env.test`
2. Ensure test database exists
3. Verify database container is running (if using Docker)

```bash
# Diagnose database connection
pnpm diagnose-db

# Reset test database
pnpm reset-test-db
```

### Getting Help

1. **Check test output**: Read error messages carefully
2. **Review documentation**: See `docs/` directory
3. **Examine similar tests**: Look for patterns in existing tests
4. **Run in debug mode**: Use `--debug` flags
5. **Ask the team**: Consult with other developers

### Useful Debug Commands

```bash
# Run single test file
jest --selectProjects node path/to/test.test.ts --no-cache

# Run test with verbose output
pnpm test:unit --verbose

# Debug specific E2E test
pnpm test:e2e:debug --grep="purchase flow"

# Check test database status
pnpm diagnose-db

# View test coverage for specific file
pnpm test:coverage --collectCoverageFrom="src/lib/square/**/*.ts"
```

## Continuous Improvement

### Adding New Tests

When adding features:
1. Write unit tests first (TDD approach)
2. Add integration tests for API routes
3. Update E2E tests if user-facing
4. Run coverage to ensure thresholds met
5. Update this documentation if needed

### Monitoring Test Health

- **Review CI failures**: Investigate and fix flaky tests immediately
- **Track coverage trends**: Ensure coverage doesn't decrease over time
- **Update test data**: Keep fixtures current with production data
- **Refactor test code**: Maintain test code quality just like production code

### Test Metrics to Track

- Test execution time (aim to keep fast)
- Coverage percentage (trending up)
- Flaky test rate (aim for 0%)
- E2E test stability (aim for 95%+ pass rate)

---

**Last Updated**: 2025-09-30

**Maintained By**: Engineering Team

For questions or improvements to this guide, please create a GitHub issue or contact the team lead.
