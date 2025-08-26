# Supabase Database Migration Plan: Dev to Production

## Overview
This document outlines a comprehensive migration strategy for moving your database from development to production in Supabase, and establishes best practices for ongoing schema changes.

---

## Part 1: Initial Production Setup (One-time Migration)

### Prerequisites
- [ ] Separate Supabase projects created (dev and prod)
- [ ] Access to both project dashboards
- [ ] Local development environment configured
- [ ] Backup of development database

### Step 1: Export Schema from Development

#### Option A: Using Prisma (Recommended for your setup)
```bash
# From your project root
cd /Users/ealanis/Development/current-projects/destino-sf

# Generate a complete SQL migration file
pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migrations/initial_production_schema.sql
```

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your dev project
supabase link --project-ref your-dev-project-ref

# Generate migration from remote database
supabase db dump --schema public > migrations/schema_dump.sql
```

### Step 2: Prepare Production Database

1. **Connect to Production Project**
```bash
# Update your .env file with production credentials
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres"
```

2. **Apply Schema to Production**
```bash
# Using Prisma
pnpm prisma migrate deploy

# Or using Supabase CLI
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[PROD-PROJECT-REF].supabase.co:5432/postgres"
```

### Step 3: Migrate Essential Data

Create a data migration script (`migrations/seed_production_data.sql`):

```sql
-- 1. Migrate Store Settings
INSERT INTO store_settings (
  name, address, city, state, zip_code, phone, email, 
  tax_rate, min_advance_hours, min_order_amount, 
  max_days_in_advance, is_store_open, catering_minimum_amount
)
SELECT * FROM dblink(
  'host=db.[DEV-PROJECT-REF].supabase.co port=5432 dbname=postgres user=postgres password=[DEV-PASSWORD]',
  'SELECT * FROM store_settings'
) AS t(
  id uuid, name text, address text, city text, state text, 
  zip_code text, phone text, email text, tax_rate decimal, 
  min_advance_hours integer, min_order_amount decimal, 
  max_days_in_advance integer, is_store_open boolean, 
  temporary_closure_msg text, created_at timestamp, 
  updated_at timestamp, catering_minimum_amount decimal
);

-- 2. Migrate Business Hours
INSERT INTO business_hours 
SELECT * FROM dblink(
  'host=db.[DEV-PROJECT-REF].supabase.co port=5432 dbname=postgres user=postgres password=[DEV-PASSWORD]',
  'SELECT * FROM business_hours'
) AS t(
  id uuid, day integer, open_time text, close_time text, 
  is_closed boolean, created_at timestamp, updated_at timestamp
);

-- 3. Migrate Categories (required for products)
INSERT INTO categories 
SELECT * FROM dblink(
  'host=db.[DEV-PROJECT-REF].supabase.co port=5432 dbname=postgres user=postgres password=[DEV-PASSWORD]',
  'SELECT * FROM categories WHERE active = true'
) AS t(
  id uuid, name text, description text, "order" integer, 
  active boolean, slug text, image_url text, metadata jsonb, 
  created_at timestamp, updated_at timestamp, square_id text
);

-- 4. Migrate Protected Products list
INSERT INTO protected_products 
SELECT * FROM dblink(
  'host=db.[DEV-PROJECT-REF].supabase.co port=5432 dbname=postgres user=postgres password=[DEV-PASSWORD]',
  'SELECT * FROM protected_products'
) AS t(
  id integer, square_id text, product_name text, 
  reason text, created_at timestamp, updated_at timestamp
);

-- 5. Migrate Catering Delivery Zones
INSERT INTO catering_delivery_zones 
SELECT * FROM dblink(
  'host=db.[DEV-PROJECT-REF].supabase.co port=5432 dbname=postgres user=postgres password=[DEV-PASSWORD]',
  'SELECT * FROM catering_delivery_zones WHERE active = true'
) AS t(
  id uuid, zone text, name text, description text, 
  minimum_amount decimal, delivery_fee decimal, 
  estimated_delivery_time text, postal_codes text[], 
  cities text[], created_at timestamp, updated_at timestamp, 
  display_order integer, active boolean
);

