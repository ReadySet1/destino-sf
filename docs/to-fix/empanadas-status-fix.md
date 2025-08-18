## 🎯 Feature/Fix Overview

**Name**: Fix Square Sync - Empanadas Product Status Issue

**Type**: Bug Fix

**Priority**: Critical

**Estimated Complexity**: Small (1-2 days)

### Problem Statement

Products (specifically empanadas) are showing as "Inactive" in the admin panel after Square sync, even though the sync code sets `active: true`. The root cause is that products are being assigned to the wrong category (Default) instead of their correct Square categories (EMPANADAS), and there may be a secondary issue with how the active status is being displayed or queried.

### Success Criteria

- [ ] All empanadas are correctly categorized under "EMPANADAS" category after sync
- [ ] All synced products show as "Active" in the admin panel
- [ ] Category mapping from Square to local database works correctly
- [ ] Products maintain their active status after sync

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// Files to modify
src/
├── lib/
│   └── square/
│       ├── production-sync.ts        // Fix determineProductCategory method
│       └── category-mapper.ts        // Already has mapping logic
├── app/
│   └── api/
│       └── square/
│           └── sync/
│               └── route.ts           // Verify sync endpoint
└── scripts/
    └── fix-empanadas-status.ts       // One-time fix script

```

### Key Interfaces & Types

```tsx
// types/square-sync.ts
interface SquareCatalogObject {
  type: string;
  id: string;
  item_data?: {
    name: string;
    description?: string | null;
    category_id?: string;  // This is the Square category ID
    categories?: Array<{
      id: string;
      ordinal?: number;
    }>;
    variations?: SquareCatalogObject[];
    image_ids?: string[];
  };
}

interface CategoryMapping {
  squareId: string;
  localCategoryName: string;
  localCategoryId?: string;
}

interface ProductSyncResult {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  active: boolean;
}
```

### Database Schema Reference

```sql
-- Ensure categories exist with correct Square mappings
UPDATE categories 
SET square_id = 'CBCQ73NCXQKUAFWGP2KQFOJN'
WHERE name = 'EMPANADAS';

-- Fix all empanadas to be active and in correct category
UPDATE products p
SET 
  active = true,
  category_id = (SELECT id FROM categories WHERE name = 'EMPANADAS')
WHERE 
  p.name LIKE '%Empanada%' 
  OR p.name LIKE '%empanada%';
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [ ] Fix `determineProductCategory` to properly map Square categories
- [ ] Ensure category-mapper is integrated with production sync
- [ ] Verify active status is correctly set and persisted
- [ ] Add logging for category assignment debugging

### Implementation Assumptions

- Square provides category_id or categories array in item_data
- Category mappings in category-mapper.ts are correct
- Database has categories with matching Square IDs

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// POST /api/square/sync - Main sync endpoint
// POST /api/square/fix-categories - One-time fix endpoint
```

### Server Actions (App Router)

```tsx
// lib/square/production-sync.ts
async function determineProductCategory(
  product: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[],
  defaultCategory: { id: string; name: string }
): Promise<string>

// lib/square/category-sync.ts (new)
async function ensureCategoriesExist(): Promise<Map<string, string>>
async function mapSquareToLocalCategory(squareCategoryId: string): Promise<string>
```

### Client-Server Data Flow

1. Admin triggers sync via UI button
2. API route calls syncProductsProduction
3. Sync fetches Square catalog with categories
4. Categories are mapped using category-mapper
5. Products are created/updated with correct category
6. Active status is set to true
7. Response includes sync statistics

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// lib/square/__tests__/category-mapping.test.ts
describe('Category Mapping', () => {
  it('maps EMPANADAS Square ID to correct local category', async () => {
    const squareId = 'CBCQ73NCXQKUAFWGP2KQFOJN';
    const localCategory = await mapSquareToLocalCategory(squareId);
    expect(localCategory.name).toBe('EMPANADAS');
  });

  it('falls back to default for unknown categories', async () => {
    const unknownId = 'UNKNOWN_CATEGORY_ID';
    const localCategory = await mapSquareToLocalCategory(unknownId);
    expect(localCategory.name).toBe('Default');
  });
});

// lib/square/__tests__/production-sync.test.ts
describe('Product Sync', () => {
  it('assigns correct category during sync', async () => {
    const mockProduct = {
      id: 'PROD_123',
      item_data: {
        name: 'Beef Empanada',
        category_id: 'CBCQ73NCXQKUAFWGP2KQFOJN'
      }
    };
    
    const result = await syncSingleProduct(mockProduct);
    expect(result.categoryName).toBe('EMPANADAS');
    expect(result.active).toBe(true);
  });
});
```

