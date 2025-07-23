# Small Issues Fix Strategy

## 📋 ISSUE CATEGORIES & PRIORITIZATION

Based on your existing business logic and test coverage, here are the likely small issues you'll encounter once testing infrastructure is stable:

---

## 🔴 **CRITICAL BUSINESS LOGIC ISSUES** (Days 3-5)

### 1. Shipping Weight Calculation Edge Cases

**Files**: `src/lib/shippingUtils.ts`

#### Likely Issues:

```typescript
// Issue: Weight calculation for mixed carts
const mixedCartItems = [
  { name: 'Alfajores Traditional', quantity: 3 },
  { name: 'Empanadas Beef', quantity: 2 },
  { name: 'Custom Sauce', quantity: 1 } // No weight config
];

// Fix: Enhanced product type detection
export function getProductType(productName: string): string {
  const name = productName.toLowerCase();

  // More robust pattern matching
  if (name.includes('alfajor') || name.includes('dulce')) return 'alfajores';
  if (name.includes('empanada') || name.includes('meat') || name.includes('beef')) return 'empanadas';
  if (name.includes('sauce') || name.includes('condiment')) return 'sauces';

  return 'default';
}

// Fix: Decimal precision in weight calculations
export async function calculateShippingWeight(
  items: CartItemForShipping[],
  fulfillmentMethod: 'pickup' | 'local_delivery' | 'nationwide_shipping'
): Promise<number> {
  // Add decimal precision handling
  const weight = /* calculation */;
  return Math.round(weight * 100) / 100; // Round to 2 decimal places
}
```

#### Test Cases to Add:

```typescript
// src/__tests__/lib/shippingUtils.test.ts - Add these tests
describe('Edge Cases', () => {
  test('handles products without weight configuration', async () => {
    const items = [{ name: 'Unknown Product', quantity: 1 }];
    const weight = await calculateShippingWeight(items, 'nationwide_shipping');
    expect(weight).toBe(0.5); // Default minimum weight
  });

  test('handles decimal quantities correctly', async () => {
    const items = [{ name: 'Alfajores', quantity: 2.5 }];
    const weight = await calculateShippingWeight(items, 'nationwide_shipping');
    expect(weight).toBeCloseTo(1.4, 2); // 0.5 + (1.5 * 0.4)
  });
});
```

### 2. Delivery Zone Validation Fixes

**Files**: `src/lib/deliveryUtils.ts`

#### Likely Issues:

```typescript
// Issue: Case sensitivity and special characters in city names
export function getDeliveryZone(city: string): DeliveryZone | null {
  // Enhanced normalization
  const normalizedCity = city
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize spaces

  return CITY_ZONES[normalizedCity] || null;
}

// Issue: Fee calculation rounding
export function calculateDeliveryFee(address: Address, subtotal: number): DeliveryFeeResult | null {
  const zone = getDeliveryZone(address.city);
  if (!zone) return null;

  const config = DELIVERY_CONFIG[zone];
  if (zone === DeliveryZone.NEARBY) {
    const nearbyConfig = config as NearbyZoneConfig;
    const isFreeDelivery = subtotal >= nearbyConfig.minOrderForFreeDelivery;
    return {
      zone,
      fee: isFreeDelivery ? 0 : Math.round(nearbyConfig.baseFee * 100) / 100,
      isFreeDelivery,
      minOrderForFreeDelivery: nearbyConfig.minOrderForFreeDelivery,
    };
  }

  return {
    zone,
    fee: Math.round(config.baseFee * 100) / 100,
    isFreeDelivery: false,
  };
}
```

### 3. Date Utilities Time Zone Issues

**Files**: `src/lib/dateUtils.ts`

#### Likely Issues:

```typescript
// Issue: Time zone handling for delivery dates
export function getNextDeliveryDate(orderDate: Date, leadTimeHours: number = 24): Date {
  // Ensure consistent timezone handling
  const pacificTime = new Date(
    orderDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  );
  const nextDelivery = new Date(pacificTime.getTime() + leadTimeHours * 60 * 60 * 1000);

  // Skip weekends and holidays
  while (nextDelivery.getDay() === 0 || nextDelivery.getDay() === 6) {
    nextDelivery.setDate(nextDelivery.getDate() + 1);
  }

  return nextDelivery;
}
```

