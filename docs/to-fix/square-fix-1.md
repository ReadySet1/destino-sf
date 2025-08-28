# 🎯 Square Sync Fix Plan - Pre-order & Seasonal Items

**Type**: Bug Fix / Enhancement  
**Priority**: Critical  
**Estimated Complexity**: Medium (3-5 days)  
**Client**: Destino SF  
**Date**: January 28, 2025  
**Tech Stack**: Next.js 15, TypeScript, Prisma, PostgreSQL, Square API, Supabase

---

## 📋 Executive Summary

The Square sync system is successfully syncing menu items (129 total) but **not properly handling item availability states**, specifically:
- **Pre-order items** (Gingerbread Alfajores) appearing as immediately purchasable
- **Seasonal/unavailable items** (Pride Alfajores) still visible and addable to cart
- Item visibility and availability modifiers not syncing from Square to the website

### Current Architecture Review
- **Database**: PostgreSQL via Prisma ORM (not using Supabase auth tables)
- **Sync System**: `ProductionSyncManager` in `/src/lib/square/production-sync.ts`
- **API Route**: `/api/square/sync` with 5-minute timeout configured
- **Frontend**: Product cards in `/src/components/Products/ProductCard.tsx`
- **No existing availability/pre-order fields** in the products table

---

## 🔍 Problem Analysis

### Current Issues

#### 1. Pre-order Items Not Working
- **Product**: Gingerbread Alfajores
- **Expected**: Should only allow pre-order within specified dates
- **Actual**: Customers can add to cart for immediate purchase
- **Root Cause**: Square's pre-order metadata not being captured/processed during sync

#### 2. Seasonal Items Remain Visible
- **Product**: Pride Alfajores  
- **Expected**: Hidden when out of season
- **Actual**: Still visible on website, marked unavailable but addable to cart
- **Root Cause**: Item visibility status from Square not being respected

#### 3. General Availability Sync Gap
- Square has item states: `ACTIVE`, `INACTIVE`, `ARCHIVED`
- Square has visibility settings: `PUBLIC`, `PRIVATE`
- These states are not being properly mapped to website availability

### Technical Context from Previous Fix
✅ **Already Fixed**:
- Timeout issues (increased to 5 minutes)
- Duplicate detection (using Square IDs instead of names)
- All 129 items syncing successfully

❌ **Not Addressed**:
- Item availability states
- Pre-order functionality
- Seasonal/temporal availability
- Item visibility flags

---

## 🏗️ Solution Architecture

### Phase 1: Database Schema Updates (Prisma Migration)

```prisma
// prisma/migrations/[timestamp]_add_availability_fields/migration.sql

-- Add availability tracking columns to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS 
  "visibility" VARCHAR(20) DEFAULT 'PUBLIC',
  "is_available" BOOLEAN DEFAULT true,
  "is_preorder" BOOLEAN DEFAULT false,
  "preorder_start_date" TIMESTAMP,
  "preorder_end_date" TIMESTAMP,
  "availability_start_date" TIMESTAMP,
  "availability_end_date" TIMESTAMP,
  "item_state" VARCHAR(20) DEFAULT 'ACTIVE',
  "availability_metadata" JSONB DEFAULT '{}',
  "custom_attributes" JSONB DEFAULT '{}';

-- Create index for performance
CREATE INDEX IF NOT EXISTS "idx_products_availability" 
  ON "products"("is_available", "visibility", "active");

-- Add to existing sync_logs table for better tracking
ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS
  "availability_updates" INTEGER DEFAULT 0,
  "preorder_items" INTEGER DEFAULT 0,
  "hidden_items" INTEGER DEFAULT 0;
```

Update Prisma schema:
```prisma
// prisma/schema.prisma - Add to Product model
model Product {
  // ... existing fields ...
  
  // Availability fields
  visibility           String?   @default("PUBLIC") @db.VarChar(20)
  isAvailable         Boolean   @default(true) @map("is_available")
  isPreorder          Boolean   @default(false) @map("is_preorder")
  preorderStartDate   DateTime? @map("preorder_start_date")
  preorderEndDate     DateTime? @map("preorder_end_date")
  availabilityStart   DateTime? @map("availability_start_date")
  availabilityEnd     DateTime? @map("availability_end_date")
  itemState           String?   @default("ACTIVE") @map("item_state") @db.VarChar(20)
  availabilityMeta    Json?     @map("availability_metadata")
  customAttributes    Json?     @map("custom_attributes")
}
```

