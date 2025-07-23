Based on the investigation, here are the exact values you need to manually set in Vercel:

## DATABASE_URL (Transaction Pooler - for webhooks and serverless functions):

```
postgresql://postgres.avfiuivgvkgaovkqjnup:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## DIRECT_URL (Direct connection - for migrations and admin tasks):

```
postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres
```

## To set these manually in Vercel:

1. Go to your Vercel dashboard
2. Navigate to your `destino-sf` project
3. Go to Settings → Environment Variables
4. Add/update these environment variables for **Production**:

- **Variable Name:** `DATABASE_URL`
- **Value:** `postgresql://postgres.avfiuivgvkgaovkqjnup:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

- **Variable Name:** `DIRECT_URL`
- **Value:** `postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres`

After setting these, deploy your project again with:

```bash
vercel --prod
```

The key differences in the correct format:

- **PROJECT_REF:** `avfiuivgvkgaovkqjnup` (your actual project ID)
- **REGION:** `us-east-1` (your project's region)
- **PASSWORD:** `83Ny4skXhAPxp3jL` (your database password)
- **PORT 6543:** For the pooled connection (webhooks/serverless)
- **PORT 5432:** For direct connection (migrations)

These should resolve the "FATAL: Tenant or user not found" error you're experiencing.
