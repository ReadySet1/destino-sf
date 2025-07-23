# Post-Sync Database Setup

After syncing data from Square or resetting the database, you need to ensure all catering functionality works properly.

## Problem

The Square sync process only creates **CateringItem** records but does NOT create **CateringPackage** records. Additionally, it was missing several catering categories. This causes issues in the catering page where sections display "items are being set up" because it requires both:

1. CateringPackage records with names containing "Appetizer Selection"
2. CateringItem records with `price = 0` (package-only items)
3. **ALL catering categories** including BUFFET and LUNCH subcategories

## Previously Missing Categories

The following categories were completely missing from the restoration process:

### BUFFET Categories:

- ✅ `CATERING- BUFFET, STARTERS` (4 items)
- ✅ `CATERING- BUFFET, ENTREES` (8 items)
- ✅ `CATERING- BUFFET, SIDES` (7 items)

### LUNCH Categories:

- ✅ `CATERING- LUNCH, STARTERS` (4 items)
- ✅ `CATERING- LUNCH, ENTREES` (8 items)
- ✅ `CATERING- LUNCH, SIDES` (7 items)

**Total:** 38 additional items across 6 categories that were not being restored.

## Solution (UPDATED - Now Automated!)

### ✅ Automatic Restoration (Recommended)

The Square sync button in the admin panel (`/admin/products`) now **automatically restores** the complete catering menu after completing the Square sync. The sync process now includes these steps:

1. **Square Product Sync**: Syncs products and categories from Square
2. **Image Refresh**: Updates product images
3. **Image Protection**: Protects custom catering images
4. **🆕 Complete Catering Menu Restoration**: Automatically restores ALL catering categories including:
   - Appetizer packages and items
   - BUFFET starters, entrees, and sides
   - LUNCH starters, entrees, and sides
   - Share platters and desserts
5. **🆕 Image Linking**: Automatically links catering items to Square products and updates images

**No manual intervention required!** The sync button will show the restoration status in the results.

### Manual Restoration (If Needed)

If you need to restore the catering menu independently:

**Option A: Complete API Restoration**

```bash
curl -X POST http://localhost:3000/api/catering/setup-menu
```

**Option B: Manual Script**

```bash
npx tsx src/scripts/setup-catering-menu-2025.ts
```

**Option C: Fix Images After Restoration**

```bash
npx tsx scripts/fix-all-catering-images.ts
```

## What Gets Restored

### 1. **Appetizer Items** (22 items)

- All appetizer items with `price = 0` for package selections
- Categories: `CATERING- APPETIZERS`

### 2. **BUFFET Items** (19 items) - ✅ NOW INCLUDED

- **STARTERS:** Ensalada de Destino, Quinoa Salad, Causa, Arugula-Jicama Salad (4 items @ $8.00)
- **ENTREES:** Peruvian Ceviche, Salmon Carpaccio, Pollo con Mojo, Lomo Saltado, etc. (8 items @ $8.00-$15.00)
- **SIDES:** Kale, Black Beans, Gallo Pinto, Arroz varieties, etc. (7 items @ $4.00)

### 3. **LUNCH Items** (19 items) - ✅ NOW INCLUDED

- **STARTERS:** Same as BUFFET but with `CATERING- LUNCH, STARTERS` category (4 items)
- **ENTREES:** Same as BUFFET but with `CATERING- LUNCH, ENTREES` category (8 items)
- **SIDES:** Same as BUFFET but with `CATERING- LUNCH, SIDES` category (7 items)

### 4. **Share Platters** (6 items)

- Plantain Chips, Cheese & Charcuterie, Cocktail Prawn platters
- Categories: `CATERING- SHARE PLATTERS`

### 5. **Dessert Items** (7 items)

- Alfajores varieties, Mini Cupcakes, Lemon Bars, Brownie Bites
- Categories: `CATERING- DESSERTS`

### 6. **Appetizer Packages** (3 required packages)

- "Appetizer Selection - 5 Items" ($22/person)
- "Appetizer Selection - 7 Items" ($34/person)
- "Appetizer Selection - 9 Items" ($46/person)

## Complete Category Coverage

After restoration, these Square categories are fully covered:

```
✅ CATERING- APPETIZERS          (22 items)
✅ CATERING- SHARE PLATTERS      (6 items)
✅ CATERING- DESSERTS            (7 items)
✅ CATERING- BUFFET, STARTERS    (4 items) ← FIXED
✅ CATERING- BUFFET, ENTREES     (8 items) ← FIXED
✅ CATERING- BUFFET, SIDES       (7 items) ← FIXED
✅ CATERING- LUNCH, STARTERS     (4 items) ← FIXED
✅ CATERING- LUNCH, ENTREES      (8 items) ← FIXED
✅ CATERING- LUNCH, SIDES        (7 items) ← FIXED
```

**Total: 73 catering items + 3 packages = 76 total catering records**

## Image Resolution

The restoration process now includes automatic image linking:

1. **Square Product Matching**: Links catering items to Square products by name
2. **Image Sync**: Copies real product images from Square to catering items
3. **Expected Results**: 95%+ of items should have images after restoration

If images are still missing after sync, manually run:

```bash
npx tsx scripts/fix-all-catering-images.ts
```

## Verification

To verify the restoration worked correctly:

1. **Check Admin Panel**: `/admin/catering` should show all categories populated
2. **Check Public Page**: `/catering` should show:
   - Appetizers tab: Packages + individual platters/desserts
   - Buffet tab: Starters, Entrees, Sides sections
   - Lunch tab: Starters, Entrees, Sides sections
3. **Check Database**: Should have ~73 catering items + 3 packages

## Troubleshooting

### If Categories Are Still Missing:

1. Run manual restoration: `curl -X POST http://localhost:3000/api/catering/setup-menu`
2. Check for errors in the API response
3. Verify database connection and permissions

### If Images Are Missing:

1. Run image fix: `npx tsx scripts/fix-all-catering-images.ts`
2. Check that Square products have images
3. Verify S3 connectivity for image hosting

### Historical Context

This issue was discovered when the following categories were completely missing from the catering page:

- BUFFET sections showed no items
- LUNCH sections showed no items
- Total of 38 items across 6 categories were not being restored

The root cause was that the restoration script (`/src/app/api/catering/setup-menu/route.ts`) only handled 3 categories and was missing the BUFFET and LUNCH definitions entirely.

**Resolution:** Added complete definitions for all 6 missing categories with proper Square category mappings and pricing based on the production catalog data.
