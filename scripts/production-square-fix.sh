#!/bin/bash

#
# Production Square Order Fix Script
# 
# Safely executes the Square order fix against production environment
# with proper environment variable setup and safety checks.
#

set -e

echo "🚨 Production Square Order Fix Tool"
echo "========================================="

# Check if we have the required environment variables
if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo "❌ VERCEL_PROJECT_ID is required. Get it from: vercel env ls"
    exit 1
fi

# Safety confirmation
echo ""
echo "⚠️  WARNING: This will run fixes against PRODUCTION Square data"
echo "🔍 Environment: Production"
echo "💳 Square: Hybrid mode (production catalog, sandbox payments)"
echo ""
read -p "Are you sure you want to proceed? (type 'YES' to continue): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "🔍 Running in DRY RUN mode first..."
echo "========================================="

# Run in dry-run mode first to see what would be fixed
vercel env pull .env.production
NODE_ENV=production npx tsx scripts/fix-stuck-square-orders.ts --dry-run

echo ""
echo "📊 Dry run completed. Review the output above."
echo ""
read -p "Do you want to execute the actual fixes? (type 'EXECUTE' to proceed): " execute_confirmation

if [ "$execute_confirmation" != "EXECUTE" ]; then
    echo "❌ Fix execution cancelled"
    exit 1
fi

echo ""
echo "🔧 Executing fixes..."
echo "========================================="

# Execute the actual fixes
NODE_ENV=production npx tsx scripts/fix-stuck-square-orders.ts --execute

echo ""
echo "✅ Production fix completed!"
echo ""
echo "🔍 Next steps:"
echo "1. Check the monitoring dashboard: /admin/monitoring"
echo "2. Verify orders in Square dashboard"
echo "3. Run the monitoring script: npm run monitor:square"
