#!/bin/bash

# ================================================================
# DESTINO SF - VERCEL SANDBOX ENVIRONMENT SETUP SCRIPT
# This script configures Vercel for Square sandbox development
# ================================================================

set -e

echo "🚀 Setting up Vercel environment for Square sandbox development..."
echo ""

# ================================================================
# ENVIRONMENT SELECTION
# ================================================================
echo "📋 Select environment to configure:"
echo "1) Preview (staging/sandbox)"
echo "2) Production (with sandbox transactions)"
echo "3) Development (local testing)"
read -p "Enter choice (1-3): " env_choice

case $env_choice in
  1)
    ENV_NAME="preview"
    echo "📋 Enter your preview URL (e.g., https://destino-sf-git-sandbox-your-username.vercel.app"
    read -p "Preview URL: " BASE_URL
    ;;
  2)
    ENV_NAME="production"
    echo "📋 Select production environment:"
    echo "a) Development deployment (https://development.destinosf.com"
    echo "b) Live production (https://www.destinosf.com)"
    read -p "Enter choice (a/b): " prod_choice
    
    case $prod_choice in
      a)
        BASE_URL="https://development.destinosf.com"
        echo "✅ Using development deployment"
        ;;
      b)
        BASE_URL="https://www.destinosf.com"
        echo "⚠️  WARNING: Using live production site!"
        echo "   Make sure you want to configure sandbox for the live site."
        ;;
      *)
        echo "❌ Invalid choice. Using development deployment."
        BASE_URL="https://development.destinosf.com"
        ;;
    esac
    ;;
  3)
    ENV_NAME="development"
    BASE_URL="http://localhost:3000"
    ;;
  *)
    echo "❌ Invalid choice. Exiting."
    exit 1
    ;;
esac

echo "✅ Selected environment: $ENV_NAME"
echo "🌐 Base URL: $BASE_URL"
echo ""

# ================================================================
# NEXT.JS CONFIGURATION
# ================================================================
echo "📦 Configuring Next.js..."
vercel env add NODE_ENV production $ENV_NAME
vercel env add NEXT_PUBLIC_APP_URL $BASE_URL $ENV_NAME
vercel env add NEXT_PUBLIC_SITE_URL $BASE_URL $ENV_NAME

# ================================================================
# SQUARE SANDBOX CONFIGURATION
# ================================================================
echo "🧪 Configuring Square Sandbox..."
vercel env add SQUARE_ENVIRONMENT sandbox $ENV_NAME
vercel env add USE_SQUARE_SANDBOX true $ENV_NAME
vercel env add SQUARE_CATALOG_USE_PRODUCTION false $ENV_NAME
vercel env add SQUARE_TRANSACTIONS_USE_SANDBOX true $ENV_NAME

# Prompt for Square sandbox credentials
echo ""
echo "🔑 Enter your Square Sandbox credentials:"
read -p "Square Sandbox Access Token: " SQUARE_SANDBOX_TOKEN
read -p "Square Sandbox Application ID: " SQUARE_SANDBOX_APP_ID
read -p "Square Sandbox Location ID: " SQUARE_SANDBOX_LOCATION_ID

vercel env add SQUARE_SANDBOX_TOKEN "$SQUARE_SANDBOX_TOKEN" $ENV_NAME
vercel env add SQUARE_SANDBOX_APPLICATION_ID "$SQUARE_SANDBOX_APP_ID" $ENV_NAME
vercel env add SQUARE_LOCATION_ID "$SQUARE_SANDBOX_LOCATION_ID" $ENV_NAME

# ================================================================
# DATABASE CONFIGURATION
# ================================================================
echo "🗄️ Configuring Database..."
read -p "Database URL (PostgreSQL): " DATABASE_URL
vercel env add DATABASE_URL "$DATABASE_URL" $ENV_NAME
vercel env add DIRECT_URL "$DATABASE_URL" $ENV_NAME

# ================================================================
# SUPABASE CONFIGURATION
# ================================================================
echo "🏪 Configuring Supabase..."
read -p "Supabase URL: " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY

vercel env add NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL" $ENV_NAME
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" $ENV_NAME
vercel env add SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_KEY" $ENV_NAME

# ================================================================
# EMAIL CONFIGURATION
# ================================================================
echo "📧 Configuring Email..."
read -p "Resend API Key: " RESEND_API_KEY
read -p "From Email: " FROM_EMAIL
read -p "Admin Email: " ADMIN_EMAIL

