## 🎯 Feature/Fix Overview

**Name**: REMOVE_CATERING_ITEMS_TABLE_REFERENCES

**Type**: [ Refactor ]

**Priority**: [ Critical ]

**Estimated Complexity**: [ Medium (3-5 days) ]

### Problem Statement

La tabla `catering_items` fue eliminada de la arquitectura pero aún existen referencias en el código que causan errores en el proceso de sync en Vercel. El error `The table public.catering_items does not exist` está bloqueando el proceso de sincronización con Square.

### Success Criteria

- [ ] Eliminar todas las referencias a `prisma.cateringItem` del código
- [ ] Eliminar toda lógica de "protección de catering items" (ya no es necesaria)
- [ ] Mantener funcionando el sync de Square usando solo la tabla `products`
- [ ] Asegurar que el proceso de sync funcione sin errores en Vercel
- [ ] Limpiar archivos y componentes obsoletos relacionados con catering items

---

## 📋 Planning Phase

### 1. Code Structure & References

### Files to Modify

```tsx
// Core files that need modification
src/
├── app/
│   └── api/
│       └── square/
│           └── unified-sync/
│               └── route.ts              // Remove cateringItem references
├── lib/
│   ├── catering-duplicate-detector.ts   // Update to use only products table
│   ├── square/
│   │   ├── catering-protection.ts       // DELETE - No longer needed
│   │   └── catering-price-sync.ts       // DELETE or UPDATE to use products
└── scripts/
    └── [various catering scripts]       // DELETE or UPDATE

// Files to DELETE completely
- src/lib/square/catering-protection.ts
- src/lib/catering-image-protection.ts
- All scripts in src/scripts/ that reference cateringItem
- Components that directly manage catering items (not catering orders)
```

### Key Changes Required

```tsx
// Before (unified-sync/route.ts)
const [productsCount, cateringCount] = await Promise.all([
  prisma.product.count(...),
  prisma.cateringItem.count(...) // REMOVE THIS
]);

// After
const productsCount = await prisma.product.count({
  where: {
    active: true,
    category: {
      name: {
        contains: 'CATERING'
      }
    }
  }
});
```

### Database Schema Updates

```sql
-- No schema changes needed (catering_items already removed)
-- Ensure all catering products are properly categorized in products table
```

### 2. Core Functionality Checklist

### Required Changes (Do Not Skip)

- [ ] Remove `prisma.cateringItem` calls from `unified-sync/route.ts`
- [ ] Update `CateringDuplicateDetector` to only check products table
- [ ] Remove `syncToCateringTable` function completely
- [ ] Update `determineSyncStrategy` to always use PRODUCTS_ONLY
- [ ] Remove `CATERING_ONLY` and `SMART_MERGE` strategies
- [ ] Delete all catering protection related files
- [ ] Update imports and remove unused dependencies

### Implementation Assumptions

- All catering items are now stored in the `products` table with appropriate categories
- The `products` table has all necessary fields for catering items
- Catering orders (`CateringOrder` table) remain unchanged and reference products

### 3. Full Stack Integration Points

### API Endpoints to Update

```tsx
// /api/square/unified-sync - Simplify to products-only
// Remove strategy parameter, always use products table
// Remove catering_items table references
```

### Files to Keep (These work with products table)

```tsx
// These components work with products, not catering_items
- src/app/catering/*              // Catering pages (use products)
- src/components/Catering/*       // Catering components (use products)
- src/store/catering-cart.ts      // Cart functionality (uses products)
- src/types/catering.ts           // Type definitions for orders
```

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Remove tests for catering_items table
// Update sync tests to only verify products table
describe('Unified Sync', () => {
  it('syncs catering products to products table', async () => {});
  it('does not reference catering_items table', async () => {});
});

