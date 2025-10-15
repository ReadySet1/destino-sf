# Master Fix Planning Template

## TypeScript/Next.js/PostgreSQL Full Stack Development

### Template Usage Instructions

This plan addresses the missing Shippo label creation functionality in your e-commerce system.

---

## 🎯 Feature/Fix Overview

**Name**: Automatic Shippo Label Creation After Payment

**Type**: Bug Fix / Enhancement

**Priority**: High

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

Orders with nationwide shipping are storing Shippo rate IDs but never automatically creating shipping labels after successful payment. The label creation functionality exists in `/src/app/actions/labels.ts` but is never triggered in the order flow.

### Success Criteria

- [x] Shipping labels are automatically created after successful Square payment for nationwide shipping orders
- [x] Labels are only created once payment is confirmed (webhook or polling)
- [x] Failed label creation attempts are logged and can be retried
- [x] Admin can manually trigger label creation from order details page

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// Modified Files
src/
├── app/
│   ├── actions/
│   │   ├── orders.ts                    // Add label creation trigger
│   │   └── labels.ts                    // Enhance retry logic
│   ├── api/
│   │   └── webhooks/
│   │       └── square/
│   │           └── route.ts              // Add label creation on payment
│   └── (dashboard)/
│       └── admin/
│           └── orders/
│               ├── [orderId]/
│               │   └── page.tsx          // Add manual label button
│               └── components/
│                   └── ShippingLabelButton.tsx  // New component
├── lib/
│   └── shippo/
│       └── label-creation.ts            // New centralized logic
└── types/
    └── shippo.ts                         // Already exists
```

### Key Interfaces & Types

```tsx
// types/shippo.ts (existing)
interface ShippingLabelResponse {
  success: boolean;
  labelUrl?: string;
  trackingNumber?: string;
  error?: string;
  errorCode?: string;
  retryAttempt?: number;
}

// New interface for label creation queue
interface LabelCreationJob {
  orderId: string;
  rateId: string;
  attempt: number;
  lastError?: string;
  createdAt: Date;
}
```

### Database Schema Reference

```sql
-- Already exists in Order table:
-- shippingRateId: String?
-- trackingNumber: String?
-- shippingCarrier: String?

-- Consider adding:
-- labelUrl: String?
-- labelCreatedAt: DateTime?
-- labelRetryCount: Int @default(0)
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [x] Trigger label creation after Square payment confirmation webhook
- [x] Store label URL and tracking number in Order table
- [x] Handle rate expiration with automatic refresh
- [x] Implement retry mechanism for failed attempts
- [x] Add manual trigger button in admin panel

### Implementation Assumptions

- Square webhook fires reliably for payment confirmations
- Shippo rates remain valid for at least 24 hours
- Maximum 3 retry attempts before manual intervention required

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// Existing webhook handler
POST /api/webhooks/square - Modify to trigger label creation

// New admin action
POST /api/admin/orders/[orderId]/create-label - Manual label creation
```

### Server Actions (App Router)

```tsx
// Modified: app/actions/orders.ts
async function handlePaymentConfirmation(orderId: string): Promise<void> {
  // Add label creation trigger
}

// Existing: app/actions/labels.ts
async function purchaseShippingLabel(
  orderId: string,
  rateId: string
): Promise<ShippingLabelResponse>;
async function refreshAndRetryLabel(orderId: string): Promise<ShippingLabelResponse>;
```

### Client-Server Data Flow

1. Square payment completed → Webhook received
2. Webhook handler validates payment status
3. If nationwide shipping, trigger label creation
4. Store label details in database
5. Send confirmation email with tracking

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Test label creation trigger
describe('Payment Confirmation Handler', () => {
  it('creates label for nationwide shipping orders', async () => {});
  it('skips label creation for pickup orders', async () => {});
  it('handles label creation failures gracefully', async () => {});
});

// Test retry mechanism
describe('Label Retry Logic', () => {
  it('refreshes expired rates', async () => {});
  it('respects maximum retry attempts', async () => {});
  it('logs failures for monitoring', async () => {});
});
```

