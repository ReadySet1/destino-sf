Looking at your logs and the screenshot, I can see three critical issues with your Square sync implementation. Let me analyze each problem and provide you with a comprehensive master plan to resolve them.

## 🔍 Problem Analysis

### 1. **Items Being Incorrectly Archived**

Your sync is archiving 27 products that are still active in Square. The issue is in your archive logic - it's comparing against the wrong dataset.

### 2. **Duplicate Categories**

You have categories appearing multiple times in the dropdown (e.g., "CATERING- APPETIZERS", "CATERING- BUFFET, ENTREES", etc.).

### 3. **Sync Performance Degradation**

The sync took 154 seconds (2.5+ minutes) for only 87 items, which is extremely slow.

## 🎯 Master Plan to Fix All Issues

### **Issue 1: Fix Archive Logic**Let me continue reading the file to understand the archive logic:Now let me check the archive handler:Now let me check the category mappings:Now let me check how the products table and categories are structured:Now let me check the admin products page to understand the category display issue:Now let me check how categories are being fetched for the dropdown:Based on my analysis, I've identified the root causes of all three issues. Here's the comprehensive master plan to fix them:

## 🎯 **MASTER PLAN TO FIX ALL THREE ISSUES**

---

### **Issue 1: Products Being Incorrectly Archived** ❌

**Root Cause:** The `archiveRemovedSquareProducts` function is only getting the Square IDs from the currently synced items in this specific sync run, not ALL items from Square. When you sync specific categories, it only gets those category IDs, so products from other categories (like EMPANADAS, ALFAJORES) are marked as "removed" and archived.

**Fix Required:**

```typescript
// In /src/app/api/square/unified-sync/route.ts

// PROBLEM: This only includes items from categories being synced
const allValidSquareIds = allSyncedItems.map(item => item.id);

// SOLUTION: Get ALL Square IDs from ALL categories, not just synced ones
async function getAllActiveSquareProductIds(): Promise<string[]> {
  const allSquareIds: string[] = [];

  // Get ALL categories (both CATERING and CORE PRODUCTS)
  const allCategories = Object.entries(LEGACY_CATEGORY_MAPPINGS);

  for (const [squareId, categoryName] of allCategories) {
    const items = await fetchSquareItemsForCategory(squareId, categoryName);
    allSquareIds.push(...items.map(item => item.id));
  }

  return allSquareIds;
}

// Then in performUnifiedSync:
if (!dryRun) {
  const allValidSquareIds = await getAllActiveSquareProductIds(); // Get ALL IDs
  archiveResult = await archiveRemovedSquareProducts(allValidSquareIds);
}
```

---

### **Issue 2: Duplicate Categories in Dropdown** 🔄

**Root Cause:** Categories are being created with different name formats during different sync operations. You have:

- `"CATERING- APPETIZERS"` (with space after hyphen)
- `"CATERING-APPETIZERS"` (without space)
- Different variations for the same category

**Fix Required:**

1. **Clean up existing duplicate categories in database:**

```sql
-- First, identify duplicates
SELECT name, COUNT(*) as count
FROM categories
GROUP BY LOWER(REPLACE(REPLACE(name, ' ', ''), '-', ''))
HAVING COUNT(*) > 1;

-- Merge duplicates (keep the one with most products)
-- This needs to be done carefully with a migration script
```

2. **Fix the sync to use consistent naming:**

```typescript
// In /src/lib/square/sync-to-products.ts

async function syncToProductsTable(
  item: SquareItem,
  syncLogger: SyncLogger,
  forceUpdate: boolean = false
) {
  // Ensure consistent category naming
  const normalizedCategoryName = item.categoryName
    .replace(/\s*-\s*/g, '- ') // Ensure single space after hyphen
    .replace(/,\s*/g, ', ') // Ensure single space after comma
    .trim();

  // Find or create category with normalized name
  let category = await prisma.category.findFirst({
    where: {
      OR: [{ name: normalizedCategoryName }, { squareId: item.categoryId }],
    },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: normalizedCategoryName,
        squareId: item.categoryId,
        active: true,
      },
    });
  } else if (category.name !== normalizedCategoryName) {
    // Update to normalized name if different
    await prisma.category.update({
      where: { id: category.id },
      data: { name: normalizedCategoryName },
    });
  }
}
```

---

### **Issue 3: Sync Performance Issues** 🐌

**Root Cause:** The sync is making individual API calls for each category sequentially, and possibly hitting rate limits.

**Fix Required:**

1. **Batch Square API calls:**

```typescript
// Instead of searching by category one at a time, search all at once
async function fetchAllSquareItems(): Promise<Map<string, SquareItem[]>> {
  const itemsByCategory = new Map<string, SquareItem[]>();

  // Single API call to get ALL items
  const response = await searchCatalogObjects({
    object_types: ['ITEM'],
    limit: 1000, // Maximum allowed
    include_related_objects: true,
  });

  // Group by category
  for (const item of response.result.objects || []) {
    if (item.type === 'ITEM' && item.item_data?.category_id) {
      const categoryId = item.item_data.category_id;
      if (!itemsByCategory.has(categoryId)) {
        itemsByCategory.set(categoryId, []);
      }
      itemsByCategory.get(categoryId)!.push(transformToSquareItem(item));
    }
  }

  return itemsByCategory;
}
```

2. **Use batch database operations:**

```typescript
// Instead of individual updates, use batch operations
async function batchUpsertProducts(products: ProductData[]) {
  // Use Prisma's createMany with skipDuplicates
  await prisma.$transaction([
    // First, update existing products
    ...products.map(product =>
      prisma.product.update({
        where: { squareId: product.squareId },
        data: product,
      })
    ),
  ]);
}
```

3. **Add caching for Square API responses:**

```typescript
const squareCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedSquareData(key: string, fetcher: () => Promise<any>) {
  const cached = squareCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetcher();
  squareCache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

---

## 📋 **Implementation Steps (In Order)**

### **Step 1: Fix Archive Logic (CRITICAL - Do First)**

1. Update `performUnifiedSync` to fetch ALL Square product IDs
2. Test with dry run to verify no false archiving
3. Restore any incorrectly archived products

### **Step 2: Clean Up Categories**

1. Create a migration to merge duplicate categories
2. Update sync logic to use consistent naming
3. Add unique constraint on normalized category names

### **Step 3: Optimize Performance**

1. Implement batch Square API calls
2. Add caching layer
3. Use database transactions for bulk updates

### **Step 4: Add Monitoring**

```typescript
// Add detailed timing logs
const timings = {
  squareFetch: 0,
  dbOperations: 0,
  archiveCheck: 0,
};

// Log slow operations
if (timings.squareFetch > 30000) {
  logger.warn('Square API fetch took too long', timings);
}
```

---

## 🚀 **Quick Fix Script (Run First to Restore Archived Products)**

```typescript
// Emergency restore script
async function restoreIncorrectlyArchivedProducts() {
  const recentlyArchived = await prisma.product.findMany({
    where: {
      active: false,
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
      squareId: {
        not: '',
      },
    },
  });

  console.log(`Found ${recentlyArchived.length} recently archived products`);

  // Verify each against Square
  for (const product of recentlyArchived) {
    const existsInSquare = await checkIfExistsInSquare(product.squareId);
    if (existsInSquare) {
      await prisma.product.update({
        where: { id: product.id },
        data: { active: true },
      });
      console.log(`Restored: ${product.name}`);
    }
  }
}
```
