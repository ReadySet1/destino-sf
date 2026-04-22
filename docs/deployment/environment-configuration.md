# Variables de Entorno para Vercel Dashboard

## 📋 Configuración para development.destinosf.com

**Copiar y pegar una por una en Vercel Dashboard → Settings → Environment Variables**

---

## 🔧 Next.js Configuration

| Variable               | Value                               | Environment |
| ---------------------- | ----------------------------------- | ----------- |
| `NODE_ENV`             | `production`                        | Production  |
| `NEXT_PUBLIC_SITE_URL` | `https://development.destinosf.com` | Production  |
| `NEXT_PUBLIC_APP_URL`  | `https://development.destinosf.com` | Production  |

---

## 🎨 Sanity CMS Configuration

| Variable                        | Value                                                                                                                                                                                  | Environment |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `xdajqttf`                                                                                                                                                                             | Production  |
| `NEXT_PUBLIC_SANITY_DATASET`    | `production`                                                                                                                                                                           | Production  |
| `NEXT_PUBLIC_SANITY_API_TOKEN`  | `<SANITY_API_TOKEN>` | Production  |
| `SANITY_API_TOKEN`              | `<SANITY_API_TOKEN>` | Production  |

---

## 🏪 Supabase Configuration

| Variable                        | Value                                                                                                                                                                                                                         | Environment |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://<PROJECT_REF>.supabase.co`                                                                                                                                                                                           | Production  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<SUPABASE_ANON_KEY>`                                                                                                                                                                                                         | Production  |
| `SUPABASE_SERVICE_ROLE_KEY`     | `<SUPABASE_SERVICE_ROLE_KEY>`                                                                                                                                                                                                 | Production  |

---

## 🗄️ Database Configuration

| Variable       | Value                                                                                      | Environment |
| -------------- | ------------------------------------------------------------------------------------------ | ----------- |
| `DATABASE_URL` | `postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres` | Production  |
| `DIRECT_URL`   | `postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres` | Production  |

---

## 💳 Square Payment Configuration (Hybrid Mode)

| Variable                          | Value                                                              | Environment |
| --------------------------------- | ------------------------------------------------------------------ | ----------- |
| `SQUARE_ENVIRONMENT`              | `sandbox`                                                          | Production  |
| `SQUARE_CATALOG_USE_PRODUCTION`   | `true`                                                             | Production  |
| `SQUARE_TRANSACTIONS_USE_SANDBOX` | `true`                                                             | Production  |
| `USE_SQUARE_SANDBOX`              | `true`                                                             | Production  |
| `SQUARE_PRODUCTION_TOKEN`         | `<SQUARE_PRODUCTION_TOKEN>`                                        | Production  |
| `SQUARE_LOCATION_ID`              | `<SQUARE_LOCATION_ID>`                                             | Production  |
| `SQUARE_SANDBOX_TOKEN`            | `<SQUARE_SANDBOX_TOKEN>`                                           | Production  |
| `SQUARE_SANDBOX_APPLICATION_ID`   | `<SQUARE_SANDBOX_APPLICATION_ID>`                                  | Production  |
| `SQUARE_ACCESS_TOKEN`             | `<SQUARE_PRODUCTION_TOKEN>`                                        | Production  |
| `SQUARE_WEBHOOK_SECRET`           | `<SQUARE_WEBHOOK_SECRET>`                                          | Production  |
| `SQUARE_WEBHOOK_SECRET_SANDBOX`   | `<SQUARE_WEBHOOK_SECRET>`                                          | Production  |

---

## 📦 Shipping Configuration (Shippo)

| Variable                  | Value                                                  | Environment |
| ------------------------- | ------------------------------------------------------ | ----------- |
| `SHIPPO_API_KEY`          | `<SHIPPO_API_KEY>`                                     | Production  |
| `SHIPPING_ORIGIN_EMAIL`   | `james@destinosf.com`                                  | Production  |
| `SHIPPING_ORIGIN_NAME`    | `Destino SF`                                           | Production  |
| `SHIPPING_ORIGIN_STREET1` | `103 Horne Ave`                                        | Production  |
| `SHIPPING_ORIGIN_CITY`    | `San Francisco`                                        | Production  |
| `SHIPPING_ORIGIN_STATE`   | `CA`                                                   | Production  |
| `SHIPPING_ORIGIN_ZIP`     | `94124`                                                | Production  |
| `SHIPPING_ORIGIN_PHONE`   | `555-555-5555`                                         | Production  |

---

## 📧 Email Configuration (Resend)

| Variable         | Value                            | Environment |
| ---------------- | -------------------------------- | ----------- |
| `SHOP_NAME`      | `Destino SF`                     | Production  |
| `FROM_EMAIL`     | `system@updates.destinosf.com`   | Production  |
| `ADMIN_EMAIL`    | `james@destinosf.com`            | Production  |
| `SUPPORT_EMAIL`  | `info@destinosf.com`             | Production  |
| `RESEND_API_KEY` | `re_placeholder_key_for_testing` | Production  |

---

## 🔒 Security & Authentication

| Variable          | Value                                          | Environment |
| ----------------- | ---------------------------------------------- | ----------- |
| `NEXTAUTH_URL`    | `https://development.destinosf.com`            | Production  |
| `NEXTAUTH_SECRET` | `LLW/4LOOsQc3JIDuzbf30hI30xebuPoM0FcSp6Sfyyk=` | Production  |

---

## 🔧 Optional Flags

| Variable                  | Value | Environment |
| ------------------------- | ----- | ----------- |
| `NEXT_TELEMETRY_DISABLED` | `1`   | Production  |

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
