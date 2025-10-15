# Master Fix Planning Template

## TypeScript/Next.js/PostgreSQL Full Stack Development

### Catering Order Payment & Confirmation Issues Fix

---

## 🎯 Feature/Fix Overview

**Name**: Catering Order Customer Data & Confirmation Issues

**Type**: Bug Fix

**Priority**: Critical

### Problem Statement

The catering order system has three critical issues:

1. Customer information is being saved as placeholder values ("Pending", "pending@example.com", "pending") in Square instead of using the actual customer data from the catering form
2. Order confirmation page showing "pending" status even when payment is marked as PAID
3. Double slashes in Square redirect URL (`destinosf.com//catering/confirmation`)

### Success Criteria

- [ ] Customer information correctly passed to Square during checkout creation
- [ ] Catering orders not duplicated as regular orders in webhook processing
- [ ] Order confirmation page displays correct payment/order status after successful payment
- [ ] Square redirect URL formatted correctly without double slashes

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// Files to Modify
src/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── square/
│   │           └── route.ts              // Update webhook to handle catering orders properly
│   └── catering/
│       └── confirmation/
│           ├── page.tsx                  // Fix status determination logic
│           └── CateringConfirmationContent.tsx
├── actions/
│   └── catering.ts                      // Update order creation with customer data
├── lib/
│   └── square/
│       └── checkout-links.ts            // Fix redirect URL formatting
└── types/
    └── catering.ts                      // Ensure proper types for customer data
```

### Key Interfaces & Types

```tsx
// types/catering.ts (Add/Update)
interface CateringOrderCustomerData {
  name: string;
  email: string;
  phone: string;
  squareCustomerId?: string;
}

interface SquareWebhookCateringPayload {
  orderId: string;
  paymentId: string;
  customerData?: {
    email?: string;
    phone?: string;
    name?: string;
  };
}

// Update existing CateringOrder to ensure customer fields are required
interface CateringOrder {
  // ... existing fields
  name: string; // Not nullable
  email: string; // Not nullable
  phone: string; // Not nullable
  squareOrderId?: string;
  squareCheckoutId?: string;
  squareCustomerId?: string;
}
```

### Database Schema Reference

```sql
-- Already exists, but ensure these fields are properly populated
-- CateringOrder table
-- name: String (not nullable)
-- email: String (not nullable)
-- phone: String (not nullable)
-- squareOrderId: String? (nullable)
-- squareCheckoutId: String? (nullable)
-- paymentStatus: PaymentStatus
-- status: CateringStatus
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [ ] Maintain existing catering order creation flow
- [ ] Keep Square checkout integration working
- [ ] Preserve webhook processing for payment updates

### Implementation Assumptions

- Square sends customer data in payment.created/updated webhooks
- CateringOrder uses squareOrderId to link with Square payments
- Confirmation page should trust database state over URL parameters

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// Existing webhook endpoint to modify
POST /api/webhooks/square - Process Square payment webhooks for catering orders
```

### Server Actions (App Router)

```tsx
// actions/catering.ts - Modify existing
async function createCateringOrderAndProcessPayment(data): Promise<...>
async function updateCateringOrderFromWebhook(orderId, customerData): Promise<...> // NEW
```

### Client-Server Data Flow

1. Client submits catering order with customer info
2. Server creates catering order with actual customer data
3. Square checkout link generated with customer data pre-populated
4. Customer completes payment on Square
5. Square webhook only updates payment status (doesn't create duplicate order)
6. Confirmation page fetches order from DB and displays correct status

---

## 🔧 Implementation Details

### Issue 1: Customer Information Saved as Placeholders

**Root Cause**: When creating a regular order (not catering), the system creates placeholder customer data ("Pending", "pending@example.com") because the order is created from a webhook before customer data is available. However, catering orders ALREADY have the customer data from the form submission, but the webhook handler is incorrectly overwriting it with placeholders.

**Fix**:

```tsx
// src/app/api/webhooks/square/route.ts

