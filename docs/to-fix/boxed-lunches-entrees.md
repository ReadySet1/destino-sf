# Master Fix Planning: Build Your Own Boxed Lunch Feature - Destino SF

## 🎯 Feature/Fix Overview

**Name**: Build Your Own Boxed Lunch - Entree Selection Update

**Type**: Feature Enhancement

**Priority**: High

### Problem Statement

The current "Build Your Own Box" feature on the catering page displays test items instead of the actual 8 entrees. Need to implement proper entree selection with images and integrate with existing Square catalog system for better inventory management.

### Success Criteria

- [ ] Replace test items with 8 specific entrees (excluding Pastel de Choclo)
- [ ] Display small images for each entree option
- [ ] Sync with Square catalog for consistent product management
- [ ] Maintain 3-tier pricing structure ($14, $15, $17)
- [ ] Support proper inventory tracking through existing Square integration

---

## 📋 Planning Phase

### 1. Code Structure & References (Based on Your Codebase)

### File Structure

```tsx
src/
├── app/
│   ├── api/
│   │   └── catering/
│   │       ├── boxed-lunches/
│   │       │   ├── route.ts              // Existing API - needs update
│   │       │   └── sync/route.ts         // New - Square sync endpoint
│   │       └── square-webhook/           // Existing webhook handler
│   ├── catering/
│   │   ├── page.tsx                      // Main catering page
│   │   └── build-your-own-box/          // New page for builder
│   │       └── page.tsx
├── components/
│   └── Catering/
│       ├── BoxedLunchMenu.tsx           // Existing - needs update
│       ├── BoxedLunchCard.tsx           // Existing - reusable
│       ├── BoxedLunchBuilder.tsx        // New - main builder component
│       ├── EntreeSelector.tsx           // New - entree selection
│       └── BoxedLunchTierSelector.tsx   // New - tier selection
├── lib/
│   ├── square/
│   │   ├── catalog.ts                   // Existing Square catalog
│   │   ├── sync.ts                      // Existing sync utilities
│   │   └── boxed-lunch-sync.ts          // New - specific sync logic
│   ├── catering/
│   │   ├── boxed-lunch-utils.ts         // Existing utilities
│   │   └── boxed-lunch-constants.ts     // New - entree definitions
│   └── db.ts                            // Existing Prisma client
├── types/
│   └── catering.ts                      // Existing - needs extension
├── store/
│   └── catering-cart.ts                 // Existing cart store
└── prisma/
    └── migrations/
        └── xxx_add_boxed_lunch_entrees.sql  // New migration
```

### Key Interfaces & Types (Extending Your Existing Types)

```tsx
// types/catering.ts - Add to existing file

// New entree-specific type for Build Your Own Box
export interface BoxedLunchEntree {
  id: string;
  squareId: string;
  name: string;
  description?: string;
  imageUrl: string | null;
  category: 'BOXED_LUNCH_ENTREE';
  available: boolean;
  sortOrder: number;
  dietaryPreferences: string[];
  // Nutritional info from existing Product model
  calories?: number;
  ingredients?: string;
  allergens?: string[];
}

// Update existing BoxedLunchItem interface
export interface BuildYourOwnBoxOrder {
  tierId: BoxedLunchTier;
  entreeId: string;
  entreeName: string;
  quantity: number;
  price: number;
  sides: string[];
  proteinAmount: string;
  customizations?: {
    notes?: string;
    nameLabel?: string; // For individual packaging
  };
}

// Tier configuration with new entrees
export interface BoxedLunchTierWithEntrees {
  tier: BoxedLunchTier;
  name: string;
  price: number;
  proteinAmount: string;
  sides: string[];
  availableEntrees: BoxedLunchEntree[];
}
```

### Database Schema Reference (Using Your Existing Prisma Schema)

