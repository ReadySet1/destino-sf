#!/bin/bash

# Script to update Vercel environment variables from .env.local
# Usage: ./scripts/update-vercel-env.sh

set -e

echo "🚀 Updating Vercel Environment Variables..."

# First, let's update the production URLs for the live site
echo "📝 Setting production URLs..."
vercel env add NEXT_PUBLIC_SITE_URL production <<< "https://destinosf.readysetllc.com"
vercel env add NEXT_PUBLIC_APP_URL production <<< "https://destinosf.readysetllc.com"

# Read .env.local and update each variable
echo "📦 Updating environment variables from .env.local..."

# Extract variables from .env.local (skip comments and empty lines)
grep -E "^[A-Z_]+=.*" .env.local | while IFS='=' read -r key value; do
    # Skip the URLs we already set above
    if [[ "$key" == "NEXT_PUBLIC_SITE_URL" || "$key" == "NEXT_PUBLIC_APP_URL" ]]; then
        continue
    fi
    
    echo "🔧 Setting $key..."
    
    # For production environment
    printf "%s" "$value" | vercel env add "$key" production
    
    # For preview environment
    printf "%s" "$value" | vercel env add "$key" preview
    
    # For development environment (if needed)
    printf "%s" "$value" | vercel env add "$key" development
done

echo "✅ All environment variables updated!"
echo "🔄 You may need to redeploy your application for changes to take effect."
echo "   Run: vercel --prod" 