#!/bin/bash

echo "=== DESTINO SF SQUARE PRODUCTION SYNC ==="
echo "Starting sync process..."

# Check environment variables
echo "Checking environment variables..."
node src/scripts/check-env.mjs

# Prompt for confirmation
echo ""
echo "This script will:"
echo "1. Clean up all categories and keep only the 'Default' category"
echo "2. Remove all existing products from the database"
echo "3. Sync products from Square production environment"
echo ""
read -p "Do you want to continue? (y/n): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Sync process aborted."
  exit 0
fi

# Step 1: Clean up categories
echo ""
echo "=== Step 1: Cleaning up categories ==="
node src/scripts/auto-clean-categories.mjs

# Step 2: Sync products from production
echo ""
echo "=== Step 2: Syncing products from production ==="
node src/scripts/sync-production.mjs

echo ""
echo "=== Sync process completed ==="
echo "Check sync-production-results.json for detailed results." 