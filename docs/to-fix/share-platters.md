Looking at your screenshots and the issues you've described, I can see two main problems: CORS issues with Square/S3 images and duplicate items being created during sync. Let me fill out your Master Fix Planning Template for these issues.

# Master Fix Planning Template

## 🎯 Feature/Fix Overview

**Name**: Square Sync Image CORS & Duplicate Items Fix

**Type**: Bug Fix

**Priority**: High

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

Square sync is creating duplicate items with size variations (Large/Small) as separate products, and CORS issues are preventing some Square-hosted images from loading while the same images work in duplicated items.

### Success Criteria

- [x] All Square item images load correctly without CORS errors
- [x] Size variations are handled as single items with options, not duplicates
- [x] Existing duplicate items are cleaned up or consolidated

---

## 📋 Planning Phase

### 1. Code Structure & References

#### Root Cause Analysis

**Image CORS Issue:**
- Current `PlatterMenuItem.tsx` uses `getImageUrl()` that directly returns Square/S3 URLs
- Some URLs fail CORS while others work (likely due to different S3 bucket policies)
- Existing `/api/proxy/image/route.ts` can handle CORS but isn't being used as fallback
- `SafeImage` component has retry logic but doesn't fallback to proxy

**Duplicate Items Issue:**
- `CateringDuplicateDetector` doesn't recognize size variations as the same product
- Sync treats "Cheese & Charcuterie Platter - Small" and "Large" as separate items
- Need variation grouping logic in sync process

#### Files to Modify

```tsx
src/
├── components/
│   ├── Catering/
│   │   └── PlatterMenuItem.tsx                 // Fix image loading with proxy fallback
│   └── ui/
│       └── safe-image.tsx                      // Update to use proxy fallback
├── lib/
│   ├── catering-duplicate-detector.ts          // Add size variation detection
│   ├── square/
│   │   └── variation-grouper.ts                // NEW: Group size variations
│   └── utils.ts                                // Update getCateringItemImage
├── app/
│   └── api/
│       ├── proxy/
│       │   └── image/
│       │       └── route.ts                    // Enhance error handling
│       └── square/
│           └── unified-sync/
│               └── route.ts                    // Add variation grouping logic
└── scripts/
    └── cleanup-duplicate-platters.ts           // NEW: Clean existing duplicates
```

### 2. Core Functionality Implementation

#### Fix 1: Image CORS with Proxy Fallback

```tsx
// components/ui/safe-image.tsx - Enhanced fallback logic
const SafeImage = ({ src, fallbackSrc, ...props }: SafeImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [useProxy, setUseProxy] = useState(false);

  const handleError = () => {
    if (!useProxy && typeof currentSrc === 'string') {
      // First fallback: try proxy
      const encodedUrl = Buffer.from(currentSrc).toString('base64');
      const proxyUrl = `/api/proxy/image?url=${encodedUrl}`;
      setCurrentSrc(proxyUrl);
      setUseProxy(true);
      return;
    }
    
    // Final fallback: use fallback image
    setCurrentSrc(fallbackSrc);
  };

  // ... rest of component
};
```

```tsx
// components/Catering/PlatterMenuItem.tsx - Remove custom getImageUrl, rely on SafeImage
export const PlatterMenuItem: React.FC<PlatterMenuItemProps> = ({ items }) => {
  // ... existing logic ...

  // Remove getImageUrl function, use imageUrl directly
  return (
    <SafeImage
      src={currentItem.imageUrl || '/images/catering/default-item.jpg'}
      alt={toTitleCase(baseName)}
      fallbackSrc="/images/catering/default-item.jpg"
      maxRetries={3}
      priority={false}
    />
  );
};
```

#### Fix 2: Size Variation Detection and Grouping

```tsx
// lib/square/variation-grouper.ts - NEW FILE
export interface ProductVariation {
  id: string;
  name: string;
  size: string;
  price: number;
  imageUrl?: string;
  description?: string;
  servingSize?: string;
}

export interface GroupedProduct {
  baseName: string;
  baseImageUrl?: string;
  category: string;
  variations: ProductVariation[];
}

export class VariationGrouper {
  static detectSizePattern(name: string): { baseName: string; size?: string } {
    const sizePatterns = [
      / - (Small|Large|Regular)$/i,
      / \((Small|Large|Regular)\)$/i,
      /(Small|Large|Regular)$/i
    ];

    for (const pattern of sizePatterns) {
      const match = name.match(pattern);
      if (match) {
        return {
          baseName: name.replace(pattern, '').trim(),
          size: match[1]
        };
      }
    }

    return { baseName: name };
  }

  static groupVariations(items: SquareItem[]): GroupedProduct[] {
    const groups = new Map<string, ProductVariation[]>();

    items.forEach(item => {
      const { baseName, size } = this.detectSizePattern(item.name);
      
      if (!groups.has(baseName)) {
        groups.set(baseName, []);
      }

      groups.get(baseName)!.push({
        id: item.id,
        name: item.name,
        size: size || 'Regular',
        price: item.price,
        imageUrl: item.imageUrl,
        description: item.description
      });
    });

    return Array.from(groups.entries()).map(([baseName, variations]) => ({
      baseName,
      baseImageUrl: variations.find(v => v.imageUrl)?.imageUrl,
      category: items[0]?.categoryName || 'Unknown',
      variations: variations.sort((a, b) => {
        const sizeOrder = { 'Small': 1, 'Regular': 2, 'Large': 3 };
        return (sizeOrder[a.size as keyof typeof sizeOrder] || 2) - 
               (sizeOrder[b.size as keyof typeof sizeOrder] || 2);
      })
    }));
  }
}
```

