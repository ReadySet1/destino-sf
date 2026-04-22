#!/bin/bash

# ================================================================
# DESTINO SF - VERCEL ENVIRONMENT VARIABLES UPLOAD SCRIPT
# Domain: development.destinosf.com
#
# SECURITY: This script reads all secrets from your local environment
# (e.g. a sourced ~/.env.vercel-upload file). Never commit real secret
# values into this file.
#
# Usage:
#   1. Copy scripts/upload-env-to-vercel.example.env to a local file
#      outside the repo (or use a gitignored .env.vercel-upload) and
#      fill in the real values.
#   2. `source /path/to/.env.vercel-upload`
#   3. `bash scripts/upload-env-to-vercel.sh`
# ================================================================

set -euo pipefail

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "❌ Missing required env var: $name" >&2
    exit 1
  fi
}

for var in \
  SANITY_API_TOKEN_VAL \
  SUPABASE_URL_VAL \
  SUPABASE_ANON_KEY_VAL \
  SUPABASE_SERVICE_ROLE_KEY_VAL \
  DATABASE_URL_VAL \
  DIRECT_URL_VAL \
  SQUARE_PRODUCTION_TOKEN_VAL \
  SQUARE_LOCATION_ID_VAL \
  SQUARE_SANDBOX_TOKEN_VAL \
  SQUARE_SANDBOX_APPLICATION_ID_VAL \
  SQUARE_WEBHOOK_SECRET_VAL \
  SHIPPO_API_KEY_VAL \
  RESEND_API_KEY_VAL; do
  require "$var"
done

echo "🚀 Uploading environment variables to Vercel (staging)..."
echo "📋 Domain: development.destinosf.com"
echo ""

# ---------- Next.js ----------
echo "📦 Next.js..."
vercel env add NODE_ENV production production
vercel env add NEXT_PUBLIC_SITE_URL https://development.destinosf.com production
vercel env add NEXT_PUBLIC_APP_URL https://development.destinosf.com production

# ---------- Sanity CMS ----------
echo "🎨 Sanity CMS..."
vercel env add NEXT_PUBLIC_SANITY_PROJECT_ID "${SANITY_PROJECT_ID_VAL:-xdajqttf}" production
vercel env add NEXT_PUBLIC_SANITY_DATASET production production
vercel env add NEXT_PUBLIC_SANITY_API_TOKEN "$SANITY_API_TOKEN_VAL" production
vercel env add SANITY_API_TOKEN "$SANITY_API_TOKEN_VAL" production

# ---------- Supabase ----------
echo "🏪 Supabase..."
vercel env add NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL_VAL" production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY_VAL" production
vercel env add SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY_VAL" production

# ---------- Database ----------
echo "🗄️  Database..."
vercel env add DATABASE_URL "$DATABASE_URL_VAL" production
vercel env add DIRECT_URL "$DIRECT_URL_VAL" production

# ---------- Square (Hybrid: production catalog + sandbox transactions) ----------
echo "💳 Square..."
vercel env add SQUARE_ENVIRONMENT sandbox production
vercel env add SQUARE_CATALOG_USE_PRODUCTION true production
vercel env add SQUARE_TRANSACTIONS_USE_SANDBOX true production
vercel env add USE_SQUARE_SANDBOX true production

vercel env add SQUARE_PRODUCTION_TOKEN "$SQUARE_PRODUCTION_TOKEN_VAL" production
vercel env add SQUARE_LOCATION_ID "$SQUARE_LOCATION_ID_VAL" production

vercel env add SQUARE_SANDBOX_TOKEN "$SQUARE_SANDBOX_TOKEN_VAL" production
vercel env add SQUARE_SANDBOX_APPLICATION_ID "$SQUARE_SANDBOX_APPLICATION_ID_VAL" production

vercel env add SQUARE_ACCESS_TOKEN "$SQUARE_PRODUCTION_TOKEN_VAL" production
vercel env add SQUARE_WEBHOOK_SECRET "$SQUARE_WEBHOOK_SECRET_VAL" production
vercel env add SQUARE_WEBHOOK_SECRET_SANDBOX "$SQUARE_WEBHOOK_SECRET_VAL" production

# ---------- Shipping (Shippo) ----------
echo "📦 Shippo..."
vercel env add SHIPPO_API_KEY "$SHIPPO_API_KEY_VAL" production
vercel env add SHIPPING_ORIGIN_EMAIL james@destinosf.com production
vercel env add SHIPPING_ORIGIN_NAME "Destino SF" production
vercel env add SHIPPING_ORIGIN_STREET1 "103 Horne Ave" production
vercel env add SHIPPING_ORIGIN_CITY "San Francisco" production
vercel env add SHIPPING_ORIGIN_STATE CA production
vercel env add SHIPPING_ORIGIN_ZIP 94124 production
vercel env add SHIPPING_ORIGIN_PHONE 555-555-5555 production

# ---------- Email (Resend) ----------
echo "📧 Resend..."
vercel env add SHOP_NAME "Destino SF" production
vercel env add FROM_EMAIL system@updates.destinosf.com production
vercel env add ADMIN_EMAIL ealanis@readysetllc.com production
vercel env add JAMES_EMAIL james@destinosf.com production
vercel env add SUPPORT_EMAIL info@destinosf.com production
vercel env add RESEND_API_KEY "$RESEND_API_KEY_VAL" production

# ---------- Security & Deployment ----------
echo "🔒 Security..."
vercel env add NEXTAUTH_URL https://development.destinosf.com production
echo "⚠️  Remember to set NEXTAUTH_SECRET:"
echo "    openssl rand -base64 32 | vercel env add NEXTAUTH_SECRET production"

# ---------- Optional flags ----------
vercel env add NEXT_TELEMETRY_DISABLED 1 production

echo ""
echo "✅ Done."
