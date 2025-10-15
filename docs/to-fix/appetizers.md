# Master Fix Plan: Catering Appetizers Section

## 🎯 Feature/Fix Overview

**Name**: Catering Menu - Appetizers Section Display Fix

**Type**: Bug Fix / Enhancement

**Priority**: High

### Problem Statement

The appetizers section on the catering menu page (`/catering`) is currently showing placeholder text "Appetizer packages are being set up" instead of displaying the actual appetizer products from the database. The products exist in the database under category "CATERING- APPETIZERS" but are not being fetched or displayed correctly.

### Success Criteria

- [ ] Display all active appetizer products from the database in a grid layout
- [ ] Show product images, names, descriptions, and dietary indicators
- [ ] Implement package selection functionality (5, 7, or 9 items)
- [ ] Calculate and display real-time pricing based on selections
- [ ] Enable "Add Package to Cart" functionality with proper validation

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
src/
├── app/
│   ├── api/
│   │   └── catering/
│   │       ├── appetizers/
│   │       │   └── route.ts              // API endpoint for fetching appetizers
│   │       └── packages/
│   │           └── route.ts              // API for package operations
│   ├── catering/
│   │   ├── page.tsx                      // Main catering page
│   │   └── components/
│   │       ├── AppetizerSection.tsx      // Appetizer section component
│   │       └── AppetizerCard.tsx         // Individual appetizer card
├── components/
│   └── catering/
│       ├── PackageSelector.tsx           // Package size selector
│       ├── AppetizerGrid.tsx            // Grid layout for appetizers
│       └── SelectionProgress.tsx         // Selection progress indicator
├── lib/
│   ├── db/
│   │   └── queries/
│   │       ├── catering.ts               // Catering-specific queries
│   │       └── appetizers.ts             // Appetizer queries
│   └── catering/
│       ├── utils.ts                      // Utility functions
│       └── validation.ts                 // Validation schemas
├── types/
│   └── catering.ts                       // TypeScript interfaces
└── hooks/
    └── useCateringAppetizers.ts          // Custom hook for appetizers
```

### Key Interfaces & Types

```tsx
// types/catering.ts

interface AppetizerProduct {
  id: string;
  squareId: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  active: boolean;
  dietary?: DietaryIndicator[];
}

interface DietaryIndicator {
  type: 'GF' | 'VG' | 'VGN';
  label: string;
}

interface AppetizerPackage {
  id: string;
  name: string;
  itemCount: 5 | 7 | 9;
  pricePerPerson: number;
  minPeople: number;
  selectedItems: string[];
}

interface CateringPackageRequest {
  packageId: string;
  selectedProductIds: string[];
  quantity: number;
}

interface CateringPackageResponse {
  success: boolean;
  package: AppetizerPackage;
  totalPrice: number;
  errors?: PackageError[];
}

type PackageError =
  | { type: 'INSUFFICIENT_ITEMS'; required: number; selected: number }
  | { type: 'DUPLICATE_SELECTION'; productId: string }
  | { type: 'INACTIVE_PRODUCT'; productId: string }
  | { type: 'VALIDATION_ERROR'; field: string; message: string };
```

### Database Schema Reference

```sql
-- Existing tables to query:
-- categories: id = '74f91d6c-09ee-427d-b377-971b9592b0f7' (CATERING- APPETIZERS)
-- products: All products with categoryId matching above
-- catering_packages: Existing packages for appetizers (5, 7, 9 items)
-- catering_package_items: Items linked to packages (currently empty)

-- Migration needed to link products to packages
ALTER TABLE catering_package_items
ADD COLUMN productId UUID REFERENCES products(id);

-- Index for performance
CREATE INDEX idx_products_category_active
ON products(categoryId, active)
WHERE active = true;
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [ ] Fetch all active appetizer products from CATERING- APPETIZERS category
- [ ] Display products in responsive grid (3 columns desktop, 2 tablet, 1 mobile)
- [ ] Show dietary indicators parsed from descriptions (gf, vg, vgn)
- [ ] Implement package size selector (5, 7, or 9 items)
- [ ] Track selection state with visual feedback
- [ ] Calculate total price based on package size
- [ ] Validate selection count matches package requirement
- [ ] Add to cart functionality with selected items

### Implementation Assumptions