// Update duplicate detector tests
describe('CateringDuplicateDetector', () => {
  it('checks duplicates only in products table', () => {});
});
```

### Integration Tests

```tsx
// Verify sync process
describe('Square Sync Integration', () => {
  it('completes sync without catering_items references', async () => {});
  it('properly categorizes catering products', async () => {});
});
```

---

## 🔒 Security Analysis

### No Security Impact

- [ ] No authentication changes needed
- [ ] No authorization changes needed
- [ ] Removing protection logic simplifies security surface

---

## 📊 Performance Considerations

### Performance Improvements

- [ ] Reduced database queries (one table instead of two)
- [ ] Simplified sync logic (no dual-table checks)
- [ ] Faster sync process overall

---

## 🚦 Implementation Checklist

### Phase 1: Remove Direct References

- [ ] Update `unified-sync/route.ts` to remove all `prisma.cateringItem` calls
- [ ] Remove `syncToCateringTable` function
- [ ] Update `determineSyncStrategy` to only return PRODUCTS_ONLY
- [ ] Remove strategy options from request schema

### Phase 2: Update Supporting Files

- [ ] Update `CateringDuplicateDetector` to only check products table
- [ ] Delete `catering-protection.ts`
- [ ] Delete `catering-image-protection.ts`
- [ ] Update or delete catering sync scripts

### Phase 3: Clean Up

- [ ] Remove unused imports
- [ ] Delete obsolete test files
- [ ] Update documentation
- [ ] Remove catering_items references from types

### Phase 4: Verification

- [ ] Test sync locally with products-only approach
- [ ] Deploy to staging and verify sync works
- [ ] Monitor Vercel logs for any remaining errors

---

## 📝 Key File Changes

### 1. unified-sync/route.ts

```tsx
// Remove these lines:
- import { CateringProtection } from '@/lib/square/catering-protection';
- const cateringCount = await prisma.cateringItem.count(...)
- async function syncToCateringTable(...) { ... }
- case 'CATERING_ONLY': ...
- case 'SMART_MERGE': ...

// Simplify to:
async function determineSyncStrategy(): Promise<SyncDecision> {
  return {
    strategy: 'PRODUCTS_ONLY',
    targetTable: 'products',
    reason: 'Unified data model - products table only'
  };
}

// Remove targetTable parameter from performUnifiedSync
// Always sync to products table
```

### 2. CateringDuplicateDetector

```tsx
// Update checkForDuplicate to only check products table
static async checkForDuplicate(item: CateringItem) {
  const existingProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { squareId: item.squareProductId },
        { name: item.name }
      ]
    }
  });

  return {
    isDuplicate: !!existingProduct,
    existingItem: existingProduct
  };
}
```

### 3. Delete These Files

```bash
# Protection files (no longer needed)
rm src/lib/square/catering-protection.ts
rm src/lib/catering-image-protection.ts

# Scripts that reference cateringItem
rm src/scripts/deduplicate-catering-items.ts
rm src/scripts/fix-catering-duplicates.ts
rm src/scripts/remove-all-manual-catering-items.ts
# ... review and clean other scripts
```

---

## 🔄 Rollback Plan

### If Issues Occur

```tsx
// Feature toggle for gradual rollout
if (process.env.USE_LEGACY_SYNC === 'true') {
  // Keep old code temporarily
} else {
  // Use new simplified sync
}
```

### Monitoring

- [ ] Monitor Vercel deployment logs
- [ ] Check sync completion status
- [ ] Verify all catering products appear correctly
- [ ] Ensure catering orders still work

---

## 📚 Notes

### Important Considerations

1. **Keep These Components** - They work with products, not catering_items:
   - Catering pages and routes
   - Catering order components
   - Catering cart functionality
   - Customer-facing catering features

2. **Remove These** - They reference the deleted table:
   - Direct prisma.cateringItem calls
   - Catering protection logic
   - Dual-table sync strategies
   - Migration scripts for catering_items

3. **Verify After Changes**:
   - Square sync completes without errors
   - Catering products appear in products table with correct categories
   - Catering orders can still be placed
   - Admin can manage catering products through products interface

Este plan asegura la eliminación completa de referencias a `catering_items` mientras mantiene toda la funcionalidad de catering intacta usando solo la tabla `products`.