// In handleOrderCreated function, check if this is a catering order:
async function handleOrderCreated(payload: SquareWebhookPayload): Promise<void> {
  const { data } = payload;
  const squareOrderData = data.object.order_created as any;

  // Check if this is a catering order first
  const cateringOrder = await prisma.cateringOrder.findUnique({
    where: { squareOrderId: data.id },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (cateringOrder) {
    // This is a catering order - don't create a regular order
    // Catering orders already have customer data from the form
    console.log(`✅ Catering order ${cateringOrder.id} already exists with Square ID ${data.id}`);
    return;
  }

  // Only create regular orders for non-catering checkouts
  // Continue with existing regular order creation logic...
  await prisma.order.upsert({
    where: { squareOrderId: data.id },
    create: {
      squareOrderId: data.id,
      status: orderStatus,
      total: 0,
      customerName: 'Pending', // These placeholders are OK for regular orders
      email: 'pending@example.com',
      phone: 'pending',
      // ...
    },
  });
}

// Also fix the catering order creation to save Square Order ID immediately:
// src/actions/catering.ts - in createCateringOrderAndProcessPayment

// After creating checkout link, update with Square order ID
const {
  checkoutUrl,
  checkoutId,
  orderId: squareOrderId,
} = await createCheckoutLink({
  orderId: orderResult.orderId,
  locationId: process.env.SQUARE_LOCATION_ID!,
  lineItems: lineItemsWithDelivery,
  redirectUrl: `${cleanAppUrl}/catering/confirmation?orderId=${orderResult.orderId}`,
  customerEmail: data.email, // Pass actual customer email
  customerName: data.name, // Pass actual customer name
  customerPhone: data.phone, // Pass actual customer phone
});

// Update order with Square IDs
await db.cateringOrder.update({
  where: { id: orderResult.orderId },
  data: {
    squareCheckoutId: checkoutId,
    squareOrderId: squareOrderId, // Save Square order ID immediately
    paymentStatus: PaymentStatus.PENDING,
  },
});
```

**Additional Fix - Update checkout-links.ts to accept more customer data:**

```tsx
// src/lib/square/checkout-links.ts

export interface SquareCheckoutLinkParams {
  orderId: string;
  locationId: string;
  lineItems: Array<{...}>;
  redirectUrl: string;
  customerEmail?: string;
  customerName?: string;    // ADD
  customerPhone?: string;   // ADD
  merchantSupportEmail?: string;
}

// In createCheckoutLink function:
const squareRequestBody = {
  idempotency_key: randomUUID(),
  order: {
    location_id: params.locationId,
    reference_id: params.orderId,
    line_items: params.lineItems,
  },
  checkout_options: {
    redirect_url: params.redirectUrl,
    merchant_support_email: params.merchantSupportEmail || process.env.ADMIN_EMAIL,
  },
  pre_populated_data: {
    buyer_email: params.customerEmail,
    // Add buyer phone if available
    ...(params.customerPhone && {
      buyer_phone_number: params.customerPhone,
    }),
  },
};
```

### Issue 2: Order Confirmation Status

**Root Cause**: The confirmation page relies on URL parameters but doesn't properly check the database for actual payment status.

**Fix**:

```tsx
// src/app/catering/confirmation/page.tsx

// Update status determination logic:
if (orderData) {
  // Trust database state over URL parameters
  if (orderData.paymentStatus === 'PAID') {
    actualStatus = 'success';
  } else if (orderData.paymentStatus === 'FAILED' || orderData.status === 'CANCELLED') {
    actualStatus = 'failed';
  } else if (orderData.paymentStatus === 'PENDING') {
    // Check if order was recently created (within 5 minutes)
    const orderAge = Date.now() - new Date(orderData.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (orderAge < fiveMinutes) {
      // Recent order, might still be processing
      actualStatus = 'processing';
    } else {
      actualStatus = 'pending';
    }
  }
}
```

### Issue 3: Double Slash in Redirect URL

**Root Cause**: The redirect URL is constructed with a hardcoded slash, but `NEXT_PUBLIC_APP_URL` might already end with a slash.

**Fix**:

```tsx
// src/lib/square/checkout-links.ts

// In createCheckoutLink function:
const cleanAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''); // Remove trailing slash
const redirectUrl = `${cleanAppUrl}/catering/confirmation?orderId=${params.orderId}`;

// Use the cleaned URL
checkout_options: {
  redirect_url: redirectUrl,
  merchant_support_email: params.merchantSupportEmail || process.env.ADMIN_EMAIL,
}
```

```tsx
// src/actions/catering.ts

// In createCateringOrderAndProcessPayment:
const cleanAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
const { checkoutUrl, checkoutId } = await createCheckoutLink({
  orderId: orderResult.orderId,
  locationId: process.env.SQUARE_LOCATION_ID!,
  lineItems: lineItemsWithDelivery,
  redirectUrl: `${cleanAppUrl}/catering/confirmation?orderId=${orderResult.orderId}`,
  customerEmail: data.email,
});
```

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Test webhook customer data extraction
describe('Square Webhook Handler', () => {
  it('extracts customer data from payment payload', async () => {
    const payload = mockPaymentPayload();
    const customerData = extractCustomerData(payload);
    expect(customerData.email).toBe('test@example.com');
  });

  it('updates catering order with customer info', async () => {
    const order = await updateCateringOrderFromWebhook(orderId, customerData);
    expect(order.email).not.toBe('pending@example.com');
  });
});

// Test URL formatting
describe('Checkout URL Generation', () => {
  it('removes double slashes from redirect URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/';
    const url = generateRedirectUrl(orderId);
    expect(url).not.toContain('//catering');
  });
});
```

### Integration Tests

```tsx
// Test full flow from order creation to confirmation
describe('Catering Order Payment Flow', () => {
  it('creates order with customer data', async () => {
    const order = await createCateringOrder(customerData);
    expect(order.name).toBe(customerData.name);
  });

  it('updates order status after payment webhook', async () => {
    await simulatePaymentWebhook(orderId);
    const order = await getCateringOrder(orderId);
    expect(order.paymentStatus).toBe('PAID');
    expect(order.status).toBe('CONFIRMED');
  });

  it('confirmation page shows correct status', async () => {
    const { status } = await getConfirmationPageData(orderId);
    expect(status).toBe('success');
  });
});
```

### E2E Tests (Playwright)

```tsx
test.describe('Catering Order E2E', () => {
  test('complete catering order with payment', async ({ page }) => {
    // Fill order form
    await page.goto('/catering');
    await page.fill('[name="name"]', 'John Doe');
    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="phone"]', '555-1234');

    // Submit and go to Square checkout
    await page.click('button[type="submit"]');

    // Complete Square payment (sandbox)
    // ...

    // Verify confirmation page
    await page.waitForURL(/\/catering\/confirmation/);
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
    await expect(page.locator('text=john@example.com')).toBeVisible();
  });
});
```

---

## 🔒 Security Analysis

### Input Validation & Sanitization

```tsx
// Validate customer data from webhooks
const validateCustomerData = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-\+\(\)]+$/)
    .optional(),
  name: z.string().min(1).max(100).optional(),
});

// Sanitize before database update
const sanitizedData = {
  email: DOMPurify.sanitize(customerData.email),
  phone: customerData.phone.replace(/[^\d\s\-\+\(\)]/g, ''),
  name: DOMPurify.sanitize(customerData.name),
};
```

### Webhook Security

- [ ] Verify Square webhook signatures
- [ ] Validate webhook event IDs to prevent replay attacks
- [ ] Check order ownership before updates
- [ ] Rate limit webhook endpoints

### Data Protection

- [ ] Don't expose sensitive customer data in URLs
- [ ] Use secure session storage for order IDs
- [ ] Implement proper CORS policies

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Ensure indexes for frequent queries
CREATE INDEX idx_catering_orders_square_order_id ON CateringOrder(squareOrderId);
CREATE INDEX idx_catering_orders_payment_status ON CateringOrder(paymentStatus);
CREATE INDEX idx_catering_orders_created_at ON CateringOrder(createdAt DESC);
```

### Caching Strategy

- [ ] Cache order data on confirmation page for 30 seconds
- [ ] Use React Query for optimistic updates
- [ ] Implement webhook deduplication cache

---

## 🚦 Implementation Checklist

### Pre-Development

- [ ] Review current webhook logs for customer data availability
- [ ] Verify Square API sends customer info in webhooks
- [ ] Check environment variables for correct APP_URL format
- [ ] Set up test catering orders in Square sandbox

### Development Phase

- [ ] Fix webhook handler to update catering orders with customer data
- [ ] Update confirmation page status determination logic
- [ ] Fix redirect URL formatting to remove double slashes
- [ ] Add logging for debugging webhook data flow
- [ ] Test with Square sandbox webhooks
- [ ] Verify customer data persistence

### Pre-Deployment

- [ ] Run full test suite
- [ ] Test with actual Square webhook events
- [ ] Verify no breaking changes to existing orders
- [ ] Update documentation
- [ ] Plan database migration if needed
- [ ] Set up monitoring for webhook failures

---

## 📝 MCP Analysis Commands

### For Local Development

```bash
# Check current webhook implementation
filesystem:read_text_file path: src/app/api/webhooks/square/route.ts

# Review catering order types
filesystem:read_text_file path: src/types/catering.ts

# Check confirmation page logic
filesystem:read_text_file path: src/app/catering/confirmation/page.tsx

# Review checkout link generation
filesystem:read_text_file path: src/lib/square/checkout-links.ts

# Search for customer data handling
filesystem:search_files path: src pattern: "customerEmail|buyer_email"
```

---

## 📚 Documentation Updates

### Webhook Data Flow

```markdown
## Catering Order Webhook Flow

1. **Order Creation**:
   - Customer fills form with name, email, phone
   - Order created with provided data
   - Square checkout link generated

2. **Payment Processing**:
   - Customer pays on Square
   - Square sends payment.created/updated webhook
   - Webhook updates order with:
     - Payment status
     - Verified customer data from Square
     - Square order ID

3. **Confirmation Display**:
   - Page fetches order from database
   - Status determined by paymentStatus field
   - Customer info displayed from database
```

### Debugging Guide

```markdown
## Common Issues & Solutions

### Customer Data Shows "Pending"

- Check webhook logs for buyer_email_address field
- Verify webhook is updating catering orders, not just regular orders
- Ensure squareOrderId is properly linked

### Confirmation Shows Wrong Status

- Check database paymentStatus field
- Verify webhook is processing successfully
- Check for timing issues between redirect and webhook

### Double Slash in URL

- Check NEXT_PUBLIC_APP_URL environment variable
- Ensure no trailing slash in env var
- Verify URL construction in checkout-links.ts
```

---

## 🔄 Rollback Plan

### Feature Toggle

```tsx
// Use environment variable for gradual rollout
if (process.env.ENABLE_CATERING_FIX === 'true') {
  // New implementation with fixes
  await updateCateringOrderWithCustomerData(order, webhookData);
} else {
  // Previous implementation
  await legacyUpdateOrder(order);
}
```

### Database Rollback

```sql
-- If customer data gets corrupted, restore from backup
UPDATE CateringOrder
SET
  name = backup_name,
  email = backup_email,
  phone = backup_phone
WHERE
  updated_at > '2025-08-21'
  AND name = 'Pending';
```

### Monitoring & Alerts

- [ ] Monitor webhook success rate
- [ ] Track orders with "pending" customer data
- [ ] Alert on confirmation page errors
- [ ] Monitor Square API response times

---

## Implementation Priority

1. **First**: Fix double slash issue (Quick win, low risk)
2. **Second**: Fix webhook customer data updating (Critical for user experience)
3. **Third**: Fix confirmation page status logic (Improves reliability)

## Estimated Timeline

- Day 1: Fix URL formatting and test
- Day 2-3: Implement webhook customer data updates
- Day 4: Update confirmation page logic
- Day 5: Testing and deployment

This comprehensive plan addresses all three issues while maintaining system stability and providing clear rollback options.
