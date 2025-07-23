# 🚀 Checkout Recovery & Unification Implementation Guide

## 📋 Overview

Note: Phase 1 has been applied.

This guide addresses two critical issues in your e-commerce system:

1. **Pending Orders Without Recovery**: When Square payment fails, orders remain in `PENDING` status with no way for customers to retry payment
2. **Duplicated Checkout Systems**: Store and Catering have completely separate checkout flows, creating maintenance overhead

## 🎯 Implementation Phases

### Phase 1: Order Recovery System (URGENT)

### Phase 2: Checkout Session Persistence

### Phase 3: Unified Checkout Components

### Phase 4: Complete System Migration

---

## 🔧 Phase 1: Order Recovery System

### 1.1 Database Schema Updates

**File: `prisma/schema.prisma`**

```prisma
model Order {
  // ... existing fields ...

  // Add these new fields:
  paymentUrl          String?   @map("payment_url")           // Store Square checkout URL
  paymentUrlExpiresAt DateTime? @map("payment_url_expires_at") // URL expiration
  retryCount          Int       @default(0) @map("retry_count") // Track retry attempts
  lastRetryAt         DateTime? @map("last_retry_at")          // Last retry timestamp

  // ... rest of existing fields ...
}

// Add new status to existing enum
enum OrderStatus {
  PENDING
  PAYMENT_FAILED  // New status for failed payments
  PROCESSING
  READY
  COMPLETED
  CANCELLED
  FULFILLMENT_UPDATED
  SHIPPING
  DELIVERED
}
```

**Migration Command:**

```bash
npx prisma db push
npx prisma generate
```

### 1.2 Order Retry API Endpoint

