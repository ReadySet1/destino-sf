I'll help you create a fix template to investigate the missing images, price, and category issues with your Square sync. Here's the structured plan:

## 🎯 Feature/Fix Overview

**Name**: Square Sync Data Mapping Fix - Images, Price & Category

**Type**: Bug Fix

**Priority**: High

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

Square sync for empanadas and alfajores is completing successfully but products are missing critical data: images are not being retrieved from Square, prices are showing as $0.00, and products are being assigned to incorrect categories despite the sync reporting success.

### Success Criteria

- [ ] All synced products display Square catalog images correctly
- [ ] Product prices match Square catalog prices (not $0.00)
- [ ] Products are correctly categorized as EMPANADAS or ALFAJORES
- [ ] Sync logs accurately report any data mapping issues

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// Files to investigate/modify
src/
├── lib/
│   ├── square/
│   │   ├── sync-manager.ts              // Core sync logic
│   │   └── square-client.ts             // Square API client
│   └── db/
│       └── queries/
│           └── products.ts               // Product database queries
├── types/
│   └── square-sync.ts                   // Type definitions
├── app/
│   └── api/
│       └── square/
│           ├── debug/
│           │   └── route.ts              // NEW: Debug endpoint
│           └── sync-filtered/
│               └── route.ts              // Existing sync endpoint
└── scripts/
    └── debug-square-sync.ts             // NEW: Debug script
```

### Key Interfaces & Types

```tsx
// types/square-sync.ts - Add debug types
interface SquareDebugInfo {
  rawCatalogObject: any;
  transformedData: SquareSyncItem;
  mappingErrors: DataMappingError[];
}

interface DataMappingError {
  field: 'image' | 'price' | 'category';
  expected: any;
  actual: any;
  reason: string;
}

interface SquareImageData {
  id: string;
  url?: string;
  caption?: string;
}
```

### Database Schema Reference

```sql
-- Check existing schema for image storage
-- products table should have:
-- images JSONB or TEXT[] column
-- price DECIMAL(10,2) column
-- category_id UUID column with FK to categories
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [ ] Preserve existing sync flow and authentication
- [ ] Maintain backward compatibility with existing data
- [ ] Keep current API contract unchanged

### Implementation Assumptions

- Square API returns image URLs in catalog object
- Price data is in `itemVariationData.priceMoney`
- Category mapping uses Square category names

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// NEW Debug endpoint
GET /api/square/debug?itemId=[squareItemId] - Debug single item sync

// Existing endpoints to modify
POST /api/square/sync-filtered - Add verbose logging option
```

### Server Actions (App Router)

```tsx
// lib/square/sync-debug.ts
async function debugSquareItem(squareId: string): Promise<SquareDebugInfo>
async function validateDataMapping(item: CatalogObject): Promise<DataMappingError[]>
async function fetchSquareImages(imageIds: string[]): Promise<SquareImageData[]>
```

### Client-Server Data Flow

1. Square API returns catalog object with nested data
2. Transform function extracts images, price, category
3. Validate transformed data before database insert
4. Log any mapping errors for debugging
5. Store complete data in database

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Square Data Transformation Tests
describe('Square Data Mapping', () => {
  it('correctly extracts image URLs from catalog object', () => {
    const mockCatalogObject = {
      id: 'test-id',
      itemData: {
        name: 'Empanada de Carne',
        imageIds: ['img-123', 'img-456'],
        categories: [{ id: 'cat-1', name: 'EMPANADAS' }],
        variations: [{
          id: 'var-1',
          itemVariationData: {
            priceMoney: { amount: 500, currency: 'USD' }
          }
        }]
      }
    };
    
    const transformed = transformSquareItem(mockCatalogObject);
    expect(transformed.images).toHaveLength(2);
    expect(transformed.price).toBe(5.00);
    expect(transformed.categoryName).toBe('EMPANADAS');
  });
  
  it('handles missing price data gracefully', () => {
    // Test edge cases
  });
  
  it('maps Square categories to local categories', () => {
    // Test category mapping
  });
});
```

### Integration Tests

