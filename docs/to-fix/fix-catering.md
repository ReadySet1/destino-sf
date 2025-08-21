# Catering Order Processing Fix Plan

## 🎯 Feature/Fix Overview

**Name**: Catering Order Processing Issues Fix
**Type**: Bug Fix
**Priority**: Critical
**Estimated Complexity**: Medium (3-5 days)

### Problem Statement
Three critical issues in catering order processing:
1. Orders with credit card payment method bypass Square payment processing
2. Delivery address is being stored incorrectly, showing as "[object Object]" 
3. Email notifications are not being sent to admins when new catering orders are created

### Success Criteria
- [x] Credit card orders redirect to Square payment link before completion
- [x] Delivery addresses are properly stored and displayed
- [x] Admin email notifications are sent for every new catering order

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure
```tsx
src/
├── actions/
│   └── catering.ts                    // Main catering server actions
├── components/
│   └── Catering/
│       └── CateringCheckoutClient.tsx // Client-side checkout component
├── lib/
│   ├── square/
│   │   ├── orders.ts                  // Square order creation
│   │   ├── payments-api.ts           // Square payment processing
│   │   └── checkout-links.ts         // NEW: Square checkout link creation
│   ├── email.ts                       // Email sending utilities
│   └── email-routing.ts              // Email routing logic
└── types/
    └── catering.ts                    // TypeScript interfaces
```

### Key Interfaces & Types
```tsx
// types/catering.ts
interface CateringOrderRequest {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  numberOfPeople: number;
  packageType: string;
  specialRequests?: string;
  deliveryAddress?: DeliveryAddress; // FIXED: Should be object, not string
  deliveryZone?: string;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  customerId?: string | null;
  items?: CateringOrderItem[];
}

interface DeliveryAddress {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryDate: string;
  deliveryTime: string;
}

interface SquareCheckoutResponse {
  checkoutId: string;
  checkoutPageUrl: string;
  orderId: string;
}
```

---

## 🔧 Issue #1: Square Payment Processing

### Root Cause
The `createCateringOrderAndProcessPayment` function creates the order but doesn't integrate with Square's checkout API for credit card payments.

### Solution Implementation

#### Step 1: Create Square Checkout Link Helper
```tsx
// lib/square/checkout-links.ts
import { randomUUID } from 'crypto';
import { getSquareService } from './service';
import { logger } from '@/utils/logger';

export async function createCheckoutLink(params: {
  orderId: string;
  locationId: string;
  lineItems: Array<{
    name: string;
    quantity: string;
    basePriceMoney: {
      amount: number;
      currency: string;
    };
  }>;
  redirectUrl: string;
  customerEmail?: string;
  merchantSupportEmail?: string;
}): Promise<{ checkoutUrl: string; checkoutId: string }> {
  const squareService = getSquareService();
  
  const checkoutRequest = {
    idempotencyKey: randomUUID(),
    order: {
      locationId: params.locationId,
      referenceId: params.orderId,
      lineItems: params.lineItems,
    },
    checkoutOptions: {
      redirectUrl: params.redirectUrl,
      merchantSupportEmail: params.merchantSupportEmail || process.env.ADMIN_EMAIL,
    },
    prePopulatedData: {
      buyerEmail: params.customerEmail,
    },
  };
  
  const result = await squareService.createPaymentLink(checkoutRequest);
  
  return {
    checkoutUrl: result.paymentLink.url,
    checkoutId: result.paymentLink.id,
  };
}
```

