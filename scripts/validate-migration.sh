#!/bin/bash

# Production Migration Validation Script
# This script validates that the migration was successful

set -e

echo "🔍 Production Migration Validation"
echo "=================================="

# Load production environment
if [ -f .env.production ]; then
    source .env.production
else
    echo "❌ .env.production file not found"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

echo "📊 Running validation checks..."
echo ""

# Check table counts
echo "1. 📋 Checking table structure..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "   Tables found: $TABLE_COUNT"

if [ "$TABLE_COUNT" -lt 25 ]; then
    echo "   ⚠️  Expected at least 25 tables, found $TABLE_COUNT"
else
    echo "   ✅ Table count looks good"
fi

# Check admin accounts
echo ""
echo "2. 👤 Checking admin accounts..."
ADMIN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM profiles WHERE role = 'ADMIN';")
echo "   Admin accounts: $ADMIN_COUNT"

if [ "$ADMIN_COUNT" -eq 0 ]; then
    echo "   ❌ No admin accounts found"
else
    echo "   ✅ Admin accounts exist"
fi

# Check store settings
echo ""
echo "3. 🏪 Checking store settings..."
STORE_SETTINGS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM store_settings;")
echo "   Store settings records: $STORE_SETTINGS_COUNT"

if [ "$STORE_SETTINGS_COUNT" -eq 0 ]; then
    echo "   ❌ No store settings found"
else
    echo "   ✅ Store settings exist"
fi

# Check categories
echo ""
echo "4. 📂 Checking categories..."
CATEGORY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM categories WHERE active = true;")
echo "   Active categories: $CATEGORY_COUNT"

if [ "$CATEGORY_COUNT" -eq 0 ]; then
    echo "   ⚠️  No active categories found"
else
    echo "   ✅ Categories exist"
fi

# Check protected products
echo ""
echo "5. 🛡️  Checking protected products..."
PROTECTED_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM protected_products;")
echo "   Protected products: $PROTECTED_COUNT"

if [ "$PROTECTED_COUNT" -eq 0 ]; then
    echo "   ⚠️  No protected products found"
else
    echo "   ✅ Protected products exist"
fi

# Check RLS policies
echo ""
echo "6. 🔒 Checking RLS policies..."
RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_policies WHERE schemaname = 'public';")
echo "   RLS policies: $RLS_COUNT"

if [ "$RLS_COUNT" -eq 0 ]; then
    echo "   ❌ No RLS policies found"
else
    echo "   ✅ RLS policies configured"
fi

# Check storage buckets
echo ""
echo "7. 🗄️  Checking storage buckets..."
BUCKET_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM storage.buckets WHERE id IN ('products', 'categories', 'spotlight');")
echo "   Required buckets: $BUCKET_COUNT/3"

if [ "$BUCKET_COUNT" -ne 3 ]; then
    echo "   ⚠️  Missing storage buckets"
else
    echo "   ✅ Storage buckets configured"
fi

# Check catering categories
echo ""
echo "8. 📂 Checking catering categories..."
CATERING_CATEGORIES=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM categories WHERE name LIKE 'CATERING-%' AND active = true;")
echo "   Catering categories: $CATERING_CATEGORIES"

if [ "$CATERING_CATEGORIES" -eq 0 ]; then
    echo "   ⚠️  No catering categories found"
else
    echo "   ✅ Catering categories exist"
fi

# Check boxed lunch tiers
echo ""
echo "9. 📦 Checking boxed lunch tiers..."
TIER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM boxed_lunch_tiers WHERE active = true;")
echo "   Active boxed lunch tiers: $TIER_COUNT"

if [ "$TIER_COUNT" -eq 0 ]; then
    echo "   ⚠️  No boxed lunch tiers found"
else
    echo "   ✅ Boxed lunch tiers exist"
fi

# Check migration status
echo ""
echo "10. 🔄 Checking migration status..."
MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;")
echo "   Completed migrations: $MIGRATION_COUNT"

echo ""
echo "🎯 Validation Summary"
echo "===================="

# Calculate overall health score
CHECKS_PASSED=0

[ "$TABLE_COUNT" -ge 25 ] && ((CHECKS_PASSED++))
[ "$ADMIN_COUNT" -gt 0 ] && ((CHECKS_PASSED++))
[ "$STORE_SETTINGS_COUNT" -gt 0 ] && ((CHECKS_PASSED++))
[ "$CATEGORY_COUNT" -gt 0 ] && ((CHECKS_PASSED++))
[ "$PROTECTED_COUNT" -gt 0 ] && ((CHECKS_PASSED++))
[ "$RLS_COUNT" -gt 0 ] && ((CHECKS_PASSED++))
[ "$BUCKET_COUNT" -eq 3 ] && ((CHECKS_PASSED++))
[ "$CATERING_CATEGORIES" -gt 0 ] && ((CHECKS_PASSED++))
[ "$TIER_COUNT" -gt 0 ] && ((CHECKS_PASSED++))

echo "Checks passed: $CHECKS_PASSED/9"

if [ "$CHECKS_PASSED" -eq 9 ]; then
    echo "✅ All validation checks passed!"
    echo "🚀 Your production database is ready!"
elif [ "$CHECKS_PASSED" -ge 7 ]; then
    echo "⚠️  Most checks passed, but there are some warnings"
    echo "🔧 Review the warnings above and fix if necessary"
else
    echo "❌ Multiple validation checks failed"
    echo "🛠️  Please review and fix the issues before proceeding"
    exit 1
fi

echo ""
echo "📋 Next Steps:"
echo "1. Test your application with the production database"
echo "2. Run Square sync to populate products"
echo "3. Test all critical user flows"
echo "4. Monitor application logs"