```tsx
// Square API Integration Tests
describe('Square API Data Retrieval', () => {
  it('fetches complete catalog data including images', async () => {
    // Mock Square API response
    const response = await squareClient.catalogApi.retrieveCatalogObject('item-id');
    expect(response.result.object).toHaveProperty('imageIds');
  });
  
  it('retrieves image URLs for image IDs', async () => {
    // Test image URL resolution
  });
});
```

### E2E Tests (Playwright)

```tsx
test.describe('Product Display After Sync', () => {
  test('synced products show images', async ({ page }) => {
    await page.goto('/products/empanadas');
    const productImages = await page.locator('.product-image').all();
    expect(productImages.length).toBeGreaterThan(0);
  });
  
  test('synced products show correct prices', async ({ page }) => {
    const priceElement = await page.locator('.product-price').first();
    const price = await priceElement.textContent();
    expect(price).not.toBe('$0.00');
  });
});
```

### Type Safety Tests

```tsx
// Ensure type safety for Square data
import { expectType } from 'tsd';

expectType<string[]>(transformedItem.images);
expectType<Decimal>(transformedItem.price);
expectType<string>(transformedItem.categoryName);
```

---

## 🔒 Security Analysis

### Authentication & Authorization

- [ ] Maintain existing auth checks
- [ ] Debug endpoints require admin role
- [ ] No exposure of Square API keys in logs

### Input Validation & Sanitization

