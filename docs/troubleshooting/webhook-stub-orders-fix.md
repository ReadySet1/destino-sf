# Webhook Stub Orders Issue - Resolution

## Problem Description

The system was creating orders with placeholder data due to webhook race conditions:

- **Customer Name**: "Order Update Processing" or "Payment Processing"
- **Email**: "processing@example.com" or "pending@example.com"
- **Phone**: "processing" or "pending"
- **Total**: $0.00
- **Items**: 0

These orders appeared in the admin panel and caused confusion for order management.

## Root Cause

The issue was caused by webhook race conditions where:

1. **`order.updated` webhook** arrived before `order.created` webhook
2. **`payment.created` webhook** arrived before `order.created` webhook

When these webhooks arrived first, the system would create "stub orders" with placeholder data to avoid errors, but these stub orders would remain with placeholder data instead of being updated with real customer information.

### Code Locations Where Stub Orders Were Created

1. **`src/lib/webhook-handlers.ts`** - `handleOrderUpdated()` function
2. **`src/lib/webhook-handlers.ts`** - `handlePaymentCreated()` function  
3. **`src/app/api/webhooks/square/route.ts`** - `handlePaymentCreated()` function

## Solution Implemented

### 1. Removed Stub Order Creation Logic

Instead of creating stub orders with placeholder data, the webhook handlers now:

- Log a warning when an order is not found
- Skip processing until the proper `order.created` webhook arrives
- Return early without creating any orders

### 2. Enhanced Customer Information Updates

Updated the `handlePaymentCreated` functions to:

- Check if existing orders have placeholder data
- Extract customer information from payment data (`buyer_email_address`, `receipt_email`, `buyer.phone_number`)
- Update orders with real customer information when payment webhooks arrive

### 3. Database Cleanup

Removed all existing stub orders from the database:

```sql
-- Removed payments associated with stub orders
DELETE FROM payments 
WHERE "orderId" IN (
  SELECT id FROM orders 
  WHERE email IN ('processing@example.com', 'pending@example.com') 
  OR "customerName" LIKE '%Processing%' 
  OR "customerName" = 'Pending'
);

-- Removed stub orders
DELETE FROM orders 
WHERE email IN ('processing@example.com', 'pending@example.com') 
OR "customerName" LIKE '%Processing%' 
OR "customerName" = 'Pending';
```

### 4. Monitoring Script

Created `scripts/monitor-stub-orders.ts` to detect future occurrences:

```bash
pnpm monitor-stub-orders
```

This script checks for orders with placeholder data and provides recommendations if found.

## Files Modified

### Core Webhook Handlers
- `src/lib/webhook-handlers.ts`
  - Removed stub order creation in `handleOrderUpdated()`
  - Enhanced `handlePaymentCreated()` to update customer information
- `src/app/api/webhooks/square/route.ts`
  - Removed stub order creation in `handlePaymentCreated()`
  - Enhanced customer information updates

### Monitoring
- `scripts/monitor-stub-orders.ts` - New monitoring script
- `package.json` - Added `monitor-stub-orders` script

## Prevention

The solution prevents future stub orders by:

1. **No more stub order creation** - Webhooks wait for proper order data
2. **Customer information updates** - Payment webhooks update placeholder data with real information
3. **Monitoring** - Regular checks to catch any future issues early

## Testing

To verify the fix:

1. Run the monitoring script: `pnpm monitor-stub-orders`
2. Check that no stub orders are found
3. Monitor webhook logs for proper order processing

## Impact

- ✅ Eliminates confusing stub orders in admin panel
- ✅ Improves data quality and customer experience
- ✅ Maintains webhook reliability without creating invalid data
- ✅ Provides monitoring to catch future issues early

## Related Issues

This fix addresses the specific order shown in the admin panel:
- **Order ID**: `a52b2007-1240-4b60-bc62-56ba88c6f664`
- **Square Order ID**: `789dY2S0D34lvy5cxmszhUt6he4F`
- **Customer**: "Order Update Processing"
- **Email**: "processing@example.com"
- **Total**: $0.00 