### Phase 2: Extend Existing TypeScript Types

```typescript
// src/types/square-sync.ts - Add to existing file

/**
 * Square item metadata with availability information
 */
export interface SquareItemAvailability {
  visibility: 'PUBLIC' | 'PRIVATE';
  state: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  availableOnline?: boolean;
  availableForPickup?: boolean;
  preorderCutoffDate?: string;
  fulfillmentAvailability?: {
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    shippingEnabled: boolean;
  };
  customAttributes?: Record<string, any>;
}

/**
 * Product availability information
 */
export interface ProductAvailability {
  isAvailable: boolean;
  isPreorder: boolean;
  preorderDates?: {
    start: Date | null;
    end: Date | null;
  };
  seasonalDates?: {
    start: Date | null;
    end: Date | null;
  };
  availabilityReason?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  state: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

// Update existing SyncResult interface
export interface EnhancedSyncResult extends SyncResult {
  availabilityStats?: {
    totalProcessed: number;
    availableItems: number;
    preorderItems: number;
    hiddenItems: number;
    seasonalItems: number;
  };
}

// src/types/product.ts - Extend existing Product type
import type { Product as PrismaProduct } from '@prisma/client';

export interface Product extends PrismaProduct {
  // Existing fields remain...
  
  // New availability fields (will be added to DB)
  visibility?: string;
  isAvailable?: boolean;
  isPreorder?: boolean;
  preorderStartDate?: Date | null;
  preorderEndDate?: Date | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;
  itemState?: string;
  availabilityMeta?: any;
  customAttributes?: any;
}
```

### Phase 3: Enhance ProductionSyncManager

