# Square Webhook Payment Status Update Fix

## Problem

Square webhooks were receiving `payment.created` and `payment.updated` events but not updating the payment status in the database. The logs showed:

- Webhooks being acknowledged immediately
- No follow-up logs from actual payment processing
- Missing error handling in the `handlePaymentUpdated` function

## Root Cause Analysis

1. **Silent failures in async processing**: The `handlePaymentUpdated` function had incomplete error handling that was causing silent failures
2. **Missing transaction management**: Database updates weren't properly wrapped in transactions
3. **Duplicate function definitions**: The `mapSquarePaymentStatus` function was defined multiple times
4. **Insufficient logging**: Errors in the async webhook processing were being swallowed

## Solution

### 1. Fixed `handlePaymentUpdated` Function

- **Complete rewrite** with proper error handling
- **Comprehensive logging** at each step
- **Transaction management** for atomic database updates
- **Event deduplication** to prevent duplicate processing
- **Graceful error recovery** with detailed error capture

### 2. Key Improvements Made

#### Error Handling & Logging

```typescript
// Before: Silent failures
try {
  // processing code
} catch (error) {
  // No logging or error handling
}

// After: Comprehensive error handling
try {
  console.log(`🔄 Processing payment.updated event: ${squarePaymentId} (Event: ${eventId})`);
  // processing code
  console.log(`✅ Order ${order.id} updated successfully (Event: ${eventId})`);
} catch (outerError: any) {
  console.error(
    `❌ CRITICAL: handlePaymentUpdated failed for payment ${payload.data?.id} (Event: ${payload.event_id}):`,
    outerError
  );

  await errorMonitor.captureWebhookError(
    outerError,
    'payment.updated.handler_failed',
    {
      squarePaymentId: payload.data?.id,
      squareOrderId: payload.data?.object?.payment?.order_id,
    },
    payload.event_id
  );

  throw outerError; // Re-throw to trigger webhook retry
}
```

#### Transaction Management

```typescript
// Atomic transaction for database updates
await prisma.$transaction(async tx => {
  // Update the order
  await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: updatedPaymentStatus,
      status: updatedOrderStatus,
      updatedAt: new Date(),
    },
  });

  // Upsert the payment record with event deduplication
  await tx.payment.upsert({
    where: { squarePaymentId: squarePaymentId },
    update: {
      status: updatedPaymentStatus,
      rawData: {
        ...paymentData,
        lastProcessedEventId: eventId,
        lastUpdated: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
    create: {
      // ... creation logic
    },
  });
});
```

#### Event Deduplication

```typescript
// Check if this event was already processed to prevent duplicates
const existingPayment = await safeQuery(() =>
  prisma.payment.findUnique({
    where: { squarePaymentId: squarePaymentId },
    select: { id: true, rawData: true, status: true },
  })
);

if (existingPayment?.rawData && typeof existingPayment.rawData === 'object') {
  const rawData = existingPayment.rawData as any;
  if (rawData?.lastProcessedEventId === eventId) {
    console.log(`⚠️ Event ${eventId} already processed for payment ${squarePaymentId}, skipping`);
    return;
  }
}
```

### 3. Testing

Created comprehensive tests in `src/__tests__/webhook-payment-fix-test.ts`:

- Payment status mapping validation
- Webhook payload structure validation
- Error handling scenarios
- Edge cases (missing data, invalid payloads)

### 4. Expected Behavior After Fix

#### Successful Payment Update Logs

```
🔄 Processing payment.updated event: payment_123 (Event: event_456)
📋 Payment data: { squarePaymentId: "payment_123", squareOrderId: "order_789", paymentStatus: "COMPLETED", ... }
✅ Found regular order with squareOrderId order_789: { id: "internal_123", currentStatus: "PENDING", currentPaymentStatus: "PENDING" }
📊 Payment status mapping: COMPLETED → PAID (Event: event_456)
📊 Order status update: PENDING → PROCESSING (Event: event_456)
✅ Order internal_123 and Payment payment_123 updated - payment status: PAID, order status: PROCESSING (Event: event_456)
```

#### Error Scenario Logs

```
❌ CRITICAL: Order with squareOrderId order_789 not found for payment update (Event: event_456)
📋 Recent orders for comparison: [...]
❌ CRITICAL: handlePaymentUpdated failed for payment payment_123 (Event: event_456): Error details...
```

## Deployment Notes

- No breaking changes
- Backward compatible
- Improved monitoring and alerting
- Enhanced webhook reliability

## Monitoring

The fix includes:

- Detailed error capture with `errorMonitor.captureWebhookError`
- Comprehensive logging for debugging
- Performance metrics tracking
- Event deduplication tracking

## Files Modified

- `src/app/api/webhooks/square/route.ts` - Main webhook handler fix
- `src/__tests__/webhook-payment-fix-test.ts` - Test coverage
- `docs/fixes/square-webhook-payment-status-fix.md` - This documentation

## Testing Instructions

1. Run tests: `pnpm test webhook-payment-fix-test`
2. Monitor webhook logs for new payment events
3. Verify payment status updates in database
4. Check error monitoring for any new failures

The fix should resolve the issue where Square webhooks were not updating payment status, ensuring reliable payment processing and order fulfillment.
