## 🎯 Feature/Fix Overview

**Name**: Square Catalog Filtered Sync Fix

**Type**: Bug Fix

**Priority**: Critical

**Estimated Complexity**: Small (1-2 days)

### Problem Statement

The filtered Square catalog sync is failing with two critical errors:
1. Invalid UUID format in sync history creation (using custom format `sync_1754518018317_e12njoct8` instead of proper UUID)
2. Malformed Square API query structure causing 400 error with "Unknown query type" (incorrect `query` field structure)

### Success Criteria

- [ ] Sync history records are created/updated successfully with valid UUIDs
- [ ] Square catalog API returns data without 400 errors
- [ ] Filtered sync completes with proper product synchronization for alfajores/empanadas
- [ ] Catering items remain protected during sync

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
src/
├── lib/
│   ├── square/
│   │   ├── filtered-sync.ts      // Main sync logic (FIX: UUID generation)
│   │   ├── catalog-api.ts        // Already using direct API correctly
│   │   └── client.ts              // Client wrapper (routes to catalog-api)
├── prisma/
│   └── schema.prisma              // SyncHistory table expects UUID
└── types/
    └── square-sync.ts             // Type definitions
```

### Key Interfaces & Types

```tsx
// From your prisma schema - SyncHistory expects UUID
model SyncHistory {
  id              String    @id @default(uuid()) @db.Uuid  // <-- Must be valid UUID
  syncType        String    @db.VarChar(50)
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  productsSynced  Int       @default(0)
  productsSkipped Int       @default(0)
  errors          Json      @default("[]")
  metadata        Json      @default("{}")
}
```

---

## 🔐 Specific Fixes Required

### Fix 1: UUID Generation in filtered-sync.ts

**Location**: `/src/lib/square/filtered-sync.ts` Line 33

```tsx
// CURRENT CODE (BROKEN):
constructor(config: Partial<FilteredSyncConfig> = {}) {
  this.config = { ...FILTERED_SYNC_CONFIG, ...config };
  this.syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// FIXED CODE:
import { randomUUID } from 'crypto';

constructor(config: Partial<FilteredSyncConfig> = {}) {
  this.config = { ...FILTERED_SYNC_CONFIG, ...config };
  this.syncId = randomUUID(); // Generates proper UUID v4 format
}
```

### Fix 2: Square API Query Structure in fetchFilteredCatalog

**Location**: `/src/lib/square/filtered-sync.ts` Lines 180-195

The issue is in the `fetchFilteredCatalog` method. The Square API is receiving an invalid query structure:

```tsx
// CURRENT CODE (BROKEN):
private async fetchFilteredCatalog(): Promise<{
  success: boolean;
  products: any[];
  relatedObjects: any[];
  error?: string;
}> {
  try {
    const catalogApi = squareClient.catalogApi;
    
    const response = await catalogApi.searchCatalogObjects({
      objectTypes: ['ITEM'],
      query: {
        sortedAttributeQuery: {
          attributeName: 'name'
        }
      },
      includeRelatedObjects: true,
      limit: 1000
    });

// FIXED CODE:
private async fetchFilteredCatalog(): Promise<{
  success: boolean;
  products: any[];
  relatedObjects: any[];
  error?: string;
}> {
  try {
    const catalogApi = squareClient.catalogApi;
    
    if (!catalogApi) {
      throw new Error('Square catalog API is not available');
    }
    
    // Use proper Square API structure
    const requestBody = {
      object_types: ['ITEM'],  // Changed from objectTypes
      include_related_objects: true,  // Changed from includeRelatedObjects
      limit: 1000,
      // Remove the problematic query field entirely or use correct structure
      sorted_attribute_query: {  // If you need sorting
        attribute_name: 'name',
        initial_attribute_value: '',
        sort_order: 'ASC'
      }
    };
    
    const response = await catalogApi.searchCatalogObjects(requestBody);
```

Actually, looking at your `catalog-api.ts`, the `searchCatalogObjects` function expects a different structure. Let me check what the actual API expects:

### Fix 2 (Revised): Align with catalog-api.ts implementation

The `catalog-api.ts` already handles the proper API structure. The issue is that `fetchFilteredCatalog` is passing the wrong format to it:

```tsx
// FIXED fetchFilteredCatalog method:
private async fetchFilteredCatalog(): Promise<{
  success: boolean;
  products: any[];
  relatedObjects: any[];
  error?: string;
}> {
  try {
    const catalogApi = squareClient.catalogApi;
    
    if (!catalogApi) {
      throw new Error('Square catalog API is not available');
    }
    
    // Use the format expected by catalog-api.ts searchCatalogObjects
    const requestBody = {
      filter: {
        types: ['ITEM']
      },
      include_deleted_objects: false,
      include_related_objects: true,
      limit: 1000
    };
    
    const response = await catalogApi.searchCatalogObjects(requestBody);

    if (!response.result) {
      return {
        success: false,
        products: [],
        relatedObjects: [],
        error: 'No result from Square API'
      };
    }

    const objects = response.result.objects || [];
    const relatedObjects = response.result.related_objects || [];

    // Filter products to only include items that match our criteria
    const filteredProducts = objects.filter(obj => this.shouldProcessProduct(obj));

    logger.info(`📦 Fetched ${objects.length} total products, ${filteredProducts.length} match filter criteria`);

    return {
      success: true,
      products: filteredProducts,
      relatedObjects
    };

  } catch (error) {
    logger.error('❌ Failed to fetch Square catalog:', error);
    return {
      success: false,
      products: [],
      relatedObjects: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Fix 3: Additional Type Safety Improvements

Add proper typing to prevent future issues:

```tsx
// types/square-sync.ts (add if not present)
export interface CatalogSearchRequest {
  filter?: {
    types?: string[];
    product_types?: string[];
  };
  include_deleted_objects?: boolean;
  include_related_objects?: boolean;
  limit?: number;
  cursor?: string;
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// lib/square/__tests__/filtered-sync.test.ts
import { FilteredSyncManager } from '../filtered-sync';
import { validate as uuidValidate } from 'uuid';

describe('FilteredSyncManager', () => {
  it('generates valid UUID for syncId', () => {
    const manager = new FilteredSyncManager();
    // Access private property for testing
    const syncId = (manager as any).syncId;
    
    expect(uuidValidate(syncId)).toBe(true);
    expect(syncId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('creates sync history with valid UUID', async () => {
    const mockPrisma = {
      syncHistory: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    
    const manager = new FilteredSyncManager();
    await (manager as any).createSyncHistory(new Date());
    
    const call = mockPrisma.syncHistory.create.mock.calls[0];
    expect(uuidValidate(call[0].data.id)).toBe(true);
  });
});

// lib/square/__tests__/catalog-api-integration.test.ts
describe('Square Catalog API Integration', () => {
  it('formats search request correctly', async () => {
    const manager = new FilteredSyncManager();
    const result = await (manager as any).fetchFilteredCatalog();
    
    // Should not throw 400 error
    expect(result.error).not.toContain('Unknown query type');
    expect(result.success).toBeDefined();
  });
});
```

### Manual Testing Steps

1. **Test UUID Generation**:
```bash
# In your Next.js app, add a test endpoint
# app/api/test-sync/route.ts
import { randomUUID } from 'crypto';

export async function GET() {
  const testId = randomUUID();
  return Response.json({ 
    uuid: testId,
    isValid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId)
  });
}
```

2. **Test Database Insert**:
```sql
-- Test that UUID column accepts the new format
INSERT INTO sync_history (id, "syncType", "startedAt") 
VALUES (gen_random_uuid(), 'TEST', NOW());

-- Verify it worked
SELECT id, LENGTH(id::text) as id_length 
FROM sync_history 
WHERE "syncType" = 'TEST';
```

3. **Test Square API Call**:
```bash
# Test the catalog API directly
curl -X POST https://connect.squareup.com/v2/catalog/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Square-Version: 2024-10-17" \
  -H "Content-Type: application/json" \
  -d '{
    "object_types": ["ITEM"],
    "include_related_objects": true,
    "limit": 10
  }'
```

---

## 🚦 Implementation Checklist

### Immediate Actions (Fix the Errors)

- [ ] Update `FilteredSyncManager` constructor to use `randomUUID()`
- [ ] Fix `fetchFilteredCatalog` to use correct API request structure
- [ ] Test sync with dry-run mode first

### Code Changes

1. **Update filtered-sync.ts**:
```bash
# Line 33 - Update constructor
# Line 180-220 - Update fetchFilteredCatalog method
```

2. **Verify imports**:
```tsx
// At top of filtered-sync.ts
import { randomUUID } from 'crypto';
```

3. **Update package.json if needed** (crypto is built-in to Node.js):
```json
// No changes needed - crypto is native to Node.js
```

### Testing Commands

```bash
# Run the sync with logging
npm run dev
# Navigate to: http://localhost:3000/api/square/sync-filtered

# Check logs for:
# - Valid UUID in "Starting filtered Square sync..." log
# - No "Unknown query type" errors
# - Successful "Fetched X total products" message

# Verify database
psql $DATABASE_URL -c "SELECT id, \"syncType\", \"startedAt\" FROM sync_history ORDER BY \"startedAt\" DESC LIMIT 5;"
```

---

## 🔄 Quick Debugging

### Check Current Sync History Issues
```sql
-- See what's in sync_history
SELECT 
  id,
  "syncType",
  "startedAt",
  "completedAt",
  "productsSynced",
  (metadata->>'success')::boolean as success,
  LEFT(errors::text, 100) as error_preview
FROM sync_history
ORDER BY "startedAt" DESC
LIMIT 10;

-- Clean up invalid entries if needed
DELETE FROM sync_history 
WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
```

### Test API Directly
```tsx
// app/api/test-catalog/route.ts
import { squareClient } from '@/lib/square/client';

export async function GET() {
  try {
    const response = await squareClient.catalogApi.searchCatalogObjects({
      filter: {
        types: ['ITEM']
      },
      include_related_objects: true,
      limit: 5
    });
    
    return Response.json({
      success: true,
      count: response.result?.objects?.length || 0
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

---

## 🎯 Summary

The fix is straightforward:

1. **Replace custom sync ID generation with `randomUUID()`** in the constructor
2. **Fix the Square API request structure** in `fetchFilteredCatalog` to match what `catalog-api.ts` expects
3. **Test thoroughly** before deploying

These are minimal, surgical changes that address the root causes without affecting the rest of your sync logic. The catering protection and other features will continue to work as designed.