```sql
-- Migration: add_boxed_lunch_entrees.sql

-- Add new category for boxed lunch entrees if not exists
INSERT INTO categories (id, name, description, "order", active, slug, "squareId")
VALUES (
  gen_random_uuid(),
  'BOXED_LUNCH_ENTREES',
  'Build Your Own Box Entrees',
  15,
  true,
  'boxed-lunch-entrees',
  NULL -- Will be populated by Square sync
) ON CONFLICT (name) DO NOTHING;

-- Add metadata column to products if not exists (for tier configuration)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for faster boxed lunch queries
CREATE INDEX IF NOT EXISTS idx_products_category_active
ON products(categoryId, active);

-- Store tier configuration in a dedicated table (optional)
CREATE TABLE IF NOT EXISTS boxed_lunch_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_number INTEGER NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  protein_amount VARCHAR(50),
  sides JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert tier configurations
INSERT INTO boxed_lunch_tiers (tier_number, name, price_cents, protein_amount, sides) VALUES
(1, 'Tier #1', 1400, '6oz protein', '["4oz Arroz Rojo", "4oz Sautéed Veggies"]'),
(2, 'Tier #2', 1500, '6oz protein', '["4oz Chipotle Potatoes", "4oz Kale"]'),
(3, 'Tier #3', 1700, '8oz protein', '["4oz Sautéed Veggies", "4oz Chipotle Potatoes"]')
ON CONFLICT (tier_number) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  protein_amount = EXCLUDED.protein_amount,
  sides = EXCLUDED.sides;
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [ ] Display exactly 8 entrees: Chicken with Mojo, Tamarind Chicken, Adobo Pork, Ropa Vieja, Acorn Squash, Quinoa Bowl, Beef Stir Fry, Churrasco with Chimichurri
- [ ] Exclude Pastel de Choclo from selections
- [ ] Show small image for each entree
- [ ] Maintain 3-tier pricing: $14.00, $15.00, $17.00
- [ ] Support individual meal customization with name labels
- [ ] Integrate with existing `useCateringCartStore` for cart management

### Implementation Assumptions

- Use existing Square integration (`squareClient` from `lib/square/client.ts`)
- Leverage existing Prisma models (Product, Category)
- Maintain compatibility with current catering cart system
- Images managed through Square's catalog system

### 3. Full Stack Integration Points

### API Endpoints (Updating Existing + New)

```tsx
// Update existing endpoint
// GET /api/catering/boxed-lunches - Modified to return Build Your Own options
// POST /api/catering/boxed-lunches/order - Create boxed lunch order
// POST /api/catering/boxed-lunches/sync - Trigger Square catalog sync

// Leverage existing webhook
// POST /api/square/webhook - Handle Square catalog updates
```

### Server Actions (Using Your Existing Pattern)

```tsx
// src/actions/catering.ts - Add new functions

export async function getBoxedLunchEntrees(): Promise<BoxedLunchEntree[]> {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      category: {
        name: 'BOXED_LUNCH_ENTREES',
      },
    },
    orderBy: { ordinal: 'asc' },
  });

  return products.map(transformToBoxedLunchEntree);
}

export async function getBoxedLunchTiers(): Promise<BoxedLunchTierWithEntrees[]> {
  const [tiers, entrees] = await Promise.all([
    prisma.$queryRaw`SELECT * FROM boxed_lunch_tiers WHERE active = true`,
    getBoxedLunchEntrees(),
  ]);

  return tiers.map(tier => ({
    ...tier,
    availableEntrees: entrees,
  }));
}

export async function createBoxedLunchOrder(
  orders: BuildYourOwnBoxOrder[]
): Promise<{ orderId: string; total: number }> {
  // Implementation using existing order creation pattern
}
```

### Client-Server Data Flow

1. Component loads tiers and entrees using existing data fetching patterns
2. User selections stored in `useCateringCartStore`
3. Order submission through existing catering checkout flow
4. Square webhook updates handled by existing `/api/square/webhook`
5. Background sync managed by existing sync utilities

---

## 🧪 Testing Strategy (Using Your Test Setup)

### Unit Tests (Jest)

```tsx
// src/__tests__/components/Catering/BoxedLunchBuilder.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BoxedLunchBuilder } from '@/components/Catering/BoxedLunchBuilder';

