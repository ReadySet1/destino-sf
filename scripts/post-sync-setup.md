# Post-Sync Database Setup

After syncing data from Square or resetting the database, you need to run additional setup scripts to ensure all catering functionality works properly.

## Problem

The Square sync process only creates **CateringItem** records but does NOT create **CateringPackage** records. This causes issues in the catering page where the appetizer section displays "Appetizer packages are being set up. Please check back soon!" because it requires both:

1. CateringPackage records with names containing "Appetizer Selection"
2. CateringItem records with `price = 0` (package-only items)

## Solution

After running the Square sync process, you must also run the catering menu setup script:

```bash
npx tsx src/scripts/setup-catering-menu-2025.ts
```

## What This Script Does

1. **Creates Appetizer Items**: Adds proper appetizer items with `price = 0` for package selections
2. **Creates Platter Items**: Adds share platters with specific pricing
3. **Creates Dessert Items**: Adds dessert options for catering
4. **Creates Appetizer Packages**: Creates the required package records:
   - "Appetizer Selection - 5 Items" ($22/person)
   - "Appetizer Selection - 7 Items" ($34/person) 
   - "Appetizer Selection - 9 Items" ($46/person)
5. **Updates Store Settings**: Sets catering minimum amounts and advance notice requirements

## Verification

After running the script, verify the data:

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

Expected results:
- `total_packages`: 3, `appetizer_packages`: 3
- `total_items`: ~120+, `zero_price_items`: ~50+

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