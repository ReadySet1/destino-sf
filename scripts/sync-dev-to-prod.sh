#!/bin/bash

# Sync Development Data to Production
# Use with caution! This will sync specific data from dev to prod

set -e  # Exit on any error

echo "⚠️  Development to Production Data Sync"
echo "======================================"
echo ""
echo "This script will sync specific data from development to production."
echo "This is potentially destructive and should only be used for:"
echo "- Configuration data (store settings, delivery zones)"
echo "- Static content (categories, protected products)"
echo "- NOT for user data, orders, or payments"
echo ""

read -p "Are you sure you want to continue? (y/N): " confirm
if [ "$confirm" != "y" ]; then
    echo "Aborted"
    exit 1
fi

# Load environment variables
if [ ! -f .env.development ] || [ ! -f .env.production ]; then
    echo "❌ Missing environment files (.env.development or .env.production)"
    exit 1
fi

source .env.development
DEV_DATABASE_URL="$DATABASE_URL"

source .env.production
PROD_DATABASE_URL="$DATABASE_URL"

if [ -z "$DEV_DATABASE_URL" ] || [ -z "$PROD_DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in environment files"
    exit 1
fi

echo "📋 Development DB: ${DEV_DATABASE_URL:0:30}..."
echo "📋 Production DB: ${PROD_DATABASE_URL:0:30}..."
echo ""

read -p "Confirm these are correct? (y/N): " confirm_db
if [ "$confirm_db" != "y" ]; then
    echo "Aborted"
    exit 1
fi

# Create temporary files for data export
TEMP_DIR=$(mktemp -d)
echo "📁 Using temporary directory: $TEMP_DIR"

# Export store settings from dev
echo "📤 Exporting store settings from development..."
psql "$DEV_DATABASE_URL" -c "COPY (SELECT * FROM store_settings ORDER BY \"createdAt\" DESC LIMIT 1) TO STDOUT WITH CSV HEADER;" > "$TEMP_DIR/store_settings.csv"

# Export catering delivery zones from dev
echo "📤 Exporting catering delivery zones from development..."
psql "$DEV_DATABASE_URL" -c "COPY (SELECT * FROM catering_delivery_zones WHERE active = true) TO STDOUT WITH CSV HEADER;" > "$TEMP_DIR/catering_delivery_zones.csv"

# Export protected products from dev
echo "📤 Exporting protected products from development..."
psql "$DEV_DATABASE_URL" -c "COPY (SELECT * FROM protected_products) TO STDOUT WITH CSV HEADER;" > "$TEMP_DIR/protected_products.csv"

# Create backup of production before sync
echo "📦 Creating production backup before sync..."
mkdir -p backups
BACKUP_FILE="backups/prod_pre_sync_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$PROD_DATABASE_URL" > "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Import to production (with conflict resolution)
echo "📥 Importing store settings to production..."
psql "$PROD_DATABASE_URL" -c "DELETE FROM store_settings;" || true
psql "$PROD_DATABASE_URL" -c "COPY store_settings FROM STDIN WITH CSV HEADER;" < "$TEMP_DIR/store_settings.csv"

echo "📥 Importing catering delivery zones to production..."
psql "$PROD_DATABASE_URL" -c "DELETE FROM catering_delivery_zones;" || true
psql "$PROD_DATABASE_URL" -c "COPY catering_delivery_zones FROM STDIN WITH CSV HEADER;" < "$TEMP_DIR/catering_delivery_zones.csv"

echo "📥 Importing protected products to production..."
psql "$PROD_DATABASE_URL" -c "DELETE FROM protected_products;" || true
psql "$PROD_DATABASE_URL" -c "COPY protected_products FROM STDIN WITH CSV HEADER;" < "$TEMP_DIR/protected_products.csv"

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Sync complete!"
echo ""
echo "📋 Synced data:"
echo "- Store settings"
echo "- Catering delivery zones"
echo "- Protected products"
echo ""
echo "🔄 Backup location: $BACKUP_FILE"
