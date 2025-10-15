# Master Migration Plan: Remove Catering Items References

## 🎯 Migration Overview

**Name**: REMOVE_CATERING_ITEMS_COMPLETE_MIGRATION

**Type**: Refactor / Database Cleanup

**Priority**: Critical

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

The `catering_items` table has been removed from the database but references still exist in the code causing build failures. All catering data should use the `products` table as the single source of truth, with Square as the authoritative data source.

### Success Criteria

- [x] All references to `catering_items` removed from codebase
- [x] Database cleaned of unused catering-related tables
- [x] Square sync working without errors
- [x] Build completes successfully
- [x] Catering functionality intact using products table

---

## 📋 Current State Analysis

### Database Tables Status

#### ✅ Tables to Keep (Working with Products)

- `products` - Main product storage (includes catering items)
- `categories` - Product categories (includes catering categories)
- `catering_packages` - Package definitions
- `catering_package_items` - Package item relationships
- `catering_orders` - Catering order records
- `catering_order_items` - Catering order line items
- `catering_delivery_zones` - Delivery zone configuration
- `catering_ratings` - Package ratings
- `catering_item_mappings` - PDF to Square name mappings

#### ❌ Tables/Models to Remove

- `catering_items` - Already removed from database (confirmed)

### Code Files Analysis

#### Files Confirmed Clean

- `/src/app/api/square/unified-sync/route.ts` - No references to `catering_items`
- `prisma/schema.prisma` - No `CateringItem` model

#### Files to Check/Update

- `/src/components/Catering/CateringItemForm.tsx`
- `/src/components/Catering/SmartCateringItemForm.tsx`
- `/src/components/Catering/SmartCateringItemsList.tsx`
- `/src/lib/catering-duplicate-detector.ts`
- Any scripts in `/src/scripts/` folder

---

## 🔧 Implementation Plan

### Phase 1: Code Cleanup (Priority: Critical)

#### 1.1 Update unified-sync route

**File**: `/src/app/api/square/unified-sync/route.ts`

```typescript
// Current code already clean - just needs simplification:
// 1. Remove strategy parameter handling (keep for backward compatibility)
// 2. Ensure only PRODUCTS_ONLY strategy is used
// 3. Remove any commented references to catering_items
```

**Status**: ✅ Already clean

#### 1.2 Update CateringDuplicateDetector

**File**: `/src/lib/catering-duplicate-detector.ts`

```typescript
// Update to only check products table
export class CateringDuplicateDetector {
  static async checkForDuplicate(item: {
    name: string;
    squareProductId?: string;
    squareCategory?: string;
  }) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { squareId: item.squareProductId },
          { name: { equals: item.name, mode: 'insensitive' } },
        ],
        category: {
          name: { contains: 'CATERING' },
        },
      },
    });

    return {
      isDuplicate: !!existingProduct,
      existingItem: existingProduct,
      source: existingProduct ? 'products' : null,
    };
  }
}
```

#### 1.3 Remove/Update Catering Component Files

**Files to check**:

- `/src/components/Catering/CateringItemForm.tsx` - Check if it references catering_items
- `/src/components/Catering/SmartCateringItemForm.tsx` - Check if it references catering_items
- `/src/components/Catering/SmartCateringItemsList.tsx` - Check if it references catering_items

If these components are for managing individual catering items (not packages/orders), they should either:

1. Be updated to work with products table
2. Be removed if no longer needed (since Square is the source of truth)

#### 1.4 Clean Script Files

Check and remove scripts that reference `catering_items`:

```bash
# Scripts to review/remove:
src/scripts/deduplicate-catering-items.ts
src/scripts/fix-catering-duplicates.ts
src/scripts/remove-all-manual-catering-items.ts
src/scripts/sync-catering-items.ts
```

### Phase 2: Database Cleanup

#### 2.1 Remove Unused Tables/Columns

Since `catering_items` is already removed, check for any orphaned references:

```sql
-- Check for any foreign key constraints referencing non-existent tables
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'catering_items';
```

#### 2.2 Clean Orphaned Data

```sql
-- Ensure all catering products are properly categorized
UPDATE products
SET category_id = (
  SELECT id FROM categories
  WHERE name LIKE 'CATERING%'
  LIMIT 1
)
WHERE square_id IN (
  SELECT square_id FROM products
  WHERE category_id IN (
    SELECT id FROM categories WHERE name LIKE 'CATERING%'
  )
)
AND category_id IS NULL;
```

### Phase 3: Type Definitions Update

#### 3.1 Update TypeScript Types

**File**: `/src/types/catering.ts`

Remove any `CateringItem` type definitions if they exist. Ensure all catering types use `Product` type:

```typescript
// Remove this if it exists:
// export interface CateringItem { ... }

// Use Product type instead:
import { Product } from '@prisma/client';

export type CateringProduct = Product & {
  category: {
    name: string;
  };
};
```

### Phase 4: API Routes Verification