- Products with price = 0.00 will use package pricing model
- Dietary indicators are parsed from description text patterns
- Images array may be empty - use placeholder image
- All appetizers are individual items (not pre-set combinations)

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// GET /api/catering/appetizers - Fetch all active appetizers
interface AppetizerListResponse {
  appetizers: AppetizerProduct[];
  packages: AppetizerPackage[];
}

// POST /api/catering/packages/validate - Validate package selection
interface ValidatePackageRequest {
  packageId: string;
  selectedProductIds: string[];
}

// POST /api/catering/cart/add - Add package to cart
interface AddToCartRequest {
  packageId: string;
  selectedProductIds: string[];
  quantity: number;
  customerNotes?: string;
}
```

### Server Actions (App Router)

```tsx
// app/catering/actions.ts
'use server';

export async function getAppetizerProducts(): Promise<AppetizerProduct[]>;
export async function validatePackageSelection(
  packageId: string,
  selections: string[]
): Promise<{ valid: boolean; errors?: string[] }>;
export async function addPackageToCart(
  data: CateringPackageRequest
): Promise<CateringPackageResponse>;
```

### Client-Server Data Flow

1. Page loads → Fetch appetizers and packages via Server Component
2. User selects package size → Update UI state
3. User selects items → Validate count client-side
4. User clicks "Add to Cart" → Server validation
5. Success → Update cart state and show confirmation
6. Error → Display validation messages

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// components/catering/AppetizerCard.test.tsx
describe('AppetizerCard', () => {
  it('displays product information correctly', () => {});
  it('shows dietary indicators when present', () => {});
  it('handles missing images with placeholder', () => {});
  it('toggles selection state on click', () => {});
  it('disables selection when max items reached', () => {});
});

// lib/catering/utils.test.ts
describe('Catering Utilities', () => {
  it('parses dietary indicators from description', () => {});
  it('calculates package price correctly', () => {});
  it('validates selection count', () => {});
});

// hooks/useCateringAppetizers.test.ts
describe('useCateringAppetizers Hook', () => {
  it('manages selection state correctly', () => {});
  it('prevents duplicate selections', () => {});
  it('resets on package size change', () => {});
});
```

### Integration Tests

```tsx
// Database Integration
describe('Appetizer Database Operations', () => {
  it('fetches only active products from correct category', async () => {
    const result = await getAppetizerProducts();
    expect(result.every(p => p.active)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles concurrent package selections', async () => {});
  it('maintains data consistency on errors', async () => {});
});

// API Integration
describe('Catering API Integration', () => {
  it('returns proper error for insufficient selections', async () => {});
  it('validates against inactive products', async () => {});
  it('handles rate limiting gracefully', async () => {});
});
```

### E2E Tests (Playwright)

```tsx
test.describe('Catering Appetizer Selection Flow', () => {
  test('complete appetizer package selection', async ({ page }) => {
    await page.goto('/catering');
    await page.click('[data-tab="appetizers"]');
    await page.click('[data-package="5"]');

    // Select 5 items
    for (let i = 0; i < 5; i++) {
      await page.click(`[data-appetizer-card]:nth-child(${i + 1})`);
    }

    await page.click('[data-add-to-cart]');
    await expect(page.locator('[data-cart-success]')).toBeVisible();
  });

  test('shows validation for incomplete selection', async ({ page }) => {
    // Select only 3 items for 5-item package
    // Verify error message appears
  });
});
```

---

## 🔐 Security Analysis

### Input Validation & Sanitization

```tsx
// Zod schemas for validation
import { z } from 'zod';

const AppetizerSelectionSchema = z
  .object({
    packageId: z.string().uuid(),
    selectedProductIds: z
      .array(z.string().uuid())
      .min(1)
      .max(9)
      .refine(ids => new Set(ids).size === ids.length, {
        message: 'Duplicate selections not allowed',
      }),
    quantity: z.number().int().positive().max(100),
    customerNotes: z.string().max(500).optional(),
  })
  .strict();

// Server-side validation
async function validateProductsExist(productIds: string[]) {
  const products = await db.query(
    `SELECT id FROM products 
     WHERE id = ANY($1) 
     AND active = true 
     AND categoryId = $2`,
    [productIds, APPETIZER_CATEGORY_ID]
  );
  return products.length === productIds.length;
}
```