**File: `src/app/api/orders/[orderId]/retry-payment/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { createSquareCheckoutSession } from '@/lib/square/checkout';
import { addHours } from 'date-fns';

const MAX_RETRY_ATTEMPTS = 3;
const CHECKOUT_URL_EXPIRY_HOURS = 24;

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = params;

    // Fetch order with validation
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: user.id, // Ensure user owns the order
        status: { in: ['PENDING', 'PAYMENT_FAILED'] },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or not eligible for retry' },
        { status: 404 }
      );
    }

    // Check retry limits
    if (order.retryCount >= MAX_RETRY_ATTEMPTS) {
      return NextResponse.json({ error: 'Maximum retry attempts exceeded' }, { status: 429 });
    }

    // Check if existing URL is still valid
    if (order.paymentUrl && order.paymentUrlExpiresAt && order.paymentUrlExpiresAt > new Date()) {
      return NextResponse.json({
        success: true,
        checkoutUrl: order.paymentUrl,
        expiresAt: order.paymentUrlExpiresAt,
      });
    }

    // Create new Square checkout session
    const squareResult = await createSquareCheckoutSession({
      orderId: order.id,
      orderItems: order.items,
      customerInfo: {
        name: order.customerName,
        email: order.email,
        phone: order.phone,
      },
      total: order.total,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?payment=cancelled`,
    });

    if (!squareResult.success || !squareResult.checkoutUrl) {
      return NextResponse.json(
        { error: squareResult.error || 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    // Update order with new checkout URL and retry info
    const expiresAt = addHours(new Date(), CHECKOUT_URL_EXPIRY_HOURS);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentUrl: squareResult.checkoutUrl,
        paymentUrlExpiresAt: expiresAt,
        retryCount: order.retryCount + 1,
        lastRetryAt: new Date(),
        status: 'PENDING', // Reset to pending for new attempt
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: squareResult.checkoutUrl,
      expiresAt,
      retryAttempt: order.retryCount + 1,
    });
  } catch (error) {
    console.error('Error in retry payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 1.3 Pending Orders Page

**File: `src/app/(store)/orders/pending/page.tsx`**

```typescript
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { PendingOrdersList } from '@/components/Orders/PendingOrdersList';

export default async function PendingOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?redirect=/orders/pending');
  }

  const pendingOrders = await prisma.order.findMany({
    where: {
      userId: user.id,
      status: { in: ['PENDING', 'PAYMENT_FAILED'] },
      paymentStatus: { in: ['PENDING', 'FAILED'] }
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pending Orders</h1>
        <p className="text-gray-600 mt-2">
          Complete your pending orders by retrying payment
        </p>
      </div>

      <PendingOrdersList orders={pendingOrders} />
    </div>
  );
}
```

### 1.4 Pending Orders Component

**File: `src/components/Orders/PendingOrdersList.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { CreditCard, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PendingOrder {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  retryCount: number;
  paymentUrlExpiresAt: Date | null;
  items: Array<{
    quantity: number;
    price: number;
    product: {
      name: string;
    };
    variant?: {
      name: string;
    };
  }>;
}

interface Props {
  orders: PendingOrder[];
}

export function PendingOrdersList({ orders }: Props) {
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const handleRetryPayment = async (orderId: string) => {
    setRetryingOrderId(orderId);

    try {
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retry payment');
      }

      if (result.success && result.checkoutUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Retry payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    } finally {
      setRetryingOrderId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Pending Orders
            </h3>
            <p className="text-gray-500">
              All your orders have been completed or are being processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  Order #{order.id.slice(-8)}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  ${order.total.toFixed(2)}
                </div>
                <Badge variant={order.status === 'PAYMENT_FAILED' ? 'destructive' : 'secondary'}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Order Items Summary */}
            <div className="text-sm">
              <h4 className="font-medium mb-2">Items:</h4>
              <ul className="space-y-1 text-gray-600">
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.quantity}x {item.product.name}
                    {item.variant && ` (${item.variant.name})`} - ${(item.price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Retry Information */}
            {order.retryCount > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment retry attempts: {order.retryCount}/3
                </AlertDescription>
              </Alert>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleRetryPayment(order.id)}
                disabled={retryingOrderId === order.id || order.retryCount >= 3}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {retryingOrderId === order.id ? 'Processing...' : 'Retry Payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 1.5 Update Existing Order Details Page

**File: `src/app/(store)/orders/[orderId]/page.tsx` (modifications)**

Add retry payment button to existing order details:

```typescript
// Add this import
import { RetryPaymentButton } from '@/components/Orders/RetryPaymentButton';

// In the component, add condition for showing retry button:
{order.status === 'PENDING' || order.status === 'PAYMENT_FAILED' ? (
  <div className="mt-4">
    <RetryPaymentButton
      orderId={order.id}
      retryCount={order.retryCount}
      disabled={order.retryCount >= 3}
    />
  </div>
) : null}
```

**File: `src/components/Orders/RetryPaymentButton.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  orderId: string;
  retryCount: number;
  disabled?: boolean;
}

export function RetryPaymentButton({ orderId, retryCount, disabled }: Props) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/retry-payment`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retry payment');
      }

      if (result.success && result.checkoutUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant="default"
      className="flex items-center gap-2"
    >
      <CreditCard className="h-4 w-4" />
      {isRetrying ? 'Processing...' : 'Retry Payment'}
    </Button>
  );
}
```

### 1.6 Update Main Order Creation Function

**File: `src/app/actions/orders.ts` (modifications)**

Update the `createOrderAndGenerateCheckoutUrl` function to store payment URL:

```typescript
// Add this after Square checkout URL creation (around line 500+)
// Store checkout URL with expiration
const expiresAt = addHours(new Date(), 24); // 24 hours expiry

await prisma.order.update({
  where: { id: dbOrder.id },
  data: {
    paymentUrl: checkoutUrl,
    paymentUrlExpiresAt: expiresAt,
    squareOrderId: squareOrderResult.order?.id,
  },
});
```

---

## 🔄 Phase 2: Checkout Session Persistence

### 2.1 Checkout Persistence Utility

**File: `src/lib/checkout-persistence.ts`**

```typescript
interface CheckoutSession {
  id: string;
  type: 'store' | 'catering';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  fulfillmentMethod: string;
  fulfillmentData: any;
  paymentMethod: string;
  items: any[];
  timestamp: number;
  expiresAt: number;
}

const SESSION_KEY = 'destino_checkout_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class CheckoutPersistence {
  static save(session: Omit<CheckoutSession, 'id' | 'timestamp' | 'expiresAt'>): string {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const expiresAt = timestamp + SESSION_DURATION;

    const fullSession: CheckoutSession = {
      ...session,
      id,
      timestamp,
      expiresAt,
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullSession));
      return id;
    } catch (error) {
      console.error('Failed to save checkout session:', error);
      return id;
    }
  }

  static load(): CheckoutSession | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: CheckoutSession = JSON.parse(stored);

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        this.clear();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load checkout session:', error);
      this.clear();
      return null;
    }
  }

  static update(updates: Partial<CheckoutSession>): void {
    const current = this.load();
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update checkout session:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear checkout session:', error);
    }
  }

  static isExpired(): boolean {
    const session = this.load();
    return !session || Date.now() > session.expiresAt;
  }
}
```

### 2.2 Session Recovery Hook

**File: `src/hooks/useCheckoutRecovery.ts`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { CheckoutPersistence } from '@/lib/checkout-persistence';
import type { CheckoutSession } from '@/lib/checkout-persistence';

export function useCheckoutRecovery(checkoutType: 'store' | 'catering') {
  const [recoveredSession, setRecoveredSession] = useState<CheckoutSession | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  useEffect(() => {
    const session = CheckoutPersistence.load();

    if (session && session.type === checkoutType) {
      setRecoveredSession(session);
      setShowRecoveryPrompt(true);
    }
  }, [checkoutType]);

  const acceptRecovery = () => {
    setShowRecoveryPrompt(false);
    return recoveredSession;
  };

  const declineRecovery = () => {
    CheckoutPersistence.clear();
    setRecoveredSession(null);
    setShowRecoveryPrompt(false);
  };

  const saveSession = (sessionData: Omit<CheckoutSession, 'id' | 'timestamp' | 'expiresAt'>) => {
    return CheckoutPersistence.save(sessionData);
  };

  const clearSession = () => {
    CheckoutPersistence.clear();
    setRecoveredSession(null);
    setShowRecoveryPrompt(false);
  };

  return {
    recoveredSession,
    showRecoveryPrompt,
    acceptRecovery,
    declineRecovery,
    saveSession,
    clearSession,
  };
}
```

---

## 🔗 Phase 3: Unified Checkout Components

### 3.1 Unified Cart Store

**File: `src/store/unified-cart.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartType = 'store' | 'catering';

export interface UnifiedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: CartType;
  variantId?: string;
  variantName?: string;
  image?: string;
  // Catering specific
  servingSize?: number;
  category?: string;
}