```typescript
// src/lib/square/production-sync.ts - Extend existing class

import { ProductAvailability, SquareItemAvailability } from '@/types/square-sync';

export class ProductionSyncManager {
  // ... existing code ...

  /**
   * Extract availability metadata from Square catalog object
   */
  private extractAvailabilityMetadata(
    catalogObject: SquareCatalogObject
  ): SquareItemAvailability {
    const itemData = catalogObject.item_data;
    
    return {
      visibility: itemData?.visibility || 'PUBLIC',
      state: catalogObject.is_deleted ? 'ARCHIVED' : 'ACTIVE',
      availableOnline: itemData?.available_online ?? true,
      availableForPickup: itemData?.available_for_pickup ?? true,
      preorderCutoffDate: itemData?.fulfillment?.preorder_cutoff_date,
      customAttributes: this.extractCustomAttributes(catalogObject),
    };
  }

  /**
   * Extract custom attributes that might contain pre-order/seasonal info
   * Square stores these in custom_attribute_values
   */
  private extractCustomAttributes(catalogObject: any): Record<string, any> {
    const attributes: Record<string, any> = {};
    
    if (catalogObject.custom_attribute_values) {
      for (const [key, value] of Object.entries(catalogObject.custom_attribute_values)) {
        // Look for pre-order and seasonal attributes
        if (key.toLowerCase().includes('preorder') || 
            key.toLowerCase().includes('seasonal') ||
            key.toLowerCase().includes('availability')) {
          attributes[key] = value;
        }
      }
    }
    
    // Also check item_data for modifier lists that might indicate availability
    if (catalogObject.item_data?.modifier_list_info) {
      catalogObject.item_data.modifier_list_info.forEach((modifier: any) => {
        if (modifier.modifier_list_id?.includes('PREORDER')) {
          attributes.has_preorder_modifier = true;
        }
      });
    }
    
    return attributes;
  }

  /**
   * Determine product availability based on Square metadata
   */
  private determineAvailability(
    metadata: SquareItemAvailability,
    productName: string
  ): ProductAvailability {
    const now = new Date();
    
    // Check if item is archived or private first
    if (metadata.state === 'ARCHIVED' || metadata.visibility === 'PRIVATE') {
      return {
        isAvailable: false,
        isPreorder: false,
        visibility: metadata.visibility,
        state: metadata.state,
        availabilityReason: 'Item is not available',
      };
    }
    
    // Check for pre-order indicators in name or attributes
    const isPreorderItem = 
      productName.toLowerCase().includes('pre-order') ||
      productName.toLowerCase().includes('preorder') ||
      metadata.customAttributes?.preorder_enabled === 'true' ||
      metadata.customAttributes?.has_preorder_modifier;
    
    // Check for seasonal indicators (Pride Alfajores case)
    const isSeasonalItem = 
      productName.toLowerCase().includes('pride') ||
      productName.toLowerCase().includes('seasonal') ||
      productName.toLowerCase().includes('holiday') ||
      metadata.customAttributes?.seasonal_item === 'true';
    
    // Extract dates from custom attributes if available
    let preorderDates = null;
    let seasonalDates = null;
    
    if (isPreorderItem && metadata.customAttributes) {
      const startDate = metadata.customAttributes.preorder_start_date;
      const endDate = metadata.customAttributes.preorder_end_date || 
                     metadata.preorderCutoffDate;
      
      if (startDate || endDate) {
        preorderDates = {
          start: startDate ? new Date(startDate) : null,
          end: endDate ? new Date(endDate) : null,
        };
      }
    }
    
    if (isSeasonalItem && metadata.customAttributes) {
      const startDate = metadata.customAttributes.seasonal_start_date;
      const endDate = metadata.customAttributes.seasonal_end_date;
      
      if (startDate && endDate) {
        seasonalDates = {
          start: new Date(startDate),
          end: new Date(endDate),
        };
        
        // Check if currently in season
        if (now < seasonalDates.start || now > seasonalDates.end) {
          return {
            isAvailable: false,
            isPreorder: false,
            visibility: metadata.visibility,
            state: metadata.state,
            seasonalDates,
            availabilityReason: 'Out of season',
          };
        }
      }
    }
    
    // Check if item is marked as unavailable online
    if (metadata.availableOnline === false) {
      return {
        isAvailable: false,
        isPreorder: false,
        visibility: metadata.visibility,
        state: metadata.state,
        availabilityReason: 'Not available online',
      };
    }
    
    return {
      isAvailable: !isPreorderItem || (preorderDates && now >= (preorderDates.start || now)),
      isPreorder: isPreorderItem,
      visibility: metadata.visibility,
      state: metadata.state,
      preorderDates,
      seasonalDates,
      availabilityReason: isPreorderItem ? 'Available for pre-order' : 'Available',
    };
  }

  /**
   * Enhanced sync method with availability handling
   */
  async syncProducts(): Promise<EnhancedSyncResult> {
    // ... existing sync logic ...
    
    const availabilityStats = {
      totalProcessed: 0,
      availableItems: 0,
      preorderItems: 0,
      hiddenItems: 0,
      seasonalItems: 0,
    };
    
    // In the product processing loop:
    for (const item of items) {
      try {
        // Extract availability metadata
        const availabilityMeta = this.extractAvailabilityMetadata(item);
        const availability = this.determineAvailability(availabilityMeta, item.item_data.name);
        
        // Update stats
        availabilityStats.totalProcessed++;
        if (availability.isAvailable) availabilityStats.availableItems++;
        if (availability.isPreorder) availabilityStats.preorderItems++;
        if (availability.visibility === 'PRIVATE') availabilityStats.hiddenItems++;
        if (availability.seasonalDates) availabilityStats.seasonalItems++;
        
        // Prepare product data with availability fields
        const productData = {
          // ... existing fields ...
          visibility: availability.visibility,
          isAvailable: availability.isAvailable,
          isPreorder: availability.isPreorder,
          preorderStartDate: availability.preorderDates?.start,
          preorderEndDate: availability.preorderDates?.end,
          availabilityStart: availability.seasonalDates?.start,
          availabilityEnd: availability.seasonalDates?.end,
          itemState: availability.state,
          availabilityMeta: availabilityMeta,
          customAttributes: availabilityMeta.customAttributes,
        };
        
        // Update or create product with availability info
        await prisma.product.upsert({
          where: { squareId: item.id },
          update: productData,
          create: productData,
        });
        
      } catch (error) {
        logger.error(`Failed to sync product ${item.id}:`, error);
      }
    }
    
    // Return enhanced result
    return {
      ...existingResult,
      availabilityStats,
    };
  }
}
```

### Phase 4: Database Update Logic