### Integration Tests

```tsx
// End-to-end order flow
describe('Order to Label Flow', () => {
  it('creates label after successful payment', async () => {});
  it('handles Shippo API failures', async () => {});
  it('prevents duplicate label creation', async () => {});
});
```

---

## 🔒 Security Analysis

### Authentication & Authorization

- [x] Webhook signature validation for Square webhooks
- [x] Admin-only access for manual label creation
- [x] Rate limiting on manual label creation endpoint

### Input Validation & Sanitization

- [x] Validate order exists and has shipping details
- [x] Verify payment status before label creation
- [x] Sanitize Shippo API responses before storage

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Index for quick lookup of orders needing labels
CREATE INDEX idx_orders_shipping_label_pending
ON orders(id)
WHERE shippingRateId IS NOT NULL
AND trackingNumber IS NULL
AND paymentStatus = 'PAID';
```

### Caching Strategy

- [x] Cache Shippo client connection
- [x] Implement exponential backoff for retries
- [x] Queue label creation jobs to prevent blocking

---

## 🚦 Implementation Checklist

### Pre-Development

- [x] Review existing label creation code
- [x] Test Shippo API with test credentials
- [x] Identify all order fulfillment paths
- [x] Document current webhook flow

### Development Phase

1. **Modify Square Webhook Handler** (`/api/webhooks/square/route.ts`)
   - Add check for nationwide shipping orders
   - Call `purchaseShippingLabel` after payment confirmation
   - Log results for monitoring

2. **Enhance Label Creation** (`/app/actions/labels.ts`)
   - Add idempotency check to prevent duplicates
   - Improve error messages for debugging
   - Add telemetry for success/failure rates

3. **Add Admin UI Component** (`/admin/orders/components/ShippingLabelButton.tsx`)
   - Create button component with loading states
   - Show current label status
   - Handle manual retry with user feedback

4. **Update Order Details Page** (`/admin/orders/[orderId]/page.tsx`)
   - Import and render ShippingLabelButton
   - Display tracking number if available
   - Show label creation errors

5. **Create Centralized Label Logic** (`/lib/shippo/label-creation.ts`)
   - Extract common label creation logic
   - Add queue management for retries
   - Implement rate refresh mechanism

### Pre-Deployment

- [x] Test with Shippo test mode
- [x] Verify webhook signature validation
- [x] Test retry mechanism with failed attempts
- [x] Update monitoring for label creation metrics
- [x] Document manual intervention process

---

## 📝 MCP Analysis Commands

### For Local Development

```bash
# Check current webhook implementation
filesystem:read_text_file path: /Users/ealanis/Development/current-projects/destino-sf/src/app/api/webhooks/square/route.ts

# Review label creation action
filesystem:read_text_file path: /Users/ealanis/Development/current-projects/destino-sf/src/app/actions/labels.ts

# Check order model for shipping fields
filesystem:read_text_file path: /Users/ealanis/Development/current-projects/destino-sf/prisma/schema.prisma

# Search for existing label creation calls
filesystem:search_files path: /Users/ealanis/Development/current-projects/destino-sf/src pattern: purchaseShippingLabel
```

---

## 🎨 Code Implementation References

### 1. Webhook Handler Modification

**File**: `/src/app/api/webhooks/square/route.ts`

**Location**: After payment confirmation (around line where `updateOrderPayment` is called)

**Add**:

```typescript
// After successful payment update
if (order.fulfillmentType === 'nationwide_shipping' && order.shippingRateId) {
  // Trigger label creation asynchronously
  purchaseShippingLabel(order.id, order.shippingRateId)
    .then(result => {
      if (result.success) {
        console.log(`Label created for order ${order.id}: ${result.trackingNumber}`);
      } else {
        console.error(`Label creation failed for order ${order.id}: ${result.error}`);
        // Queue for retry or alert admin
      }
    })
    .catch(error => {
      console.error(`Unexpected error creating label for ${order.id}:`, error);
    });
}
```

### 2. Admin Button Component

**New File**: `/src/app/(dashboard)/admin/orders/components/ShippingLabelButton.tsx`

**Structure**:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { purchaseShippingLabel, refreshAndRetryLabel } from '@/app/actions/labels';
import { toast } from 'sonner';

interface ShippingLabelButtonProps {
  orderId: string;
  shippingRateId: string | null;
  trackingNumber: string | null;
  shippingCarrier: string | null;
}

export function ShippingLabelButton({
  orderId,
  shippingRateId,
  trackingNumber,
  shippingCarrier,
}: ShippingLabelButtonProps) {
  // Implementation
}
```

