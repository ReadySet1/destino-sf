# Shopping Cart

## Overview

The shopping cart system provides a seamless experience for customers to manage their orders before checkout, with support for both regular orders and catering packages.

## Cart Architecture

### State Management

```typescript
interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
  isCateringOrder: boolean;
  deliveryZone?: DeliveryZone;
}

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: ProductCustomization[];
}
```

### Persistent Storage

- **Local Storage**: Cart persistence across browser sessions
- **User Account Sync**: Logged-in users have cart synced to account
- **Cross-Device Access**: Cart available on multiple devices
- **Session Recovery**: Automatic cart restoration

## Cart Functionality

### Item Management

- **Add Items**: Products with variants and customizations
- **Update Quantities**: Real-time quantity adjustments
- **Remove Items**: Individual item removal
- **Clear Cart**: Complete cart reset
- **Save for Later**: Wishlist functionality

### Real-time Calculations

- **Subtotal Updates**: Automatic price recalculation
- **Tax Calculation**: Dynamic tax computation based on delivery location
- **Delivery Fees**: Zone-based delivery cost calculation
- **Minimum Order Validation**: Catering order minimum enforcement

### Cart Validation

```typescript
// Cart validation logic
export const validateCart = (cart: CartState): CartValidation => {
  const errors: string[] = [];

  // Check minimum order requirements
  if (cart.isCateringOrder && cart.subtotal < getMinimumOrder(cart.deliveryZone)) {
    errors.push(
      `Minimum order of $${getMinimumOrder(cart.deliveryZone)} required for this delivery zone`
    );
  }

  // Validate item availability
  cart.items.forEach(item => {
    if (!isProductAvailable(item.productId)) {
      errors.push(`${item.productName} is currently unavailable`);
    }
  });

  return { isValid: errors.length === 0, errors };
};
```

## Catering Cart Features

### Package Integration

- **Catering Packages**: Pre-configured catering solutions
- **Package Customization**: Modify package contents
- **Minimum Order Enforcement**: Zone-specific minimum requirements
- **Delivery Zone Selection**: Geographic area validation

### Advanced Pricing

- **Volume Discounts**: Automatic price reductions for large orders
- **Zone-based Pricing**: Delivery fees calculated by location
- **Special Event Pricing**: Holiday and special occasion rates

## User Experience Features

### Cart Summary

- **Expandable Cart Widget**: Quick access from any page
- **Item Thumbnails**: Visual representation of cart contents
- **Progress Indicators**: Steps toward minimum order requirements
- **Estimated Delivery Time**: Time-based delivery estimates

### Mobile Optimization

- **Touch-friendly Controls**: Optimized for mobile interaction
- **Swipe Gestures**: Intuitive item management
- **Responsive Design**: Seamless experience across devices

### Quick Actions

- **Recently Added**: Quick access to recent additions
- **Recommended Additions**: Suggestions to complete the order
- **One-click Reorder**: Repeat previous orders easily

## Cart Persistence & Sync

### Storage Strategy

```typescript
// Cart persistence implementation
export class CartPersistence {
  private static STORAGE_KEY = 'destino-cart';

  static saveCart(cart: CartState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));

    // Sync to user account if logged in
    if (getCurrentUser()) {
      syncCartToAccount(cart);
    }
  }

  static loadCart(): CartState | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }
}
```

### Conflict Resolution

- **Merge Strategy**: Intelligent cart merging across devices
- **User Preference**: Manual resolution for conflicting items
- **Timestamp Priority**: Most recent changes take precedence

## Performance Optimization

### Lazy Loading

- **Component Splitting**: Async cart component loading
- **Image Optimization**: Lazy loading of product images
- **API Optimization**: Batched product information requests

### Caching

- **Product Data Caching**: Reduce API calls for product information
- **Price Calculation Caching**: Cache complex pricing calculations
- **Delivery Zone Caching**: Store zone information locally

## Analytics & Tracking

### Cart Analytics

- **Abandonment Tracking**: Monitor incomplete checkout flows
- **Product Performance**: Most added/removed items
- **Conversion Metrics**: Cart-to-order conversion rates
- **User Behavior**: Cart interaction patterns

### Business Intelligence

- **Average Cart Value**: Revenue optimization insights
- **Popular Combinations**: Product bundling opportunities
- **Geographic Patterns**: Delivery zone preferences
