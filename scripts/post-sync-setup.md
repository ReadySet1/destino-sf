# Post-Sync Database Setup

After syncing data from Square or resetting the database, you need to ensure all catering functionality works properly.

## Problem

The Square sync process only creates **CateringItem** records but does NOT create **CateringPackage** records. This causes issues in the catering page where the appetizer section displays "Appetizer packages are being set up. Please check back soon!" because it requires both:

1. CateringPackage records with names containing "Appetizer Selection"
2. CateringItem records with `price = 0` (package-only items)

## Solution (UPDATED - Now Automated!)

### ✅ Automatic Restoration (Recommended)

The Square sync button in the admin panel (`/admin/products`) now **automatically restores** the catering menu after completing the Square sync. The sync process now includes these steps:

1. **Square Product Sync**: Syncs products and categories from Square
2. **Image Refresh**: Updates product images  
3. **Image Protection**: Protects custom catering images
4. **🆕 Catering Menu Restoration**: Automatically restores appetizer packages and items

**No manual intervention required!** The sync button will show the restoration status in the results.

### Manual Restoration (If Needed)

If you need to restore the catering menu independently, you can either:

**Option A: API Endpoint**
```bash
curl -X POST http://localhost:3000/api/catering/setup-menu
```

**Option B: Script**
```bash
npx tsx src/scripts/setup-catering-menu-2025.ts
```

## What Gets Restored

1. **Appetizer Items**: 22 appetizer items with `price = 0` for package selections
2. **Platter Items**: 6 share platters with specific pricing
3. **Dessert Items**: 7 dessert options for catering
4. **Appetizer Packages**: 3 required package records:
   - "Appetizer Selection - 5 Items" ($22/person)
   - "Appetizer Selection - 7 Items" ($34/person) 
   - "Appetizer Selection - 9 Items" ($46/person)
5. **Store Settings**: Sets catering minimum amounts and advance notice requirements

## Verification

After running the sync or setup, verify the data:

```bash
npx tsx scripts/check-catering-data.ts
```

Expected results:
- `Total Packages`: 3, `Appetizer Packages`: 3
- `Total Items`: ~120+, `Zero-price Items`: ~50+
- `Appetizer Section Working`: ✅ YES

**Or check manually:**
```sql
-- Check packages were created
SELECT COUNT(*) as total_packages, 
       COUNT(CASE WHEN name LIKE '%Appetizer Selection%' THEN 1 END) as appetizer_packages 
FROM "CateringPackage";

-- Check items were created (should have both $0 and priced items)
SELECT COUNT(*) as total_items, 
       COUNT(CASE WHEN price = 0 THEN 1 END) as zero_price_items 
FROM "CateringItem";
```

## Troubleshooting

If the appetizer section still shows "packages unavailable":

1. **Check the sync results** in the admin panel for any errors in the "Appetizer Packages & Catering Menu" section
2. **Run the diagnostic**: `npx tsx scripts/check-catering-data.ts`
3. **Manual API call**: `curl -X POST http://localhost:3000/api/catering/setup-menu`
4. **Check logs** in the browser developer console and server logs for any API errors

## Implementation Details

The automated restoration is implemented in:
- **Frontend**: `src/app/(dashboard)/admin/products/sync-square.tsx` (Step 5)
- **Backend**: `src/app/api/catering/setup-menu/route.ts`
- **Data Source**: Same data as `src/scripts/setup-catering-menu-2025.ts`

This ensures consistency between manual and automatic restoration processes.

## Future Prevention

To prevent this issue in the future:

1. **Always run the setup script after database resets**
2. **Consider adding package creation to the main sync process**
3. **Add database validation checks to the catering page**
4. **Create automated tests to verify critical catering data exists**

## Alternative: Manual Package Creation

If the script fails, you can manually create packages via the admin interface at:
`/admin/catering/packages/new`

## Related Files

- Script: `src/scripts/setup-catering-menu-2025.ts`
- Catering Actions: `src/actions/catering.ts`
- Catering Page: `src/app/catering/page.tsx`
- Menu Tabs Component: `src/components/Catering/CateringMenuTabs.tsx` 