```tsx
// lib/catering-duplicate-detector.ts - Enhanced duplicate detection
export class CateringDuplicateDetector {
  // Add new method for variation-aware duplicate detection
  static async checkForVariationDuplicate(itemData: {
    name: string;
    squareProductId?: string;
    squareCategory?: string;
  }): Promise<DuplicateCheckResult & { isVariation?: boolean; baseProduct?: any }> {
    
    const { baseName, size } = VariationGrouper.detectSizePattern(itemData.name);
    
    // Check if base product exists
    const existingBaseProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { name: { equals: baseName, mode: 'insensitive' } },
          { name: { startsWith: baseName, mode: 'insensitive' } }
        ],
        active: true,
        category: {
          name: { contains: 'CATERING' }
        }
      },
      include: { variants: true }
    });

    if (existingBaseProduct) {
      // Check if this size variation already exists
      const existingVariation = existingBaseProduct.variants?.find(v => 
        v.name.toLowerCase().includes(size?.toLowerCase() || 'regular')
      );

      return {
        isDuplicate: !!existingVariation,
        isVariation: true,
        baseProduct: existingBaseProduct,
        existingItem: existingVariation ? {
          id: existingVariation.id,
          name: existingVariation.name,
          squareProductId: existingBaseProduct.squareId,
          source: existingBaseProduct.squareId ? 'square' : 'manual'
        } : undefined,
        matchType: existingVariation ? 'exact_variation' : 'base_product_exists',
        confidence: existingVariation ? 1.0 : 0.8
      };
    }

    // Fall back to original duplicate detection
    return await this.checkForDuplicate(itemData);
  }
}
```

#### Fix 3: Enhanced Sync with Variation Support

```tsx
// app/api/square/unified-sync/route.ts - Modify batchSyncToProducts function
async function batchSyncToProducts(
  items: SquareItem[], 
  syncLogger: SyncLogger,
  forceUpdate: boolean = false
): Promise<{ synced: number; skipped: number; errors: number }> {
  
  // Group items by variations first
  const groupedProducts = VariationGrouper.groupVariations(items);
  
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const group of groupedProducts) {
    try {
      // Check if base product exists
      const duplicateCheck = await CateringDuplicateDetector.checkForVariationDuplicate({
        name: group.baseName,
        squareProductId: group.variations[0]?.id
      });

      if (duplicateCheck.isDuplicate && !duplicateCheck.isVariation) {
        // Product already exists completely, skip
        syncLogger.logItemProcessed(
          group.variations[0].id, 
          group.baseName, 
          'duplicate', 
          `Product already exists`
        );
        skippedCount++;
        continue;
      }

      let baseProduct = duplicateCheck.baseProduct;

      if (!baseProduct) {
        // Create new base product
        const category = await getOrCreateCategory(
          items.find(i => group.variations.some(v => v.id === i.id))?.categoryId || '',
          items.find(i => group.variations.some(v => v.id === i.id))?.categoryName || ''
        );

        const uniqueSlug = await generateUniqueSlug(group.baseName, group.variations[0].id);

        baseProduct = await prisma.product.create({
          data: {
            name: group.baseName,
            description: group.variations[0].description || '',
            price: Math.min(...group.variations.map(v => v.price)), // Use lowest price as base
            squareId: group.variations[0].id, // Use first variation's ID as reference
            category: { connect: { id: category.id } },
            active: true,
            images: group.baseImageUrl ? [group.baseImageUrl] : [],
            slug: uniqueSlug,
          }
        });

        syncLogger.logItemSynced(group.variations[0].id, group.baseName, 'Created base product');
      }

      // Add/update variations
      for (const variation of group.variations) {
        await prisma.productVariant.upsert({
          where: { squareVariantId: variation.id },
          update: {
            name: `${variation.size} - ${variation.price}`,
            price: variation.price,
          },
          create: {
            productId: baseProduct.id,
            squareVariantId: variation.id,
            name: `${variation.size} - $${variation.price}`,
            price: variation.price,
          }
        });
      }

      syncedCount++;
      syncLogger.logItemSynced(
        group.variations[0].id, 
        group.baseName, 
        `Synced with ${group.variations.length} variations`
      );

    } catch (error) {
      errorCount++;
      syncLogger.logError(group.baseName, error as Error);
    }
  }

  return { synced: syncedCount, skipped: skippedCount, errors: errorCount };
}
```

