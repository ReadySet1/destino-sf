# Pre-Sync Checklist for Square Product Sync

## ⚠️ CRITICAL: Database Must Be Ready Before Sync

Since your database was reset, you must apply all pending migrations before running the Square sync.

## Step 1: Apply Database Migrations

```bash
# Apply all pending migrations
pnpm prisma migrate deploy

# Or for development environment
pnpm prisma migrate dev
```

**Expected Result**: All 19 migrations should be applied successfully.

## Step 2: Verify Database Structure

```bash
# Generate Prisma client
pnpm prisma generate

# Check database connection
pnpm prisma db seed
```

## Step 3: Verify Tables Exist

Run this query to check if core tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('products', 'categories', 'variants', 'catering_delivery_zones');
```

## Step 4: Safe to Run Square Sync

Only after Steps 1-3 are complete:

1. Go to `/admin/products`
2. Click "Sync Products, Images & Update Catering"
3. Monitor the sync process

## 🔍 What the Sync Will Do

### Product Operations:

- ✅ Create products from Square catalog
- ✅ Create/update categories
- ✅ Handle product variants
- ✅ Process product images
- ✅ Set product ordering (ordinal)

### Catering Operations:

- ✅ Sync catering items with Square
- ✅ Restore appetizer packages
- ✅ Update catering images
- ✅ Setup catering menu

### Safety Features:

- ✅ Rate limiting to prevent API overload
- ✅ Retry logic for failed operations
- ✅ Error handling and logging
- ✅ Backup/restore of catering data

## 🛡️ Compatibility Confirmed

The sync code is fully compatible with your current schema:

- All database field names match
- All data types are correct
- New CateringDeliveryZone won't interfere
- Proper error handling in place

## ⚠️ Do Not Skip Step 1

Running the sync without applying migrations will result in:

- `table "products" does not exist` errors
- `table "categories" does not exist` errors
- Complete sync failure
- No data imported from Square

---

**Next Action**: Run `pnpm prisma migrate deploy` first, then proceed with sync.
