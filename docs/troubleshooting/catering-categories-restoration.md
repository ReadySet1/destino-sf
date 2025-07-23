# Catering Categories Restoration Guide

## Issue: Missing BUFFET and LUNCH Categories

### Problem Description

After Square sync, the catering page showed empty sections for:
- **Buffet tab**: No starters, entrees, or sides 
- **Lunch tab**: No starters, entrees, or sides

**Root Cause:** The restoration script `/src/app/api/catering/setup-menu/route.ts` only restored 3 categories:
- ✅ `CATERING- APPETIZERS`
- ✅ `CATERING- SHARE PLATTERS` 
- ✅ `CATERING- DESSERTS`

**Missing:** 6 categories with 38 total items
- ❌ `CATERING- BUFFET, STARTERS` (4 items)
- ❌ `CATERING- BUFFET, ENTREES` (8 items)
- ❌ `CATERING- BUFFET, SIDES` (7 items) 
- ❌ `CATERING- LUNCH, STARTERS` (4 items)
- ❌ `CATERING- LUNCH, ENTREES` (8 items)
- ❌ `CATERING- LUNCH, SIDES` (7 items)

### Solution Implemented

#### 1. Added Missing Category Definitions

Added to `/src/app/api/catering/setup-menu/route.ts`:

```typescript
// BUFFET Categories
const BUFFET_STARTERS = [ /* 4 starter items */ ];
const BUFFET_ENTREES = [ /* 8 entree items */ ];  
const BUFFET_SIDES = [ /* 7 side items */ ];

// LUNCH Categories  
const LUNCH_STARTERS = [ /* 4 starter items */ ];
const LUNCH_ENTREES = [ /* 8 entree items */ ];
const LUNCH_SIDES = [ /* 7 side items */ ];
```

#### 2. Fixed Search Logic

**Problem:** Script searched by `name` only, causing conflicts between BUFFET and LUNCH items with same names.

**Solution:** Changed to search by `name + squareCategory`:

```typescript
// Before (caused conflicts)
const existingItem = await prisma.cateringItem.findFirst({
  where: { name: item.name }
});

// After (allows same names in different categories)  
const existingItem = await prisma.cateringItem.findFirst({
  where: { 
    name: item.name,
    squareCategory: item.squareCategory 
  }
});
```

#### 3. Added Processing Loops

Added 6 new processing loops in the POST function to handle each category.

### Items Restored

#### BUFFET Items (19 total)

**STARTERS (4 items @ $8.00):**
- Ensalada de Destino
- Quinoa Salad  
- Causa
- Arugula-Jicama Salad

**ENTREES (8 items @ $8.00-$15.00):**
- Peruvian Ceviche ($12.00)
- Salmon Carpaccio ($14.00)
- Pollo con Mojo ($10.00)
- Lomo Saltado ($15.00)
- Aji de Gallina ($11.00)
- Ropa Vieja ($12.00)
- Capon de Ayuama ($9.00)
- Grilled Veggie Skewers ($8.00)

**SIDES (7 items @ $4.00):**
- Kale
- Black Beans
- Gallo Pinto
- Arroz Blanco
- Arroz Rojo  
- Arroz Verde
- Garlic-Chipotle Mashed Potatoes

#### LUNCH Items (19 total)

**Same items as BUFFET** but with different `squareCategory`:
- STARTERS: `CATERING- LUNCH, STARTERS`
- ENTREES: `CATERING- LUNCH, ENTREES`
- SIDES: `CATERING- LUNCH, SIDES`

### Testing Results

**API Restoration:**
```bash
curl -X POST http://localhost:3000/api/catering/setup-menu
# Result: 22 new items created, 51 updated
```

**Database Verification:**
```bash
npx tsx verify-catering-items.ts
# Result: 38 BUFFET/LUNCH items found (19 each)
```

**Image Resolution:**
```bash 
npx tsx scripts/fix-all-catering-images.ts
# Result: 36 items updated with images (95% success rate)
```

### Data Sources

Items were based on Square's production catalog:

- **Source**: `config/production-catalog-full.json`
- **Reference Items**: 
  - `"(Catering) Salads/Starters"` → BUFFET/LUNCH STARTERS
  - `"(Catering) Side Dishes"` → BUFFET/LUNCH SIDES  
  - `"(Catering) Main Dishes"` → BUFFET/LUNCH ENTREES

### Prevention

To prevent this issue in the future:

#### 1. Documentation
- ✅ Updated `scripts/post-sync-setup.md` with complete category list
- ✅ Created this troubleshooting guide
- ✅ Added historical context

#### 2. Validation  
Add to sync process:
```bash
# Verify all 9 categories exist after sync
SELECT "squareCategory", COUNT(*) 
FROM "catering_items" 
WHERE "squareCategory" LIKE 'CATERING-%' 
GROUP BY "squareCategory";
```

Expected results:
```
CATERING- APPETIZERS          | 22
CATERING- SHARE PLATTERS      |  6  
CATERING- DESSERTS            |  7
CATERING- BUFFET, STARTERS    |  4
CATERING- BUFFET, ENTREES     |  8
CATERING- BUFFET, SIDES       |  7
CATERING- LUNCH, STARTERS     |  4
CATERING- LUNCH, ENTREES      |  8  
CATERING- LUNCH, SIDES        |  7
```

#### 3. Testing
Create automated test:
```typescript
// Test: All catering categories populated
expect(await getCateringItems()).toHaveLength(73);
expect(await getItemsForTab('buffet')).toHaveLength(19);
expect(await getItemsForTab('lunch')).toHaveLength(19);
```

### Quick Fix Commands

If this issue recurs:

```bash
# 1. Restore missing categories  
curl -X POST http://localhost:3000/api/catering/setup-menu

# 2. Fix images
npx tsx scripts/fix-all-catering-images.ts

# 3. Verify
npx tsx verify-catering-items.ts
```

### Files Modified

- **Primary Fix**: `src/app/api/catering/setup-menu/route.ts`
- **Documentation**: `scripts/post-sync-setup.md`
- **Testing**: Created verification scripts

### Related Issues

- **Image Resolution**: Resolved by linking to Square products by name
- **Category Mapping**: Handled in `src/types/catering.ts` SQUARE_CATEGORY_MAPPING
- **UI Display**: Fixed by populating missing data, no UI changes needed 