---

## 🟡 **COMPONENT & UI ISSUES** (Days 6-7)

### 1. CartSummary Component Fixes

**Files**: `src/components/Store/CartSummary.tsx`

#### Likely Issues:

```typescript
// Issue: Tax calculation precision
const TAX_RATE = 0.0825; // 8.25% SF tax rate

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  totalItems,
  cartType = 'regular'
}) => {
  // Fix: Proper tax calculation and formatting
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  // Fix: Proper number formatting
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Fix: Singular/plural item text
  const itemText = totalItems === 1 ? 'item' : 'items';

  return (
    <div className={cn(
      "rounded-lg border p-4 bg-white shadow-sm",
      cartType === 'catering' && "border-amber-200"
    )}>
      <h2 className={cn(
        "text-lg font-semibold mb-3",
        cartType === 'catering' && "text-amber-700"
      )}>
        {cartType === 'catering' ? 'Catering Summary' : 'Order Summary'}
      </h2>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal ({totalItems} {itemText})</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-1">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};
```

### 2. Admin Panel Component Fixes

**Files**: `src/components/admin/ShippingConfigManager.tsx`

#### Likely Issues:

```typescript
// Issue: Form validation and error handling
export const ShippingConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<ShippingWeightConfig[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateConfig = (config: ShippingWeightConfig): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (config.baseWeightLb <= 0) {
      errors.baseWeight = 'Base weight must be greater than 0';
    }
    if (config.weightPerUnitLb < 0) {
      errors.weightPerUnit = 'Weight per unit cannot be negative';
    }
    if (!config.productName.trim()) {
      errors.productName = 'Product name is required';
    }

    return errors;
  };

  const handleSaveConfig = async (config: ShippingWeightConfig) => {
    const validationErrors = validateConfig(config);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await updateShippingConfiguration(config.productName, config);
      // Update local state
      setConfigs(prev => prev.map(c => (c.productName === config.productName ? config : c)));
      setErrors({});
    } catch (error) {
      setErrors({ general: 'Failed to save configuration' });
    }
  };
};
```

---

## 🟢 **API ROUTE ISSUES** (Days 8-9)

### 1. Shipping API Route Fixes

**Files**: `src/app/api/shipping/calculate/route.ts`

#### Likely Issues:

```typescript
// Issue: Input validation and error handling
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Enhanced input validation
    const { items, fulfillmentMethod } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!['pickup', 'local_delivery', 'nationwide_shipping'].includes(fulfillmentMethod)) {
      return NextResponse.json({ error: 'Invalid fulfillment method' }, { status: 400 });
    }

    // Validate each item
    for (const item of items) {
      if (!item.name || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have a valid name and positive quantity' },
          { status: 400 }
        );
      }
    }

    const weight = await calculateShippingWeight(items, fulfillmentMethod);

    return NextResponse.json({
      success: true,
      weight,
      fulfillmentMethod,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Shipping calculation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. Order Validation API Fixes

**Files**: `src/app/api/orders/validate/route.ts`

#### Likely Issues:

```typescript
// Issue: Order minimum validation logic
export async function POST(request: Request) {
  try {
    const { items, address, cartType } = await request.json();

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    // Enhanced validation logic
    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      subtotal,
      deliveryInfo: null as any,
    };

    // Delivery zone validation for local orders
    if (address && address.city) {
      const deliveryResult = calculateDeliveryFee(address, subtotal);
      if (!deliveryResult) {
        validationResult.isValid = false;
        validationResult.errors.push('Delivery not available to this address');
      } else {
        validationResult.deliveryInfo = deliveryResult;

        // Order minimum validation
        if (
          deliveryResult.zone === DeliveryZone.NEARBY &&
          !deliveryResult.isFreeDelivery &&
          subtotal < 75
        ) {
          validationResult.warnings.push(
            `Add ${formatCurrency(75 - subtotal)} more for free delivery!`
          );
        }
      }
    }

    // Catering minimum validation
    if (cartType === 'catering' && subtotal < 200) {
      validationResult.isValid = false;
      validationResult.errors.push('Catering orders require a minimum of $200');
    }

    return NextResponse.json(validationResult);
  } catch (error) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}