describe('BoxedLunchBuilder', () => {
  it('displays all 8 required entrees', async () => {
    render(<BoxedLunchBuilder />);

    const entrees = [
      'Chicken with Mojo',
      'Tamarind Chicken',
      'Adobo Pork',
      'Ropa Vieja',
      'Acorn Squash',
      'Quinoa Bowl',
      'Beef Stir Fry',
      'Churrasco with Chimichurri',
    ];

    for (const entree of entrees) {
      expect(await screen.findByText(entree)).toBeInTheDocument();
    }
  });

  it('does not display Pastel de Choclo', () => {
    render(<BoxedLunchBuilder />);
    expect(screen.queryByText('Pastel de Choclo')).not.toBeInTheDocument();
  });
});

// src/__tests__/app/api/catering/boxed-lunches/route.test.ts
describe('API: /api/catering/boxed-lunches', () => {
  it('returns correct tier configurations', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/catering/boxed-lunches'));
    const data = await response.json();

    expect(data.tiers).toHaveLength(3);
    expect(data.tiers[0].price).toBe(14.0);
  });
});
```

### Integration Tests

```tsx
// src/__tests__/integration/boxed-lunch-sync.test.ts
import { syncBoxedLunchEntrees } from '@/lib/square/boxed-lunch-sync';

describe('Boxed Lunch Square Sync', () => {
  it('creates BOXED_LUNCH_ENTREES category in Square', async () => {
    const result = await syncBoxedLunchEntrees();
    expect(result.categoryCreated).toBe(true);
  });

  it('syncs all 8 entrees with images', async () => {
    const result = await syncBoxedLunchEntrees();
    expect(result.entreesSynced).toBe(8);
    expect(result.errors).toHaveLength(0);
  });
});
```

### E2E Tests (Playwright)

```tsx
// tests/e2e/boxed-lunch-builder.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Build Your Own Boxed Lunch', () => {
  test('complete boxed lunch order flow', async ({ page }) => {
    await page.goto('/catering');

    // Navigate to Build Your Own Box
    await page.click('text="Build Your Own Box"');

    // Select Tier 2
    await page.click('[data-testid="tier-2"]');

    // Select Tamarind Chicken
    await page.click('[data-testid="entree-tamarind-chicken"]');

    // Set quantity
    await page.fill('[data-testid="quantity"]', '5');

    // Add to cart
    await page.click('[data-testid="add-to-cart"]');

    // Verify cart update
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('5');
  });
});
```

---

## 🔐 Security Analysis

### Authentication & Authorization

- [ ] Use existing auth pattern from `src/middleware.ts`
- [ ] Verify admin role for Square sync operations
- [ ] Validate Square webhook signatures using existing `webhook-validator.ts`
- [ ] Apply existing rate limiting from `@upstash/ratelimit`

### Input Validation & Sanitization

```tsx
// Use Zod schemas following your existing pattern
import { z } from 'zod';

const BoxedLunchOrderSchema = z.object({
  tierId: z.enum(['TIER_1', 'TIER_2', 'TIER_3']),
  entreeId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  customizations: z
    .object({
      notes: z.string().max(500).optional(),
      nameLabel: z.string().max(100).optional(),
    })
    .optional(),
});

// Leverage existing Square webhook validation
import { validateWebhookSignature } from '@/lib/square/webhook-validator';
```

### SQL Injection Prevention

```tsx
// Use Prisma's parameterized queries (your existing pattern)
const getEntreeById = async (entreeId: string) => {
  return await prisma.product.findUnique({
    where: {
      id: entreeId,
      category: { name: 'BOXED_LUNCH_ENTREES' },
      active: true,
    },
  });
};
```

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Using your existing Prisma indexes pattern
-- Already have indexes on:
-- - products(categoryId)
-- - products(active)
-- - products(squareId, active)

-- Add composite index for boxed lunch queries
CREATE INDEX IF NOT EXISTS idx_products_boxed_lunch
ON products(categoryId, active, ordinal)
WHERE active = true;
```