-- 6. Create Admin Profiles
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'emmanuel@alanis.dev', 'Emmanuel Alanis', 'ADMIN', NOW(), NOW()),
  (gen_random_uuid(), 'james@destinosf.com', 'James - Destino SF', 'ADMIN', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';
```

### Step 4: Run Square Sync for Product Data

After the schema and essential data are migrated:

1. **Configure Square for Production**
```env
# Update .env for production
SQUARE_ENVIRONMENT="production"
SQUARE_ACCESS_TOKEN="[YOUR-PRODUCTION-TOKEN]"
SQUARE_CATALOG_USE_PRODUCTION="true"
SQUARE_TRANSACTIONS_USE_SANDBOX="false"
USE_SQUARE_SANDBOX="false"
```

2. **Run Product Sync**
```bash
# Navigate to your admin panel
# Go to /admin/products
# Click "Sync Products, Images & Update Catering"
```

### Step 5: Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- Continue for all tables...

-- Create policies (example for products)
CREATE POLICY "Products are viewable by everyone" 
  ON products FOR SELECT 
  USING (active = true);

CREATE POLICY "Products are editable by admins only" 
  ON products FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Step 6: Setup Supabase Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products', 'products', true),
  ('categories', 'categories', true),
  ('spotlight', 'spotlight', true);

-- Set up storage policies
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('products', 'categories', 'spotlight'));

CREATE POLICY "Admin write access" ON storage.objects
  FOR INSERT USING (auth.jwt() ->> 'role' = 'admin');
```

---

## Part 2: Ongoing Migration Strategy

### Development Workflow

```mermaid
graph LR
    A[Local Dev] --> B[Dev Branch]
    B --> C[Test in Dev Supabase]
    C --> D[Create Migration]
    D --> E[Test Migration]
    E --> F[Apply to Prod]
```

### Best Practices for Schema Changes

#### 1. Use Prisma Migrations for Schema Changes
```bash
# Make changes to schema.prisma
# Generate migration
pnpm prisma migrate dev --name descriptive_migration_name

# This creates a migration file in prisma/migrations/
```

#### 2. Version Control Strategy
```bash
# Always commit migrations
git add prisma/migrations/
git commit -m "feat: add new table/column for feature X"
```

#### 3. Testing Migrations
```bash
# Test on dev database first
DATABASE_URL="[DEV_DATABASE_URL]" pnpm prisma migrate deploy

# Verify everything works
# Then apply to production
DATABASE_URL="[PROD_DATABASE_URL]" pnpm prisma migrate deploy
```

### Migration Workflow for New Features

#### Step 1: Develop Locally
```bash
# Make schema changes
# Edit prisma/schema.prisma

# Generate migration
pnpm prisma migrate dev --name add_new_feature

# Test locally
pnpm dev
```

#### Step 2: Deploy to Dev Environment
```bash
# Push to dev branch
git push origin feature/new-feature

# Apply to dev Supabase
DATABASE_URL="[DEV_URL]" pnpm prisma migrate deploy
```

#### Step 3: Create Production Migration Script
```bash
# Generate migration SQL
pnpm prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migrations/$(date +%Y%m%d)_feature_name.sql

# Review the generated SQL
cat migrations/[date]_feature_name.sql
```

#### Step 4: Apply to Production
```bash
# Backup production first
supabase db dump --db-url "[PROD_URL]" > backups/prod_$(date +%Y%m%d).sql

# Apply migration
DATABASE_URL="[PROD_URL]" pnpm prisma migrate deploy

# Or using Supabase CLI
supabase db push --db-url "[PROD_URL]"
```

---

## Part 3: Automation Scripts

### Create Migration Helper Scripts

#### `scripts/migrate-to-prod.sh`
```bash
#!/bin/bash

# Load environment variables
source .env.production

# Backup production database
echo "📦 Backing up production database..."
pg_dump $DATABASE_URL > backups/prod_$(date +%Y%m%d_%H%M%S).sql

# Apply migrations
echo "🚀 Applying migrations to production..."
pnpm prisma migrate deploy

# Verify migration
echo "✅ Verifying migration..."
pnpm prisma db pull
pnpm prisma generate

echo "✨ Migration complete!"
```

#### `scripts/sync-dev-to-prod.sh`
```bash
#!/bin/bash

# This script syncs specific data from dev to prod
# Use with caution!

echo "⚠️  WARNING: This will sync data from dev to prod"
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ]; then
  echo "Aborted"
  exit 1
fi

# Export from dev
pg_dump --data-only \
  --table=catering_packages \
  --table=catering_delivery_zones \
  --table=store_settings \
  $DEV_DATABASE_URL > temp_data.sql

# Import to prod
psql $PROD_DATABASE_URL < temp_data.sql

# Cleanup
rm temp_data.sql

echo "✅ Sync complete"
```

---

## Part 4: Rollback Strategy

### Preparing for Rollbacks

1. **Always Create Backups**
```bash
# Before any migration
pg_dump $DATABASE_URL > backups/pre_migration_$(date +%Y%m%d).sql
```

2. **Create Down Migrations**
```sql
-- For every UP migration, create a DOWN migration
-- migrations/20250825_add_feature_DOWN.sql

DROP TABLE IF EXISTS new_feature_table;
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
```

3. **Test Rollback Procedure**
```bash
# Apply rollback
psql $DATABASE_URL < migrations/[date]_feature_DOWN.sql

# Restore from backup if needed
psql $DATABASE_URL < backups/pre_migration_[date].sql
```

---

## Part 5: Monitoring and Validation

### Post-Migration Checklist

- [ ] All tables created successfully
- [ ] Indexes properly applied
- [ ] RLS policies active
- [ ] Required data migrated
- [ ] Square sync completed
- [ ] Admin accounts accessible
- [ ] API endpoints responding
- [ ] Frontend functioning correctly

### Validation Queries

```sql
-- Check table counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Verify critical data
SELECT COUNT(*) FROM products WHERE active = true;
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM profiles WHERE role = 'ADMIN';

-- Check for migration issues
SELECT * FROM _prisma_migrations 
ORDER BY finished_at DESC 
LIMIT 5;
```

---

## Part 6: Emergency Procedures

### If Migration Fails

1. **Immediate Rollback**
```bash
# Restore from backup
psql $DATABASE_URL < backups/pre_migration_[date].sql
```

2. **Debug Migration**
```bash
# Check migration status
pnpm prisma migrate status

# Reset if needed (DEVELOPMENT ONLY)
pnpm prisma migrate reset
```

3. **Contact Support**
- Supabase Dashboard → Support
- Include migration logs
- Provide error messages

---

## Summary

### Initial Setup Checklist
1. ✅ Export schema from dev
2. ✅ Create production database
3. ✅ Apply schema to production
4. ✅ Migrate essential data
5. ✅ Run Square sync
6. ✅ Configure RLS
7. ✅ Setup storage buckets
8. ✅ Verify deployment

### Ongoing Process
1. 📝 Develop features locally
2. 🧪 Test in dev environment
3. 📦 Create migration scripts
4. 🚀 Deploy to production
5. ✅ Validate and monitor

### Key Commands Reference
```bash
# Generate migration
pnpm prisma migrate dev --name feature_name

# Apply to production
DATABASE_URL="[PROD_URL]" pnpm prisma migrate deploy

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql

# Check migration status
pnpm prisma migrate status
```

---

## Notes

- Always test migrations in development first
- Keep migration files in version control
- Document breaking changes
- Maintain backward compatibility when possible
- Schedule major migrations during low-traffic periods
- Have a rollback plan ready

This migration plan ensures safe, repeatable deployments from development to production while maintaining data integrity and minimizing downtime.