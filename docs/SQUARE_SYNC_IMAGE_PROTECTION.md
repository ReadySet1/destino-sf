# Square Sync Image Protection System

## Overview
This system protects manually assigned catering and product images from being overwritten during Square syncs. It ensures that the specific images we've manually assigned (like the different alfajores variants and share platters) are preserved even when Square doesn't provide the same level of image specificity.

## The Problem
Previously, Square syncs would overwrite manually assigned images because:
1. The sync logic strictly used images from Square (`images: imageUrlsFromSquare`)
2. Square often doesn't have images or has generic images
3. Our manually assigned variant-specific images (like different alfajores types) would be lost

## The Solution

### 1. Catering Image Protection Service (`src/lib/catering-image-protection.ts`)
- **`createCateringImageBackup()`**: Creates a backup of all catering item images before sync
- **`protectCateringImages()`**: Restores catering images to their corresponding products after sync
- **`restoreCateringImagesFromBackup()`**: Restores images from a specific backup

### 2. Updated Sync Process (`src/app/(dashboard)/admin/products/sync-square.tsx`)
The sync now follows this enhanced workflow:

```
1. Create backup of catering images
2. Run Square product sync
3. Run image refresh/fix
4. Protect/restore catering images
5. Display comprehensive results
```

### 3. API Endpoints
- **`/api/catering/backup-images`**: Creates backup before sync
- **`/api/catering/protect-images`**: Restores images after sync

## How It Works

### Before Sync
1. **Backup Creation**: The system identifies all active catering items with `imageUrl` values
2. **Mapping**: Creates a mapping of `squareProductId → imageUrl` for restoration
3. **Storage**: Stores this mapping temporarily for the sync process

### During Sync
- Square sync proceeds normally, potentially overwriting product images
- The system logs what images are being replaced

### After Sync
1. **Protection**: For each catering item with a manually assigned image:
   - Finds the corresponding product by `squareProductId`
   - Checks if the catering `imageUrl` is in the product's images array
   - If missing, adds it as the first image in the array
2. **Preservation**: Ensures manually assigned images take priority over Square images

## Protected Image Types

The system specifically protects:

### 1. Variant-Specific Images
- **Alfajores variants**: Classic, Chocolate, Lemon, Gluten-Free
- **Platter sizes**: Small and Large variants
- **Specific product images**: Items with unique S3 URLs from our products table

### 2. Local Fallback Images
- Images stored in `/images/menu/` or `/images/catering/`
- Custom images not from Square

### 3. Manually Assigned S3 Images
- S3 URLs that we've specifically assigned from our products table
- High-quality product-specific images

## Usage

### Automatic Protection (Recommended)
The sync button now automatically handles image protection:

```typescript
// This happens automatically when you click "Sync Products & Images from Square"
1. Backup → 2. Sync → 3. Fix Images → 4. Protect → 5. Report Results
```

### Manual Protection
You can also run protection manually:

```typescript
import { protectCateringImages } from '@/lib/catering-image-protection';

const result = await protectCateringImages();
console.log(`Protected ${result.protected} images`);
```

## Results Tracking

The system provides detailed feedback:

```typescript
interface ImageProtectionResult {
  protected: number;    // Images successfully restored
  skipped: number;     // Images already correct
  errors: number;      // Protection failures
}
```

## Benefits

### 1. **Preserves Manual Work**
- Keeps the specific alfajores variant images we manually assigned
- Maintains share platter images that Square doesn't provide
- Protects custom local images

### 2. **Smart Fallbacks**
- Uses Square images when they're better (more images, higher quality)
- Falls back to manual images when Square has none
- Prioritizes variant-specific images over generic ones

### 3. **Transparent Process**
- Logs all image decisions for debugging
- Provides detailed statistics on what was protected
- Non-destructive (adds images rather than replacing)

### 4. **Automatic Operation**
- Runs as part of the normal sync process
- No manual intervention required
- Self-healing for future syncs

## Monitoring

The admin sync interface now shows:
- ✅ **Products synced**: Count from Square
- ✅ **Images updated**: From image refresh API
- ✅ **Catering images protected**: From protection system
- ❌ **Errors**: Any protection failures

## Future Considerations

### 1. **Expand Protection**
Could be extended to protect other manually assigned images beyond catering

### 2. **Version Control**
Could add image versioning to track changes over time

### 3. **Conflict Resolution**
Could add UI for resolving conflicts between Square and manual images

### 4. **Performance Optimization**
For large catalogs, could batch operations or add caching

## Technical Notes

### Database Fields Used
- `CateringItem.imageUrl`: Primary manual image assignment
- `CateringItem.squareProductId`: Links to Product table
- `Product.images[]`: Array where images are restored
- `Product.squareId`: Links back to catering items

### Image Priority Logic
1. **Variant-specific manual images** (highest priority)
2. **Square images** (when significantly better)
3. **Generic manual images** (fallback)
4. **Empty arrays** (when nothing available)

This system ensures that our carefully curated catering images are never lost during Square syncs while still benefiting from Square's product data and any new images they provide. 