#### 4.1 Check All Catering API Routes

Verify these routes use products table:

- `/api/catering/*` - Should query products table
- `/api/admin/catering/*` - Should manage products in catering categories
- `/api/square/sync/*` - Should only sync to products table

### Phase 5: Testing & Verification

#### 5.1 Test Square Sync

```bash
# Test sync with dry run first
curl -X POST http://localhost:3000/api/square/unified-sync \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Then run actual sync
curl -X POST http://localhost:3000/api/square/unified-sync \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

#### 5.2 Verify Build

```bash
npm run build
# Should complete without errors
```

#### 5.3 Test Catering Features

- [ ] Browse catering menu
- [ ] Add catering items to cart
- [ ] Create catering order
- [ ] Admin can view catering products in products list

---

## 🚦 Implementation Checklist

### Immediate Actions (Day 1)

- [ ] Backup database
- [ ] Review and update `/src/lib/catering-duplicate-detector.ts`
- [ ] Check component files for catering_items references
- [ ] Remove unused script files

### Code Updates (Day 2)

- [ ] Update any remaining `prisma.cateringItem` references
- [ ] Update imports removing CateringItem type
- [ ] Ensure all catering queries use products table
- [ ] Update any admin interfaces

### Testing (Day 3)

- [ ] Run build locally
- [ ] Test Square sync
- [ ] Test catering order flow
- [ ] Deploy to staging

### Cleanup (Day 4)

- [ ] Remove commented code
- [ ] Update documentation
- [ ] Clean up unused imports
- [ ] Optimize queries

### Deployment (Day 5)

- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify sync runs successfully
- [ ] Document changes

---

## 🔍 Files to Scan and Update

### Priority 1 - Build Blockers

```bash
# Search for any remaining references
grep -r "cateringItem" src/ --exclude-dir=node_modules
grep -r "catering_items" src/ --exclude-dir=node_modules
grep -r "CateringItem" src/ --exclude-dir=node_modules
```

### Priority 2 - Component Updates

- `/src/components/Catering/*.tsx`
- `/src/app/catering/*.tsx`
- `/src/app/admin/catering/*.tsx`

### Priority 3 - Library Files

- `/src/lib/square/*.ts`
- `/src/lib/catering*.ts`

---

## 📝 Migration SQL Scripts

### Clean Up Orphaned Data

```sql
-- Ensure all catering categories have Square IDs
UPDATE categories
SET square_id = 'TEMP_' || id::text
WHERE name LIKE 'CATERING%'
AND square_id IS NULL;

-- Archive any products without categories
UPDATE products
SET active = false
WHERE category_id NOT IN (SELECT id FROM categories)
AND active = true;
```

### Verify Data Integrity

```sql
-- Check catering products count
SELECT
  c.name as category_name,
  COUNT(p.id) as product_count,
  COUNT(CASE WHEN p.active THEN 1 END) as active_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.name LIKE 'CATERING%'
GROUP BY c.name
ORDER BY c.name;

-- Verify no orphaned references
SELECT
  'catering_order_items' as table_name,
  COUNT(*) as orphaned_count
FROM catering_order_items coi
WHERE NOT EXISTS (
  SELECT 1 FROM catering_orders co
  WHERE co.id = coi.order_id
);
```

---

## 🔄 Rollback Plan

If issues occur after deployment:

1. **Revert code changes**

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Restore database backup** (if needed)

   ```bash
   # Use Supabase dashboard or CLI
   supabase db restore --backup-id <backup-id>
   ```

3. **Re-enable old sync** (temporary)
   - Set environment variable: `USE_LEGACY_SYNC=true`

---

## 📊 Success Metrics

- [ ] Zero build errors
- [ ] Square sync completes in < 2 minutes
- [ ] All catering products visible in admin
- [ ] Catering orders can be placed
- [ ] No references to `catering_items` in codebase
- [ ] Database queries optimized (< 100ms average)

---

## 🎯 Key Commands for Implementation

```bash
# 1. Find all references
find src -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "cateringItem\|catering_items\|CateringItem"

# 2. Test build
npm run build

# 3. Run type check
npm run type-check

# 4. Test sync endpoint
curl -X POST http://localhost:3000/api/square/unified-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"dryRun": true}'

# 5. Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM products WHERE category_id IN (SELECT id FROM categories WHERE name LIKE 'CATERING%');"
```

---

## 📚 Notes

### Important Considerations

1. **Square is Source of Truth**: Never allow manual editing of catering items
2. **Products Table Only**: All catering items stored in products table
3. **Category Consistency**: Ensure catering categories are properly maintained
4. **Sync Performance**: Monitor sync times and optimize queries
5. **Data Integrity**: Regular checks for orphaned records

### Post-Migration Monitoring

- Set up alerts for sync failures
- Monitor query performance
- Track catering order creation
- Verify inventory updates
- Check for data inconsistencies

This migration plan ensures complete removal of `catering_items` references while maintaining all catering functionality through the `products` table.