```typescript
// lib/db/menu-sync.ts
import { db } from '@/lib/db';
import { EnhancedSquareCatalogSync } from '@/lib/square/catalog-sync';

export async function updateMenuItemAvailability(
  squareItemId: string,
  availability: MenuItemAvailability,
  metadata: SquareItemMetadata
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(menuItems)
      .set({
        is_available: availability.isAvailable,
        is_preorder: availability.isPreorder,
        preorder_start_date: availability.preorderDates?.start,
        preorder_end_date: availability.preorderDates?.end,
        availability_start_date: availability.seasonalDates?.start,
        availability_end_date: availability.seasonalDates?.end,
        square_visibility: metadata.visibility,
        square_item_state: metadata.state,
        sync_metadata: metadata.custom_attributes || {},
        updated_at: new Date()
      })
      .where(eq(menuItems.square_item_id, squareItemId));
  });
}

export async function syncAllItemAvailability(): Promise<SyncResult> {
  const sync = new EnhancedSquareCatalogSync();
  const errors: SyncError[] = [];
  let itemsUpdated = 0;
  
  try {
    // Get all menu items from database
    const items = await db
      .select()
      .from(menuItems)
      .where(isNull(menuItems.deleted_at));
    
    // Process each item
    for (const item of items) {
      try {
        // Fetch current Square data
        const metadata = await sync.fetchItemWithAvailability(item.square_item_id);
        
        // Determine availability
        const availability = sync.determineAvailability(metadata);
        
        // Update database
        await updateMenuItemAvailability(
          item.square_item_id,
          availability,
          metadata
        );
        
        itemsUpdated++;
      } catch (error) {
        errors.push({
          itemId: item.square_item_id,
          itemName: item.name,
          error: error.message
        });
      }
    }
    
    // Log sync results
    await db.insert(squareSyncLog).values({
      sync_type: 'AVAILABILITY_UPDATE',
      item_count: items.length,
      success_count: itemsUpdated,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
      started_at: new Date(),
      completed_at: new Date()
    });
    
    return {
      success: errors.length === 0,
      itemsProcessed: items.length,
      itemsUpdated,
      errors,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
```

### Phase 5: Frontend Display Logic

```tsx
// components/menu/MenuItem.tsx
import { MenuItemAvailability } from '@/types/square-sync';

interface MenuItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    is_available: boolean;
    is_preorder: boolean;
    preorder_start_date?: Date;
    preorder_end_date?: Date;
    availability_reason?: string;
  };
}

export function MenuItem({ item }: MenuItemProps) {
  // Don't show unavailable items at all (like Pride Alfajores out of season)
  if (!item.is_available && !item.is_preorder) {
    return null;
  }
  
  const handleAddToCart = () => {
    if (item.is_preorder) {
      // Show pre-order modal with dates
      openPreorderModal({
        item,
        message: `This item is available for pre-order. 
                  Expected delivery between ${formatDate(item.preorder_start_date)} 
                  and ${formatDate(item.preorder_end_date)}.`
      });
    } else if (item.is_available) {
      // Normal add to cart
      addToCart(item);
    }
  };
  
  return (
    <div className="menu-item">
      <h3>{item.name}</h3>
      <p className="price">${item.price}</p>
      
      {item.is_preorder && (
        <div className="preorder-badge">
          Pre-order Only
        </div>
      )}
      
      <button 
        onClick={handleAddToCart}
        disabled={!item.is_available && !item.is_preorder}
        className={item.is_preorder ? 'btn-preorder' : 'btn-primary'}
      >
        {item.is_preorder ? 'Pre-order Now' : 'Add to Cart'}
      </button>
    </div>
  );
}
```

### Phase 6: Automated Sync Schedule