vercel env add RESEND_API_KEY "$RESEND_API_KEY" $ENV_NAME
vercel env add FROM_EMAIL "$FROM_EMAIL" $ENV_NAME
vercel env add ADMIN_EMAIL "$ADMIN_EMAIL" $ENV_NAME
vercel env add SHOP_NAME "Destino SF (Sandbox)" $ENV_NAME

# ================================================================
# AUTHENTICATION CONFIGURATION
# ================================================================
echo "🔒 Configuring Authentication..."
read -p "NextAuth Secret (generate with: openssl rand -base64 32): " NEXTAUTH_SECRET
read -p "NextAuth URL (default: $BASE_URL): " NEXTAUTH_URL

NEXTAUTH_URL=${NEXTAUTH_URL:-$BASE_URL}

vercel env add NEXTAUTH_SECRET "$NEXTAUTH_SECRET" $ENV_NAME
vercel env add NEXTAUTH_URL "$NEXTAUTH_URL" $ENV_NAME

# ================================================================
# SANITY CMS CONFIGURATION
# ================================================================
echo "🎨 Configuring Sanity CMS..."
read -p "Sanity Project ID: " SANITY_PROJECT_ID
read -p "Sanity Dataset (default: production): " SANITY_DATASET
read -p "Sanity API Token: " SANITY_API_TOKEN

SANITY_DATASET=${SANITY_DATASET:-production}

vercel env add NEXT_PUBLIC_SANITY_PROJECT_ID "$SANITY_PROJECT_ID" $ENV_NAME
vercel env add NEXT_PUBLIC_SANITY_DATASET "$SANITY_DATASET" $ENV_NAME
vercel env add SANITY_API_TOKEN "$SANITY_API_TOKEN" $ENV_NAME

# ================================================================
# SHIPPING CONFIGURATION
# ================================================================
echo "📦 Configuring Shipping..."
read -p "Shippo API Key (test): " SHIPPO_API_KEY

vercel env add SHIPPO_API_KEY "$SHIPPO_API_KEY" $ENV_NAME
vercel env add SHIPPING_ORIGIN_EMAIL "sandbox@destinosf.com" $ENV_NAME
vercel env add SHIPPING_ORIGIN_NAME "Destino SF (Sandbox)" $ENV_NAME
vercel env add SHIPPING_ORIGIN_STREET1 "123 Test St" $ENV_NAME
vercel env add SHIPPING_ORIGIN_CITY "San Francisco" $ENV_NAME
vercel env add SHIPPING_ORIGIN_STATE "CA" $ENV_NAME
vercel env add SHIPPING_ORIGIN_ZIP "94102" $ENV_NAME
vercel env add SHIPPING_ORIGIN_PHONE "555-123-4567" $ENV_NAME

# ================================================================
# WEBHOOK CONFIGURATION
# ================================================================
echo "🔗 Configuring Webhooks..."
read -p "Square Webhook Signature Key: " SQUARE_WEBHOOK_SIGNATURE_KEY
read -p "Square Webhook Secret: " SQUARE_WEBHOOK_SECRET

vercel env add SQUARE_WEBHOOK_SIGNATURE_KEY "$SQUARE_WEBHOOK_SIGNATURE_KEY" $ENV_NAME
vercel env add SQUARE_WEBHOOK_SECRET "$SQUARE_WEBHOOK_SECRET" $ENV_NAME

# ================================================================
# OPTIONAL CONFIGURATION
# ================================================================
echo "🔧 Optional Configuration..."
vercel env add NEXT_TELEMETRY_DISABLED 1 $ENV_NAME
vercel env add BYPASS_RATE_LIMIT true $ENV_NAME

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Deploy your application:"
echo "   vercel --prod"
echo ""
echo "2. Test the configuration:"
echo "   curl $BASE_URL/api/debug/square-config"
echo ""
echo "3. Test order creation:"
echo "   Visit $BASE_URL and try creating a test order"
echo ""
echo "4. Monitor logs:"
echo "   vercel logs"
echo ""
echo "🔧 Environment: $ENV_NAME"
echo "🌐 URL: $BASE_URL"
echo "🧪 Square Sandbox: Enabled"
echo ""
echo "⚠️  IMPORTANT: This is a sandbox environment for testing only!"
echo "   No real transactions will be processed." 