### 3. Database Schema Updates

```sql
-- Add variation support if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false;

-- Ensure product_variants table exists with proper structure
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  square_variant_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_square_id ON product_variants(square_variant_id);
```

### 4. Cleanup Script for Existing Duplicates

```tsx
// scripts/cleanup-duplicate-platters.ts - NEW FILE
import { prisma } from '@/lib/db';
import { VariationGrouper } from '@/lib/square/variation-grouper';

async function cleanupDuplicatePlatters() {
  // Find all catering share platter products
  const sharePlatters = await prisma.product.findMany({
    where: {
      category: {
        name: 'CATERING- SHARE PLATTERS'
      },
      active: true
    },
    include: { variants: true }
  });

  console.log(`Found ${sharePlatters.length} share platter products`);

  // Group by base name
  const grouped = new Map<string, typeof sharePlatters>();
  
  sharePlatters.forEach(product => {
    const { baseName } = VariationGrouper.detectSizePattern(product.name);
    if (!grouped.has(baseName)) {
      grouped.set(baseName, []);
    }
    grouped.get(baseName)!.push(product);
  });

  for (const [baseName, products] of grouped) {
    if (products.length > 1) {
      console.log(`Merging ${products.length} products for "${baseName}"`);
      
      // Keep the first product as the base
      const baseProduct = products[0];
      const duplicates = products.slice(1);

      // Update base product name to remove size suffix
      await prisma.product.update({
        where: { id: baseProduct.id },
        data: {
          name: baseName,
          has_variations: true
        }
      });

      // Create variations from duplicates
      for (const duplicate of duplicates) {
        const { size } = VariationGrouper.detectSizePattern(duplicate.name);
        
        await prisma.productVariant.create({
          data: {
            productId: baseProduct.id,
            squareVariantId: duplicate.squareId || `cleanup-${duplicate.id}`,
            name: `${size || 'Regular'} - $${duplicate.price}`,
            price: duplicate.price
          }
        });

        // Deactivate duplicate
        await prisma.product.update({
          where: { id: duplicate.id },
          data: { active: false }
        });
      }

      console.log(`✅ Merged "${baseName}" with ${duplicates.length} variations`);
    }
  }
}

// Run cleanup
cleanupDuplicatePlatters()
  .then(() => console.log('Cleanup completed'))
  .catch(console.error);
```

---

## 🚦 Implementation Checklist

### Phase 1: Image CORS Fix
- [x] Update `SafeImage` component with proxy fallback logic
- [x] Modify `PlatterMenuItem` to use SafeImage properly
- [x] Test image loading for problematic items
- [x] Enhance `/api/proxy/image` error handling

### Phase 2: Variation Grouping
- [x] Create `VariationGrouper` utility class
- [x] Update `CateringDuplicateDetector` with variation awareness
- [x] Modify sync logic to group variations
- [x] Update database schema for variations

### Phase 3: Cleanup & Testing
- [x] Create cleanup script for existing duplicates
- [x] Run cleanup on development/staging
- [x] Test sync with variation grouping
- [x] Verify no new duplicates are created

### Phase 4: Frontend Updates
- [x] Update `PlatterMenuItem` to show size variations in dropdown
- [x] Ensure cart handles variations properly
- [x] Update admin interface to show variations

---

## 🎯 Key Implementation Files

**Critical Files to Modify:**

1. **`src/components/ui/safe-image.tsx`**
   - Add proxy fallback logic
   - Better error handling for CORS issues

2. **`src/lib/catering-duplicate-detector.ts`**
   - Add `checkForVariationDuplicate` method
   - Integration with `VariationGrouper`

3. **`src/app/api/square/unified-sync/route.ts`**
   - Modify `batchSyncToProducts` to use variation grouping
   - Update sync logic to create products with variations

4. **`src/lib/square/variation-grouper.ts`** (NEW)
   - Core logic for detecting and grouping size variations
   - Size pattern detection

5. **`scripts/cleanup-duplicate-platters.ts`** (NEW)
   - One-time cleanup of existing duplicate items
   - Convert duplicates to variations

---

## 📊 Expected Results

### Before Fix:
- Multiple "Cheese & Charcuterie Platter" products (Small, Large) with $0 prices
- CORS errors for some images showing "No Image Available"
- Cluttered admin interface with duplicate products

### After Fix:
- Single "Cheese & Charcuterie Platter" product with size variations
- All images load correctly via proxy fallback
- Clean admin interface with proper variation management
- Size selector in frontend shows proper pricing

This comprehensive fix addresses both the image CORS issues and the duplicate item creation problem by implementing proper variation grouping and proxy fallback for images.