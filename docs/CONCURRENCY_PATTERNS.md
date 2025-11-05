# Concurrency Patterns & Race Condition Prevention

**Project:** DES-60 Phase 4: Concurrent Operations & Race Conditions
**Status:** ✅ Implemented
**Last Updated:** 2025-01-05

## Overview

This document describes the concurrency control mechanisms implemented to prevent race conditions, duplicate operations, and data corruption in the Destino SF application. These patterns ensure data integrity when multiple users or processes access shared resources simultaneously.

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Implemented Solutions](#implemented-solutions)
3. [Usage Patterns](#usage-patterns)
4. [Testing Strategy](#testing-strategy)
5. [Monitoring & Metrics](#monitoring--metrics)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Problem Statement

### Race Conditions Addressed

1. **Cart State Management**
   - Multiple rapid cart additions/removals
   - Cross-tab cart synchronization
   - Quantity update races

2. **Order Creation**
   - Double-submit on checkout button
   - Duplicate orders with identical items
   - Concurrent order creation by same user

3. **Payment Processing**
   - Double payment attempts
   - Concurrent payment on same order
   - Payment status conflicts

4. **Database Integrity**
   - Concurrent updates to same record
   - TOCTOU (Time-of-Check to Time-of-Use) vulnerabilities
   - Lost updates

---

## Implemented Solutions

### 1. Optimistic Locking

**Purpose:** Version-based concurrency control for non-critical updates

**Location:** `src/lib/concurrency/optimistic-lock.ts`

**How it works:**
- Each record has a `version` field
- On update, check version hasn't changed
- Increment version on successful update
- Throw `OptimisticLockError` on conflict

**When to use:**
- Order status updates
- Non-financial data modifications
- Operations that can be safely retried

**Example:**
```typescript
import { updateWithOptimisticLock } from '@/lib/concurrency/optimistic-lock';

// Update order with optimistic locking
const updatedOrder = await updateWithOptimisticLock(
  prisma.order,
  orderId,
  currentVersion,
  { status: 'PROCESSING' },
  { modelName: 'Order' }
);
```

**Schema Changes:**
```prisma
model Order {
  // ... other fields
  version Int @default(1)  // Added for optimistic locking
}
```

---

### 2. Pessimistic Locking

**Purpose:** Row-level database locks for critical operations

**Location:** `src/lib/concurrency/pessimistic-lock.ts`

**How it works:**
- Uses PostgreSQL `SELECT ... FOR UPDATE NOWAIT`
- Acquires exclusive row lock within transaction
- Blocks concurrent access to locked rows
- Auto-releases on transaction commit/rollback

**When to use:**
- Payment processing (prevent double charges)
- Inventory updates (prevent overselling)
- Financial transactions

**Example:**
```typescript
import { withRowLock } from '@/lib/concurrency/pessimistic-lock';

// Lock order for payment processing
const result = await withRowLock<Order>(
  'orders',
  orderId,
  async (lockedOrder) => {
    // Validate and process payment
    if (lockedOrder.paymentStatus !== 'PENDING') {
      throw new Error('Order already paid');
    }

    const payment = await processPayment(lockedOrder);

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PAID' }
    });

    return payment;
  },
  {
    timeout: 30000,  // 30 second timeout
    noWait: true     // Fail immediately if locked
  }
);
```

**Integration Points:**
- **Payment Route:** `src/app/api/checkout/payment/route.ts:63-129`
  - Prevents concurrent payment processing
  - Validates order status under lock
  - Atomic payment + status update

---

### 3. Request Deduplication

**Purpose:** Prevent duplicate concurrent requests with same parameters

**Location:** `src/lib/concurrency/request-deduplicator.ts`

**How it works:**
- Caches in-flight requests by key
- Returns same Promise for duplicate keys
- Auto-expires after TTL (5 seconds default)
- Clears cache on error (allows retry)

**When to use:**
- Checkout button double-click prevention
- Network retry scenarios
- Any user-triggered action that shouldn't duplicate

**Example:**
```typescript
import { globalDeduplicator, userKey } from '@/lib/concurrency/request-deduplicator';

// Deduplicate checkout requests
return await globalDeduplicator.deduplicate(
  userKey(userId, 'checkout', JSON.stringify(items)),
  async () => {
    // Create order (executed only once for concurrent requests)
    return await createOrder(items, customerInfo);
  }
);
```

**Integration Points:**
- **Checkout Route:** `src/app/api/checkout/route.ts:76-177`
  - Deduplicates concurrent checkout requests
  - Prevents double-submit race conditions

---

### 4. Duplicate Order Prevention

**Purpose:** Detect and prevent duplicate pending orders

**Location:** `src/lib/duplicate-order-prevention.ts`

**How it works:**
- Checks for pending orders with same items
- Compares product IDs, variants, and quantities
- Returns existing order if duplicate found
- Only checks orders from last 24 hours

**When to use:**
- Before creating new order
- When user refreshes checkout page
- Network retry scenarios

**Example:**
```typescript
import { checkForDuplicateOrder } from '@/lib/duplicate-order-prevention';

// Check before creating order
const duplicateCheck = await checkForDuplicateOrder(
  userId,
  cartItems,
  customerEmail
);

if (duplicateCheck.hasPendingOrder) {
  return NextResponse.json({
    error: 'Duplicate order detected',
    existingOrder: duplicateCheck.existingOrder
  }, { status: 409 });
}
```

**Integration Points:**
- **Checkout Route:** `src/app/api/checkout/route.ts:84-113`
  - Checks BEFORE order creation
  - Prevents TOCTOU vulnerability

---

### 5. Database Constraints

**Purpose:** Enforce uniqueness at database level

**Schema Changes:**
```prisma
model OrderItem {
  // ... fields ...

  @@unique([orderId, productId, variantId])  // Prevent duplicate items in same order
  @@index([productId])
  @@index([orderId])
  @@index([variantId])
}
```

**Why it matters:**
- Last line of defense against duplicates
- Prevents corruption from application bugs
- Enforces business rules at data layer

---

## Usage Patterns

### Pattern 1: Complete Checkout Flow Protection

```typescript
// 1. Request Deduplication (prevent double-click)
return await globalDeduplicator.deduplicate(deduplicationKey, async () => {

  // 2. Duplicate Order Check (prevent duplicate orders)
  const duplicateCheck = await checkForDuplicateOrder(userId, items, email);
  if (duplicateCheck.hasPendingOrder) {
    return { error: 'Duplicate order', existingOrder: duplicateCheck.existingOrder };
  }

  // 3. Create order (with database constraints)
  const order = await prisma.order.create({ /* ... */ });

  return { orderId: order.id };
});
```

### Pattern 2: Payment Processing Protection

```typescript
// 1. Pessimistic Lock (prevent concurrent payment)
const result = await withRowLock('orders', orderId, async (lockedOrder) => {

  // 2. Validate state under lock
  if (lockedOrder.paymentStatus !== 'PENDING') {
    throw new Error('Already paid');
  }

  // 3. Process payment (idempotent via Square)
  const payment = await createPayment(sourceId, squareOrderId, amount);

  // 4. Update status atomically
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', status: 'PROCESSING' }
  });

  return { success: true, paymentId: payment.id };
}, { timeout: 30000, noWait: true });
```

### Pattern 3: Cart State Consistency

```typescript
// Zustand handles this automatically, but for custom state:
set(state => {
  // Read current state
  const currentItems = state.items;

  // Calculate new state based on current
  const updatedItems = addItemToCart(currentItems, newItem);

  // Return new state atomically
  return {
    items: updatedItems,
    total: calculateTotal(updatedItems)
  };
});
```

---

## Testing Strategy

### Unit Tests

1. **Cart Race Conditions** (`src/__tests__/concurrency/cart-race-conditions.test.ts`)
   - 10 concurrent cart additions
   - Rapid quantity updates (100 clicks/second)
   - Multi-tab sync scenarios

2. **Order Creation Race** (`src/__tests__/concurrency/order-creation-race.test.ts`)
   - 5 concurrent identical checkout requests
   - Duplicate order detection
   - Request deduplication

3. **Payment Race Conditions** (`src/__tests__/concurrency/payment-race-conditions.test.ts`)
   - 5 concurrent payment attempts on same order
   - Lock timeout handling
   - Payment status validation

4. **Database Locks** (`src/__tests__/concurrency/database-locks.test.ts`)
   - Optimistic lock conflicts
   - Pessimistic lock acquisition
   - Multiple row locks
   - Deadlock prevention

### Integration Tests

**Checkout Flow** (`src/__tests__/integration/checkout-flow-concurrency.test.ts`)
- Complete flow: cart → checkout → payment
- 10 concurrent users
- Double-submit prevention
- Performance under load (20 concurrent users)

### E2E Tests

**Concurrent Users** (`tests/e2e/13-concurrent-users.spec.ts`)
- Real browser simulation
- 3+ concurrent users
- Multi-tab scenarios
- Double-click prevention
- Performance validation

### Running Tests

```bash
# Unit tests
pnpm test src/__tests__/concurrency/

# Integration tests
pnpm test src/__tests__/integration/checkout-flow-concurrency.test.ts

# E2E tests
pnpm test:e2e tests/e2e/13-concurrent-users.spec.ts

# All Phase 4 tests
pnpm test:concurrency  # (if configured)
```

---

## Monitoring & Metrics

### Metrics Tracked

**Location:** `src/lib/monitoring/concurrency-metrics.ts`

1. **Lock Metrics**
   - Pessimistic lock acquisitions
   - Lock timeouts
   - Lock wait times
   - Optimistic lock conflicts

2. **Request Deduplication**
   - Cache hits/misses
   - Deduplication rate
   - Latency

3. **Duplicate Detection**
   - Duplicate orders detected
   - False positives

4. **Performance**
   - Transaction duration
   - Concurrent operation counts

### Accessing Metrics

```typescript
import {
  concurrencyMetrics,
  getConcurrencyHealth,
  exportMetricsForMonitoring
} from '@/lib/monitoring/concurrency-metrics';

// Get summary
const summary = concurrencyMetrics.getSummary();

// Health check
const health = getConcurrencyHealth();
if (!health.healthy) {
  console.error('Concurrency issues detected:', health.issues);
}

// Export for external monitoring
const metrics = exportMetricsForMonitoring();
```

### Monitoring Dashboard

**Key Metrics to Watch:**

1. **Lock Timeout Rate**
   - Alert if > 10 per hour
   - Indicates high contention

2. **Optimistic Lock Conflicts**
   - Alert if > 50 per hour
   - May need pessimistic locks

3. **Deduplication Hit Rate**
   - Alert if > 50%
   - Possible double-submit issues

4. **Duplicate Order Rate**
   - Alert if > 5%
   - Race condition in checkout

---

## Best Practices

### 1. Choose the Right Pattern

| Scenario | Recommended Pattern | Why |
|----------|-------------------|-----|
| Payment processing | Pessimistic locking | Prevent double charges (critical) |
| Order status updates | Optimistic locking | Allow concurrent reads, retry on conflict |
| Checkout button | Request deduplication | Fast, user-friendly double-click prevention |
| Order creation | Duplicate check + deduplication | Multi-layered protection |
| Cart updates | Zustand atomic updates | Built-in consistency |

### 2. Lock Ordering

Always acquire locks in the same order to prevent deadlocks:

```typescript
// ✅ Good: Consistent order (alphabetical by table)
await withRowLock('customers', customerId, async () => {
  await withRowLock('orders', orderId, async () => {
    // Process
  });
});

// ❌ Bad: Different order in different places
// Thread A: Lock orders, then customers
// Thread B: Lock customers, then orders
// = Deadlock!
```

### 3. Keep Transactions Short

```typescript
// ✅ Good: Short transaction
await withRowLock('orders', orderId, async (order) => {
  const payment = await processPayment(order);  // Fast
  await updateOrderStatus(order.id, 'PAID');    // Fast
  return payment;
}, { timeout: 5000 });

// ❌ Bad: Long-running transaction
await withRowLock('orders', orderId, async (order) => {
  await sendEmailNotification(order);  // Slow!
  await updateInventory(order);        // Slow!
  await generateInvoice(order);        // Slow!
}, { timeout: 30000 });  // Holds lock too long
```

### 4. Handle Lock Failures Gracefully

```typescript
try {
  await withRowLock('orders', orderId, async (order) => {
    // Process payment
  }, { noWait: true });
} catch (error) {
  if (isLockAcquisitionError(error)) {
    if (error.reason === 'timeout') {
      return { error: 'Payment already in progress. Please wait.' };
    }
  }
  throw error;
}
```

### 5. Test Concurrent Scenarios

Always write tests for:
- Concurrent identical requests
- Rapid sequential requests
- Multi-user scenarios
- Lock timeout scenarios
- Optimistic lock conflicts

---

## Troubleshooting

### Issue: High Lock Timeout Rate

**Symptoms:**
- Users see "Payment already in progress" errors
- Lock timeout metrics > 10/hour

**Diagnosis:**
```typescript
const health = getConcurrencyHealth();
console.log(health.stats.lockTimeouts);
```

**Solutions:**
1. Check for slow operations within locks
2. Reduce transaction timeout
3. Use `noWait: false` for retry behavior
4. Investigate database performance

---

### Issue: Optimistic Lock Conflicts

**Symptoms:**
- Frequent `OptimisticLockError` exceptions
- Order updates failing

**Diagnosis:**
```typescript
const summary = concurrencyMetrics.getSummary();
console.log(summary[ConcurrencyMetricType.OPTIMISTIC_LOCK_CONFLICT]);
```

**Solutions:**
1. Switch to pessimistic locking for high-contention operations
2. Implement retry logic with exponential backoff
3. Reduce concurrent update operations

---

### Issue: Duplicate Orders Despite Prevention

**Symptoms:**
- Users still creating duplicate orders
- Duplicate check not triggering

**Diagnosis:**
1. Check if items match exactly (product ID + variant + quantity)
2. Verify duplicate check runs BEFORE order creation
3. Check for TOCTOU gaps

**Solutions:**
1. Ensure duplicate check inside deduplicator callback
2. Verify database constraints are in place
3. Check for cart item normalization issues

---

### Issue: Request Deduplication Not Working

**Symptoms:**
- Duplicate operations despite deduplication
- Cache hit rate very low

**Diagnosis:**
```typescript
const metrics = concurrencyMetrics.getMetrics(
  ConcurrencyMetricType.REQUEST_CACHE_HIT
);
console.log(`Hit rate: ${metrics.length} hits`);
```

**Solutions:**
1. Verify consistent key generation
2. Check TTL isn't too short
3. Ensure same deduplicator instance is used
4. Check for cache clearing on errors

---

## Migration Guide

### From No Concurrency Control

1. **Add version field:**
   ```bash
   pnpm prisma migrate dev --name add_order_version
   ```

2. **Add unique constraints:**
   ```bash
   pnpm prisma migrate dev --name add_orderitem_unique
   ```

3. **Update checkout route:**
   - Wrap in request deduplicator
   - Add duplicate order check
   - Follow pattern in `src/app/api/checkout/route.ts`

4. **Update payment route:**
   - Add pessimistic locking
   - Add status validation
   - Follow pattern in `src/app/api/checkout/payment/route.ts`

5. **Add monitoring:**
   - Import concurrency metrics
   - Record metrics in critical paths
   - Set up health check endpoint

### Testing the Migration

```bash
# 1. Run unit tests
pnpm test src/__tests__/concurrency/

# 2. Run integration tests
pnpm test src/__tests__/integration/

# 3. Run E2E tests
pnpm test:e2e tests/e2e/13-concurrent-users.spec.ts

# 4. Monitor production
# Check metrics dashboard for issues
```

---

## Related Documentation

- [Database Schema](../prisma/schema.prisma) - Version fields and constraints
- [API Routes](../src/app/api/) - Concurrency pattern implementations
- [Testing Infrastructure](./PHASE_5_TEST_INFRASTRUCTURE_SUMMARY.md) - Test setup and patterns

---

## Support

For questions or issues:
1. Check this documentation
2. Review test cases for examples
3. Check monitoring metrics
4. Contact development team

---

**Document Version:** 1.0
**Last Review:** 2025-01-05
**Next Review:** 2025-04-05
