# Square Webhook Payment Status Update - Fix Plan (Updated)

## 🎯 Feature/Fix Overview

**Name**: Square Webhook Payment Status Processing Fix

**Type**: Bug Fix

**Priority**: Critical

**Estimated Complexity**: Small (1-2 days) - The issue appears to be missing handler implementation

**Sprint/Milestone**: Payment Processing Sprint

### Problem Statement
Square webhooks are being received, validated, and duplicate-checked successfully, but there's no implementation to actually process payment events and update order status. The system logs show "Duplicate webhook event detected" but never attempts to update the database with payment information.

### Success Criteria
- [ ] Payment status updates from "PENDING" to "PAID" when payment completes
- [ ] Square payment ID and order ID are stored in the database
- [ ] Order status reflects actual payment state
- [ ] Both regular and catering orders handle payment updates correctly
- [ ] Clear logging shows payment status transitions

### Dependencies
- **Blocked by**: None
- **Blocks**: Customer payment confirmation, admin order management
- **Related Files**: `/api/webhooks/square/route.ts`, database schema

---

## 📋 Planning Phase

### 1. Current State Analysis (Based on Logs)

#### ✅ What's Working
```typescript
// From logs, these are functioning correctly:
1. Webhook signature validation (both HMAC methods)
2. Duplicate event detection system
3. Event parsing and type identification
4. Metric tracking for webhook events
5. Database connection and Prisma initialization
```

#### ❌ What's Missing
```typescript
// Critical gaps identified:
1. No payment event handlers (payment.created, payment.updated)
2. No database updates after webhook validation
3. No order lookup using Square reference_id
4. No payment status mapping logic
5. Orders remain in PENDING status indefinitely
```

### 2. Key Observations from Logs

#### Webhook Event Flow
```
1. Order created: 0f8ec05b-db40-4224-a0f8-0b039e45fef8
2. Square Order ID: vc6A17NanweGCzxUJ0kuBBgMMi4F
3. Payment created: x4U6Asvr3HI7qEaslN71sykakwJZY
4. Events received but only logged as "Duplicate webhook event detected"
5. Order remains PENDING in admin view
```

#### Missing Link
The webhook handler is only detecting duplicates but **not processing the events before marking them as handled**. This is the critical bug.

### 3. Root Cause Analysis

#### The Core Issue
```typescript
// Current flow (INCORRECT):
1. Receive webhook
2. Check if event ID exists in processed events
3. If exists → log "duplicate" and exit
4. If not exists → save event ID (but no processing!)

// Should be:
1. Receive webhook
2. Check if event ID exists
3. If not exists → PROCESS EVENT → save event ID
4. If exists → skip (duplicate)
```

### 4. Implementation Plan

#### Phase 1: Fix Event Processing Order
```typescript
// In /api/webhooks/square/route.ts

// Current problematic pattern:
if (await isDuplicateEvent(eventId)) {
  console.warn(`⚠️ Duplicate webhook event detected: ${eventId}`);
  return NextResponse.json({ received: true });
}
// Missing: actual event processing!

// Fixed pattern:
if (await isDuplicateEvent(eventId)) {
  console.warn(`⚠️ Duplicate webhook event detected: ${eventId}`);
  return NextResponse.json({ received: true });
}

// Process the event BEFORE marking as processed
await processWebhookEvent(eventType, eventData);
await markEventAsProcessed(eventId);
```

#### Phase 2: Implement Payment Event Handlers
```typescript
async function processWebhookEvent(eventType: string, data: any) {
  switch (eventType) {
    case 'payment.created':
      await handlePaymentCreated(data);
      break;
    case 'payment.updated':
      await handlePaymentUpdated(data);
      break;
    case 'order.updated':
      await handleOrderUpdated(data);
      break;
    // ... other cases
  }
}
```

#### Phase 3: Order Lookup Strategy
```typescript
// Use reference_id to find our internal order
async function findOrderBySquareReference(squareOrderId: string) {
  // First try: direct square_order_id lookup
  let order = await prisma.order.findFirst({
    where: { square_order_id: squareOrderId }
  });
  
  // Second try: check catering orders
  if (!order) {
    order = await prisma.cateringOrder.findFirst({
      where: { square_order_id: squareOrderId }
    });
  }
  
  // Third try: use reference_id (our order ID in Square)
  if (!order && data.order?.reference_id) {
    order = await findOrderById(data.order.reference_id);
  }
  
  return order;
}
```