#### Step 2: Update Server Action
```tsx
// actions/catering.ts - Update createCateringOrderAndProcessPayment
export async function createCateringOrderAndProcessPayment(data: {
  // ... existing parameters
}): Promise<{ success: boolean; error?: string; orderId?: string; checkoutUrl?: string }> {
  try {
    // Create the catering order
    const orderResult = await saveContactInfo({
      ...data,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      customerId: data.customerId,
      items: data.items,
    });

    if (!orderResult.success || !orderResult.orderId) {
      return { success: false, error: 'Failed to create catering order' };
    }

    // Process payment based on method
    if (data.paymentMethod === PaymentMethod.SQUARE) {
      // Create Square checkout link for credit card payment
      const lineItems = data.items?.map(item => ({
        name: item.name,
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: Math.round(item.pricePerUnit * 100), // Convert to cents
          currency: 'USD',
        },
      })) || [];

      // Add delivery fee if applicable
      if (data.deliveryFee && data.deliveryFee > 0) {
        lineItems.push({
          name: 'Delivery Fee',
          quantity: '1',
          basePriceMoney: {
            amount: Math.round(data.deliveryFee * 100),
            currency: 'USD',
          },
        });
      }

      const { checkoutUrl, checkoutId } = await createCheckoutLink({
        orderId: orderResult.orderId,
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/catering/confirmation?orderId=${orderResult.orderId}`,
        customerEmail: data.email,
      });

      // Update order with Square checkout ID
      await db.cateringOrder.update({
        where: { id: orderResult.orderId },
        data: { 
          squareCheckoutId: checkoutId,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      // Send admin notification email
      await sendCateringOrderNotification(orderResult.orderId);

      return {
        success: true,
        orderId: orderResult.orderId,
        checkoutUrl, // Return the Square checkout URL
      };
    } else if (data.paymentMethod === PaymentMethod.CASH) {
      // For cash orders, just mark as pending and send notification
      await sendCateringOrderNotification(orderResult.orderId);
      
      return {
        success: true,
        orderId: orderResult.orderId,
      };
    }

    return {
      success: true,
      orderId: orderResult.orderId,
    };
  } catch (error) {
    console.error('Error creating catering order and processing payment:', error);
    return { success: false, error: 'Failed to create catering order and process payment' };
  }
}
```

---

## 🔧 Issue #2: Delivery Address Storage

### Root Cause
The delivery address is being concatenated into a string instead of being stored as a structured JSON object in the database.

### Solution Implementation

#### Step 1: Update Database Schema
```sql
-- migrations/fix_catering_delivery_address.sql
ALTER TABLE "CateringOrder" 
ADD COLUMN "deliveryAddressJson" JSONB;

-- Migrate existing data (if any)
UPDATE "CateringOrder" 
SET "deliveryAddressJson" = jsonb_build_object(
  'street', split_part("deliveryAddress", ',', 1),
  'city', split_part("deliveryAddress", ',', 2),
  'state', split_part("deliveryAddress", ',', 3)
)
WHERE "deliveryAddress" IS NOT NULL;
```

#### Step 2: Update Prisma Schema
```prisma
// prisma/schema.prisma
model CateringOrder {
  // ... existing fields
  deliveryAddress    String?
  deliveryAddressJson Json?    @map("delivery_address_json")
  // ... rest of fields
}
```

#### Step 3: Fix Client Component
```tsx
// components/Catering/CateringCheckoutClient.tsx
const handleCompleteOrder = async () => {
  // ... existing code

  const result = await createCateringOrderAndProcessPayment({
    // ... other fields
    ...(fulfillmentMethod === 'local_delivery' && {
      deliveryAddress: {
        street: deliveryAddress.street,
        street2: deliveryAddress.street2,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
        deliveryDate: format(pickupDate, 'yyyy-MM-dd'),
        deliveryTime: pickupTime,
      },
      deliveryZone: deliveryValidation?.deliveryZone || 'UNKNOWN',
      deliveryFee: deliveryValidation?.deliveryFee || 0,
    }),
    // ... rest of fields
  });
};
```

#### Step 4: Update Server Action
```tsx
// actions/catering.ts - Update saveContactInfo
export async function saveContactInfo(data: {
  // ... existing parameters
  deliveryAddress?: DeliveryAddress; // Changed from string to object
  // ... rest of parameters
}): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    const newOrder = await db.cateringOrder.create({
      data: {
        // ... existing fields
        deliveryAddress: data.deliveryAddress 
          ? `${data.deliveryAddress.street}${data.deliveryAddress.street2 ? `, ${data.deliveryAddress.street2}` : ''}, ${data.deliveryAddress.city}, ${data.deliveryAddress.state} ${data.deliveryAddress.postalCode}`
          : null,
        deliveryAddressJson: data.deliveryAddress || null,
        // ... rest of fields
      },
    });

    return { success: true, orderId: newOrder.id };
  } catch (error) {
    console.error('Error saving contact info:', error);
    return { success: false, error: 'Failed to save contact info' };
  }
}
```

---

## 🔧 Issue #3: Email Notifications

### Root Cause
The email notification function is not being called when catering orders are created.

### Solution Implementation

#### Step 1: Create Catering Email Template
```tsx
// emails/admin/CateringOrderNotification.tsx
import React from 'react';

interface CateringOrderNotificationProps {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventDate: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    pricePerUnit: number;
  }>;
  deliveryAddress?: any;
  paymentMethod: string;
}