### Integration Tests

```tsx
// Integration test for full sync flow
describe('Square Sync Integration', () => {
  it('syncs empanadas with correct category and active status', async () => {
    // Mock Square API response
    const mockSquareResponse = {
      objects: [
        {
          id: 'ITEM_123',
          type: 'ITEM',
          item_data: {
            name: 'Beef Empanada',
            category_id: 'CBCQ73NCXQKUAFWGP2KQFOJN'
          }
        }
      ]
    };

    // Run sync
    const result = await syncProductsProduction();
    
    // Verify database state
    const product = await prisma.product.findUnique({
      where: { squareId: 'ITEM_123' },
      include: { category: true }
    });
    
    expect(product.category.name).toBe('EMPANADAS');
    expect(product.active).toBe(true);
  });
});
```

---

## 🔒 Security Analysis

### Authentication & Authorization

- [ ] Sync endpoint requires admin authentication
- [ ] Category mappings are read-only from environment
- [ ] No user input in category determination logic

### Input Validation & Sanitization

```tsx
// Validate Square category IDs
const isValidSquareCategoryId = (id: string): boolean => {
  return /^[A-Z0-9]{24}$/.test(id);
};

// Sanitize category names
const sanitizeCategoryName = (name: string): string => {
  return name.trim().toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
};
```

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Ensure indexes exist for category lookups
CREATE INDEX IF NOT EXISTS idx_categories_square_id ON categories(square_id);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, active);
```

### Caching Strategy

- [ ] Cache category mappings in memory during sync
- [ ] Batch category lookups to reduce queries

---

## 🚦 Implementation Checklist

### Pre-Development

- [x] Analyze existing code patterns
- [x] Identify root cause (determineProductCategory not implemented)
- [ ] Review category-mapper.ts integration
- [ ] Set up feature branch

### Development Phase

- [ ] Fix determineProductCategory method
- [ ] Add category mapping logic
- [ ] Create one-time fix script
- [ ] Add comprehensive logging
- [ ] Test with sample data
- [ ] Verify in staging environment

### Pre-Deployment

- [ ] Run fix script on production data backup
- [ ] Verify all empanadas have correct category
- [ ] Check active status displays correctly
- [ ] Monitor sync performance
- [ ] Document changes

---

## 📝 Implementation Code

### 1. Fix production-sync.ts - determineProductCategory method

```typescript
// src/lib/square/production-sync.ts

import CategoryMapper from './category-mapper';