interface UnifiedCartState {
  items: UnifiedCartItem[];
  cartType: CartType | null;

  // Actions
  addItem: (item: UnifiedCartItem) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  setCartType: (type: CartType) => void;

  // Getters
  getItemsByType: (type: CartType) => UnifiedCartItem[];
  getTotalByType: (type: CartType) => number;
  getItemCount: () => number;
  canAddItemType: (type: CartType) => boolean;
}

export const useUnifiedCartStore = create<UnifiedCartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartType: null,

      addItem: item => {
        const state = get();

        // Prevent mixing cart types
        if (state.cartType && state.cartType !== item.type) {
          throw new Error(`Cannot mix ${state.cartType} and ${item.type} items in cart`);
        }

        const existingItemIndex = state.items.findIndex(
          i => i.id === item.id && i.variantId === item.variantId && i.type === item.type
        );

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...state.items];
          updatedItems[existingItemIndex].quantity += item.quantity;

          set({
            items: updatedItems,
            cartType: item.type,
          });
        } else {
          // Add new item
          set({
            items: [...state.items, item],
            cartType: item.type,
          });
        }
      },

      removeItem: (id, variantId) => {
        const state = get();
        const filteredItems = state.items.filter(
          item => !(item.id === id && item.variantId === variantId)
        );

        set({
          items: filteredItems,
          cartType: filteredItems.length > 0 ? state.cartType : null,
        });
      },

      updateQuantity: (id, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(id, variantId);
          return;
        }

        const state = get();
        const updatedItems = state.items.map(item =>
          item.id === id && item.variantId === variantId ? { ...item, quantity } : item
        );

        set({ items: updatedItems });
      },

      clearCart: () => {
        set({ items: [], cartType: null });
      },

      setCartType: type => {
        set({ cartType: type });
      },

      getItemsByType: type => {
        return get().items.filter(item => item.type === type);
      },

      getTotalByType: type => {
        return get()
          .items.filter(item => item.type === type)
          .reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      canAddItemType: type => {
        const state = get();
        return !state.cartType || state.cartType === type;
      },
    }),
    {
      name: 'destino-unified-cart',
      partialize: state => ({
        items: state.items,
        cartType: state.cartType,
      }),
    }
  )
);
```

### 3.2 Unified Checkout Component Base

**File: `src/components/Unified/UnifiedCheckout.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUnifiedCartStore, type CartType } from '@/store/unified-cart';
import { useCheckoutRecovery } from '@/hooks/useCheckoutRecovery';
import { CheckoutFormFields } from './CheckoutFormFields';
import { CheckoutSummary } from './CheckoutSummary';
import { SessionRecoveryDialog } from './SessionRecoveryDialog';
import { createUnifiedOrder } from '@/app/actions/unified-checkout';
import { toast } from 'sonner';