```

---

## ⚡ **PERFORMANCE & OPTIMIZATION ISSUES** (Day 10)

### 1. Database Query Optimization

```typescript
// Issue: N+1 queries in shipping configuration
export async function getAllShippingConfigurations(): Promise<ShippingWeightConfig[]> {
  try {
    // Single query instead of multiple
    const dbConfigs = await prisma.shippingConfiguration.findMany({
      orderBy: { productName: 'asc' },
      select: {
        productName: true,
        baseWeightLb: true,
        weightPerUnitLb: true,
        isActive: true,
        applicableForNationwideOnly: true,
      },
    });

    // Process in memory instead of additional queries
    const configs = dbConfigs.map(config => ({
      productName: config.productName,
      baseWeightLb: Number(config.baseWeightLb),
      weightPerUnitLb: Number(config.weightPerUnitLb),
      isActive: config.isActive,
      applicableForNationwideOnly: config.applicableForNationwideOnly,
    }));

    return configs;
  } catch (error) {
    console.error('Error fetching shipping configurations:', error);
    return Object.values(DEFAULT_WEIGHT_CONFIGS);
  }
}
```

### 2. Component Performance

```typescript
// Issue: Unnecessary re-renders in CartSummary
import { memo, useMemo } from 'react';

export const CartSummary: React.FC<CartSummaryProps> = memo(({
  subtotal,
  totalItems,
  cartType = 'regular'
}) => {
  // Memoize expensive calculations
  const calculations = useMemo(() => {
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { tax, total };
  }, [subtotal]);

  // Memoize formatting
  const formattedAmounts = useMemo(() => ({
    subtotal: formatCurrency(subtotal),
    tax: formatCurrency(calculations.tax),
    total: formatCurrency(calculations.total),
  }), [subtotal, calculations]);

  return (
    // Component JSX
  );
});
```

---

## 📊 **TESTING STRATEGY FOR SMALL ISSUES**

### Daily Testing Workflow

```bash
# Morning: Run full test suite to catch regressions
pnpm test:ci

# During development: Watch specific modules
pnpm test:shipping --watch
pnpm test:delivery --watch
pnpm test:components --watch

# Before commits: Validate all related tests
pnpm test:unit
pnpm test:api
pnpm test:components
```

### Issue-Specific Testing

```bash
# Test business logic fixes
pnpm test:unit

# Test component fixes
pnpm test:components

# Test API route fixes
pnpm test:api

# Test integration flows
pnpm test:integration
```

---

## 🎯 **SUCCESS METRICS FOR SMALL ISSUES**

### Week 2 Goals

- **Business Logic**: 0 edge case failures
- **Component Rendering**: 0 UI inconsistencies
- **API Routes**: 100% input validation coverage
- **Performance**: <200ms average response time

### Week 3 Goals

- **Test Coverage**: >95% for all fixed modules
- **Bug Reports**: 0 critical issues in production
- **User Experience**: Smooth order flow end-to-end
- **Admin Panel**: Full shipping configuration management

---

## 🔄 **MAINTENANCE & MONITORING**

### Continuous Integration

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    pnpm test:ci
    pnpm test:integration

- name: Check Coverage
  run: |
    pnpm test:coverage

- name: Performance Tests
  run: |
    pnpm test:api --verbose
```

### Error Monitoring

```typescript
// Add to critical business logic functions
export async function calculateShippingWeight(
  items: CartItemForShipping[],
  fulfillmentMethod: string
): Promise<number> {
  try {
    // Business logic
    const weight = /* calculation */;

    // Log for monitoring
    console.log('Shipping calculation:', {
      itemCount: items.length,
      fulfillmentMethod,
      calculatedWeight: weight,
      timestamp: new Date().toISOString()
    });

    return weight;
  } catch (error) {
    // Error tracking
    console.error('Shipping calculation failed:', {
      error: error.message,
      items: items.length,
      fulfillmentMethod,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
```

This strategy provides a systematic approach to identify and fix the small issues that will surface once your testing infrastructure is stable, prioritizing business-critical fixes first and building toward a robust, well-tested system.
