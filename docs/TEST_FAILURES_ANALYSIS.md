# Critical Test Failures Analysis - DES-76

**Date**: November 6, 2025
**Branch**: `fix/critical-test-failures`
**Status**: Partial Fix Complete

## Summary

**Initial State**: 47 failing tests (578 passing)
**Current State**: 46 failing tests (579 passing)
**Fixed**: 1 test
**Remaining**: 46 tests

## Fixed Issue

### TransactionIsolationLevel Missing from Prisma Mock

**Problem**: The Prisma mock in `src/__mocks__/@prisma/client.js` was missing the `TransactionIsolationLevel` enum, causing errors in pessimistic locking operations:

```
Cannot read properties of undefined (reading 'ReadCommitted')
```

**Fix Applied**: Added `TransactionIsolationLevel` enum to the `Prisma` namespace in the mock:

```javascript
Prisma: {
  // ... other properties
  TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
  },
}
```

**Files Changed**:

- `src/__mocks__/@prisma/client.js` (Line 13-18)

**Result**: 1 test now passes that was previously failing.

---

## Remaining Test Failures (46 tests)

The remaining failures are concentrated in **integration and concurrency tests** that require sophisticated database behavior beyond what simple mocks can provide.

### Failure Categories

#### 1. Payment Edge Cases (7 tests)

**Location**: Various test files
**Issues**:

- Mock doesn't handle concurrent payment attempts correctly
- Mock doesn't track payment processing states across calls
- Square API mocks don't simulate real timeout behavior

**Examples**:

- Should handle multiple concurrent payment attempts for same order
- Should prevent payment on already processing order
- Should handle Square API timeout during payment processing

#### 2. Checkout Flow Concurrency (7 tests)

**Location**: `src/__tests__/integration/checkout-flow-concurrency.test.ts`
**Issues**:

- Full checkout flow requires complex state management across multiple API calls
- Mocks don't maintain state between checkout → order → payment steps
- Concurrent user scenarios need real transaction isolation

**Examples**:

- Should complete full checkout flow: cart → order → payment
- Should prevent double-submit during checkout
- Should handle 10 concurrent users checking out different orders

#### 3. Payment Race Conditions (15 tests)

**Location**: `src/__tests__/concurrency/payment-race-conditions.test.ts`
**Issues**:

- Pessimistic locking with `$queryRawUnsafe` not properly mocked
- Transaction isolation levels don't work in mocks
- Lock timeout and deadlock scenarios can't be simulated with mocks

**Examples**:

- Should prevent concurrent payment processing on same order
- Should handle lock timeout gracefully
- Should update order status atomically within transaction

#### 4. Payment API Route Tests (13 tests)

**Location**: `src/__tests__/app/api/checkout/payment/route.test.ts`
**Issues**:

- Route tests expect real transaction behavior
- Mock Prisma doesn't handle error scenarios correctly
- Database errors and constraints not simulated

**Examples**:

- Should process payment successfully
- Should handle database errors during order status update
- Should maintain payment idempotency

#### 5. Order Creation Race Conditions (4 tests)

**Location**: `src/__tests__/concurrency/order-creation-race.test.ts`
**Issues**:

- `checkForDuplicateOrder` function requires complex WHERE queries that mocks don't support
- Unique constraints not enforced in mock
- Concurrent order creation needs real database locking

**Examples**:

- Should prevent duplicate orders from concurrent requests with same items
- Should detect duplicate order with same items within 24 hours
- Should prevent duplicate order items via unique constraint

---

## Root Cause Analysis

### Why Mocks Are Insufficient

1. **Complex Query Support**
   - Tests use `findMany` with nested WHERE clauses, date comparisons, and array operations
   - Current mock has basic filtering but doesn't handle complex query logic
   - Example: Finding orders with matching items within 24 hours

2. **Transaction Isolation**
   - Pessimistic locking requires `$transaction` with isolation levels
   - Mock doesn't implement real transaction behavior
   - Concurrent operations don't have actual isolation

3. **Database Constraints**
   - Unique constraints (e.g., `@@unique([orderId, productId, variantId])`)
   - Foreign key constraints
   - Check constraints
   - Mock Prisma creates records without enforcing constraints

4. **Raw SQL Queries**
   - Tests use `$queryRawUnsafe` for locking (`SELECT ... FOR UPDATE`)
   - Mock doesn't implement raw query execution
   - Can't simulate PostgreSQL-specific behavior (NOWAIT, SKIP LOCKED)

5. **State Persistence Across Calls**
   - Integration tests make multiple API calls expecting state to persist
   - Mock stores are independent per test but don't maintain referential integrity
   - Cascade operations (delete order → delete order items) not implemented

---

## Recommended Solutions

### Option 1: Use Real Test Database (RECOMMENDED) ⭐

