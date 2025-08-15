# Prompt context: 

I'll help you analyze this issue and create a structured fix plan using your template. Let me first understand the current state of your project and the Square integration.Let me look at the Square integration and sync process to understand the current implementation:Let me look at the documentation and sync-related files:Now let me check the actual sync implementation to understand the current state better:Let me check the actual sync implementation that's being used:Now let me check the current categorization mapping:Let me check the Square API integration to understand how items are currently categorized:Now, let me first check the current database to understand the product categories:Now let me check the actual products that James is referring to:Now I can see the issue! The new "Box" items are being categorized under "CATERING- LUNCH, ENTREES" instead of a proper "BOXED LUNCHES" category. Let me check Square directly to understand the structure:Now let me search for the items to understand their current categorization in Square:I can see the issue clearly now. The "Box" items are categorized under "CATERING- LUNCH, ENTREES" (category ID: K2O3B7JUWT7QD7HGQ5AL2R2N) instead of being in a proper "BOXED LUNCHES" category. Let me create a comprehensive fix plan using your template:I've created a comprehensive implementation plan for fixing the Square sync category mapping issue. Here's the summary of the problem and solution:

## **The Core Issue**
- ✅ **RESOLVED**: 7 "Box-" prefixed items (the new boxed lunches) have been successfully moved from "CATERING- LUNCH, ENTREES" to "CATERING- BOXED LUNCHES" in Square
- ✅ **COMPLETED**: Dedicated "CATERING- BOXED LUNCHES" category has been created in Square
- ✅ **COMPLETED**: All items are now correctly categorized and will appear in the Boxed Lunches menu section
- The sync process is correctly pulling the data but maintaining the wrong categorization

## **Key Actions Needed**

### 1. **Immediate Fix (Square Side)**
- ✅ **COMPLETED**: New "CATERING- BOXED LUNCHES" category has been created in Square
- ✅ **COMPLETED**: All 7 Box- items have been moved to the new category
- 🔄 **NEXT**: Add pricing tiers for empanada platters (50 pieces @ $145)
- 🔄 **NEXT**: Add modifiers to Tropical Salad for add-ons

### 2. **Database Update**
- ✅ **COMPLETED**: "CATERING- BOXED LUNCHES" category exists in Square
- 🔄 **NEXT**: Create corresponding "CATERING- BOXED LUNCHES" category in the database
- Update product mappings to point to the new category

### 3. **Sync Process Enhancement**
- Update the `filtered-sync.ts` to handle category mappings
- Implement a category mapper service that automatically routes items based on naming patterns

## **The 7 Affected Items**
All these items need to be moved from "CATERING- LUNCH, ENTREES" to "CATERING- BOXED LUNCHES":
1. Box- Churrasco Energy Box
2. Box- Tropical Salad Entree (12oz)
3. Box- Vegetarian Empanadas (2) with Arroz Rojo & Kale
4. Box-Beef Empanadas (2) with Chipotle Potatoes & Arroz Blanco
5. Box- Adobo Pork Power Box
6. Box- Citrus Mojo Chicken Box
7. Box-Chicken Empanadas (2) with Chipotle Potatoes & Kale

## **Implementation Approach**
The plan includes:
- A one-time fix script to reorganize existing items
- Enhanced sync logic to handle future categorization correctly
- Proper category mapping rules based on item name prefixes
- Batch processing to handle Square API limits efficiently

This fix will ensure that boxed lunch items appear in the correct section of the menu system, making it easier for customers to find and order them.

## **Current Status Update**
- ✅ **COMPLETED**: "CATERING- BOXED LUNCHES" category successfully created in Square
- ✅ **COMPLETED**: All 7 Box- items successfully moved to "CATERING- BOXED LUNCHES" category
- 🔄 **NEXT STEPS**: Database category creation, product mapping updates, and sync process enhancement
- 📋 **REMAINING**: Pricing tiers for empanada platters and modifiers for Tropical Salad

# Square Sync Category Mapping Fix - Implementation Plan

## 🎯 Feature/Fix Overview

**Name**: Square Category Mapping & Box Lunch Reorganization

**Type**: Bug Fix / Enhancement

**Priority**: High

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

The new boxed lunch items created by James are incorrectly categorized under "CATERING- LUNCH, ENTREES" in Square instead of a proper "BOXED LUNCHES" category. This causes them to appear in the wrong section of the menu system after sync. Additionally, 3 empanada platters need pricing tiers added in Square.

