# Master Fix Plan: Catering Order $0.00 Duplication - FINAL SOLUTION

## 🚨 CRITICAL ISSUE - ROOT CAUSE IDENTIFIED

**Current Status**: The system is creating $0.00 "Regular Orders" when processing catering order webhooks.

**Evidence**: 
- Order `7328EB30`: Regular Order, $0.00, 0 items, PROCESSING status (PHANTOM ORDER)
- Order `AC0CD9F4`: Catering Order, $203.00, 7 items, PENDING status (REAL ORDER)

---

## 🔍 ROOT CAUSE - FOUND IN YOUR CODE

### The Exact Problem Location

**File**: `src/app/api/webhooks/square/route.ts`
**Function**: `handleOrderCreated` (Lines 88-290)
**Specific Issue**: Lines 240-267

The webhook handler is creating a placeholder "Regular Order" when it doesn't find the catering order immediately due to a race condition. Here's what's happening:

1. User creates a catering order
2. Square sends `order.created` webhook immediately
3. Webhook arrives BEFORE the catering order is fully saved in your database
4. The webhook handler doesn't find the catering order (lines 97-178)
5. It then creates a PHANTOM regular order with $0.00 (lines 240-267)

### The Problematic Code (Lines 240-267)

```typescript
await safeQuery(() =>
  prisma.order.upsert({
    where: { squareOrderId: data.id },
    update: { /* ... */ },
    create: {
      squareOrderId: data.id,
      status: orderStatus,
      total: 0, // ← THIS CREATES THE $0.00 ORDER!
      customerName: 'Pending Order', // ← THIS IS THE PHANTOM ORDER
      email: 'pending-order@webhook.temp',
      phone: 'pending-order',
      pickupTime: new Date(),
      rawData: {
        webhookSource: 'order.created',
        placeholderOrder: true, // ← EVEN MARKED AS PLACEHOLDER!
        cateringOrderCheckPerformed: true,
      }
    },
  })
);
```

### Good News: Partial Fix Already Attempted

Your code already has:
1. **Retry logic** to find catering orders (lines 104-141)
2. **Recent catering order check** (lines 184-221)
3. **Queue for later processing** (lines 65-85)

**BUT**: The queue function is implemented with `setTimeout` but still creates the placeholder after 10 seconds if the catering order isn't found!

---

## 🎯 THE FIX - THREE OPTIONS

### Option 1: IMMEDIATE FIX (Stop the Bleeding)
**Location**: Line 240-267 in `handleOrderCreated`
**Action**: Comment out or remove the entire `prisma.order.upsert` block that creates placeholder orders

```typescript
// REMOVE OR COMMENT THIS ENTIRE BLOCK (Lines 240-267)
// await safeQuery(() =>
//   prisma.order.upsert({
//     ...
//   })
// );

// Replace with:
console.log(`⚠️ Order ${data.id} not found after all retries. Skipping placeholder creation.`);
return; // Just exit without creating anything
```

### Option 2: PROPER FIX (Recommended)
**Enhance the queue logic to NEVER create placeholders**

1. **Update `queueWebhookForLaterProcessing`** (Line 65-85):
   - Remove the line that calls `handleOrderCreated` again (line 78)
   - Just log and exit if catering order still not found

2. **Remove placeholder creation** (Lines 240-267):
   - Delete the entire `prisma.order.upsert` block
   - Replace with logging and exit

### Option 3: COMPREHENSIVE FIX (Best Long-term)
**Only process webhooks for known orders**

1. **Change webhook strategy**:
   - Never create orders from webhooks
   - Only UPDATE existing orders
   - Orders should ONLY be created by your checkout flow

---

## 🔧 IMMEDIATE IMPLEMENTATION

### Step 1: Quick Fix (Do This NOW)

Open `src/app/api/webhooks/square/route.ts` and go to line 240. Replace this block:

