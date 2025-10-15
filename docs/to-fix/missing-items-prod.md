I'll analyze the migration issues between development and production. Let me examine the codebase and scripts to identify why certain parts aren't syncing properly.Let me check the Square sync functionality and the catering-related code to understand the synchronization issues:Let me check the actual sync implementation:Now let me check the actual sync implementation that syncs with Square:Now let me check the catering-specific sync functionality:Let me check the production sync manager that actually performs the sync:Now, let me check the catering-related endpoints to understand how they handle the catering items:Now let me check the script for some key tables to understand the database structure:Let me check the prisma schema to understand the database structure:Based on my analysis of your codebase and migration scripts, I can see the issues causing the missing sync items. Here's the **Fix Plan**:

## 🔍 **Root Cause Analysis**

### **Issue 1: Missing Appetizers**

The appetizers are missing because:

1. The Square sync is looking for categories named exactly `CATERING- APPETIZERS`, `CATERING- SHARE PLATTERS`, and `CATERING- DESSERTS`
2. The sync script only syncs basic configuration data (store_settings, delivery_zones, protected_products) but NOT categories or products
3. Categories need to be synced from development to production with their exact names and Square IDs

### **Issue 2: Missing Build Your Own Boxed Lunch Tiers**

The boxed lunch tiers are missing because:

1. They are stored in a separate `boxed_lunch_tiers` table
2. The sync script doesn't include this table in its export/import process
3. The API endpoint checks this table directly via raw SQL query

### **Issue 3: Stuck Sync in Database**

The stuck sync record is in the `user_sync_logs` table with status 'RUNNING' but the actual sync has likely failed or timed out.

## 📋 **Fix Plan**

### **Step 1: Add Missing Tables to Sync Script**

Update `/scripts/sync-dev-to-prod.sh` to include:

1. **Categories table** (required for product categorization)
2. **boxed_lunch_tiers table** (required for Build Your Own feature)
3. **Optional: catering_packages table** (if you have catering packages)

### **Step 2: Fix the Sync Script**

Add these sections after the existing exports in the script:

```bash
# Export categories from dev (CRITICAL - needed for products to map correctly)
echo "📤 Exporting categories from development..."
psql "$DEV_DATABASE_URL" -c "COPY (SELECT * FROM categories WHERE active = true) TO STDOUT WITH CSV HEADER;" > "$TEMP_DIR/categories.csv"

# Export boxed lunch tiers from dev
echo "📤 Exporting boxed lunch tiers from development..."
psql "$DEV_DATABASE_URL" -c "COPY (SELECT * FROM boxed_lunch_tiers WHERE active = true) TO STDOUT WITH CSV HEADER;" > "$TEMP_DIR/boxed_lunch_tiers.csv"
```

And in the import section:

```bash
# Import categories to production
echo "📥 Importing categories to production..."
psql "$PROD_DATABASE_URL" -c "DELETE FROM categories WHERE squareId IS NOT NULL;" || true
psql "$PROD_DATABASE_URL" -c "COPY categories FROM STDIN WITH CSV HEADER;" < "$TEMP_DIR/categories.csv"

# Import boxed lunch tiers to production
echo "📥 Importing boxed lunch tiers to production..."
psql "$PROD_DATABASE_URL" -c "DELETE FROM boxed_lunch_tiers;" || true
psql "$PROD_DATABASE_URL" -c "COPY boxed_lunch_tiers FROM STDIN WITH CSV HEADER;" < "$TEMP_DIR/boxed_lunch_tiers.csv"
```

### **Step 3: Clean Up Stuck Sync Records**

Before running the sync, clean up stuck records:

```sql
-- Run this on production database
UPDATE user_sync_logs
SET status = 'FAILED',
    endTime = NOW(),
    message = 'Sync terminated due to timeout'
WHERE status IN ('RUNNING', 'PENDING')
  AND startTime < NOW() - INTERVAL '1 hour';
```

### **Step 4: Proper Sync Order**

The correct sync order should be:

1. **First sync configuration and structure:**
   - store_settings
   - catering_delivery_zones
   - protected_products
   - **categories** (NEW - CRITICAL)
   - **boxed_lunch_tiers** (NEW)

2. **Then run Square sync via admin panel:**
   - This will sync all products from Square
   - Products will correctly map to categories since categories are already synced
   - The sync will properly categorize CATERING items

### **Step 5: Verify Category Mapping**

The key categories that must exist in production with exact names:

- `CATERING- APPETIZERS`
- `CATERING- SHARE PLATTERS`
- `CATERING- DESSERTS`
- `CATERING- BOXED LUNCHES`
- `CATERING- BOXED LUNCH ENTREES`
- `CATERING- BUFFET`
- `CATERING- LUNCH`

### **Step 6: Update Validation Script**

Add checks to `/scripts/validate-migration.sh`:

```bash
# Check categories
echo "9. 📂 Checking catering categories..."
CATERING_CATEGORIES=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM categories WHERE name LIKE 'CATERING-%';")
echo "   Catering categories: $CATERING_CATEGORIES"

# Check boxed lunch tiers
echo "10. 📦 Checking boxed lunch tiers..."
TIER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM boxed_lunch_tiers WHERE active = true;")
echo "   Active boxed lunch tiers: $TIER_COUNT"
```

## 🚀 **Execution Steps**

1. **Backup production** (already in your script)
2. **Clean stuck sync records** in production database
3. **Update sync script** with categories and boxed_lunch_tiers
4. **Run updated sync script**
5. **Verify categories** are synced correctly
6. **Run Square sync** from admin panel
7. **Validate** with updated validation script

## ⚠️ **Important Notes**

1. **Categories MUST be synced before products** - this is critical for proper mapping
2. **Don't delete existing products** during sync - let Square sync update them
3. **The sync order matters** - structure first, then data
4. **Square IDs in categories** must be preserved for proper linking

This approach ensures all catering items will appear correctly because:

- Categories will exist with proper names
- Boxed lunch tiers will be available
- Square sync will map products to correct categories
- APIs will find the data they expect