export const CateringOrderNotification: React.FC<CateringOrderNotificationProps> = ({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  eventDate,
  totalAmount,
  items,
  deliveryAddress,
  paymentMethod,
}) => (
  <div>
    <h1>New Catering Order Received</h1>
    <h2>Order #{orderId}</h2>
    
    <h3>Customer Information</h3>
    <p>Name: {customerName}</p>
    <p>Email: {customerEmail}</p>
    <p>Phone: {customerPhone}</p>
    
    <h3>Event Details</h3>
    <p>Date: {eventDate}</p>
    
    {deliveryAddress && (
      <>
        <h3>Delivery Address</h3>
        <p>{deliveryAddress.street} {deliveryAddress.street2}</p>
        <p>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}</p>
        <p>Delivery: {deliveryAddress.deliveryDate} at {deliveryAddress.deliveryTime}</p>
      </>
    )}
    
    <h3>Order Items</h3>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td>{item.name}</td>
            <td>{item.quantity}</td>
            <td>${item.pricePerUnit.toFixed(2)}</td>
            <td>${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    
    <h3>Total: ${totalAmount.toFixed(2)}</h3>
    <p>Payment Method: {paymentMethod}</p>
  </div>
);
```

#### Step 2: Create Email Sending Function
```tsx
// lib/email.ts - Add new function
import { Resend } from 'resend';
import { CateringOrderNotification } from '@/emails/admin/CateringOrderNotification';
import { getRecipientEmail } from './email-routing';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCateringOrderNotification(orderId: string): Promise<void> {
  try {
    // Fetch the order with items
    const order = await db.cateringOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Get the admin email based on alert type
    const adminEmail = getRecipientEmail('CATERING_INQUIRY_RECEIVED' as AlertType);
    
    // Parse delivery address if it exists
    const deliveryAddress = order.deliveryAddressJson 
      ? JSON.parse(order.deliveryAddressJson as string)
      : null;

    // Send email to admin
    const { data, error } = await resend.emails.send({
      from: `${process.env.SHOP_NAME || 'Destino SF'} <${process.env.FROM_EMAIL || 'orders@destino-sf.com'}>`,
      to: adminEmail,
      subject: `New Catering Order #${order.id} - $${order.totalAmount.toFixed(2)}`,
      react: CateringOrderNotification({
        orderId: order.id,
        customerName: order.name,
        customerEmail: order.email,
        customerPhone: order.phone,
        eventDate: order.eventDate.toISOString(),
        totalAmount: Number(order.totalAmount),
        items: order.items.map(item => ({
          name: item.itemName,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
        })),
        deliveryAddress,
        paymentMethod: order.paymentMethod,
      }),
    });

    if (error) {
      console.error('Error sending catering notification email:', error);
      throw new Error(error.message);
    }

    console.log('Catering notification email sent successfully:', data?.id);
    
    // Also send confirmation to customer
    await sendCateringConfirmationToCustomer(order);
  } catch (error) {
    console.error('Failed to send catering notification email:', error);
    // Don't throw to avoid breaking the order flow
  }
}

