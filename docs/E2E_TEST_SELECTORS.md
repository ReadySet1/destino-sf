# E2E Test Selectors - data-testid Requirements

This document tracks which components need `data-testid` attributes for reliable E2E testing.

## Priority 1: Critical Path Components (Checkout & Cart)

### Cart Page Components

- [x] `cart-item` - Individual cart item container (CartItemRow.tsx:47)
- [x] `cart-item-name` - Product name in cart (CartItemRow.tsx:65)
- [x] `cart-item-price` - Price display (CartItemRow.tsx:69)
- [x] `cart-item-image` - Product image (CartItemRow.tsx:54)
- [x] `quantity-stepper` - Quantity stepper container (QuantityStepper.tsx:25)
- [x] `quantity-value` - Quantity display (QuantityStepper.tsx:39)
- [x] `quantity-increase` - Increase quantity button (QuantityStepper.tsx:50)
- [x] `quantity-decrease` - Decrease quantity button (QuantityStepper.tsx:33)
- [x] `remove-item` - Remove item from cart button (CartItemRow.tsx:102)
- [ ] `clear-cart` - Clear entire cart button
- [ ] `cart-count` - Cart badge count indicator
- [x] `order-subtotal` - Subtotal display (CartSummary.tsx - already exists)
- [x] `order-tax` - Tax amount display (CartSummary.tsx - already exists)
- [x] `order-total` - Total amount display (CartSummary.tsx - already exists)
- [x] `cart-summary` - Cart summary container (CartSummary.tsx - already exists)
- [ ] `checkout-button` - Proceed to checkout button
- [ ] `cart-notification` - Add to cart notification toast

### Checkout Page Components

- [x] `customer-email` - Email input field (CheckoutForm.tsx:1478)
- [x] `customer-phone` - Phone number input field (CheckoutForm.tsx:1490)
- [x] `customer-name` - Full name input (CheckoutForm.tsx:1471)
- [x] `delivery-pickup` - Pickup option radio (FulfillmentSelector.tsx:38)
- [x] `delivery-delivery` - Delivery option radio (FulfillmentSelector.tsx:57)
- [x] `delivery-shipping` - Shipping option radio (FulfillmentSelector.tsx:77)
- [x] `address-line1` - Street address line 1 (AddressForm.tsx:101)
- [x] `address-line2` - Street address line 2 (AddressForm.tsx:115)
- [x] `address-recipient-name` - Recipient name (AddressForm.tsx:84)
- [x] `city` - City input (AddressForm.tsx:130)
- [x] `state` - State select (AddressForm.tsx:146)
- [x] `zip` - ZIP code input (AddressForm.tsx:172)
- [x] `delivery-instructions` - Delivery instructions (CheckoutForm.tsx:1686)
- [x] `fetch-shipping-rates` - Fetch shipping rates button (CheckoutForm.tsx:1709)
- [x] `place-order` - Place order button (CheckoutForm.tsx:1803)
- [ ] `cardholder-name` - Payment card name field

### Product Components

- [ ] `add-to-cart` - Add to cart button on product pages
- [ ] `product-price` - Product price display
- [ ] `product-name` - Product name/title
- [ ] `product-description` - Product description text
- [ ] `product-image` - Product image
- [ ] `product-quantity-selector` - Quantity selector on product page

## Priority 2: Authentication Components

### Sign In Page

- [x] `email` - Email input (sign in) (SignInForm.tsx:45)
- [x] `password` - Password input (sign in) (SignInForm.tsx:75)
- [x] `login-button` - Sign in submit button (SignInForm.tsx:84)
- [ ] `sign-in-button` - Alternative sign in button
- [ ] `forgot-password-link` - Forgot password link

### Sign Up Page