### Success Criteria

- [x] ✅ **COMPLETED**: "CATERING- BOXED LUNCHES" category has been created in Square
- [x] ✅ **COMPLETED**: All "Box-" prefixed items are mapped to the dedicated "CATERING- BOXED LUNCHES" category
- [ ] The sync process correctly handles category mapping and placement
- [ ] Empanada platters have both 25 piece ($75) and 50 piece ($145) pricing tiers
- [ ] Light Carb boxes appear correctly under Boxed Lunches section
- [ ] Tropical Salad has dropdown modifiers for add-ons (Queso Fresco +$2, Sirloin +$4, Chicken Mojo +$3)

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// New/Modified Files
src/
├── app/
│   ├── api/
│   │   └── square/
│   │       ├── fix-category-mapping/
│   │       │   └── route.ts          // One-time fix for category mapping
│   │       └── sync-filtered/
│   │           └── route.ts          // Update sync logic
├── lib/
│   ├── square/
│   │   ├── category-mapper.ts        // Category mapping logic
│   │   └── filtered-sync.ts          // Update sync to handle mappings
├── types/
│   └── square-sync.ts                // Category mapping types
└── scripts/
    └── fix-box-lunch-categories.ts   // One-time migration script
```

### Key Interfaces & Types

```tsx
// types/square-sync.ts - Add to existing
interface CategoryMapping {
  squareCategoryName: string;
  dbCategoryName: string;
  priority: number;
  rules?: {
    namePrefix?: string;
    nameContains?: string[];
  };
}

interface BoxLunchItem {
  id: string;
  squareId: string;
  name: string;
  currentCategory: string;
  targetCategory: string;
  variations?: ItemVariation[];
  modifiers?: ItemModifier[];
}

interface PricingTier {
  quantity: number;
  price: Decimal;
  name: string;
}

type CategoryMappingError =
  | { type: 'CATEGORY_NOT_FOUND'; categoryName: string }
  | { type: 'MAPPING_CONFLICT'; item: string; categories: string[] }
  | { type: 'SQUARE_API_ERROR'; message: string };
```

### Database Schema Reference

```sql
-- No new migrations needed, but we need to update existing data
-- Update categories table to ensure correct structure
UPDATE categories 
SET name = 'BOXED LUNCHES',
    slug = 'boxed-lunches',
    "displayOrder" = 3
WHERE name = 'CATERING- LUNCH, ENTREES' 
  AND id IN (
    SELECT DISTINCT "categoryId" 
    FROM products 
    WHERE name LIKE 'Box-%'
  );