// Define unified checkout schema
const unifiedCheckoutSchema = z.object({
  // Customer info
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone number required'),

  // Fulfillment
  fulfillmentMethod: z.enum(['pickup', 'local_delivery', 'nationwide_shipping']),

  // Payment
  paymentMethod: z.enum(['SQUARE', 'CASH']),

  // Dynamic fields based on fulfillment method
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryDate: z.string().optional(),
  deliveryTime: z.string().optional(),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
  }).optional(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
  }).optional(),
  shippingRateId: z.string().optional(),

  // Catering specific
  eventDate: z.date().optional(),
  specialRequests: z.string().optional(),
});

type UnifiedCheckoutData = z.infer<typeof unifiedCheckoutSchema>;

interface Props {
  type: CartType;
  initialUserData?: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  } | null;
}

export function UnifiedCheckout({ type, initialUserData }: Props) {
  const router = useRouter();
  const { items, getItemsByType, clearCart } = useUnifiedCartStore();
  const {
    recoveredSession,
    showRecoveryPrompt,
    acceptRecovery,
    declineRecovery,
    saveSession,
    clearSession
  } = useCheckoutRecovery(type);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = getItemsByType(type);

  const form = useForm<UnifiedCheckoutData>({
    resolver: zodResolver(unifiedCheckoutSchema),
    defaultValues: {
      name: initialUserData?.name || '',
      email: initialUserData?.email || '',
      phone: initialUserData?.phone || '',
      fulfillmentMethod: 'pickup',
      paymentMethod: 'SQUARE',
    },
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      router.push(type === 'store' ? '/cart' : '/catering');
    }
  }, [cartItems.length, router, type]);

  // Auto-save session data
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (cartItems.length > 0) {
        saveSession({
          type,
          customerInfo: {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || ''
          },
          fulfillmentMethod: data.fulfillmentMethod || 'pickup',
          fulfillmentData: data,
          paymentMethod: data.paymentMethod || 'SQUARE',
          items: cartItems
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, cartItems, saveSession, type]);

  const handleRecoveryAccept = () => {
    const session = acceptRecovery();
    if (session) {
      // Restore form data from session
      form.reset({
        name: session.customerInfo.name,
        email: session.customerInfo.email,
        phone: session.customerInfo.phone,
        fulfillmentMethod: session.fulfillmentMethod as any,
        paymentMethod: session.paymentMethod as any,
        ...session.fulfillmentData
      });
      toast.success('Session restored successfully');
    }
  };

  const onSubmit = async (data: UnifiedCheckoutData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createUnifiedOrder({
        type,
        items: cartItems,
        formData: data,
        userId: initialUserData?.id
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Clear session and cart on success
      clearSession();
      clearCart();

      // Redirect based on payment method and result
      if (data.paymentMethod === 'SQUARE' && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        router.push(`/checkout/success?orderId=${result.orderId}&type=${type}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <>
      {showRecoveryPrompt && (
        <SessionRecoveryDialog
          open={showRecoveryPrompt}
          onAccept={handleRecoveryAccept}
          onDecline={declineRecovery}
          sessionData={recoveredSession}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          {type === 'store' ? 'Checkout' : 'Complete Your Catering Order'}
        </h1>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CheckoutFormFields
              form={form}
              type={type}
              error={error}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="lg:col-span-1">
            <CheckoutSummary
              items={cartItems}
              type={type}
              formData={form.watch()}
            />
          </div>
        </form>
      </div>
    </>
  );
}
```

### 3.3 Session Recovery Dialog

**File: `src/components/Unified/SessionRecoveryDialog.tsx`**

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import type { CheckoutSession } from '@/lib/checkout-persistence';

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  sessionData: CheckoutSession | null;
}

export function SessionRecoveryDialog({ open, onAccept, onDecline, sessionData }: Props) {
  if (!sessionData) return null;

  const sessionAge = Date.now() - sessionData.timestamp;
  const hoursAgo = Math.floor(sessionAge / (1000 * 60 * 60));
  const minutesAgo = Math.floor((sessionAge % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Dialog open={open} onOpenChange={() => onDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Resume Previous Session?
          </DialogTitle>
          <DialogDescription>
            We found an incomplete checkout session from{' '}
            {hoursAgo > 0 ? `${hoursAgo}h ${minutesAgo}m` : `${minutesAgo}m`} ago.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-medium">
                {sessionData.items.length} item{sessionData.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <div>Name: {sessionData.customerInfo.name || 'Not filled'}</div>
              <div>Email: {sessionData.customerInfo.email || 'Not filled'}</div>
              <div>Fulfillment: {sessionData.fulfillmentMethod}</div>
              <div>Payment: {sessionData.paymentMethod}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onDecline}>
            Start Fresh
          </Button>
          <Button onClick={onAccept}>
            Resume Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.4 Unified Server Action

**File: `src/app/actions/unified-checkout.ts`**

```typescript
'use server';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import type { CartType } from '@/store/unified-cart';
import { createOrderAndGenerateCheckoutUrl } from './orders';
import { createCateringOrderAndProcessPayment } from './catering';

const unifiedOrderSchema = z.object({
  type: z.enum(['store', 'catering']),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
      variantId: z.string().optional(),
    })
  ),
  formData: z
    .object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string(),
      fulfillmentMethod: z.enum(['pickup', 'local_delivery', 'nationwide_shipping']),
      paymentMethod: z.enum(['SQUARE', 'CASH']),
      // Add other fields as needed
    })
    .passthrough(), // Allow additional fields
  userId: z.string().optional(),
});

type UnifiedOrderInput = z.infer<typeof unifiedOrderSchema>;

interface UnifiedOrderResult {
  success: boolean;
  error?: string;
  orderId?: string;
  checkoutUrl?: string;
}

export async function createUnifiedOrder(input: UnifiedOrderInput): Promise<UnifiedOrderResult> {
  try {
    const validatedInput = unifiedOrderSchema.parse(input);
    const { type, items, formData, userId } = validatedInput;

    // Transform unified data to existing format
    const customerInfo = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
    };

    // Create fulfillment data based on method
    let fulfillment: any = {
      method: formData.fulfillmentMethod,
    };

    // Add method-specific data
    if (formData.fulfillmentMethod === 'pickup') {
      fulfillment.pickupTime =
        (formData as any).pickupDate && (formData as any).pickupTime
          ? `${(formData as any).pickupDate}T${(formData as any).pickupTime}:00`
          : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // Default to 2 days from now
    } else if (formData.fulfillmentMethod === 'local_delivery') {
      fulfillment.deliveryDate = (formData as any).deliveryDate;
      fulfillment.deliveryTime = (formData as any).deliveryTime;
      fulfillment.deliveryAddress = (formData as any).deliveryAddress;
      fulfillment.deliveryInstructions = (formData as any).deliveryInstructions;
    } else if (formData.fulfillmentMethod === 'nationwide_shipping') {
      fulfillment.shippingAddress = (formData as any).shippingAddress;
      fulfillment.rateId = (formData as any).shippingRateId;
      // Additional shipping data would be populated from rate selection
    }

    if (type === 'store') {
      // Use existing store checkout flow
      const result = await createOrderAndGenerateCheckoutUrl({
        items,
        customerInfo,
        fulfillment,
        paymentMethod: formData.paymentMethod as 'SQUARE' | 'CASH',
      });

      return {
        success: result.success,
        error: result.error,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
      };
    } else {
      // Use existing catering checkout flow
      const cateringData = {
        customerInfo: {
          ...customerInfo,
          specialRequests: (formData as any).specialRequests || '',
          eventDate: (formData as any).eventDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        eventDetails: {
          eventDate: (formData as any).eventDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          specialRequests: (formData as any).specialRequests || '',
        },
        fulfillment: {
          method: formData.fulfillmentMethod,
          ...(formData.fulfillmentMethod === 'pickup'
            ? {
                pickupDate: (formData as any).pickupDate,
                pickupTime: (formData as any).pickupTime,
              }
            : {
                deliveryAddress: (formData as any).deliveryAddress,
                deliveryDate: (formData as any).deliveryDate,
                deliveryTime: (formData as any).deliveryTime,
              }),
        },
        payment: {
          method: formData.paymentMethod,
        },
        items: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
      };

      const result = await createCateringOrderAndProcessPayment(cateringData);

      return {
        success: result.success,
        error: result.error,
        orderId: result.orderId,
        checkoutUrl: result.checkoutUrl,
      };
    }
  } catch (error) {
    console.error('Unified checkout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process order',
    };
  }
}
```

---

## 🔄 Phase 4: Migration Strategy

### 4.1 Gradual Migration Plan

#### Step 1: Add Feature Flags

```typescript
// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  UNIFIED_CHECKOUT: process.env.NEXT_PUBLIC_ENABLE_UNIFIED_CHECKOUT === 'true',
  ORDER_RECOVERY: process.env.NEXT_PUBLIC_ENABLE_ORDER_RECOVERY === 'true',
} as const;
```

#### Step 2: Update Environment Variables

```bash
# .env.local
NEXT_PUBLIC_ENABLE_ORDER_RECOVERY=true
NEXT_PUBLIC_ENABLE_UNIFIED_CHECKOUT=false # Start with false
```

#### Step 3: Progressive Rollout

**Week 1: Order Recovery System**

- Deploy Phase 1 with feature flag
- Test with pending orders
- Monitor retry success rates

**Week 2: Session Persistence**

- Deploy Phase 2
- Test session recovery flows
- Gather user feedback

**Week 3: Unified Components (Store)**

- Enable unified checkout for store only
- A/B test against current checkout
- Monitor conversion rates

**Week 4: Full Unification**

- Enable unified checkout for catering
- Complete migration
- Remove old components

### 4.2 Testing Strategy

#### Unit Tests

```typescript
// src/__tests__/lib/checkout-persistence.test.ts
import { CheckoutPersistence } from '@/lib/checkout-persistence';

describe('CheckoutPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and load session data', () => {
    const sessionData = {
      type: 'store' as const,
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      },
      fulfillmentMethod: 'pickup',
      fulfillmentData: {},
      paymentMethod: 'SQUARE',
      items: [],
    };

    const sessionId = CheckoutPersistence.save(sessionData);
    expect(sessionId).toBeDefined();

    const loaded = CheckoutPersistence.load();
    expect(loaded).toMatchObject(sessionData);
  });

  it('should handle expired sessions', () => {
    // Test implementation
  });
});
```

#### Integration Tests

```typescript
// src/__tests__/api/orders/retry-payment.test.ts
import { POST } from '@/app/api/orders/[orderId]/retry-payment/route';
import { createMocks } from 'node-mocks-http';

describe('/api/orders/[orderId]/retry-payment', () => {
  it('should create new checkout URL for pending order', async () => {
    // Test implementation
  });

  it('should respect retry limits', async () => {
    // Test implementation
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/order-recovery.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Order Recovery Flow', () => {
  test('should allow retry payment for failed order', async ({ page }) => {
    // Create pending order
    // Navigate to order details
    // Click retry payment
    // Verify Square checkout loads
  });
});
```

### 4.3 Monitoring & Analytics

#### Key Metrics to Track

```typescript
// src/lib/analytics.ts
export const trackOrderRecovery = {
  retryAttempted: (orderId: string, attempt: number) => {
    // Analytics tracking
  },
  retrySucceeded: (orderId: string, attempt: number) => {
    // Analytics tracking
  },
  retryFailed: (orderId: string, attempt: number, error: string) => {
    // Analytics tracking
  },
  sessionRecovered: (sessionId: string, type: 'store' | 'catering') => {
    // Analytics tracking
  },
};
```

#### Database Queries for Monitoring

```sql
-- Pending orders needing attention
SELECT
  id,
  status,
  payment_status,
  retry_count,
  created_at,
  last_retry_at,
  total
FROM orders
WHERE status IN ('PENDING', 'PAYMENT_FAILED')
  AND retry_count < 3
  AND created_at > NOW() - INTERVAL '7 days';

-- Recovery success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_pending,
  COUNT(CASE WHEN retry_count > 0 THEN 1 END) as retry_attempted,
  COUNT(CASE WHEN status = 'COMPLETED' AND retry_count > 0 THEN 1 END) as retry_succeeded
FROM orders
WHERE created_at > NOW() - INTERVAL '30 days'
  AND status IN ('PENDING', 'PAYMENT_FAILED', 'COMPLETED')
GROUP BY DATE(created_at);
```

---

## 🛡️ Security Considerations

### 4.1 Order Access Control

```typescript
// Ensure users can only retry their own orders
const order = await prisma.order.findUnique({
  where: {
    id: orderId,
    userId: user.id, // Critical: verify ownership
    status: { in: ['PENDING', 'PAYMENT_FAILED'] },
  },
});
```

### 4.2 Rate Limiting

```typescript
// src/lib/rate-limiting.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const retryRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1h'), // 3 retries per hour
  analytics: true,
});
```

### 4.3 Session Data Validation

```typescript
// Always validate recovered session data
const validateSession = (session: any): session is CheckoutSession => {
  return (
    session &&
    typeof session.id === 'string' &&
    typeof session.type === 'string' &&
    session.customerInfo &&
    Array.isArray(session.items) &&
    typeof session.timestamp === 'number' &&
    typeof session.expiresAt === 'number'
  );
};
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Run database migrations
- [ ] Update environment variables
- [ ] Run full test suite
- [ ] Test in staging environment
- [ ] Prepare rollback plan

### Deployment Steps

1. [ ] Deploy Phase 1 (Order Recovery) with feature flag OFF
2. [ ] Run database migration in production
3. [ ] Enable ORDER_RECOVERY feature flag
4. [ ] Monitor for 24 hours
5. [ ] Deploy Phase 2 (Session Persistence)
6. [ ] Deploy Phase 3 (Unified Components) with flag OFF
7. [ ] A/B test unified checkout
8. [ ] Gradually enable for all users
9. [ ] Remove old checkout components

### Post-Deployment Monitoring

- [ ] Monitor retry success rates
- [ ] Check error logs for new issues
- [ ] Verify session persistence works
- [ ] Monitor checkout conversion rates
- [ ] Gather user feedback

---

## 🚀 Quick Start Implementation

To implement just the urgent order recovery system:

1. **Add database fields** (Schema updates)
2. **Create retry API endpoint** (`/api/orders/[orderId]/retry-payment/route.ts`)
3. **Add retry button to order details** (Update existing order page)
4. **Update order creation** (Store checkout URL in database)

**Estimated time: 1-2 days for basic retry functionality**

For full implementation including session persistence and unified checkout: **2-3 weeks**

This approach gives you immediate value with the order recovery system while setting up the foundation for a more robust, unified checkout experience.