### Caching Strategy

- [ ] Leverage existing React Query setup from `@tanstack/react-query`
- [ ] Use your existing pattern for caching Square data
- [ ] Implement stale-while-revalidate for entree data

```tsx
// components/Catering/BoxedLunchBuilder.tsx
import { useQuery } from '@tanstack/react-query';

const { data: entrees, isLoading } = useQuery({
  queryKey: ['boxed-lunch-entrees'],
  queryFn: getBoxedLunchEntrees,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

---

## 🚦 Implementation Checklist

### Pre-Development

- [ ] Create "Boxed Lunch Entrees" category in Square
- [ ] Upload images for all 8 entrees to Square catalog
- [ ] Review existing BoxedLunchMenu component implementation
- [ ] Verify Square webhook is properly configured

### Development Phase

- [ ] Update `types/catering.ts` with new interfaces
- [ ] Create database migration for tier configuration
- [ ] Implement Square sync for boxed lunch entrees
- [ ] Update `BoxedLunchMenu.tsx` component
- [ ] Create `BoxedLunchBuilder.tsx` component
- [ ] Update `/api/catering/boxed-lunches` endpoint
- [ ] Integrate with existing cart system
- [ ] Add individual name labeling feature

### Pre-Deployment

- [ ] Run test suite: `pnpm test:catering`
- [ ] Test Square sync: `pnpm square-sync`
- [ ] Run E2E tests: `pnpm test:e2e:critical`
- [ ] Verify on staging environment
- [ ] Update documentation

---

## 📝 Square Integration Commands (Using Your Scripts)

### Square Catalog Setup

```bash
# Use your existing Square sync script
pnpm square-sync

# Or use the API endpoint
curl -X POST http://localhost:3000/api/square/sync

# Test Square connection
pnpm test-square-tokens

# Monitor sync status
tsx src/scripts/monitor-catering-images.ts
```

### Create Boxed Lunch Entrees in Square

```tsx
// src/lib/square/boxed-lunch-sync.ts
import { squareClient } from './client';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/db';

const BOXED_LUNCH_ENTREES = [
  { name: 'Chicken with Mojo', description: 'Citrus marinated grilled chicken' },
  { name: 'Tamarind Chicken', description: 'Sweet and tangy glazed chicken' },
  { name: 'Adobo Pork', description: 'Filipino-style braised pork' },
  { name: 'Ropa Vieja', description: 'Cuban shredded beef stew' },
  { name: 'Acorn Squash', description: 'Roasted seasonal squash (Vegetarian)' },
  { name: 'Quinoa Bowl', description: 'Protein-packed grain bowl (Vegetarian)' },
  { name: 'Beef Stir Fry', description: 'Wok-seared beef with vegetables' },
  { name: 'Churrasco with Chimichurri', description: 'Grilled steak with herb sauce' },
];

export async function syncBoxedLunchEntrees() {
  try {
    // Get or create category
    const categoryResponse = await squareClient.catalogApi.searchCatalogObjects({
      objectTypes: ['CATEGORY'],
      query: {
        textFilter: {
          keywords: ['Boxed Lunch Entrees'],
        },
      },
    });

    let categoryId = categoryResponse.result.objects?.[0]?.id;

    if (!categoryId) {
      // Create category following your existing pattern
      const createResponse = await squareClient.catalogApi.upsertCatalogObject({
        idempotencyKey: `boxed-lunch-category-${Date.now()}`,
        object: {
          type: 'CATEGORY',
          id: '#boxed-lunch-entrees',
          categoryData: {
            name: 'Boxed Lunch Entrees',
          },
        },
      });
      categoryId = createResponse.result.catalogObject.id;
    }

    // Sync entrees to Square and local database
    for (const entree of BOXED_LUNCH_ENTREES) {
      // Implementation following your existing sync pattern
    }

    logger.info('✅ Boxed lunch entrees synced successfully');
  } catch (error) {
    logger.error('❌ Boxed lunch sync failed:', error);
    throw error;
  }
}
```

---

## 🎨 Component Implementation (Using Your Patterns)

### BoxedLunchBuilder Component

```tsx
// src/components/Catering/BoxedLunchBuilder.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCateringCartStore } from '@/store/catering-cart';
import { useQuery } from '@tanstack/react-query';
import { getBoxedLunchTiers } from '@/actions/catering';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/catering/boxed-lunch-utils';

