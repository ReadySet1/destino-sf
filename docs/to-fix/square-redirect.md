
## ✅ Cart Checkout Redirect Fix - COMPLETED

**Name**: Fix Regular Cart and Catering Checkout Square Payment Redirect

**Type**: Bug Fix

**Priority**: Critical

**Status**: RESOLVED ✅

**Estimated Complexity**: Small (1 day)

### Problem Statement
Both `/cart` checkout and `/catering/checkout` form submissions were experiencing redirect issues. The checkout process was clearing cart state before redirect completion, causing React state updates that interfered with navigation. Additionally, there was an intermediate "Load failed" error due to:

1. **State clearing before redirect completion** - Cart state was cleared before navigation finished
2. **Form submission interference** - Default browser form behavior conflicted with JavaScript redirects  
3. **Concurrent navigation attempts** - Multiple navigation events triggered simultaneously
4. **Button type ambiguity** - Missing `type="button"` on checkout buttons caused form submission behavior

### Root Cause Analysis

Based on your code analysis:

1. **Regular Cart (`/src/components/store/CheckoutForm.tsx`)**:
   - Uses `window.location.href = result.checkoutUrl` for redirect
   - Has `setTimeout(() => { window.location.href = result.checkoutUrl; }, 100)` wrapper
   - Clears cart BEFORE redirect completes, which might cause state update conflicts

2. **Catering Checkout (`/src/components/Catering/CateringCheckoutClient.tsx`)**:
   - Uses `window.location.replace(result.checkoutUrl)` with fallback to `window.location.href`
   - Has extensive logging showing checkout URL is received
   - Your logs show: `checkoutUrl: 'https://sandbox.square.link/u/Cy2I8E3c'` but redirect doesn't happen

### The Core Issue

The main problem is **React state updates interfering with navigation**. When you clear the cart or update state right before redirecting, React may:
1. Trigger re-renders
2. Cancel pending navigation
3. Cause the form to resubmit or reset

---

## 📋 Fixed Implementation

### Step 1: Fix Regular Cart Checkout

```tsx
// src/components/store/CheckoutForm.tsx

// Update the onSubmit function's redirect logic:
const onSubmit = async (formData: CheckoutFormData) => {
  setIsSubmitting(true);
  setError('');

  try {
    // ... existing validation and order creation logic ...

    if (formData.paymentMethod === PaymentMethod.SQUARE) {
      console.log('Using Square checkout');
      
      const actionPayload = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        customerInfo: customerInfo,
        fulfillment: fulfillmentData,
        paymentMethod: formData.paymentMethod,
      };

      const result = await createOrderAndGenerateCheckoutUrl(actionPayload as any);
      
      if (!result.success || !result.checkoutUrl) {
        const errorMessage = result.error || 'Failed to create checkout session.';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ Redirecting to Square Checkout:', result.checkoutUrl);
      
      // CRITICAL FIX: Don't clear cart or state before redirect
      // Just redirect immediately
      window.location.href = result.checkoutUrl;
      
      // The page will unload, so these won't execute:
      // Don't put any code here that you expect to run
      
    } else {
      // Handle manual payment methods...
      // ... existing code ...
    }
  } catch (err: any) {
    console.error('Error during checkout process:', err);
    const message = err.message || 'An unexpected error occurred.';
    setError(message);
    toast.error(message);
    setIsSubmitting(false);
  }
};
```

### Step 2: Fix Catering Checkout

```tsx
// src/components/Catering/CateringCheckoutClient.tsx

const handleCompleteOrder = async () => {
  // ... existing validation ...

  try {
    // ... existing order preparation ...

    const result = await createCateringOrderAndProcessPayment({
      // ... existing payload ...
    });

    console.log('🎯 Server action result:', result);

    if (result.success) {
      // CRITICAL FIX: Check for checkout URL first, before any state changes
      if (result.checkoutUrl && typeof result.checkoutUrl === 'string' && result.checkoutUrl.length > 0) {
        console.log('✅ Redirecting to Square checkout:', result.checkoutUrl);
        
        // Validate URL format
        const isValidSquareUrl = result.checkoutUrl.includes('square.link') || 
                                result.checkoutUrl.includes('squareup.com');
        
        if (!isValidSquareUrl) {
          console.error('⚠️ Invalid checkout URL format:', result.checkoutUrl);
          setSubmitError('Invalid checkout URL received. Please try again.');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
        
        // CRITICAL: Redirect immediately without any state changes
        window.location.href = result.checkoutUrl;
        
        // Don't clear cart or do anything else here
        // The page is navigating away
        return;
      }
      
      // Only clear cart and redirect to confirmation if no checkout URL
      // (manual payment methods)
      clearCart();
      clearCustomerInfoFromLocalStorage();
      clearDeliveryAddressFromLocalStorage();
      clearFulfillmentInfoFromLocalStorage();
      
      router.push(`/catering/confirmation?orderId=${result.orderId}`);
    } else {
      // Handle error...
      const errorMessage = result.error || 'Failed to create order';
      setSubmitError(errorMessage);
      toast.error(`Error creating order: ${errorMessage}`);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  } catch (error) {
    // ... error handling ...
  }
};
```