```typescript
// CURRENT CODE (Lines 240-267) - CREATING PHANTOM ORDERS
try {
  await safeQuery(() =>
    prisma.order.upsert({
      where: { squareOrderId: data.id },
      update: {
        status: orderStatus,
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        squareOrderId: data.id,
        status: orderStatus,
        total: 0, // Will be updated by payment webhook
        customerName: 'Pending Order',
        email: 'pending-order@webhook.temp',
        phone: 'pending-order',
        pickupTime: new Date(),
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
          webhookSource: 'order.created',
          placeholderOrder: true,
          cateringOrderCheckPerformed: true,
        } as unknown as Prisma.InputJsonValue,
      },
    })
  );

  console.log(`✅ Successfully processed order.created event for order ${data.id}`);
} catch (error: any) {
  // ... error handling
}
```

With this:

```typescript
// FIXED CODE - NO PHANTOM ORDERS
console.log(`⚠️ [WEBHOOK] Order ${data.id} not found after all checks.`);
console.log(`⚠️ [WEBHOOK] This might be processed later when the order is created.`);
console.log(`⚠️ [WEBHOOK] Skipping placeholder creation to prevent $0.00 duplicates.`);

// Store webhook for retry if needed (optional)
// You could store this in Redis or a webhook_queue table for later processing
// For now, just log and exit
return;
```

### Step 2: Fix the Queue Function (Line 78)

In `queueWebhookForLaterProcessing`, remove the recursive call:

```typescript
// REMOVE THIS LINE (Line 78):
await handleOrderCreated(payload);

// REPLACE WITH:
console.log(`⚠️ [WEBHOOK-QUEUE] Order still not found after delay. Abandoning.`);
```

### Step 3: Clean Up Existing Phantom Orders

Run this SQL to identify and clean up phantom orders:

```sql
-- Find all $0.00 phantom orders
SELECT 
  id,
  "squareOrderId",
  status,
  total,
  "customerName",
  email,
  "createdAt"
FROM orders
WHERE 
  total = 0
  AND ("customerName" = 'Pending Order' OR email LIKE '%webhook.temp%')
  AND "createdAt" > NOW() - INTERVAL '7 days';

-- After verifying these are phantom orders, delete them:
-- DELETE FROM orders WHERE id IN (/* ids from above query */);
```

---

## ✅ VERIFICATION STEPS

After implementing the fix:

1. **Test Catering Order Creation**:
   - Create a new catering order
   - Check database - should have ONLY one catering order
   - No $0.00 regular orders should appear

2. **Monitor Webhook Logs**:
   - Look for "Skipping placeholder creation" messages
   - Verify no errors from missing orders

3. **Check Order List**:
   - All orders should have proper amounts
   - No "Pending Order" customer names
   - No "pending-order@webhook.temp" emails

---

## 📊 MONITORING QUERIES

```sql
-- Monitor for new phantom orders (run every hour)
SELECT COUNT(*) as phantom_count
FROM orders
WHERE 
  total = 0
  AND "customerName" IN ('Pending Order', 'Pending')
  AND "createdAt" > NOW() - INTERVAL '1 hour';

-- Check catering order processing
SELECT 
  co.id as catering_id,
  co."squareOrderId",
  co.status as catering_status,
  co."totalAmount",
  o.id as regular_id,
  o.total as regular_total
FROM catering_orders co
LEFT JOIN orders o ON o."squareOrderId" = co."squareOrderId"
WHERE co."createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY co."createdAt" DESC;
```

---

## 🎯 SUMMARY

**The Problem**: Line 240-267 in `src/app/api/webhooks/square/route.ts` creates phantom $0.00 orders

**The Solution**: Remove the placeholder order creation logic entirely

**Why This Happened**: Race condition between webhook arrival and catering order database save

**Permanent Fix**: Webhooks should only UPDATE existing orders, never CREATE new ones

---

## 📝 ADDITIONAL NOTES

1. Your retry logic (5 attempts with exponential backoff) is good but still results in placeholder creation
2. The queue logic exists but incorrectly re-calls the same function
3. The "placeholderOrder: true" flag shows this was intentional but misguided
4. Square webhooks can arrive before your database transaction commits

**Best Practice**: Webhooks should be idempotent and only update existing records. Order creation should only happen in your checkout flow where you have full control.
