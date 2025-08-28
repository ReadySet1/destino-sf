## 📊 Monitoring & Validation

### Success Metrics
- **Pre-order items**: Display "Pre-order Now" button with modal confirmation
- **Seasonal items**: Not visible when out of season
- **Sync reliability**: 100% completion rate
- **Performance**: Availability sync completes in < 1 minute

### Monitoring Queries
```sql
-- Check items with availability settings
SELECT 
  name,
  active,
  is_available,
  is_preorder,
  visibility,
  item_state,
  preorder_start_date,
  preorder_end_date,
  "updatedAt"
FROM products
WHERE 
  is_preorder = true 
  OR is_available = false
  OR visibility != 'PUBLIC'
ORDER BY "updatedAt" DESC;

-- Monitor sync performance
SELECT 
  sync_type,
  status,
  items_synced,
  availability_updates,
  preorder_items,
  hidden_items,
  completed_at - started_at as duration
FROM sync_logs
WHERE sync_type LIKE '%AVAILABILITY%'
ORDER BY created_at DESC
LIMIT 10;

-- Find potential issues
SELECT 
  name,
  square_id,
  CASE 
    WHEN LOWER(name) LIKE '%pre-order%' AND is_preorder != true THEN 'Missing pre-order flag'
    WHEN LOWER(name) LIKE '%pride%' AND availability_start_date IS NULL THEN 'Missing seasonal dates'
    WHEN visibility = 'PRIVATE' AND active = true THEN 'Private but active'
    ELSE 'OK'
  END as issue
FROM products
WHERE 
  (LOWER(name) LIKE '%pre-order%' AND is_preorder != true)
  OR (LOWER(name) LIKE '%pride%' AND availability_start_date IS NULL)
  OR (visibility = 'PRIVATE' AND active = true);
```

### Admin Dashboard Queries (Prisma)
```typescript
// Get availability overview
const availabilityStats = await prisma.product.groupBy({
  by: ['isAvailable', 'isPreorder', 'visibility'],
  _count: true,
  where: { active: true },
});

// Find pre-order items
const preorderItems = await prisma.product.findMany({
  where: { isPreorder: true },
  select: {
    name: true,
    preorderStartDate: true,
    preorderEndDate: true,
    updatedAt: true,
  },
  orderBy: { updatedAt: 'desc' },
});

// Find hidden/seasonal items
const hiddenItems = await prisma.product.findMany({
  where: {
    OR: [
      { visibility: 'PRIVATE' },
      { isAvailable: false },
      { availabilityStart: { not: null } },
    ],
  },
  select: {
    name: true,
    visibility: true,
    isAvailable: true,
    availabilityStart: true,
    availabilityEnd: true,
  },
});
```### Phase 4: Update API Route & Sync Process