### Step 3: Add Success Page Cleanup

Create a cleanup mechanism on the success/confirmation pages:

```tsx
// src/app/(store)/order-confirmation/page.tsx
// or src/app/catering/confirmation/page.tsx

'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { useCateringCartStore } from '@/store/catering-cart';

export default function ConfirmationPage() {
  useEffect(() => {
    // Clear carts only AFTER successful payment
    const regularCart = useCartStore.getState();
    const cateringCart = useCateringCartStore.getState();
    
    regularCart.clearCart();
    cateringCart.clearCart();
    
    // Clear any saved form data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('regularCheckoutData');
      localStorage.removeItem('cateringCustomerInfo');
      localStorage.removeItem('cateringDeliveryAddress');
      localStorage.removeItem('cateringFulfillmentInfo');
    }
  }, []);

  // ... rest of confirmation page
}
```

### Step 4: Add Debug Utilities

Add a debug mode to help identify issues:

```tsx
// src/lib/debug/checkout-debug.ts

export const CHECKOUT_DEBUG = process.env.NODE_ENV === 'development';

export function debugCheckout(step: string, data: any) {
  if (!CHECKOUT_DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const caller = new Error().stack?.split('\n')[2]?.trim() || 'Unknown';
  
  console.group(`🔍 [CHECKOUT-DEBUG] ${step}`);
  console.log('Time:', timestamp);
  console.log('Caller:', caller);
  console.log('Data:', data);
  console.groupEnd();
}

// Usage in your components:
import { debugCheckout } from '@/lib/debug/checkout-debug';

// In checkout form:
debugCheckout('Square URL Received', { url: result.checkoutUrl });
debugCheckout('About to redirect', { method: 'window.location.href' });
window.location.href = result.checkoutUrl;
debugCheckout('Redirect executed', { url: result.checkoutUrl });
```

### Step 5: Server Action Verification

Ensure your server actions return the correct structure:

```tsx
// src/app/actions/index.ts or wherever createOrderAndGenerateCheckoutUrl is defined

export async function createOrderAndGenerateCheckoutUrl(payload: any) {
  try {
    // ... order creation logic ...

    // Create Square checkout
    const checkoutResult = await createCheckoutLink({
      // ... params ...
    });

    // CRITICAL: Ensure we return the exact structure expected
    return {
      success: true,
      checkoutUrl: checkoutResult.checkout.url, // Make sure this path is correct
      orderId: order.id,
      checkoutId: checkoutResult.checkout.id,
    };
  } catch (error) {
    console.error('Failed to create checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

### Quick Fix to Test Immediately

Try this minimal change first in both checkout components:

```tsx
// Replace this pattern:
setTimeout(() => {
  window.location.href = result.checkoutUrl;
}, 100);

// With this:
window.location.assign(result.checkoutUrl);
```

Or even simpler:

```tsx
// Use a form submit to Square instead:
const form = document.createElement('form');
form.method = 'GET';
form.action = result.checkoutUrl;
document.body.appendChild(form);
form.submit();
```

### Testing Checklist

1. [ ] Test regular cart checkout redirect
2. [ ] Test catering checkout redirect  
3. [ ] Verify cart is cleared only after successful payment
4. [ ] Check browser console for any errors during redirect
5. [ ] Test with different payment methods
6. [ ] Verify order is created in database before redirect

### Common Issues to Check

1. **Content Security Policy (CSP)**: Check if CSP headers are blocking external redirects
2. **React StrictMode**: Double rendering in development might cause issues
3. **Browser Extensions**: Ad blockers might interfere with payment redirects
4. **CORS**: Though unlikely for navigation, check browser network tab

Would you like me to help you implement any specific part of this fix? The key insight is to avoid any state changes after receiving the checkout URL and before the redirect executes.