```typescript
// app/api/cron/sync-availability/route.ts
import { NextResponse } from 'next/server';
import { syncAllItemAvailability } from '@/lib/db/menu-sync';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const result = await syncAllItemAvailability();
    
    // Send notification if errors occurred
    if (result.errors.length > 0) {
      await sendAdminNotification({
        subject: 'Square Sync - Availability Update Issues',
        body: `${result.errors.length} items failed to sync`,
        errors: result.errors
      });
    }
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Availability sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests
```typescript
// __tests__/square-sync.test.ts
describe('Square Availability Sync', () => {
  it('correctly identifies pre-order items', async () => {
    const metadata = {
      visibility: 'PUBLIC',
      state: 'ACTIVE',
      custom_attributes: {
        preorder_enabled: 'true',
        preorder_start_date: '2025-02-01',
        preorder_end_date: '2025-02-14'
      }
    };
    
    const availability = sync.determineAvailability(metadata);
    expect(availability.isPreorder).toBe(true);
    expect(availability.isAvailable).toBe(true);
  });
  
  it('hides seasonal items when out of season', async () => {
    const metadata = {
      visibility: 'PUBLIC',
      state: 'ACTIVE',
      custom_attributes: {
        seasonal_start_date: '2025-06-01',
        seasonal_end_date: '2025-06-30'
      }
    };
    
    const availability = sync.determineAvailability(metadata);
    expect(availability.isAvailable).toBe(false);
  });
});
```

### 2. Integration Tests
- Test full sync process with mock Square API
- Verify database updates correctly
- Test edge cases (API failures, partial syncs)

### 3. Manual Testing Checklist
- [ ] Gingerbread Alfajores shows "Pre-order" button
- [ ] Pre-order modal displays correct dates
- [ ] Pride Alfajores hidden when out of season
- [ ] Regular items continue to work normally
- [ ] Sync completes within timeout window
- [ ] Error notifications sent for failed items

---

## 📊 Monitoring & Validation

### Success Metrics
- **Pre-order items**: Display pre-order UI instead of regular "Add to Cart"
- **Seasonal items**: Not visible when out of season
- **Sync reliability**: 100% completion rate
- **Performance**: Sync completes in < 2 minutes

### Monitoring Queries
```sql
-- Check items with availability issues
SELECT 
  name,
  is_available,
  is_preorder,
  square_visibility,
  square_item_state,
  updated_at
FROM menu_items
WHERE (is_preorder = true OR is_available = false)
ORDER BY updated_at DESC;

-- Monitor sync performance
SELECT 
  sync_type,
  item_count,
  success_count,
  error_count,
  completed_at - started_at as duration
FROM square_sync_log
WHERE sync_type = 'AVAILABILITY_UPDATE'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 Implementation Steps

### Day 1: Database & Types
1. Run database migrations
2. Add TypeScript types
3. Deploy to staging

### Day 2: Square API Integration
1. Implement enhanced sync class
2. Add availability determination logic
3. Test with real Square data

### Day 3: Frontend Updates
1. Update MenuItem component
2. Add pre-order modal
3. Test UI behaviors

### Day 4: Automation & Testing
1. Set up cron job for hourly syncs
2. Run integration tests
3. Deploy to production

### Day 5: Monitoring & Documentation
1. Verify all items displaying correctly
2. Monitor sync logs
3. Update client documentation

---

## 🔄 Rollback Plan

If issues occur after deployment:

1. **Immediate**: Disable availability checks in frontend
```typescript
// Quick toggle in environment variables
NEXT_PUBLIC_ENABLE_AVAILABILITY_CHECK=false
```

2. **Database**: Keep original data intact
```sql
-- Rollback changes if needed
UPDATE menu_items 
SET is_available = true, is_preorder = false
WHERE square_item_id IN (SELECT square_item_id FROM menu_items);
```

3. **Full Rollback**: Revert to previous version
```bash
git revert HEAD
vercel rollback
```

---

## 📝 Client Communication

### For Destino SF Team:
- Pre-order items will show a special "Pre-order" button
- Customers will see expected delivery dates before ordering
- Seasonal items will automatically hide/show based on dates
- You can set these dates directly in Square Dashboard
- No manual intervention needed once deployed

### Setting Up Items in Square:
1. **For Pre-orders**: Add custom attributes
   - `preorder_enabled`: true
   - `preorder_start_date`: YYYY-MM-DD
   - `preorder_end_date`: YYYY-MM-DD

2. **For Seasonal Items**: Add custom attributes
   - `seasonal_start_date`: YYYY-MM-DD
   - `seasonal_end_date`: YYYY-MM-DD

3. **To Hide Items**: Set visibility to "PRIVATE" in Square

---

## ✅ Definition of Done

- [ ] All 129 items sync with correct availability
- [ ] Gingerbread Alfajores shows pre-order UI
- [ ] Pride Alfajores hidden when out of season
- [ ] Sync runs automatically every hour
- [ ] Error monitoring in place
- [ ] Client trained on Square settings
- [ ] Documentation updated
- [ ] Zero customer complaints about availability

---

## 🎯 Expected Outcome

After implementation:
- **100% accuracy** between Square settings and website display
- **Zero confusion** for customers about item availability
- **Automated management** - set it and forget it
- **Better customer experience** with clear pre-order messaging
- **Increased trust** through accurate availability information