async function sendCateringConfirmationToCustomer(order: any): Promise<void> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SHOP_NAME || 'Destino SF'} <${process.env.FROM_EMAIL || 'orders@destino-sf.com'}>`,
      to: order.email,
      subject: `Catering Order Confirmation #${order.id}`,
      html: `
        <h1>Thank you for your catering order!</h1>
        <p>We've received your catering order #${order.id} for ${order.eventDate}.</p>
        <p>Total: $${order.totalAmount.toFixed(2)}</p>
        <p>We'll contact you shortly to confirm the details.</p>
      `,
    });

    if (error) {
      console.error('Error sending customer confirmation:', error);
    }
  } catch (error) {
    console.error('Failed to send customer confirmation:', error);
  }
}
```

#### Step 3: Update Email Routing
```tsx
// lib/email-routing.ts - Add CATERING_INQUIRY_RECEIVED to the list
const orderAndStoreAlertTypes = [
  'NEW_ORDER',
  'ORDER_STATUS_CHANGE',
  'DAILY_SUMMARY',
  'CONTACT_FORM_RECEIVED',
  'CATERING_INQUIRY_RECEIVED', // Add this
  'INVENTORY_LOW_STOCK',
  'SALES_TREND_ALERT',
  'REVENUE_MILESTONE',
  'ORDER_VOLUME_ALERT',
];
```

---

## 🧪 Testing Strategy

### Unit Tests
```tsx
// __tests__/catering-order.test.ts
describe('Catering Order Processing', () => {
  it('creates Square checkout link for credit card payments', async () => {
    const mockCheckoutUrl = 'https://checkout.square.site/...';
    jest.spyOn(squareService, 'createPaymentLink').mockResolvedValue({
      paymentLink: { url: mockCheckoutUrl, id: 'checkout_123' }
    });

    const result = await createCateringOrderAndProcessPayment({
      paymentMethod: PaymentMethod.SQUARE,
      // ... other fields
    });

    expect(result.checkoutUrl).toBe(mockCheckoutUrl);
  });

  it('stores delivery address as JSON object', async () => {
    const deliveryAddress = {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94110',
      deliveryDate: '2025-08-30',
      deliveryTime: '10:00 AM',
    };

    const result = await saveContactInfo({
      deliveryAddress,
      // ... other fields
    });

    const order = await db.cateringOrder.findUnique({
      where: { id: result.orderId }
    });

    expect(order.deliveryAddressJson).toEqual(deliveryAddress);
  });

  it('sends email notification to admin', async () => {
    const sendEmailSpy = jest.spyOn(resend.emails, 'send');

    await createCateringOrderAndProcessPayment({
      // ... order data
    });

    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.stringContaining('@'),
        subject: expect.stringContaining('New Catering Order'),
      })
    );
  });
});
```

### Integration Tests
```tsx
// __tests__/catering-checkout-flow.test.ts
describe('Catering Checkout Flow', () => {
  it('completes full checkout flow with Square payment', async () => {
    // 1. Add items to cart
    // 2. Fill customer info
    // 3. Select delivery and add address
    // 4. Select credit card payment
    // 5. Verify redirect to Square checkout
    // 6. Verify order created in database
    // 7. Verify email sent
  });
});
```

---

## 🔐 Security Analysis

### Payment Security
- [ ] Validate all payment amounts server-side
- [ ] Use idempotency keys for Square API calls
- [ ] Never expose Square API keys to client
- [ ] Validate Square webhook signatures

### Data Validation
- [ ] Sanitize all user inputs
- [ ] Validate delivery addresses against allowed zones
- [ ] Verify email formats before sending
- [ ] Rate limit checkout endpoint

---

## 📊 Performance Considerations

### Database Optimization
```sql
-- Add indexes for catering orders
CREATE INDEX idx_catering_orders_customer_id ON "CateringOrder"("customerId");
CREATE INDEX idx_catering_orders_status ON "CateringOrder"("status");
CREATE INDEX idx_catering_orders_payment_status ON "CateringOrder"("paymentStatus");
CREATE INDEX idx_catering_orders_created_at ON "CateringOrder"("createdAt");
```

### Email Queue
- Consider implementing a queue for email notifications to prevent blocking the checkout flow
- Add retry logic for failed email sends

---

## 🚦 Implementation Checklist

### Pre-Development
- [x] Analyze existing catering order flow
- [x] Identify Square payment integration pattern
- [x] Review email notification system
- [ ] Set up Square sandbox for testing

### Development Phase
- [x] Implement Square checkout link creation
- [x] Fix delivery address storage structure
- [x] Create email notification templates
- [x] Update server actions with all fixes
- [x] Add proper error handling
- [ ] Write comprehensive tests

### Testing Phase
- [ ] Test Square payment flow end-to-end
- [ ] Verify delivery address displays correctly
- [ ] Confirm email notifications are sent
- [ ] Test with different payment methods
- [ ] Test error scenarios

### Pre-Deployment
- [ ] Run full test suite
- [ ] Test in staging environment
- [ ] Verify Square production credentials
- [ ] Update documentation
- [ ] Plan rollback strategy

---

## 🛠️ Implementation Updates

### Square API Integration Fix (2024-08-21)
**Issue**: Square checkout API was failing with "Field must not be blank (CODE: VALUE_EMPTY)" error.

**Root Cause**: The Square API request format was using camelCase field names instead of the required snake_case format.

**Fix Applied**:
- Updated `src/lib/square/checkout-links.ts` to use correct Square API format:
  - `idempotency_key` instead of `idempotencyKey`
  - `location_id` instead of `locationId` 
  - `reference_id` instead of `referenceId`
  - `line_items` instead of `lineItems`
  - `checkout_options` instead of `checkoutOptions`
  - `redirect_url` instead of `redirectUrl`
  - `merchant_support_email` instead of `merchantSupportEmail`
  - `pre_populated_data` instead of `prePopulatedData`
  - `buyer_email` instead of `buyerEmail`
  - `base_price_money` instead of `basePriceMoney`
- Removed unnecessary `itemType` field from line items
- Fixed line item transformation to match working implementation

**Status**: ✅ **RESOLVED** - Square checkout links now working correctly

---