**Approach**: Run integration tests against a real PostgreSQL test database

**Pros**:

- Tests real database behavior (transactions, constraints, locking)
- No need to maintain complex mocks
- Catches real-world issues
- More reliable CI

**Cons**:

- Requires database setup in CI
- Slightly slower test execution
- Need database cleanup between tests

**Implementation**:

```bash
# In CI workflow
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_db

# In tests
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE orders, order_items, ... CASCADE`;
});
```

**Estimated Time**: 2-4 hours (already partially implemented in pre-deployment workflow)

### Option 2: Improve Prisma Mock (NOT RECOMMENDED)

**Approach**: Enhance `src/__mocks__/@prisma/client.js` to handle all test scenarios

**Pros**:

- No external dependencies
- Faster test execution

**Cons**:

- Extremely time-consuming (20+ hours of work)
- Mock will never match real database behavior 100%
- Maintenance burden as tests evolve
- Won't catch real database issues

**Required Mock Improvements**:

1. Implement complex `findMany` WHERE clause logic
2. Add unique constraint checking
3. Implement transaction isolation simulation
4. Add `$queryRawUnsafe` support for locking queries
5. Implement cascade deletes and referential integrity
6. Add concurrent access simulation

**Estimated Time**: 20-40 hours (not practical)

### Option 3: Refactor Tests (COMPROMISE)

**Approach**: Split tests into unit tests (use mocks) and integration tests (use real DB)

**Pros**:

- Best of both worlds
- Fast unit tests with mocks
- Reliable integration tests with real DB
- Clear test organization

**Cons**:

- Requires test refactoring
- Some tests may need to be rewritten

**Implementation**:

- Move integration tests to `src/__tests__/integration/` (already there!)
- Configure Jest to run integration tests separately
- Use real database for integration tests only

**Estimated Time**: 4-8 hours

### Option 4: Keep Continue-On-Error (TEMPORARY)

**Approach**: Leave `continue-on-error: true` in workflow with plan to fix later

**Pros**:

- Unblocks current development
- Can be addressed in follow-up work

**Cons**:

- Technical debt remains
- CI doesn't catch test failures

**Implementation**:

- Keep current workflow configuration
- Create follow-up tickets (already done: DES-77)
- Set deadline for proper fix

---

## Recommendation

**Go with Option 1: Use Real Test Database for Integration Tests**

### Reasoning

1. **Pre-deployment workflow already has PostgreSQL setup** (see `.github/workflows/pre-deployment.yml:32-45`)
2. **Integration tests SHOULD use real databases** - that's what integration tests are for
3. **Fastest path to stable CI** - 2-4 hours vs 20-40 hours for mocking
4. **Best practices** - Industry standard is to use test databases for integration tests

### Implementation Plan

1. **Configure test database** (2 hours)
   - Update `jest.config.ts` to detect integration tests
   - Add database cleanup utilities
   - Configure connection pooling for tests

2. **Update integration tests** (2 hours)
   - Remove unnecessary mocks in integration test files
   - Add proper setup/teardown with database cleanup
   - Ensure tests can run in parallel with isolation

3. **Update CI workflow** (30 minutes)
   - Remove `continue-on-error: true` from critical tests
   - Ensure PostgreSQL service is available for all test runs

4. **Verify** (30 minutes)
   - Run full test suite locally with test database
   - Run in CI to confirm all tests pass
   - Document test database setup in README

**Total Estimated Time**: 2-4 hours

---

## Files to Modify

If implementing Option 1:

1. **`jest.config.ts`**
   - Add test database configuration
   - Separate integration test project configuration

2. **`jest.setup.enhanced.js`**
   - Add conditional logic: use mocks for unit tests, real DB for integration tests
   - Add database cleanup utilities

3. **`.github/workflows/pre-deployment.yml`**
   - Remove `continue-on-error: true` from line 152
   - Ensure PostgreSQL service is configured (already there!)

4. **Integration test files**
   - Add database cleanup in `beforeEach`/`afterEach`
   - Remove unnecessary mocks that interfere with real database

---

## Next Steps

1. **Decide on approach** (Option 1 recommended)
2. **Implement chosen solution**
3. **Verify all tests pass**
4. **Update DES-76 in Plane**
5. **Close DES-77 or repurpose for ongoing test improvements**

---

## Related Issues

- **DES-76**: Fix Critical Path Test Failures (this issue)
- **DES-77**: Improve Test Infrastructure and CI Stability
- **PR #93**: Merged development to main (added `continue-on-error` as temporary workaround)

---

## Technical Debt

**Current State**: CI allows critical test failures with `continue-on-error: true`

**Risk Level**: Medium

- Tests don't catch real issues
- False sense of security
- Technical debt accumulates

**Timeline**: Should be fixed within 1-2 weeks to maintain code quality

---

_Generated as part of DES-76 implementation_