export const BoxedLunchBuilder: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedEntree, setSelectedEntree] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [nameLabel, setNameLabel] = useState('');

  const { addItem } = useCateringCartStore();

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['boxed-lunch-tiers'],
    queryFn: getBoxedLunchTiers,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddToCart = () => {
    if (!selectedTier || !selectedEntree) {
      toast.error('Please select a tier and entree');
      return;
    }

    const tier = tiers?.find(t => t.tier === selectedTier);
    const entree = tier?.availableEntrees.find(e => e.id === selectedEntree);

    if (!tier || !entree) return;

    addItem({
      id: `boxed-lunch-${selectedTier}-${selectedEntree}`,
      name: `${tier.name} - ${entree.name}`,
      price: tier.price,
      quantity,
      image: entree.imageUrl || undefined,
      variantId: nameLabel || undefined, // Store name label as variant
    });

    toast.success('Added to cart!');

    // Reset form
    setSelectedEntree(null);
    setQuantity(1);
    setNameLabel('');
  };

  // Component implementation following your existing patterns
  // Use your existing UI components and styling
};
```

---

## 📄 Rollback Plan

### Database Rollback

```sql
-- Rollback migration
DELETE FROM products WHERE categoryId IN (
  SELECT id FROM categories WHERE name = 'BOXED_LUNCH_ENTREES'
);
DELETE FROM categories WHERE name = 'BOXED_LUNCH_ENTREES';
DROP TABLE IF EXISTS boxed_lunch_tiers;
```

### Feature Toggle (Using Your Environment Variables)

```tsx
// Check for feature flag in .env
const ENABLE_NEW_BOXED_LUNCH = process.env.NEXT_PUBLIC_ENABLE_BOXED_LUNCH === 'true';

// In your catering page
{
  ENABLE_NEW_BOXED_LUNCH ? (
    <BoxedLunchBuilder />
  ) : (
    <BoxedLunchMenu /> // Existing component
  );
}
```

---

## Implementation Priority & Next Steps

### Recommended Approach: Leverage Existing Square Integration

Since you already have a robust Square integration with:

- Working catalog sync (`src/lib/square/sync.ts`)
- Webhook handling (`src/lib/square/webhooks.ts`)
- Category mapping (`src/lib/square/category-mapper.ts`)
- Prisma models for products

**Implementation Steps:**

1. **Day 1: Square Setup**
   - Create "Boxed Lunch Entrees" category in Square
   - Add all 8 entrees with images
   - Run `pnpm square-sync` to sync to database

2. **Day 2: Database & API Updates**
   - Add tier configuration table
   - Update `/api/catering/boxed-lunches` endpoint
   - Extend existing types in `types/catering.ts`

3. **Day 3-4: Frontend Components**
   - Update `BoxedLunchMenu.tsx` or create new `BoxedLunchBuilder.tsx`
   - Add entree selection with images
   - Integrate with `useCateringCartStore`

4. **Day 5: Testing & Deployment**
   - Run existing test suite: `pnpm test:catering`
   - Test on staging with `pnpm test:e2e:critical`
   - Deploy with feature flag

### Key Files to Modify:

1. `src/types/catering.ts` - Add new interfaces
2. `src/app/api/catering/boxed-lunches/route.ts` - Update API logic
3. `src/components/Catering/BoxedLunchMenu.tsx` - Update or replace component
4. `src/lib/square/sync.ts` - Add boxed lunch sync logic
5. `prisma/schema.prisma` - Add tier configuration if needed

This approach maximizes reuse of your existing infrastructure while adding the specific functionality needed for the Build Your Own Box feature.
