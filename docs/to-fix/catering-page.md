## 🎯 Feature/Fix Overview

**Name**: Fix Catering Page Display Issues (Buffet & Lunch Items)

**Type**: Bug Fix

**Priority**: Critical

### Problem Statement

The catering page imports `getCateringItems` from `@/actions/catering` but this function doesn't exist, causing the page to display 0 items. Products with catering categories (BUFFET, LUNCH) exist in Square but aren't being fetched from the products table and displayed on the frontend.

### Success Criteria

- [ ] Buffet items (Starters, Entrees, Sides) display correctly from products table
- [ ] Lunch items (Starters, Entrees, Sides) display correctly from products table
- [ ] All items show proper pricing from Square variants
- [ ] Debug info is removed from production view

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
src/
├── actions/
│   └── catering.ts                       // Add getCateringItems function
├── app/
│   └── catering/
│       └── page.tsx                      // Already imports getCateringItems
├── components/
│   └── Catering/
│       ├── CateringMenuTabs.tsx          // Remove debug info
│       └── ALaCarteMenu.tsx              // Displays items correctly
├── types/
│   └── catering.ts                       // Add missing helper functions
└── lib/
    └── catering-data-manager.ts          // Already has logic, needs export
```

### Key Interfaces & Types

```tsx
// types/catering.ts - Add missing functions
export function getItemsForTab(items: CateringItem[], tab: string): CateringItem[] {
  console.log(`🔍 [getItemsForTab] Filtering ${items.length} items for tab: ${tab}`);

  const tabMapping = SQUARE_CATEGORY_MAPPING;
  const matchingCategories = Object.entries(tabMapping)
    .filter(([, tabName]) => tabName === tab)
    .map(([category]) => category);

  const filtered = items.filter(
    item => item.squareCategory && matchingCategories.includes(item.squareCategory)
  );

  console.log(`  ✅ Found ${filtered.length} items for tab ${tab}`);
  return filtered;
}

export function groupBuffetItemsByCategory(items: CateringItem[]): Record<string, CateringItem[]> {
  const groups: Record<string, CateringItem[]> = {};

  items.forEach(item => {
    let category = 'Other';

    if (item.squareCategory?.includes('STARTERS')) {
      category = 'Starters';
    } else if (item.squareCategory?.includes('ENTREES')) {
      category = 'Entrees';
    } else if (item.squareCategory?.includes('SIDES')) {
      category = 'Sides';
    } else if (item.squareCategory?.includes('DESSERTS')) {
      category = 'Desserts';
    }

    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  });

  return groups;
}

export function groupLunchItemsByCategory(items: CateringItem[]): Record<string, CateringItem[]> {
  // Similar to buffet grouping
  return groupBuffetItemsByCategory(items);
}

export function groupItemsBySubcategory(items: CateringItem[]): Record<string, CateringItem[]> {
  const groups: Record<string, CateringItem[]> = {};

  items.forEach(item => {
    const category = item.squareCategory || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  });

  return groups;
}

export function getAppetizerPackageItems(items: CateringItem[]): CateringItem[] {
  return items.filter(item => item.squareCategory?.includes('APPETIZER') && item.price === 0);
}
```

### Database Schema Reference

```sql
-- Products table (existing) contains catering items
-- Categories table has entries like:
-- 'CATERING- BUFFET, STARTERS'
-- 'CATERING- BUFFET, ENTREES'
-- 'CATERING- BUFFET, SIDES'
-- 'CATERING- LUNCH, STARTERS'
-- 'CATERING- LUNCH, ENTREES'
-- 'CATERING- LUNCH, SIDES'
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [ ] Fetch products with CATERING categories from products table
- [ ] Convert products with variants to individual CateringItem entries
- [ ] Map Square categories correctly to frontend tabs
- [ ] Display items with proper pricing

### Implementation Assumptions

- Products are already synced from Square to products table
- Each product may have variants (Small/Large) with different prices
- Categories use naming pattern "CATERING- [TYPE], [SUBCATEGORY]"

### 3. Full Stack Integration Points

### Server Actions

```tsx
// actions/catering.ts - Add this function
export async function getCateringItems(): Promise<CateringItem[]> {
  try {
    console.log('🔧 [CATERING] Using unified data manager (PRODUCTS_ONLY)...');

    const products = await db.product.findMany({
      where: {
        active: true,
        category: {
          name: {
            contains: 'CATERING',
          },
        },
      },
      include: {
        category: true,
        variants: true,
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    const cateringItems: CateringItem[] = [];

    products.forEach(product => {
      const category = mapSquareCategoryToEnum(product.category?.name);
      const firstImage = product.images?.[0] || null;

      if (!product.variants || product.variants.length === 0) {
        // No variants - single item
        cateringItems.push({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: Number(product.price),
          category,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          servingSize: null,
          imageUrl: firstImage,
          isActive: true,
          squareCategory: product.category?.name || '',
          squareProductId: product.squareId,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        });
      } else {
        // Convert each variant to separate item
        product.variants.forEach(variant => {
          const servingSize =
            variant.name === 'Small'
              ? '10-20 people'
              : variant.name === 'Large'
                ? '25-40 people'
                : null;

          const displayName =
            variant.name === 'Regular' ? product.name : `${product.name} - ${variant.name}`;

          cateringItems.push({
            id: `${product.id}-${variant.id}`,
            name: displayName,
            description: product.description || '',
            price: variant.price ? Number(variant.price) : Number(product.price),
            category,
            isVegetarian: false,
            isVegan: false,
            isGlutenFree: false,
            servingSize,
            imageUrl: firstImage,
            isActive: true,
            squareCategory: product.category?.name || '',
            squareProductId: product.squareId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          });
        });
      }
    });

    console.log(
      `✅ [CATERING] Converted ${products.length} products to ${cateringItems.length} catering items`
    );
    return cateringItems;
  } catch (error) {
    console.error('❌ [CATERING] Error fetching catering items:', error);
    return [];
  }
}

// Helper function to map Square category names to enum
function mapSquareCategoryToEnum(categoryName: string | undefined): CateringItemCategory {
  if (!categoryName) return CateringItemCategory.STARTER;

  const name = categoryName.toUpperCase();

  if (name.includes('DESSERT')) return CateringItemCategory.DESSERT;
  if (name.includes('ENTREE')) return CateringItemCategory.ENTREE;
  if (name.includes('SIDE')) return CateringItemCategory.SIDE;
  if (name.includes('STARTER')) return CateringItemCategory.STARTER;
  if (name.includes('BEVERAGE')) return CateringItemCategory.BEVERAGE;
  if (name.includes('APPETIZER')) return CateringItemCategory.STARTER;

  return CateringItemCategory.STARTER;
}
```