```tsx
// Validate Square data before storage
const validateSquareData = (data: any) => {
  // Validate image URLs are HTTPS
  if (data.images) {
    data.images.forEach((url: string) => {
      if (!url.startsWith('https://')) {
        throw new Error('Invalid image URL');
      }
    });
  }
  
  // Validate price is positive
  if (data.price && data.price < 0) {
    throw new Error('Invalid price');
  }
};
```

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Ensure indexes exist for lookups
CREATE INDEX IF NOT EXISTS idx_products_square_id ON products(square_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
```

### Caching Strategy

- [ ] Cache Square image URLs (they rarely change)
- [ ] Implement retry logic for image fetch failures
- [ ] Batch image requests to Square API

---

## 🚦 Implementation Checklist

### Pre-Development

- [ ] Analyze current Square API responses in logs
- [ ] Review Square API documentation for image handling
- [ ] Check database schema for image storage format
- [ ] Verify category name matching logic

### Development Phase

- [ ] Create debug script to inspect raw Square data
- [ ] Fix image ID to URL resolution
- [ ] Fix price extraction from variations
- [ ] Fix category mapping logic
- [ ] Add comprehensive logging
- [ ] Update sync dashboard to show data quality

### Pre-Deployment

- [ ] Test with sample Square items
- [ ] Verify all existing products update correctly
- [ ] Check performance impact
- [ ] Document any Square API limitations
- [ ] Create rollback plan

---

## 📝 MCP Analysis Commands

### For Local Development

```bash
# Check current sync implementation
desktop-commander: read_file ./src/lib/square/sync-manager.ts

# Look for image handling code
desktop-commander: search_code "imageIds"
desktop-commander: search_code "images.*Square"

# Check price extraction logic
desktop-commander: search_code "priceMoney"
desktop-commander: search_code "amount.*100"

# Review category mapping
desktop-commander: search_code "categories.*map"
desktop-commander: search_code "EMPANADAS|ALFAJORES"

# Check database schema
desktop-commander: read_file ./prisma/schema.prisma
```

### For GitHub Repositories

```bash
# Review Square sync implementation
github: get_file_contents path: src/lib/square/sync-manager.ts

# Check type definitions
github: get_file_contents path: src/types/square-sync.ts

# Search for image handling
github: search_code "Square.*image"

# Check API responses
github: search_code "catalogApi"
```

---

## 🎨 Debug Implementation

### Debug Script

Create `scripts/debug-square-sync.ts`:

```tsx
import { Client, Environment } from 'square';
import dotenv from 'dotenv';

dotenv.config();

async function debugSquareSync() {
  const client = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN!,
    environment: Environment.Sandbox,
  });
  
  try {
    // Fetch a specific item
    const response = await client.catalogApi.listCatalog(
      undefined,
      'ITEM'
    );
    
    const items = response.result.objects || [];
    
    // Find empanadas/alfajores
    const targetItems = items.filter(item => {
      const categories = item.itemData?.categories || [];
      return categories.some(cat => 
        ['EMPANADAS', 'ALFAJORES'].includes(cat.name?.toUpperCase() || '')
      );
    });
    
    console.log('Found items:', targetItems.length);
    
    // Debug first item
    if (targetItems.length > 0) {
      const item = targetItems[0];
      console.log('\n=== RAW SQUARE DATA ===');
      console.log(JSON.stringify(item, null, 2));
      
      // Check images
      console.log('\n=== IMAGE DATA ===');
      console.log('Image IDs:', item.itemData?.imageIds);
      
      if (item.itemData?.imageIds?.length > 0) {
        // Fetch image details
        const imageResponse = await client.catalogApi.batchRetrieveCatalogObjects({
          objectIds: item.itemData.imageIds,
        });
        console.log('Image objects:', JSON.stringify(imageResponse.result.objects, null, 2));
      }
      
      // Check price
      console.log('\n=== PRICE DATA ===');
      const variations = item.itemData?.variations || [];
      variations.forEach((v, i) => {
        console.log(`Variation ${i}:`, {
          name: v.itemVariationData?.name,
          price: v.itemVariationData?.priceMoney,
        });
      });
      
      // Check category
      console.log('\n=== CATEGORY DATA ===');
      console.log('Categories:', item.itemData?.categories);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugSquareSync();
```

### Debug API Endpoint

Create `/src/app/api/square/debug/route.ts`:

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { squareClient } from '@/lib/square/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  
  try {
    let debugInfo: any = {};
    
    if (itemId) {
      // Debug specific item
      const itemResponse = await squareClient.catalogApi.retrieveCatalogObject(itemId);
      const item = itemResponse.result.object;
      
      debugInfo.rawData = item;
      
      // Check for images
      if (item.itemData?.imageIds?.length > 0) {
        const imageResponse = await squareClient.catalogApi.batchRetrieveCatalogObjects({
          objectIds: item.itemData.imageIds,
        });
        debugInfo.images = imageResponse.result.objects;
      }
      
      // Transform and check for issues
      debugInfo.transformedData = {
        name: item.itemData?.name,
        images: item.itemData?.imageIds || [],
        price: item.itemData?.variations?.[0]?.itemVariationData?.priceMoney,
        category: item.itemData?.categories?.[0],
      };
      
      // Identify issues
      debugInfo.issues = [];
      if (!debugInfo.transformedData.images.length) {
        debugInfo.issues.push('No images found');
      }
      if (!debugInfo.transformedData.price?.amount) {
        debugInfo.issues.push('No price found');
      }
      if (!debugInfo.transformedData.category?.name) {
        debugInfo.issues.push('No category found');
      }
    } else {
      // List all items with issues
      const response = await squareClient.catalogApi.listCatalog(undefined, 'ITEM');
      const items = response.result.objects || [];
      
      debugInfo.totalItems = items.length;
      debugInfo.itemsWithIssues = items.filter(item => {
        const hasImages = item.itemData?.imageIds?.length > 0;
        const hasPrice = item.itemData?.variations?.some(v => 
          v.itemVariationData?.priceMoney?.amount > 0
        );
        const hasCategory = item.itemData?.categories?.length > 0;
        
        return !hasImages || !hasPrice || !hasCategory;
      }).map(item => ({
        id: item.id,
        name: item.itemData?.name,
        hasImages: !!item.itemData?.imageIds?.length,
        hasPrice: !!item.itemData?.variations?.some(v => 
          v.itemVariationData?.priceMoney?.amount > 0
        ),
        hasCategory: !!item.itemData?.categories?.length,
      }));
    }
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error },
      { status: 500 }
    );
  }
}
```

---

## 🔄 Fix Implementation Steps

1. **Run debug script** to understand Square data structure
2. **Identify mapping issues** in transformation logic
3. **Update sync manager** with correct field mappings
4. **Add image URL resolution** if needed
5. **Fix price calculation** (likely needs /100 for cents)
6. **Fix category matching** logic
7. **Test with dry run** before full sync
8. **Monitor sync logs** for validation

This template will help you systematically identify and fix the data mapping issues in your Square sync implementation.