- [x] `email` - Email input (sign up) (sign-up/page.tsx:82)
- [x] `password` - Password input (sign up) (sign-up/page.tsx:120)
- [ ] `confirm-password` - Confirm password input (NOT IMPLEMENTED - form doesn't have this field)
- [x] `register-button` - Registration submit button (sign-up/page.tsx:133)
- [ ] `terms-checkbox` - Terms and conditions checkbox

### Password Reset

- [x] `reset-password-button` - Submit password reset button (forgot-password/page.tsx:45)
- [x] `email` - Email input for reset (forgot-password/page.tsx:36)
- [ ] `new-password` - New password input
- [ ] `confirm-new-password` - Confirm new password input

## Priority 3: Navigation & Layout

### Navigation

- [ ] `nav-menu-toggle` - Mobile menu toggle button
- [ ] `nav-cart-link` - Cart link in navigation
- [ ] `nav-account-link` - Account/profile link
- [ ] `user-menu` - User dropdown menu
- [ ] `logout-button` - Logout button

### Admin Navigation

- [ ] `admin-nav` - Admin navigation container
- [ ] `admin-products-link` - Admin products link
- [ ] `admin-orders-link` - Admin orders link
- [ ] `admin-settings-link` - Admin settings link

## Priority 4: Catering Components

- [ ] `catering-package-select` - Package selector
- [ ] `catering-guest-count` - Guest count input
- [ ] `catering-event-date` - Event date picker
- [ ] `catering-notes` - Special notes textarea
- [ ] `catering-submit` - Submit catering inquiry button

## Implementation Guidelines

### How to Add data-testid

```tsx
// ✅ Good - Use semantic, stable identifiers
<button data-testid="add-to-cart">Add to Cart</button>

// ❌ Bad - Don't use implementation details
<button data-testid="button-1">Add to Cart</button>

// ✅ Good - Use component-specific IDs for lists
<div data-testid={`cart-item-${product.id}`}>
  <span data-testid="cart-item-name">{product.name}</span>
  <button data-testid="remove-item">Remove</button>
</div>
```

### Naming Conventions

1. **Lowercase with hyphens**: `data-testid="product-price"`
2. **Action-based for buttons**: `add-to-cart`, `place-order`, `remove-item`
3. **Descriptive for inputs**: `customer-email`, `shipping-address`, `card-number`
4. **Scoped for context**: `cart-item-name` (not just `name`)

### When to Use data-testid

✅ **Use data-testid for:**

- Interactive elements (buttons, links, inputs)
- Dynamic content that changes (cart items, order totals)
- Elements matched by unstable selectors (text content, CSS classes)
- Critical user flows (checkout, authentication)

❌ **Don't use data-testid for:**

- Static headings (use `getByRole('heading', { name: '...' })`)
- Semantic HTML with stable ARIA labels
- Simple navigation links with stable text
- Read-only display content

## Testing Priority Order

1. **Critical Path** (Week 1): Cart, Checkout, Payments
2. **Authentication** (Week 1): Sign In, Sign Up, Password Reset
3. **Navigation** (Week 2): Main nav, User menu, Admin nav
4. **Catering** (Week 2): Catering forms and flows
5. **Products** (Week 2): Product pages, search, filters

## Progress Tracking

- **Total Required**: ~45 data-testid attributes
- **Implemented**: 32+ (Cart: 12/15, Checkout: 13/16, Auth: 7/15)
- **Priority 1 Cart & Checkout**: ~83% complete
- **Priority 2 Authentication**: ~47% complete
- **Target**: 100% by end of Phase 1 (Week 2)

## Implementation Summary (DES-55)

### Completed Files:

1. **CartItemRow.tsx** - 5 data-testid attributes
   - cart-item, cart-item-name, cart-item-price, cart-item-image, remove-item

2. **QuantityStepper.tsx** - 4 data-testid attributes
   - quantity-stepper, quantity-decrease, quantity-value, quantity-increase

3. **CartSummary.tsx** - 4 data-testid attributes (already existed)
   - cart-summary, order-subtotal, order-tax, order-total

4. **CheckoutForm.tsx** - 6 data-testid attributes
   - customer-name, customer-email, customer-phone, delivery-instructions, fetch-shipping-rates, place-order

5. **AddressForm.tsx** - 6 data-testid attributes
   - address-recipient-name, address-line1, address-line2, city, state, zip

6. **FulfillmentSelector.tsx** - 3 data-testid attributes
   - delivery-pickup, delivery-delivery, delivery-shipping

### Completed in DES-55 (Phase 1):

**Priority 1 - Cart & Checkout** (28/33 completed):

1. CartItemRow.tsx - 5 data-testid attributes
2. QuantityStepper.tsx - 4 data-testid attributes
3. CartSummary.tsx - 4 data-testid attributes
4. CheckoutForm.tsx - 6 data-testid attributes
5. AddressForm.tsx - 6 data-testid attributes
6. FulfillmentSelector.tsx - 3 data-testid attributes

**Priority 2 - Authentication** (7/15 completed): 7. SignInForm.tsx - 3 data-testid attributes (email, password, login-button) 8. sign-up/page.tsx - 3 data-testid attributes (email, password, register-button) 9. forgot-password/page.tsx - 2 data-testid attributes (email, reset-password-button)

### Remaining Priority 1 Tasks:

- [ ] clear-cart button
- [ ] cart-count badge
- [ ] checkout-button (link from cart to checkout)
- [ ] cart-notification toast
- [ ] cardholder-name (Square payment form)

### Remaining Priority 2 Tasks:

- [ ] confirm-password field (sign-up - NOT IMPLEMENTED in form)
- [ ] forgot-password-link
- [ ] terms-checkbox
- [ ] new-password and confirm-new-password (password reset flow)
