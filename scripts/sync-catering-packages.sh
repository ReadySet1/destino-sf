#!/bin/bash

# Sync Catering Packages from Development to Production
# This fixes the missing appetizer packages issue

set -e

echo "📦 Catering Packages Sync"
echo "========================"
echo ""
echo "This script syncs catering packages from development to production."
echo "This fixes the 'Appetizer packages are being set up' message."
echo ""

# Load environment variables
source .env.development
DEV_DATABASE_URL="$DATABASE_URL"

source .env.production
PROD_DATABASE_URL="$DATABASE_URL"

echo "📋 Development DB: ${DEV_DATABASE_URL:0:30}..."
echo "📋 Production DB: ${PROD_DATABASE_URL:0:30}..."

# Export catering packages from development
echo ""
echo "📤 Exporting catering packages from development..."
psql "$DEV_DATABASE_URL" -c "COPY (SELECT * FROM catering_packages WHERE \"isActive\" = true ORDER BY \"featuredOrder\") TO STDOUT WITH CSV HEADER;" > /tmp/catering_packages.csv

PACKAGE_COUNT=$(wc -l < /tmp/catering_packages.csv)
echo "   Exported $((PACKAGE_COUNT - 1)) active catering packages"

# Show what we're importing
echo "   Packages to sync:"
psql "$DEV_DATABASE_URL" -t -c "SELECT '   - ' || name || ' ($' || \"pricePerPerson\" || ' per person)' FROM catering_packages WHERE \"isActive\" = true ORDER BY \"featuredOrder\";"

echo ""
read -p "Proceed with importing catering packages to production? (y/N): " confirm
if [ "$confirm" != "y" ]; then
    echo "Import cancelled"
    exit 0
fi

# Import catering packages to production
if [ "$PACKAGE_COUNT" -gt 1 ]; then
    echo ""
    echo "📥 Importing catering packages to production..."
    
    # Clear existing packages
    echo "   Clearing existing packages..."
    psql "$PROD_DATABASE_URL" -c "DELETE FROM catering_packages;" || true
    
    # Import fresh packages
    echo "   Importing fresh packages..."
    psql "$PROD_DATABASE_URL" -c "COPY catering_packages FROM STDIN WITH CSV HEADER;" < /tmp/catering_packages.csv
    
    echo "   ✅ Catering packages imported successfully"
else
    echo "⚠️  No catering packages to import"
fi

# Verify import
echo ""
echo "🔍 Verifying import..."

# Check packages in production
PROD_PACKAGES=$(psql "$PROD_DATABASE_URL" -t -c "SELECT count(*) FROM catering_packages WHERE \"isActive\" = true;")
echo "   Production catering packages: $PROD_PACKAGES"

# List package names
if [ "$PROD_PACKAGES" -gt 0 ]; then
    echo "   Package names:"
    psql "$PROD_DATABASE_URL" -t -c "SELECT '   - ' || name || ' ($' || \"pricePerPerson\" || ' per person)' FROM catering_packages WHERE \"isActive\" = true ORDER BY \"featuredOrder\";"
fi

# Cleanup
rm -f /tmp/catering_packages.csv

echo ""
echo "🎉 CATERING PACKAGES SYNC COMPLETE!"
echo "=================================="

if [ "$PROD_PACKAGES" -gt 0 ]; then
    echo ""
    echo "✅ SUCCESS! Catering packages are now in production:"
    echo "   - Total packages: $PROD_PACKAGES"
    echo ""
    echo "🚀 NEXT STEPS:"
    echo "1. Refresh your catering page"
    echo "2. The 'Appetizer packages are being set up' message should be gone"
    echo "3. Appetizer packages should now be selectable"
    echo ""
    echo "🔧 The missing appetizers issue should now be COMPLETELY FIXED!"
else
    echo "❌ Import may have failed. Check the logs above."
fi