### SQL Injection Prevention

```tsx
// Always use parameterized queries
const getAppetizers = async () => {
  const query = `
    SELECT 
      p.id,
      p."squareId",
      p.name,
      p.description,
      p.price,
      p.images,
      p.active
    FROM products p
    WHERE p."categoryId" = $1
      AND p.active = true
    ORDER BY p.name ASC
  `;

  return await db.query(query, [APPETIZER_CATEGORY_ID]);
};
```

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_products_category_active
ON products("categoryId", active)
WHERE active = true;

-- Consider materialized view for appetizer data
CREATE MATERIALIZED VIEW mv_catering_appetizers AS
SELECT
  p.*,
  array_agg(cpi."packageId") as package_ids
FROM products p
LEFT JOIN catering_package_items cpi ON p.id = cpi."productId"
WHERE p."categoryId" = '74f91d6c-09ee-427d-b377-971b9592b0f7'
  AND p.active = true
GROUP BY p.id;
```

### Caching Strategy

- [ ] Implement React Query for client-side caching
- [ ] Cache appetizer list for 5 minutes (products change infrequently)
- [ ] Use optimistic updates for cart additions
- [ ] Implement stale-while-revalidate pattern

### Image Optimization

- [ ] Lazy load images with Intersection Observer
- [ ] Use Next.js Image component with proper sizing
- [ ] Implement blur placeholder for loading state
- [ ] Serve WebP format with fallback

---

## 🚦 Implementation Checklist

### Phase 1: Database & API Setup

- [ ] Create database queries for fetching appetizers
- [ ] Build API endpoint `/api/catering/appetizers`
- [ ] Implement server actions for data fetching
- [ ] Add proper error handling and logging

### Phase 2: Component Development

- [ ] Create `AppetizerSection` component
- [ ] Build `AppetizerCard` with selection state
- [ ] Implement `PackageSelector` component
- [ ] Add `SelectionProgress` indicator
- [ ] Create responsive grid layout

### Phase 3: State Management

- [ ] Implement selection state with React hooks
- [ ] Add package size switching logic
- [ ] Build validation for selection count
- [ ] Create cart integration logic

### Phase 4: UI Polish & Testing

- [ ] Add loading and error states
- [ ] Implement dietary indicator badges
- [ ] Add animations and transitions
- [ ] Write comprehensive tests
- [ ] Perform accessibility audit

### Phase 5: Deployment

- [ ] Run performance profiling
- [ ] Test on various devices
- [ ] Update documentation
- [ ] Deploy to staging environment
- [ ] Monitor for errors post-deployment

---

## 📝 Sample Implementation Code

### Database Query

```typescript
// lib/db/queries/appetizers.ts
import { db } from '@/lib/db';
import type { AppetizerProduct } from '@/types/catering';

const APPETIZER_CATEGORY_ID = '74f91d6c-09ee-427d-b377-971b9592b0f7';

export async function getActiveAppetizers(): Promise<AppetizerProduct[]> {
  const query = `
    SELECT 
      p.id,
      p."squareId",
      p.name,
      p.description,
      p.price,
      p.images,
      p.active
    FROM products p
    WHERE p."categoryId" = $1
      AND p.active = true
    ORDER BY p.name ASC
  `;

  const result = await db.query<AppetizerProduct>(query, [APPETIZER_CATEGORY_ID]);

  return result.rows.map(product => ({
    ...product,
    dietary: parseDietaryIndicators(product.description),
  }));
}

function parseDietaryIndicators(description: string | null): DietaryIndicator[] {
  if (!description) return [];

  const indicators: DietaryIndicator[] = [];
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('-gf')) {
    indicators.push({ type: 'GF', label: 'Gluten Free' });
  }
  if (lowerDesc.includes('-vg')) {
    indicators.push({ type: 'VG', label: 'Vegetarian' });
  }
  if (lowerDesc.includes('-vgn') || lowerDesc.includes('vgn')) {
    indicators.push({ type: 'VGN', label: 'Vegan' });
  }

  return indicators;
}
```

### React Component

```tsx
// components/catering/AppetizerCard.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { AppetizerProduct } from '@/types/catering';

interface AppetizerCardProps {
  appetizer: AppetizerProduct;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (id: string) => void;
}

