#!/bin/bash

# ================================================================
# DESTINO SF - VERCEL ENVIRONMENT VARIABLES UPLOAD SCRIPT
# Domain: development.destinosf.com
# ================================================================

echo "🚀 Subiendo variables de entorno a Vercel para staging..."
echo "📋 Dominio: development.destinosf.com"
echo ""

# ================================================================
# NEXT.JS CONFIGURATION
# ================================================================
echo "📦 Configurando Next.js..."
vercel env add NODE_ENV production production
vercel env add NEXT_PUBLIC_SITE_URL https://development.destinosf.com production
vercel env add NEXT_PUBLIC_APP_URL https://development.destinosf.com production

# ================================================================
# SANITY CMS CONFIGURATION
# ================================================================
echo "🎨 Configurando Sanity CMS..."
vercel env add NEXT_PUBLIC_SANITY_PROJECT_ID xdajqttf production
vercel env add NEXT_PUBLIC_SANITY_DATASET production production
vercel env add NEXT_PUBLIC_SANITY_API_TOKEN sknvEeWowz9OKxxmiP0KlV6hcIbJQEYKPGvYIhygUXVQQgMusKBumaSx8HdR6Bl3rnAY87I418e56InlohRuarRhapaGQ1kePtaB280jlhoSElAD5BAOgwEZC61d9XY2PtW5aHQSDcWy4deRxaf4BTgtLs0r4GUTRcQwgtos7vrgwgMUOhhu production
vercel env add SANITY_API_TOKEN sknvEeWowz9OKxxmiP0KlV6hcIbJQEYKPGvYIhygUXVQQgMusKBumaSx8HdR6Bl3rnAY87I418e56InlohRuarRhapaGQ1kePtaB280jlhoSElAD5BAOgwEZC61d9XY2PtW5aHQSDcWy4deRxaf4BTgtLs0r4GUTRcQwgtos7vrgwgMUOhhu production

# ================================================================
# SUPABASE CONFIGURATION
# ================================================================
echo "🏪 Configurando Supabase..."
vercel env add NEXT_PUBLIC_SUPABASE_URL https://avfiuivgvkgaovkqjnup.supabase.co production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Zml1aXZndmtnYW92a3FqbnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDcxNTUsImV4cCI6MjA2MDQ4MzE1NX0.-EOnFNeNUhbHq5aPjD6n9ND1_DfGAia6r2B8BQik_XU production
vercel env add SUPABASE_SERVICE_ROLE_KEY eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Zml1aXZndmtnYW92a3FqbnVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDkwNzE1NSwiZXhwIjoyMDYwNDgzMTU1fQ.OIpMWAL3cNInEbaKDURbjvaD83JwHPV-PymcjBcG0D8 production

# ================================================================
# DATABASE CONFIGURATION
# ================================================================
echo "🗄️  Configurando Base de Datos..."
vercel env add DATABASE_URL "postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres" production
vercel env add DIRECT_URL "postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres" production

# ================================================================
# SQUARE PAYMENT CONFIGURATION (HYBRID MODE)
# ================================================================
echo "💳 Configurando Square (Híbrido: Catálogo Producción + Transacciones Sandbox)..."
vercel env add SQUARE_ENVIRONMENT sandbox production
vercel env add SQUARE_CATALOG_USE_PRODUCTION true production
vercel env add SQUARE_TRANSACTIONS_USE_SANDBOX true production
vercel env add USE_SQUARE_SANDBOX true production

# Production tokens (for catalog)
vercel env add SQUARE_PRODUCTION_TOKEN EAAAl1cr9vZhERNNLJXpZ1iNxBRnW-sL9vtvkBShEoolqsZG69tnmnlptGhl4BXj production
vercel env add SQUARE_LOCATION_ID LMV06M1ER6HCC production

# Sandbox tokens (for transactions)
vercel env add SQUARE_SANDBOX_TOKEN EAAAl-uQi9jcs2DbsPElJqTceFFKlfoyvZWsQbyMMHqhlnmX7dJzk9_UfMAs8rZW production
vercel env add SQUARE_SANDBOX_APPLICATION_ID sandbox-sq0idb-kSJsJFl3McesRc_oqx-pHQ production

# Legacy support
vercel env add SQUARE_ACCESS_TOKEN EAAAl1cr9vZhERNNLJXpZ1iNxBRnW-sL9vtvkBShEoolqsZG69tnmnlptGhl4BXj production
vercel env add SQUARE_WEBHOOK_SIGNATURE_KEY xysLcWwihbVWY2OWBv-EXQ production

# ================================================================
# SHIPPING CONFIGURATION (Shippo)
# ================================================================
echo "📦 Configurando Envíos (Shippo)..."
vercel env add SHIPPO_API_KEY shippo_test_f48af1270bac0e03515781c1b20e301454dc95bc production
vercel env add SHIPPING_ORIGIN_EMAIL james@destinosf.com production
vercel env add SHIPPING_ORIGIN_NAME "Destino SF" production
vercel env add SHIPPING_ORIGIN_STREET1 "103 Horne Ave" production
vercel env add SHIPPING_ORIGIN_CITY "San Francisco" production
vercel env add SHIPPING_ORIGIN_STATE CA production
vercel env add SHIPPING_ORIGIN_ZIP 94124 production
vercel env add SHIPPING_ORIGIN_PHONE 555-555-5555 production

# ================================================================
# EMAIL CONFIGURATION (Resend)
# ================================================================
echo "📧 Configurando Email (Resend)..."
vercel env add SHOP_NAME "Destino SF" production
vercel env add FROM_EMAIL system@updates.destinosf.com production
vercel env add ADMIN_EMAIL james@destinosf.com production
vercel env add SUPPORT_EMAIL info@destinosf.com production
vercel env add RESEND_API_KEY re_placeholder_key_for_testing production

# ================================================================
# SECURITY & DEPLOYMENT
# ================================================================
echo "🔒 Configurando Seguridad..."
vercel env add NEXTAUTH_URL https://development.destinosf.com production
echo "⚠️  IMPORTANTE: Necesitas generar un NEXTAUTH_SECRET"
echo "   Ejecuta: openssl rand -base64 32"
echo "   Luego: vercel env add NEXTAUTH_SECRET [tu_secret_generado] production"

# ================================================================
# OPTIONAL FLAGS
# ================================================================
echo "🔧 Configurando flags opcionales..."
vercel env add NEXT_TELEMETRY_DISABLED 1 production

echo ""
echo "✅ ¡Variables de entorno subidas a Vercel!"
echo "🌐 Dominio configurado: development.destinosf.com"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Genera un NEXTAUTH_SECRET:"
echo "   openssl rand -base64 32"
echo "2. Súbelo a Vercel:"
echo "   vercel env add NEXTAUTH_SECRET [tu_secret] production"
echo "3. Configura el dominio personalizado en Vercel Dashboard"
echo "4. Verifica las variables con: vercel env ls"
echo "5. Haz un nuevo deployment: vercel --prod"
echo ""
echo "🔧 CONFIGURACIÓN DE SUPABASE:"
echo "Ve a tu dashboard de Supabase y agrega estas URLs en Auth Settings:"
echo "Site URL: https://development.destinosf.com"
echo "Redirect URLs: https://development.destinosf.com/auth/callback" 