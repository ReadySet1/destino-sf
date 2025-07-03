# Variables de Entorno para Vercel Dashboard

## 📋 Configuración para development.destinosf.com

**Copiar y pegar una por una en Vercel Dashboard → Settings → Environment Variables**

---

## 🔧 Next.js Configuration

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `NEXT_PUBLIC_SITE_URL` | `https://development.destinosf.com` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://development.destinosf.com` | Production |

---

## 🎨 Sanity CMS Configuration

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `xdajqttf` | Production |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | Production |
| `NEXT_PUBLIC_SANITY_API_TOKEN` | `sknvEeWowz9OKxxmiP0KlV6hcIbJQEYKPGvYIhygUXVQQgMusKBumaSx8HdR6Bl3rnAY87I418e56InlohRuarRhapaGQ1kePtaB280jlhoSElAD5BAOgwEZC61d9XY2PtW5aHQSDcWy4deRxaf4BTgtLs0r4GUTRcQwgtos7vrgwgMUOhhu` | Production |
| `SANITY_API_TOKEN` | `sknvEeWowz9OKxxmiP0KlV6hcIbJQEYKPGvYIhygUXVQQgMusKBumaSx8HdR6Bl3rnAY87I418e56InlohRuarRhapaGQ1kePtaB280jlhoSElAD5BAOgwEZC61d9XY2PtW5aHQSDcWy4deRxaf4BTgtLs0r4GUTRcQwgtos7vrgwgMUOhhu` | Production |

---

## 🏪 Supabase Configuration

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://avfiuivgvkgaovkqjnup.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Zml1aXZndmtnYW92a3FqbnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDcxNTUsImV4cCI6MjA2MDQ4MzE1NX0.-EOnFNeNUhbHq5aPjD6n9ND1_DfGAia6r2B8BQik_XU` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2Zml1aXZndmtnYW92a3FqbnVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDkwNzE1NSwiZXhwIjoyMDYwNDgzMTU1fQ.OIpMWAL3cNInEbaKDURbjvaD83JwHPV-PymcjBcG0D8` | Production |

---

## 🗄️ Database Configuration

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres` | Production |
| `DIRECT_URL` | `postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres` | Production |

---

## 💳 Square Payment Configuration (Hybrid Mode)

| Variable | Value | Environment |
|----------|-------|-------------|
| `SQUARE_ENVIRONMENT` | `sandbox` | Production |
| `SQUARE_CATALOG_USE_PRODUCTION` | `true` | Production |
| `SQUARE_TRANSACTIONS_USE_SANDBOX` | `true` | Production |
| `USE_SQUARE_SANDBOX` | `true` | Production |
| `SQUARE_PRODUCTION_TOKEN` | `EAAAl1cr9vZhERNNLJXpZ1iNxBRnW-sL9vtvkBShEoolqsZG69tnmnlptGhl4BXj` | Production |
| `SQUARE_LOCATION_ID` | `LMV06M1ER6HCC` | Production |
| `SQUARE_SANDBOX_TOKEN` | `EAAAl-uQi9jcs2DbsPElJqTceFFKlfoyvZWsQbyMMHqhlnmX7dJzk9_UfMAs8rZW` | Production |
| `SQUARE_SANDBOX_APPLICATION_ID` | `sandbox-sq0idb-kSJsJFl3McesRc_oqx-pHQ` | Production |
| `SQUARE_ACCESS_TOKEN` | `EAAAl1cr9vZhERNNLJXpZ1iNxBRnW-sL9vtvkBShEoolqsZG69tnmnlptGhl4BXj` | Production |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | `xysLcWwihbVWY2OWBv-EXQ` | Production |

---

## 📦 Shipping Configuration (Shippo)

| Variable | Value | Environment |
|----------|-------|-------------|
| `SHIPPO_API_KEY` | `shippo_test_f48af1270bac0e03515781c1b20e301454dc95bc` | Production |
| `SHIPPING_ORIGIN_EMAIL` | `james@destinosf.com` | Production |
| `SHIPPING_ORIGIN_NAME` | `Destino SF` | Production |
| `SHIPPING_ORIGIN_STREET1` | `103 Horne Ave` | Production |
| `SHIPPING_ORIGIN_CITY` | `San Francisco` | Production |
| `SHIPPING_ORIGIN_STATE` | `CA` | Production |
| `SHIPPING_ORIGIN_ZIP` | `94124` | Production |
| `SHIPPING_ORIGIN_PHONE` | `555-555-5555` | Production |

---

## 📧 Email Configuration (Resend)

| Variable | Value | Environment |
|----------|-------|-------------|
| `SHOP_NAME` | `Destino SF` | Production |
| `FROM_EMAIL` | `system@updates.destinosf.com` | Production |
| `ADMIN_EMAIL` | `james@destinosf.com` | Production |
| `SUPPORT_EMAIL` | `info@destinosf.com` | Production |
| `RESEND_API_KEY` | `re_placeholder_key_for_testing` | Production |

---

## 🔒 Security & Authentication

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXTAUTH_URL` | `https://development.destinosf.com` | Production |
| `NEXTAUTH_SECRET` | `LLW/4LOOsQc3JIDuzbf30hI30xebuPoM0FcSp6Sfyyk=` | Production |

---

## 🔧 Optional Flags

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_TELEMETRY_DISABLED` | `1` | Production |

---

## 📋 Notas Importantes

1. **URLs Corregidas**: Todas las URLs ahora apuntan a `https://development.destinosf.com`
2. **Square Híbrido**: Configurado para usar catálogo de producción pero transacciones en sandbox
3. **NEXTAUTH_SECRET**: Generado automáticamente con alta seguridad
4. **Environment**: Todas las variables están configuradas para "Production" environment en Vercel

## 🔧 Próximos Pasos

1. **Agregar dominio personalizado** en Vercel Dashboard
2. **Configurar Supabase** con las nuevas URLs:
   - Site URL: `https://development.destinosf.com`
   - Redirect URLs: `https://development.destinosf.com/auth/callback`
3. **Deployar**: `vercel --prod`
4. **Verificar**: `vercel env ls` 