### 3. Order Details Page Integration

**File**: `/src/app/(dashboard)/admin/orders/[orderId]/page.tsx`

**Location**: After shipping information display (around line with tracking number display)

**Add**:

```typescript
import { ShippingLabelButton } from '../components/ShippingLabelButton';

// In the render, after tracking number display:
{serializedOrder?.fulfillmentType === 'nationwide_shipping' && (
  <ShippingLabelButton
    orderId={serializedOrder.id}
    shippingRateId={serializedOrder.shippingRateId}
    trackingNumber={serializedOrder.trackingNumber}
    shippingCarrier={serializedOrder.shippingCarrier}
  />
)}
```

### 4. Database Migration (Optional)

**File**: `/prisma/migrations/[timestamp]_add_label_fields.sql`

```sql
-- Add label tracking fields
ALTER TABLE "Order"
ADD COLUMN "labelUrl" TEXT,
ADD COLUMN "labelCreatedAt" TIMESTAMP(3),
ADD COLUMN "labelRetryCount" INTEGER DEFAULT 0;

-- Index for finding orders needing labels
CREATE INDEX "Order_label_pending_idx"
ON "Order"("id")
WHERE "shippingRateId" IS NOT NULL
AND "trackingNumber" IS NULL
AND "paymentStatus" = 'PAID';
```

---

## 📚 Documentation

### For Admin Users

1. **Automatic Label Creation**: Labels are created automatically after payment for nationwide shipping orders
2. **Manual Creation**: Use the "Create Shipping Label" button on order details if automatic creation fails
3. **Retry Logic**: System automatically retries up to 3 times with rate refresh
4. **Monitoring**: Check order notes for label creation errors

### For Developers

1. **Label Creation Flow**: Payment → Webhook → Label Creation → Database Update
2. **Error Handling**: All failures logged with specific error codes
3. **Rate Expiration**: Automatic refresh and retry on `RATE_EXPIRED` errors
4. **Idempotency**: Multiple calls with same order ID won't create duplicate labels

---

## 🔄 Rollback Plan

### Feature Toggle

```typescript
// Environment variable for gradual rollout
if (process.env.ENABLE_AUTO_LABEL_CREATION === 'true') {
  // New label creation logic
}
```

### Database Rollback

```sql
-- Rollback migration if needed
ALTER TABLE "Order"
DROP COLUMN IF EXISTS "labelUrl",
DROP COLUMN IF EXISTS "labelCreatedAt",
DROP COLUMN IF EXISTS "labelRetryCount";

DROP INDEX IF EXISTS "Order_label_pending_idx";
```

### Monitoring & Alerts

- [x] Track label creation success rate
- [x] Alert on high failure rate (>10%)
- [x] Monitor Shippo API response times
- [x] Track manual intervention frequency

---

## Implementation Priority

1. **Phase 1**: Add webhook trigger (High Priority)
2. **Phase 2**: Add admin manual button (Medium Priority)
3. **Phase 3**: Enhance retry logic (Low Priority)
4. **Phase 4**: Add monitoring/alerts (Low Priority)

This ensures basic functionality first, then improves reliability and observability.