private async determineProductCategory(
  product: SquareCatalogObject,
  relatedObjects: SquareCatalogObject[],
  defaultCategory: { id: string; name: string }
): Promise<string> {
  try {
    // Get Square category ID from product
    const squareCategoryId = product.item_data?.category_id || 
                            product.item_data?.categories?.[0]?.id;
    
    if (!squareCategoryId) {
      logger.warn(`No category found for product ${product.item_data?.name}, using default`);
      return defaultCategory.id;
    }

    // Check if we have a mapping for this Square category
    const localCategoryName = CategoryMapper.getLegacyLocalCategory(squareCategoryId) ||
                              CategoryMapper.getLocalCategory(squareCategoryId);
    
    if (!localCategoryName) {
      logger.warn(`No mapping for Square category ${squareCategoryId}, using default`);
      return defaultCategory.id;
    }

    // Find or create the local category
    let localCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { squareId: squareCategoryId },
          { name: localCategoryName }
        ]
      }
    });

    if (!localCategory) {
      // Create the category if it doesn't exist
      localCategory = await prisma.category.create({
        data: {
          name: localCategoryName,
          squareId: squareCategoryId,
          slug: CategoryMapper.normalizeCategory(localCategoryName).toLowerCase(),
          description: `Category synced from Square`,
          active: true,
          order: 0
        }
      });
      logger.info(`Created new category: ${localCategoryName} with Square ID: ${squareCategoryId}`);
    } else if (!localCategory.squareId) {
      // Update existing category with Square ID
      await prisma.category.update({
        where: { id: localCategory.id },
        data: { squareId: squareCategoryId }
      });
      logger.info(`Updated category ${localCategoryName} with Square ID: ${squareCategoryId}`);
    }

    logger.debug(`Product ${product.item_data?.name} assigned to category ${localCategoryName}`);
    return localCategory.id;
    
  } catch (error) {
    logger.error(`Error determining category for product ${product.item_data?.name}:`, error);
    return defaultCategory.id;
  }
}
```

### 2. One-time fix script

```typescript
// src/scripts/fix-empanadas-status.ts

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import CategoryMapper from '@/lib/square/category-mapper';

async function fixEmpanadasStatus() {
  console.log('🔧 Starting Empanadas Status Fix...\n');

  try {
    // Step 1: Ensure EMPANADAS category exists with correct Square ID
    console.log('1. Checking EMPANADAS category...');
    
    const squareEmpanadasId = 'CBCQ73NCXQKUAFWGP2KQFOJN';
    let empanadasCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'EMPANADAS' },
          { squareId: squareEmpanadasId }
        ]
      }
    });

    if (!empanadasCategory) {
      console.log('Creating EMPANADAS category...');
      empanadasCategory = await prisma.category.create({
        data: {
          name: 'EMPANADAS',
          squareId: squareEmpanadasId,
          slug: 'empanadas',
          description: 'Delicious empanadas',
          active: true,
          order: 1
        }
      });
    } else if (!empanadasCategory.squareId) {
      console.log('Updating EMPANADAS category with Square ID...');
      empanadasCategory = await prisma.category.update({
        where: { id: empanadasCategory.id },
        data: { 
          squareId: squareEmpanadasId,
          active: true
        }
      });
    }

    console.log(`✅ EMPANADAS category ready: ${empanadasCategory.id}`);

    // Step 2: Find all empanada products
    console.log('\n2. Finding empanada products...');
    
    const empanadasProducts = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'Empanada', mode: 'insensitive' } },
          { name: { contains: 'empanada', mode: 'insensitive' } }
        ]
      },
      include: {
        category: true
      }
    });

    console.log(`Found ${empanadasProducts.length} empanada products`);

    // Step 3: Update products to correct category and active status
    console.log('\n3. Updating products...');
    
    let updatedCount = 0;
    for (const product of empanadasProducts) {
      const needsUpdate = product.categoryId !== empanadasCategory.id || !product.active;
      
      if (needsUpdate) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            categoryId: empanadasCategory.id,
            active: true
          }
        });
        updatedCount++;
        console.log(`  ✅ Updated: ${product.name}`);
        console.log(`     - Category: ${product.category.name} → EMPANADAS`);
        console.log(`     - Active: ${product.active} → true`);
      } else {
        console.log(`  ⏭️  Skipped: ${product.name} (already correct)`);
      }
    }

    // Step 4: Verify the fix
    console.log('\n4. Verifying fix...');
    
    const verifyProducts = await prisma.product.count({
      where: {
        categoryId: empanadasCategory.id,
        active: true
      }
    });

    console.log(`\n✅ Fix complete!`);
    console.log(`   - Updated ${updatedCount} products`);
    console.log(`   - Total active empanadas: ${verifyProducts}`);

    // Step 5: Display sample products
    const sampleProducts = await prisma.product.findMany({
      where: {
        categoryId: empanadasCategory.id
      },
      take: 5,
      select: {
        name: true,
        active: true,
        price: true
      }
    });

    console.log('\n📋 Sample empanadas:');
    sampleProducts.forEach(p => {
      console.log(`   - ${p.name}: $${p.price} (active: ${p.active})`);
    });

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixEmpanadasStatus().catch(console.error);
```

### 3. Enhanced sync route with logging

```typescript
// src/app/api/square/sync/route.ts