```typescript
// src/app/api/square/sync/route.ts - Add availability sync

export async function POST(request: Request) {
  try {
    // ... existing code ...
    
    // Enhanced sync with availability tracking
    const syncManager = new ProductionSyncManager({
      ...existingOptions,
      syncAvailability: true, // New flag
    });
    
    const result = await syncManager.syncProducts();
    
    // Log availability statistics
    if (result.availabilityStats) {
      logger.info('📊 Availability sync results:', {
        total: result.availabilityStats.totalProcessed,
        available: result.availabilityStats.availableItems,
        preorder: result.availabilityStats.preorderItems,
        hidden: result.availabilityStats.hiddenItems,
        seasonal: result.availabilityStats.seasonalItems,
      });
    }
    
    // Update sync_logs with availability info
    await prisma.syncLogs.create({
      data: {
        sync_type: 'PRODUCT_SYNC_WITH_AVAILABILITY',
        status: result.success ? 'COMPLETED' : 'FAILED',
        items_synced: result.syncedProducts,
        availability_updates: result.availabilityStats?.totalProcessed || 0,
        preorder_items: result.availabilityStats?.preorderItems || 0,
        hidden_items: result.availabilityStats?.hiddenItems || 0,
        errors: result.errors,
        warnings: result.warnings,
        metadata: result,
        started_at: new Date(),
        completed_at: new Date(),
      },
    });
    
    return NextResponse.json(result);
  } catch (error) {
    // ... error handling ...
  }
}

// src/app/api/square/sync-availability/route.ts - New dedicated endpoint
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for quick availability updates

export async function POST() {
  try {
    logger.info('🔄 Starting availability-only sync');
    
    // Get all active products
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { 
        id: true, 
        squareId: true, 
        name: true,
        isAvailable: true,
        isPreorder: true,
      },
    });
    
    const syncManager = new ProductionSyncManager();
    let updated = 0;
    
    for (const product of products) {
      try {
        // Fetch latest from Square
        const catalogObject = await squareClient.catalogApi.retrieveCatalogObject(
          product.squareId
        );
        
        // Extract and determine availability
        const availabilityMeta = syncManager.extractAvailabilityMetadata(
          catalogObject.object
        );
        const availability = syncManager.determineAvailability(
          availabilityMeta,
          product.name
        );
        
        // Only update if changed
        if (
          product.isAvailable !== availability.isAvailable ||
          product.isPreorder !== availability.isPreorder
        ) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              isAvailable: availability.isAvailable,
              isPreorder: availability.isPreorder,
              visibility: availability.visibility,
              itemState: availability.state,
              preorderStartDate: availability.preorderDates?.start,
              preorderEndDate: availability.preorderDates?.end,
              availabilityStart: availability.seasonalDates?.start,
              availabilityEnd: availability.seasonalDates?.end,
              availabilityMeta: availabilityMeta,
              customAttributes: availabilityMeta.customAttributes,
              updatedAt: new Date(),
            },
          });
          updated++;
          
          logger.info(`Updated availability for ${product.name}:`, {
            wasAvailable: product.isAvailable,
            nowAvailable: availability.isAvailable,
            isPreorder: availability.isPreorder,
          });
        }
      } catch (error) {
        logger.error(`Failed to update availability for ${product.name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated availability for ${updated} products`,
      productsChecked: products.length,
      productsUpdated: updated,
    });
  } catch (error) {
    logger.error('Availability sync failed:', error);
    return NextResponse.json(
      { success: false, error: 'Availability sync failed' },
      { status: 500 }
    );
  }
}# 🎯 Square Sync Fix Plan - Pre-order & Seasonal Items

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

### Phase 5: Frontend Updates - ProductCard Component

```tsx
// src/components/Products/ProductCard.tsx - Update existing component

'use client';

import { Product } from '@/types/product';
import { useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useCartAlertStore } from '@/components/ui/cart-alert';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [showPreorderModal, setShowPreorderModal] = useState(false);
  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();
  
  // Check if product should be hidden
  if (!product.active || 
      product.visibility === 'PRIVATE' || 
      product.itemState === 'ARCHIVED' ||
      (!product.isAvailable && !product.isPreorder)) {
    return null; // Don't render hidden/unavailable items
  }
  
  // Check seasonal availability
  const now = new Date();
  if (product.availabilityStart && product.availabilityEnd) {
    const start = new Date(product.availabilityStart);
    const end = new Date(product.availabilityEnd);
    if (now < start || now > end) {
      return null; // Hide out-of-season items
    }
  }
  
  const handleAddToCart = () => {
    if (product.isPreorder) {
      setShowPreorderModal(true);
    } else if (product.isAvailable) {
      addItem({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        image: product.images?.[0] || '',
      });
      showAlert(product.name);
    }
  };
  
  const handlePreorderConfirm = () => {
    addItem({
      id: product.id,
      name: `[PRE-ORDER] ${product.name}`,
      price: Number(product.price),
      quantity: 1,
      image: product.images?.[0] || '',
      metadata: {
        isPreorder: true,
        preorderEndDate: product.preorderEndDate,
      },
    });
    showAlert(`Pre-order: ${product.name}`);
    setShowPreorderModal(false);
  };
  
  return (
    <>
      <div className="product-card relative">
        {/* Pre-order badge */}
        {product.isPreorder && (
          <div className="absolute top-2 right-2 z-10">
            <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pre-order
            </span>
          </div>
        )}
        
        {/* Product image */}
        <div className="product-image">
          {/* ... existing image code ... */}
        </div>
        
        {/* Product details */}
        <div className="product-details">
          <h3>{product.name}</h3>
          <p className="price">${formatPrice(product.price)}</p>
          
          {/* Pre-order dates if applicable */}
          {product.isPreorder && product.preorderEndDate && (
            <p className="text-sm text-amber-600 mt-1">
              Pre-order by {format(new Date(product.preorderEndDate), 'MMM d')}
            </p>
          )}
          
          <Button
            onClick={handleAddToCart}
            disabled={!product.isAvailable && !product.isPreorder}
            className={cn(
              'w-full mt-4',
              product.isPreorder ? 'bg-amber-500 hover:bg-amber-600' : ''
            )}
          >
            {product.isPreorder ? 'Pre-order Now' : 'Add to Cart'}
          </Button>
        </div>
      </div>
      
      {/* Pre-order confirmation modal */}
      <Dialog open={showPreorderModal} onOpenChange={setShowPreorderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-order Item</DialogTitle>
            <DialogDescription>
              <div className="space-y-4 mt-4">
                <p className="font-semibold">{product.name}</p>
                
                {product.preorderStartDate && product.preorderEndDate && (
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      Pre-order period:
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {format(new Date(product.preorderStartDate), 'MMM d')} - 
                      {format(new Date(product.preorderEndDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      Expected delivery after pre-order period ends
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-gray-600">
                  This item is available for pre-order only. Your order will be 
                  prepared and delivered after the pre-order period ends.
                </p>
                
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreorderModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePreorderConfirm}
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                  >
                    Confirm Pre-order
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

// src/components/Menu/MenuSection.tsx - Filter products by availability
export function MenuSection({ category }: { category: Category }) {
  // Filter out unavailable items at the section level
  const availableProducts = category.products.filter(product => 
    product.active && 
    (product.isAvailable || product.isPreorder) &&
    product.visibility !== 'PRIVATE' &&
    product.itemState !== 'ARCHIVED'
  );
  
  if (availableProducts.length === 0) {
    return null; // Don't show empty categories
  }
  
  return (
    <div className="menu-section">
      <h2>{category.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### Phase 6: Automated Sync & Monitoring

```typescript
// src/app/api/cron/sync-availability/route.ts - Vercel Cron Job
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify this is from Vercel Cron
  const authHeader = headers().get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Call the availability sync endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_URL}/api/square/sync-availability`,
      { method: 'POST' }
    );
    
    const result = await response.json();
    
    // Send alert if any products changed to unavailable
    if (result.productsUpdated > 0) {
      await sendAdminAlert({
        type: 'AVAILABILITY_CHANGE',
        message: `${result.productsUpdated} products had availability changes`,
        details: result,
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Cron availability sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

// vercel.json - Add cron configuration
{
  "crons": [
    {
      "path": "/api/cron/sync-availability",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}

// src/scripts/diagnose-availability.ts - Diagnostic script
import { prisma } from '@/lib/db';
import { squareClient } from '@/lib/square/client';

async function diagnoseAvailability() {
  console.log('🔍 Diagnosing product availability issues...\n');
  
  // Check for specific problem items
  const problemItems = [
    { name: 'Gingerbread Alfajores', issue: 'Should be pre-order only' },
    { name: 'Pride Alfajores', issue: 'Should be hidden when out of season' },
  ];
  
  for (const item of problemItems) {
    console.log(`\n📦 Checking: ${item.name}`);
    console.log(`   Issue: ${item.issue}`);
    
    // Find in database
    const product = await prisma.product.findFirst({
      where: { 
        name: { contains: item.name.split(' ')[0], mode: 'insensitive' }
      },
    });
    
    if (!product) {
      console.log(`   ❌ Not found in database`);
      continue;
    }
    
    console.log(`   Database state:`);
    console.log(`   - Active: ${product.active}`);
    console.log(`   - Available: ${product.isAvailable ?? 'not set'}`);
    console.log(`   - Pre-order: ${product.isPreorder ?? 'not set'}`);
    console.log(`   - Visibility: ${product.visibility ?? 'not set'}`);
    
    // Check Square state
    try {
      const { result } = await squareClient.catalogApi.retrieveCatalogObject(
        product.squareId
      );
      
      const catalogItem = result.object;
      console.log(`\n   Square state:`);
      console.log(`   - Visibility: ${catalogItem.item_data?.visibility || 'PUBLIC'}`);
      console.log(`   - Available online: ${catalogItem.item_data?.available_online ?? true}`);
      console.log(`   - Deleted: ${catalogItem.is_deleted || false}`);
      
      // Check for custom attributes
      if (catalogItem.custom_attribute_values) {
        console.log(`   - Custom attributes:`);
        Object.entries(catalogItem.custom_attribute_values).forEach(([key, value]) => {
          console.log(`     ${key}: ${JSON.stringify(value)}`);
        });
      }
      
      // Check name for indicators
      const nameIndicators = [];
      if (item.name.toLowerCase().includes('pre-order')) nameIndicators.push('pre-order in name');
      if (item.name.toLowerCase().includes('seasonal')) nameIndicators.push('seasonal in name');
      if (item.name.toLowerCase().includes('pride')) nameIndicators.push('pride/seasonal indicator');
      
      if (nameIndicators.length > 0) {
        console.log(`   - Name indicators: ${nameIndicators.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error fetching from Square: ${error.message}`);
    }
  }
  
  // Summary statistics
  console.log('\n📊 Overall Statistics:');
  const stats = await prisma.product.groupBy({
    by: ['active', 'isAvailable', 'isPreorder'],
    _count: true,
  });
  
  console.table(stats);
  
  // Find items that might need attention
  const potentialPreorders = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'pre-order', mode: 'insensitive' } },
        { name: { contains: 'preorder', mode: 'insensitive' } },
      ],
    },
    select: { name: true, isPreorder: true },
  });
  
  if (potentialPreorders.length > 0) {
    console.log('\n⚠️  Items with pre-order in name:');
    potentialPreorders.forEach(p => {
      console.log(`   - ${p.name} (pre-order flag: ${p.isPreorder ?? 'not set'})`);
    });
  }
  
  const seasonalItems = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'seasonal', mode: 'insensitive' } },
        { name: { contains: 'pride', mode: 'insensitive' } },
        { name: { contains: 'holiday', mode: 'insensitive' } },
      ],
    },
    select: { name: true, isAvailable: true, availabilityStart: true, availabilityEnd: true },
  });
  
  if (seasonalItems.length > 0) {
    console.log('\n🎄 Potential seasonal items:');
    seasonalItems.forEach(s => {
      console.log(`   - ${s.name}`);
      console.log(`     Available: ${s.isAvailable ?? 'not set'}`);
      console.log(`     Season: ${s.availabilityStart ? `${s.availabilityStart} to ${s.availabilityEnd}` : 'not set'}`);
    });
  }
}

// Run if called directly
if (require.main === module) {
  diagnoseAvailability()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Diagnosis failed:', error);
      process.exit(1);
    });
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests
```typescript
// src/__tests__/lib/square/availability.test.ts
import { ProductionSyncManager } from '@/lib/square/production-sync';

describe('Availability Detection', () => {
  const syncManager = new ProductionSyncManager();
  
  it('correctly identifies pre-order items by name', () => {
    const metadata = {
      visibility: 'PUBLIC',
      state: 'ACTIVE',
      customAttributes: {},
    };
    
    const availability = syncManager.determineAvailability(
      metadata,
      'Gingerbread Alfajores - Pre-Order'
    );
    
    expect(availability.isPreorder).toBe(true);
    expect(availability.isAvailable).toBe(true);
  });
  
  it('hides seasonal items when out of season', () => {
    const metadata = {
      visibility: 'PUBLIC',
      state: 'ACTIVE',
      customAttributes: {
        seasonal_start_date: '2025-06-01',
        seasonal_end_date: '2025-06-30',
      },
    };
    
    // Test in January (out of season)
    jest.useFakeTimers().setSystemTime(new Date('2025-01-28'));
    
    const availability = syncManager.determineAvailability(
      metadata,
      'Pride Alfajores'
    );
    
    expect(availability.isAvailable).toBe(false);
    expect(availability.availabilityReason).toBe('Out of season');
  });
  
  it('respects Square visibility settings', () => {
    const metadata = {
      visibility: 'PRIVATE',
      state: 'ACTIVE',
      customAttributes: {},
    };
    
    const availability = syncManager.determineAvailability(
      metadata,
      'Test Product'
    );
    
    expect(availability.isAvailable).toBe(false);
    expect(availability.visibility).toBe('PRIVATE');
  });
});
```

### 2. Integration Tests
```typescript
// src/__tests__/integration/square-availability-sync.test.ts
describe('Square Availability Sync', () => {
  it('syncs availability from Square to database', async () => {
    // Mock Square API response
    const mockSquareItem = {
      id: 'SQUARE123',
      item_data: {
        name: 'Test Pre-Order Item',
        visibility: 'PUBLIC',
      },
      custom_attribute_values: {
        preorder_enabled: 'true',
        preorder_start_date: '2025-02-01',
        preorder_end_date: '2025-02-14',
      },
    };
    
    // Run sync
    const result = await syncManager.syncSingleProduct(mockSquareItem);
    
    // Verify database update
    const product = await prisma.product.findUnique({
      where: { squareId: 'SQUARE123' },
    });
    
    expect(product.isPreorder).toBe(true);
    expect(product.preorderStartDate).toEqual(new Date('2025-02-01'));
    expect(product.preorderEndDate).toEqual(new Date('2025-02-14'));
  });
});
```

### 3. E2E Tests
```typescript
// tests/e2e/availability.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Availability', () => {
  test('shows pre-order badge and modal', async ({ page }) => {
    await page.goto('/menu');
    
    // Find pre-order item
    const preorderCard = page.locator('.product-card:has-text("Gingerbread Alfajores")');
    await expect(preorderCard.locator('.preorder-badge')).toBeVisible();
    
    // Click pre-order button
    await preorderCard.locator('button:has-text("Pre-order Now")').click();
    
    // Verify modal appears
    await expect(page.locator('.dialog-content')).toContainText('Pre-order Item');
    await expect(page.locator('.dialog-content')).toContainText('Expected delivery');
  });
  
  test('hides out-of-season items', async ({ page }) => {
    await page.goto('/menu');
    
    // Pride Alfajores should not be visible in January
    await expect(page.locator('.product-card:has-text("Pride Alfajores")')).not.toBeVisible();
  });
});
```

### 4. Manual Testing Checklist
- [ ] **Gingerbread Alfajores**
  - [ ] Shows "Pre-order" badge
  - [ ] Button says "Pre-order Now" instead of "Add to Cart"
  - [ ] Modal appears with pre-order dates
  - [ ] Item added to cart with [PRE-ORDER] prefix
- [ ] **Pride Alfajores**  
  - [ ] Not visible on menu page when out of season
  - [ ] Cannot be accessed via direct URL when unavailable
- [ ] **Regular Items**
  - [ ] Continue to work normally
  - [ ] "Add to Cart" button functions as before
- [ ] **Square Sync**
  - [ ] Run sync and verify completion < 2 minutes
  - [ ] Check logs for availability statistics
  - [ ] Verify database fields are populated

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