### Client-Server Data Flow

1. Page loads → calls `getCateringItems()` server action
2. Server fetches products with CATERING categories from database
3. Converts products/variants to CateringItem format
4. Returns array to frontend
5. Frontend filters by tab (buffet/lunch) and displays

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Test getCateringItems function
describe('getCateringItems', () => {
  it('fetches products with CATERING categories', async () => {});
  it('converts variants to separate items', async () => {});
  it('maps Square categories correctly', async () => {});
});

// Test helper functions
describe('catering helpers', () => {
  it('getItemsForTab filters correctly', () => {});
  it('groupBuffetItemsByCategory groups correctly', () => {});
});
```

### Integration Tests

```tsx
// Test full data flow
describe('Catering Page Integration', () => {
  it('displays buffet items correctly', async () => {});
  it('displays lunch items correctly', async () => {});
  it('handles variants properly', async () => {});
});
```

---

## 🔒 Security Analysis

### Input Validation & Sanitization

- [ ] Database queries use Prisma ORM (SQL injection protected)
- [ ] No user input in this flow (read-only display)
- [ ] Prices converted to Number type for consistency

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Ensure index exists on categories.name for CATERING filter
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Ensure products.categoryId is indexed
CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products("categoryId");
```

### Caching Strategy

- [ ] Consider caching catering items in memory for 5 minutes
- [ ] Use React Query/SWR on frontend for client-side caching

---

## 🚦 Implementation Checklist

### Pre-Development

- [ ] Verify products table has catering items
- [ ] Check categories table has correct Square categories
- [ ] Confirm variants have proper pricing

### Development Phase

- [ ] Add getCateringItems function to actions/catering.ts
- [ ] Add helper functions to types/catering.ts
- [ ] Remove debug info from CateringMenuTabs.tsx
- [ ] Test with actual Square data

### Pre-Deployment

- [ ] Run tests
- [ ] Verify all buffet items display
- [ ] Verify all lunch items display
- [ ] Check variant pricing works
- [ ] Remove console.log statements

---

## 📝 MCP Analysis Commands

### For Local Development

```bash
# Check products with catering categories
supabase-destino: execute_sql
SELECT p.id, p.name, p.price, c.name as category_name
FROM products p
JOIN categories c ON p."categoryId" = c.id
WHERE c.name LIKE '%CATERING%'
ORDER BY c.name, p.name;

# Check variants for catering products
supabase-destino: execute_sql
SELECT v.name, v.price, p.name as product_name
FROM variants v
JOIN products p ON v."productId" = p.id
JOIN categories c ON p."categoryId" = c.id
WHERE c.name LIKE '%CATERING%';

# Verify Square sync
mcp_square_api: make_api_request
service: catalog
method: searchItems
request: {"category_ids": ["UOWY2ZPV24Q6K6BBD5CZRM4B"]}
```

---

## 🎨 Code Style Guidelines

### TypeScript Best Practices

- Use proper typing for all functions
- Convert Prisma Decimal to Number type
- Handle null/undefined gracefully

### Next.js Patterns

- Use Server Actions for data fetching
- Keep components client-side when needed
- Proper error boundaries

### PostgreSQL Conventions

- Use existing products/categories tables
- Maintain referential integrity
- Use indexes for performance

---

## 🔄 Rollback Plan

### If Issues Occur

1. The getCateringItems function returns empty array on error
2. Frontend handles empty state gracefully
3. No database changes required (read-only operation)

### Monitoring & Alerts

- [ ] Monitor console errors in production
- [ ] Track page load times
- [ ] Check for missing items reports

---

## Example Implementation Summary

The fix is straightforward:

1. **Add getCateringItems function** to `/src/actions/catering.ts` that:
   - Queries products table for items with CATERING categories
   - Converts products with variants into individual menu items
   - Returns proper CateringItem[] format

2. **Add helper functions** to `/src/types/catering.ts`:
   - `getItemsForTab` - filters items by tab
   - `groupBuffetItemsByCategory` - groups buffet items
   - `groupLunchItemsByCategory` - groups lunch items
   - Other missing functions referenced in components

3. **Remove debug info** from CateringMenuTabs component

4. **Test** with actual Square data to ensure items display correctly

This maintains the existing architecture while fixing the missing data fetch functionality.
