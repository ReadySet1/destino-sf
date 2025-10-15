# Master Fix Plan: Complete Solution for $0.00 Phantom Orders

## 🚨 CRITICAL: MULTIPLE LOCATIONS CREATING PHANTOM ORDERS

We found **TWO places** creating phantom $0.00 orders. Both need to be fixed!

---

## 📍 LOCATION 1: Main Webhook Handler

**File**: `src/app/api/webhooks/square/route.ts`
**Function**: `handleOrderCreated` (Lines 88-290)
**Status**: Already fixed in previous attempt

## 📍 LOCATION 2: Secondary Webhook Handler (STILL CREATING PHANTOMS!)

**File**: `src/lib/webhook-handlers.ts`
**Function**: `handleOrderCreated` (Lines 35-106)
**Issue**: Lines 64-84 creating phantom orders

### The Problematic Code in webhook-handlers.ts:

```typescript
create: {
  squareOrderId: data.id,
  status: orderStatus,
  total: 0, // ← CREATES $0.00 ORDER!
  customerName: 'Pending', // ← THIS MATCHES YOUR SCREENSHOT!
  email: 'pending@example.com',
  phone: 'pending',
  pickupTime: new Date(),
  rawData: {
    ...data.object,
    lastProcessedEventId: eventId,
    lastProcessedAt: new Date().toISOString(),
  } as unknown as Prisma.InputJsonValue,
},
```

---

## 🔧 COMPLETE FIX - ALL LOCATIONS

### Fix #1: Update webhook-handlers.ts (Lines 62-86)

**File**: `src/lib/webhook-handlers.ts`

Replace the entire `prisma.order.upsert` block with:

```typescript
// Check if this is likely a catering order by looking at the event timing
const recentCateringCheck = await prisma.cateringOrder.findFirst({
  where: {
    createdAt: {
      gte: new Date(Date.now() - 60000), // Last minute
    },
  },
  select: { id: true },
});

if (recentCateringCheck) {
  console.log(`⚠️ [WEBHOOK-HANDLERS] Recent catering activity detected.`);
  console.log(
    `⚠️ [WEBHOOK-HANDLERS] Skipping order creation for ${data.id} to prevent phantom orders.`
  );
  return;
}

// For non-catering orders, only update if it exists
if (existingOrder) {
  await safeQuery(() =>
    prisma.order.update({
      where: { squareOrderId: data.id },
      data: {
        status: orderStatus,
        rawData: {
          ...data.object,
          lastProcessedEventId: eventId,
          lastProcessedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    })
  );
  console.log(`✅ Updated existing order ${data.id}`);
} else {
  console.log(
    `⚠️ [WEBHOOK-HANDLERS] Order ${data.id} not found. Skipping creation to prevent phantoms.`
  );
  return;
}
```

### Fix #2: Verify Main Webhook Handler is Fixed

**File**: `src/app/api/webhooks/square/route.ts`
**Lines**: 240-267

Ensure this section is removed/commented and replaced with:

```typescript
console.log(`⚠️ [WEBHOOK] Order ${data.id} not found after all checks.`);
console.log(`⚠️ [WEBHOOK] Skipping placeholder creation to prevent $0.00 duplicates.`);
return;
```

### Fix #3: Check for Any Other Imports

Search for any files that import `handleOrderCreated` from `webhook-handlers.ts`:

```bash
grep -r "from '@/lib/webhook-handlers'" src/
grep -r "from './webhook-handlers'" src/
grep -r "from '../webhook-handlers'" src/
```

---

## 🔍 WHY YOU STILL HAD THE ISSUE

Your codebase has **duplicate webhook handling logic**:

1. **Primary handler**: `src/app/api/webhooks/square/route.ts` - You fixed this one
2. **Secondary handler**: `src/lib/webhook-handlers.ts` - This was still creating phantoms!

The secondary handler is likely being called from somewhere else in your webhook processing flow, possibly through imports or the webhook queue system.

---

## 🧹 CLEANUP SQL

After fixing BOTH locations, clean up existing phantom orders:

```sql
-- Find ALL phantom orders (including those with customerName = 'Pending')
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
  AND ("customerName" IN ('Pending', 'Pending Order')
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- Delete them after verification
DELETE FROM orders
WHERE
  total = 0
  AND ("customerName" IN ('Pending', 'Pending Order')
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '7 days';
```

---

## ✅ VERIFICATION STEPS

1. **Check both files are fixed**:
   - `src/app/api/webhooks/square/route.ts` (lines 240-267)
   - `src/lib/webhook-handlers.ts` (lines 62-86)

2. **Test a new catering order**:
   - Create a catering order
   - Monitor logs for "Skipping" messages from BOTH handlers
   - Verify NO $0.00 orders appear

3. **Check for imports**:
   - Ensure no other files are calling the old `handleOrderCreated` functions

---

## 🎯 ROOT CAUSE SUMMARY

**Problem**: Two separate webhook handlers were both creating phantom orders
**Solution**: Both handlers must skip order creation and only update existing orders
**Key Learning**: Always check for duplicate webhook processing logic in different files

---

## 📊 MONITORING

Add this to your monitoring to catch any future phantom orders:

```sql
-- Alert if any $0.00 orders are created
CREATE OR REPLACE FUNCTION check_phantom_orders()
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE total = 0
    AND "createdAt" > NOW() - INTERVAL '1 hour'
  ) THEN
    RAISE NOTICE 'ALERT: Phantom $0.00 order detected!';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run this check every hour
SELECT check_phantom_orders();
```

---

## 🚀 IMMEDIATE ACTION

1. Fix `src/lib/webhook-handlers.ts` lines 62-86 NOW
2. Verify `src/app/api/webhooks/square/route.ts` is still fixed
3. Deploy immediately
4. Clean up phantom orders with the SQL above
5. Test with a new catering order

This should completely eliminate ALL phantom $0.00 orders!