export async function POST(request: Request) {
  try {
    logger.info('🚀 Square sync API triggered via POST');
    logger.info('📊 Pre-sync statistics:');
    
    // Log current state before sync
    const preStats = await prisma.product.groupBy({
      by: ['active', 'categoryId'],
      _count: true
    });
    
    logger.info('Pre-sync product distribution:', preStats);

    // Parse request body for options
    let options = {};
    try {
      const body = await request.json();
      options = body.options || {};
    } catch {
      logger.info('Using default sync options');
    }

    // Start the production sync process
    const result = await syncProductsProduction(options);

    // Log post-sync state
    const postStats = await prisma.product.groupBy({
      by: ['active', 'categoryId'],
      _count: true
    });
    
    logger.info('Post-sync product distribution:', postStats);

    // Check specifically for empanadas
    const empanadasCategory = await prisma.category.findFirst({
      where: { name: 'EMPANADAS' }
    });
    
    if (empanadasCategory) {
      const empanadasCount = await prisma.product.count({
        where: {
          categoryId: empanadasCategory.id,
          active: true
        }
      });
      logger.info(`✅ Active empanadas after sync: ${empanadasCount}`);
    }

    const response = {
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      data: {
        syncedProducts: result.syncedProducts,
        skippedProducts: result.skippedProducts,
        productDetails: result.productDetails,
        errors: result.errors,
        warnings: result.warnings,
      },
    };

    return NextResponse.json(response, { status: result.success ? 200 : 500 });
  } catch (error) {
    logger.error('❌ Critical error in Square sync API route:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Critical sync failure',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## 🔄 Rollback Plan

### Database Rollback

```sql
-- Backup current state before fix
CREATE TABLE products_backup_20250117 AS SELECT * FROM products;
CREATE TABLE categories_backup_20250117 AS SELECT * FROM categories;

-- Rollback if needed
UPDATE products p
SET 
  category_id = b.category_id,
  active = b.active
FROM products_backup_20250117 b
WHERE p.id = b.id;
```

### Feature Toggle

```typescript
// Use environment variable for gradual rollout
const USE_ENHANCED_CATEGORY_MAPPING = process.env.USE_ENHANCED_CATEGORY_MAPPING === 'true';

if (USE_ENHANCED_CATEGORY_MAPPING) {
  // New implementation
  categoryId = await this.determineProductCategory(product, relatedObjects, defaultCategory);
} else {
  // Previous implementation
  categoryId = defaultCategory.id;
}
```

---

## 📚 Documentation

### How to Run the Fix

1. **First, run the one-time fix script to correct existing data:**
   ```bash
   npx tsx src/scripts/fix-empanadas-status.ts
   ```

2. **Deploy the updated sync code**

3. **Trigger a new sync to verify the fix:**
   ```bash
   curl -X POST http://localhost:3000/api/square/sync
   ```

4. **Verify in the admin panel that empanadas show as active**

### Monitoring

Monitor these metrics after deployment:
- Number of products in EMPANADAS category
- Active status of empanada products  
- Category assignment logs during sync
- Sync completion time

---

## Summary

The core issue is that the `determineProductCategory` method in `production-sync.ts` is not implemented - it just returns the default category. This causes all empanadas to be miscategorized. The fix implements proper category mapping using the existing `category-mapper.ts` logic and ensures products are assigned to their correct Square categories.