#### Phase 4: Payment Status Updates
```typescript
async function handlePaymentUpdated(data: any) {
  const { payment } = data;
  
  // Map Square status to our status
  const statusMap = {
    'COMPLETED': 'PAID',
    'PENDING': 'PENDING',
    'FAILED': 'FAILED',
    'CANCELED': 'CANCELED'
  };
  
  const order = await findOrderBySquareReference(payment.order_id);
  if (!order) {
    console.error(`Order not found for payment ${payment.id}`);
    return;
  }
  
  // Update both regular and catering orders
  if (order.type === 'regular') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        payment_status: statusMap[payment.status],
        square_payment_id: payment.id,
        paid_at: payment.status === 'COMPLETED' ? new Date() : null
      }
    });
  } else {
    await prisma.cateringOrder.update({
      where: { id: order.id },
      data: {
        payment_status: statusMap[payment.status],
        square_payment_id: payment.id,
        paid_at: payment.status === 'COMPLETED' ? new Date() : null
      }
    });
  }
  
  console.log(`✅ Payment status updated: ${order.id} → ${statusMap[payment.status]}`);
}
```

### 5. Database Schema Verification

#### Required Fields Check
```sql
-- Ensure these columns exist:
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_order_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

ALTER TABLE catering_orders ADD COLUMN IF NOT EXISTS square_payment_id VARCHAR(255);
ALTER TABLE catering_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_square_order_id ON orders(square_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_square_payment_id ON orders(square_payment_id);
```

### 6. Testing Strategy

#### Immediate Testing Steps
```typescript
// 1. Add comprehensive logging
console.log('📥 Processing webhook event:', {
  type: eventType,
  eventId,
  orderId: data.order?.reference_id,
  squareOrderId: data.object_id,
  paymentStatus: data.payment?.status
});

// 2. Test with Square Sandbox
- Create test order
- Complete payment in Square checkout
- Monitor logs for event processing
- Verify database updates

// 3. Manual verification query
SELECT id, status, payment_status, square_order_id, square_payment_id, paid_at 
FROM orders 
WHERE id = '0f8ec05b-db40-4224-a0f8-0b039e45fef8';
```

### 7. Implementation Checklist

#### Immediate Actions (Day 1)
- [ ] Fix the event processing order bug (process THEN mark as duplicate)
- [ ] Add payment event handlers
- [ ] Implement order lookup logic
- [ ] Add comprehensive logging
- [ ] Test with existing pending orders

#### Follow-up Actions (Day 2)
- [ ] Add error recovery for failed updates
- [ ] Implement webhook retry logic
- [ ] Add monitoring alerts for stuck orders
- [ ] Document the webhook flow
- [ ] Create reconciliation script for historical orders

### 8. Quick Wins

Based on the logs, these immediate fixes will solve the issue:

1. **Move event processing before duplicate check storage**
2. **Add handler for `payment.created` and `payment.updated`**
3. **Store Square IDs for order correlation**
4. **Update order status based on payment status**

### 9. Monitoring & Validation

#### Success Metrics
```typescript
// Add these log statements to verify fix:
console.log(`💳 Payment webhook processed: ${payment.id}`);
console.log(`📦 Order ${orderId} updated: ${oldStatus} → ${newStatus}`);
console.log(`✅ Payment ${payment.id} linked to order ${orderId}`);
```

#### Validation Queries
```sql
-- Check for stuck orders (should return 0 after fix)
SELECT COUNT(*) FROM orders 
WHERE status = 'PENDING' 
AND created_at < NOW() - INTERVAL '30 minutes'
AND square_order_id IS NOT NULL;

-- Verify payment tracking
SELECT id, payment_status, square_payment_id, paid_at 
FROM orders 
WHERE square_order_id = 'vc6A17NanweGCzxUJ0kuBBgMMi4F';
```

---

## 🚨 Critical Finding

**The webhook handler is marking events as processed without actually processing them!** This is why every webhook shows "Duplicate webhook event detected" - the system saves the event ID to prevent duplicates but never processes the actual payment update.

## Next Immediate Steps

1. **Open `/api/webhooks/square/route.ts`**
2. **Find where events are marked as processed**
3. **Add payment processing BEFORE marking as duplicate**
4. **Test with a new order to verify the fix**

This is a straightforward fix that should take only a few hours to implement and test.