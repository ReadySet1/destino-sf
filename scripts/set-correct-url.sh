#!/bin/bash

# ================================================================
# SET CORRECT URL FOR CURRENT ENVIRONMENT
# This script helps set the correct NEXT_PUBLIC_APP_URL
# ================================================================

set -e

echo "🔧 Setting Correct URL for Current Environment"
echo ""

echo "📋 Your Destino SF URLs:"
echo "1) Development deployment: https://development.destinosf.com"
echo "2) Live production: https://www.destinosf.com"
echo "3) Local development: http://localhost:3000"
echo "4) Custom URL"
echo ""

read -p "Which URL do you want to use? (1-4): " url_choice

case $url_choice in
  1)
    TARGET_URL="https://development.destinosf.com"
    ENV_NAME="production"
    echo "✅ Setting up for development deployment"
    ;;
  2)
    TARGET_URL="https://www.destinosf.com"
    ENV_NAME="production"
    echo "⚠️  WARNING: Setting up for live production site!"
    echo "   Make sure you want to configure this for the live site."
    ;;
  3)
    TARGET_URL="http://localhost:3000"
    ENV_NAME="development"
    echo "✅ Setting up for local development"
    ;;
  4)
    read -p "Enter your custom URL: " TARGET_URL
    read -p "Enter environment (production/preview/development): " ENV_NAME
    ;;
  *)
    echo "❌ Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "🔧 Setting environment variables..."

# Set the URL for the specified environment
vercel env add NEXT_PUBLIC_APP_URL "$TARGET_URL" $ENV_NAME
vercel env add NEXT_PUBLIC_SITE_URL "$TARGET_URL" $ENV_NAME

echo ""
echo "✅ URL set successfully!"
echo "🌐 URL: $TARGET_URL"
echo "🔧 Environment: $ENV_NAME"
echo ""

# Ask if user wants to deploy
read -p "Do you want to deploy now? (y/n): " deploy_choice

if [[ $deploy_choice =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Deploying..."
    if [ "$ENV_NAME" = "production" ]; then
        vercel --prod
    else
        vercel
    fi
    
    echo ""
    echo "✅ Deployment complete!"
    echo "🧪 Test your configuration:"
    echo "   curl $TARGET_URL/api/debug/square-config"
    echo ""
    echo "🛒 Test order creation:"
    echo "   Visit $TARGET_URL and try creating an order"
else
    echo ""
    echo "📋 To deploy later, run:"
    if [ "$ENV_NAME" = "production" ]; then
        echo "   vercel --prod"
    else
        echo "   vercel"
    fi
fi 