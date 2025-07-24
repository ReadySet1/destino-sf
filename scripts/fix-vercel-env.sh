#!/bin/bash

# ================================================================
# QUICK FIX: Vercel Environment Variables
# This script fixes the immediate NEXT_PUBLIC_APP_URL issue
# ================================================================

set -e

echo "🔧 Quick Fix: Setting up Vercel Environment Variables"
echo ""

# Get the current deployment URL
echo "📋 Getting current deployment URL..."
CURRENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "")

if [ -z "$CURRENT_URL" ]; then
    echo "❌ Could not determine current deployment URL"
    echo ""
    echo "📋 Available URLs:"
    echo "1) Development deployment: https://development.destinosf.com"
    echo "2) Live production: https://www.destinosf.com"
    echo "3) Custom URL"
    read -p "Enter choice (1-3): " url_choice
    
    case $url_choice in
      1)
        CURRENT_URL="https://development.destinosf.com"
        echo "✅ Using development deployment"
        ;;
      2)
        CURRENT_URL="https://www.destinosf.com"
        echo "⚠️  WARNING: Using live production site!"
        ;;
      3)
        read -p "Enter your custom URL: " CURRENT_URL
        ;;
      *)
        echo "❌ Invalid choice. Using development deployment."
        CURRENT_URL="https://development.destinosf.com"
        ;;
    esac
fi

# Ensure URL has https:// prefix
if [[ ! "$CURRENT_URL" =~ ^https?:// ]]; then
    CURRENT_URL="https://$CURRENT_URL"
fi

echo "✅ Using URL: $CURRENT_URL"
echo ""

# Fix the critical environment variables
echo "🔧 Setting critical environment variables..."

# Set NEXT_PUBLIC_APP_URL for all environments
echo "Setting NEXT_PUBLIC_APP_URL..."
vercel env add NEXT_PUBLIC_APP_URL "$CURRENT_URL" production
vercel env add NEXT_PUBLIC_APP_URL "$CURRENT_URL" preview
vercel env add NEXT_PUBLIC_APP_URL "$CURRENT_URL" development

# Set NEXT_PUBLIC_SITE_URL for all environments
echo "Setting NEXT_PUBLIC_SITE_URL..."
vercel env add NEXT_PUBLIC_SITE_URL "$CURRENT_URL" production
vercel env add NEXT_PUBLIC_SITE_URL "$CURRENT_URL" preview
vercel env add NEXT_PUBLIC_SITE_URL "$CURRENT_URL" development

# Fix Square configuration for production
echo "🔧 Fixing Square configuration..."
vercel env add USE_SQUARE_SANDBOX false production
vercel env add SQUARE_CATALOG_USE_PRODUCTION true production
vercel env add SQUARE_TRANSACTIONS_USE_SANDBOX true production

# Remove conflicting environment variable if it exists
echo "🧹 Cleaning up conflicting variables..."
vercel env rm SQUARE_ENVIRONMENT production 2>/dev/null || echo "SQUARE_ENVIRONMENT not found, skipping..."

echo ""
echo "✅ Quick fix applied!"
echo ""
echo "📋 Next Steps:"
echo "1. Deploy the changes:"
echo "   vercel --prod"
echo ""
echo "2. Test the configuration:"
echo "   curl $CURRENT_URL/api/debug/square-config"
echo ""
echo "3. Test order creation:"
echo "   Visit $CURRENT_URL and try creating an order"
echo ""
echo "🔧 If you need full sandbox setup, run:"
echo "   ./scripts/setup-vercel-sandbox.sh" 