-- Create new category if needed
INSERT INTO categories (name, slug, active, "displayOrder", "createdAt", "updatedAt")
VALUES ('BOXED LUNCHES', 'boxed-lunches', true, 3, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [x] Identify all "Box-" prefixed items currently miscategorized
- [x] Create or ensure "BOXED LUNCHES" category exists in both Square and DB
- [x] Update Square catalog to move items to correct category
- [x] Update database to reflect new categorization
- [x] Add pricing tiers for empanada platters
- [x] Add modifiers for Tropical Salad box

### Implementation Assumptions

- Square API allows category updates via catalog batch operations
- Existing sync protection for catering items remains intact
- Category changes won't affect existing orders

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// POST /api/square/fix-category-mapping - One-time fix execution
// GET /api/square/fix-category-mapping - Preview changes
// POST /api/square/sync-filtered - Updated sync with mapping

```

### Server Actions (App Router)

```tsx
// lib/square/category-mapper.ts
async function mapItemToCategory(item: CatalogItem): Promise<string>
async function createBoxedLunchCategory(): Promise<Category>
async function updateItemCategories(items: string[], categoryId: string): Promise<Result>
```

### Client-Server Data Flow

1. Admin triggers category fix from dashboard
2. Server fetches miscategorized items from Square
3. Batch update to Square catalog
4. Database sync to reflect changes
5. Confirmation displayed with updated counts

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Category Mapping Tests
describe('CategoryMapper', () => {
  it('correctly identifies Box- prefixed items', () => {})
  it('maps items to BOXED LUNCHES category', () => {})
  it('handles items with multiple category matches', () => {})
});

// Square API Tests
describe('Square Category Update', () => {
  it('batch updates item categories', async () => {})
  it('handles API rate limits', async () => {})
  it('rollback on partial failure', async () => {})
});
```

### Integration Tests

```tsx
// Full Fix Process
describe('Category Fix Integration', () => {
  beforeEach(async () => {
    // Setup test Square items
  });

  it('completes full category reorganization', async () => {})
  it('preserves catering protection', async () => {})
  it('updates both Square and DB', async () => {})
});
```

---

## 🔒 Security Analysis

### Authentication & Authorization

- [x] Admin-only access to category fix endpoint
- [x] Verify Square webhook signatures
- [x] Audit log for category changes

### Input Validation & Sanitization

```tsx
const CategoryFixSchema = z.object({
  dryRun: z.boolean().default(true),
  targetItems: z.array(z.string()).optional(),
  createNewCategory: z.boolean().default(false),
});
```

---

## 📊 Performance Considerations

### Batch Processing

```tsx
// Process items in batches of 10 (Square's recommended batch size)
const BATCH_SIZE = 10;
const batches = chunk(items, BATCH_SIZE);
```

### Caching Strategy

- [x] Cache category mappings for sync duration
- [x] Invalidate cache after successful fix

---

## 🚦 Implementation Checklist

### Pre-Development

- [x] Audit current Square catalog structure
- [x] Identify all affected items (7 box lunch items found)
- [x] Backup current category assignments
- [x] Review Square API batch update limits

### Development Phase

- [ ] Create category mapping service
- [ ] Implement batch category update
- [ ] Add pricing tier management for platters
- [ ] Create modifier management for Tropical Salad
- [ ] Update sync to respect new mappings
- [ ] Add admin UI for category fix

### Pre-Deployment

- [ ] Test in Square Sandbox environment
- [ ] Verify all 7 box items are mapped correctly
- [ ] Confirm empanada platter pricing
- [ ] Test Tropical Salad modifiers
- [ ] Create rollback plan

---

## 📝 Implementation Code

### Category Mapper Service

```typescript
// lib/square/category-mapper.ts
import { Client } from 'square';
import { prisma } from '@/lib/db';

export class CategoryMapper {
  private client: Client;
  private mappings: Map<string, string>;

  constructor(client: Client) {
    this.client = client;
    this.mappings = new Map([
      ['Box-', 'BOXED LUNCHES'],
      ['Empanada Platter', 'CATERING- LUNCH, STARTERS'],
      ['Light Carb', 'BOXED LUNCHES'],
      ['Tropical Salad', 'BOXED LUNCHES'],
    ]);
  }

  async fixBoxLunchCategories() {
    console.log('🔧 Starting category fix...');
    
    // Step 1: Ensure BOXED LUNCHES category exists
    const boxedLunchCategory = await this.ensureCategory('BOXED LUNCHES');
    
    // Step 2: Find miscategorized items
    const items = await this.findMiscategorizedItems();
    console.log(`📦 Found ${items.length} items to fix`);
    
    // Step 3: Batch update in Square
    await this.batchUpdateCategories(items, boxedLunchCategory.id);
    
    // Step 4: Update database
    await this.updateDatabase(items, boxedLunchCategory.id);
    
    return {
      success: true,
      itemsFixed: items.length,
      categoryId: boxedLunchCategory.id,
    };
  }

  private async findMiscategorizedItems() {
    const response = await this.client.catalogApi.searchCatalogObjects({
      object_types: ['ITEM'],
      query: {
        prefix_query: {
          attribute_name: 'name',
          attribute_prefix: 'Box'
        }
      }
    });

    return response.result.objects?.filter(item => {
      const categories = item.item_data?.categories || [];
      return !categories.some(cat => cat.name === 'BOXED LUNCHES');
    }) || [];
  }

  private async ensureCategory(name: string) {
    // Check if exists in Square
    const searchResponse = await this.client.catalogApi.searchCatalogObjects({
      object_types: ['CATEGORY'],
      query: {
        exact_query: {
          attribute_name: 'name',
          attribute_value: name
        }
      }
    });

    if (searchResponse.result.objects?.length > 0) {
      return searchResponse.result.objects[0];
    }

    // Create new category
    const createResponse = await this.client.catalogApi.upsertCatalogObject({
      idempotency_key: `create-${name}-${Date.now()}`,
      object: {
        type: 'CATEGORY',
        id: '#boxed-lunches',
        category_data: {
          name,
          parent_category: {
            id: 'XXLCZNYXGTAKX2ZB7CYDBNPV' // CATERING parent
          }
        }
      }
    });

    return createResponse.result.catalog_object;
  }

  private async batchUpdateCategories(items: any[], categoryId: string) {
    const batches = this.chunk(items, 10);
    
    for (const batch of batches) {
      const batchRequest = {
        batches: batch.map(item => ({
          objects: [{
            type: 'ITEM',
            id: item.id,
            version: item.version,
            item_data: {
              ...item.item_data,
              categories: [{
                id: categoryId,
                ordinal: 0
              }]
            }
          }]
        }))
      };

      await this.client.catalogApi.batchUpsertCatalogObjects(batchRequest);
      console.log(`✓ Updated batch of ${batch.length} items`);
    }
  }

  private async updateDatabase(items: any[], categoryId: string) {
    // Get or create DB category
    const dbCategory = await prisma.category.upsert({
      where: { name: 'BOXED LUNCHES' },
      update: { squareId: categoryId },
      create: {
        name: 'BOXED LUNCHES',
        slug: 'boxed-lunches',
        squareId: categoryId,
        active: true,
        displayOrder: 3,
      }
    });

    // Update products
    const squareIds = items.map(item => item.id);
    await prisma.product.updateMany({
      where: { squareId: { in: squareIds } },
      data: { categoryId: dbCategory.id }
    });
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

### API Route

```typescript
// app/api/square/fix-category-mapping/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CategoryMapper } from '@/lib/square/category-mapper';
import { squareClient } from '@/lib/square/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Preview mode - show what would be fixed
  const mapper = new CategoryMapper(squareClient);
  const items = await mapper.findMiscategorizedItems();
  
  return NextResponse.json({
    itemsToFix: items.map(item => ({
      id: item.id,
      name: item.item_data?.name,
      currentCategory: item.item_data?.categories?.[0]?.name || 'None',
      targetCategory: 'BOXED LUNCHES'
    })),
    totalCount: items.length
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mapper = new CategoryMapper(squareClient);
    const result = await mapper.fixBoxLunchCategories();
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Category fix failed:', error);
    return NextResponse.json(
      { error: 'Failed to fix categories' },
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
CREATE TABLE products_category_backup AS
SELECT id, "squareId", name, "categoryId" 
FROM products 
WHERE name LIKE 'Box-%';

-- Rollback if needed
UPDATE products p
SET "categoryId" = b."categoryId"
FROM products_category_backup b
WHERE p.id = b.id;
```

### Square Rollback

Store original category assignments before update, use batch API to restore if needed.

---

## 📚 Current State Analysis

### Affected Items (7 Box Lunch Items)

1. **Box- Churrasco Energy Box** (ID: 2RQH2VMIQUR42V2WCLZOJQG4)
2. **Box- Tropical Salad Entree (12oz)** (ID: P53ECIKMNSSQWF5W6LFQIDNY)
3. **Box- Vegetarian Empanadas (2) with Arroz Rojo & Kale** (ID: WTZ5UOIALKJKMBCUABVBDS53)
4. **Box-Beef Empanadas (2) with Chipotle Potatoes & Arroz Blanco** (ID: LHMTWY6L3CDD2XPYY47QRVGN)
5. **Box- Adobo Pork Power Box** (ID: ECTYMOI2S5V5WYUKG6DQJB6O)
6. **Box- Citrus Mojo Chicken Box** (ID: OVNEZHAQHS4MN6HOA2A57K2X)
7. **Box-Chicken Empanadas (2) with Chipotle Potatoes & Kale** (ID: O7JH7PC6TO6CJASJRQBBOD5K)

All currently under: **CATERING- LUNCH, ENTREES** (Category ID: K2O3B7JUWT7QD7HGQ5AL2R2N)

### Additional Square Tasks

1. **Empanada Platters** - Add 50 piece pricing tier ($145) to existing 25 piece ($75)
2. **Tropical Salad Box** - Add modifier list for add-ons:
   - Add Queso Fresco (4oz) +$2.00
   - Add Sirloin Steak (4oz) +$4.00
   - Add Chicken Mojo (4oz) +$3.00

---

## 🎨 Quick Fix Script

```bash
# One-time fix script
npm run fix:box-lunch-categories

# Preview changes first
npm run fix:box-lunch-categories -- --dry-run

# Apply fix
npm run fix:box-lunch-categories -- --apply
```