export function AppetizerCard({ appetizer, isSelected, isDisabled, onToggle }: AppetizerCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = appetizer.images?.[0] || '/placeholder-food.jpg';

  const handleClick = () => {
    if (!isDisabled || isSelected) {
      onToggle(appetizer.id);
    }
  };

  return (
    <div
      className={`
        relative cursor-pointer rounded-lg overflow-hidden
        border-2 transition-all duration-200
        ${isSelected ? 'border-green-500 shadow-lg' : 'border-gray-200'}
        ${isDisabled && !isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
      `}
      onClick={handleClick}
      role="checkbox"
      aria-checked={isSelected}
      aria-disabled={isDisabled && !isSelected}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 bg-green-500 rounded-full p-1">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}

      <div className="aspect-square relative">
        <Image
          src={imageError ? '/placeholder-food.jpg' : imageUrl}
          alt={appetizer.name}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg capitalize">{appetizer.name}</h3>

        {appetizer.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {appetizer.description.split('/')[0].trim()}
          </p>
        )}

        {appetizer.dietary && appetizer.dietary.length > 0 && (
          <div className="flex gap-2 mt-2">
            {appetizer.dietary.map(indicator => (
              <span
                key={indicator.type}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                title={indicator.label}
              >
                {indicator.type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Custom Hook

```tsx
// hooks/useCateringAppetizers.ts
import { useState, useCallback, useMemo } from 'react';
import type { AppetizerProduct, AppetizerPackage } from '@/types/catering';

export function useCateringAppetizers(
  appetizers: AppetizerProduct[],
  packages: AppetizerPackage[]
) {
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const currentPackage = useMemo(
    () => packages.find(p => p.id === selectedPackageId),
    [packages, selectedPackageId]
  );

  const maxSelections = currentPackage?.itemCount || 5;
  const canSelectMore = selectedItems.size < maxSelections;

  const toggleItem = useCallback(
    (itemId: string) => {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else if (canSelectMore) {
          newSet.add(itemId);
        }
        return newSet;
      });
    },
    [canSelectMore]
  );

  const changePackage = useCallback((packageId: string) => {
    setSelectedPackageId(packageId);
    setSelectedItems(new Set()); // Reset selections
  }, []);

  const isComplete = selectedItems.size === maxSelections;

  const calculateTotal = useCallback(() => {
    if (!currentPackage) return 0;
    return currentPackage.pricePerPerson * currentPackage.minPeople;
  }, [currentPackage]);

  return {
    selectedPackageId,
    selectedItems: Array.from(selectedItems),
    currentPackage,
    isComplete,
    canSelectMore,
    total: calculateTotal(),
    toggleItem,
    changePackage,
    clearSelections: () => setSelectedItems(new Set()),
  };
}
```

---

## 🔄 Rollback Plan

### Database Rollback

```sql
-- No database schema changes required for basic implementation
-- If migrations were applied:
-- DROP INDEX IF EXISTS idx_products_category_active;
-- ALTER TABLE catering_package_items DROP COLUMN IF EXISTS productId;
```

### Feature Toggle

```tsx
// Use environment variable for gradual rollout
const ENABLE_NEW_APPETIZER_SECTION = process.env.NEXT_PUBLIC_ENABLE_NEW_APPETIZERS === 'true';

if (ENABLE_NEW_APPETIZER_SECTION) {
  return <NewAppetizerSection />;
} else {
  return <LegacyPlaceholder />;
}
```

### Monitoring & Alerts

- [ ] Monitor API response times for appetizer endpoints
- [ ] Track selection completion rates
- [ ] Alert on cart addition failures > 5%
- [ ] Monitor client-side error rates

---

## 📊 Success Metrics

- **Page Load Time**: < 2 seconds for appetizer section
- **Selection Completion Rate**: > 70% of users who start selection
- **Cart Addition Success**: > 95% success rate
- **Error Rate**: < 1% client-side errors
- **User Engagement**: 20% increase in catering orders with appetizers

---

## Next Steps

1. **Immediate Actions**:
   - Review and approve this fix plan
   - Set up development branch
   - Begin Phase 1 implementation

2. **Dependencies**:
   - Confirm Square API integration for pricing
   - Validate image CDN availability
   - Review cart system integration points

This comprehensive plan ensures a robust implementation of the appetizer section that matches your existing codebase patterns while providing excellent user experience.
