# 🚨 URGENT: Database Connection Fix for Destino SF

## Problem
Your production webhook is failing with this error:
```
Can't reach database server at `aws-0-us-east-1.pooler.supabase.com:6543`
```

## Root Cause
- Your code expects a **pooled connection** (aws-0-us-east-1.pooler.supabase.com:6543)
- Your environment variables have a **direct connection** (db.avfiuivgvkgaovkqjnup.supabase.co:5432)

## IMMEDIATE FIX (Choose One Method)

### Method 1: Vercel Dashboard (Recommended)
1. Go to: https://vercel.com/ready-sets-projects/destino-sf/settings/environment-variables
2. Find `DATABASE_URL` and click Edit
3. Update Production value to:
   ```
   postgresql://postgres:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
4. Find `DIRECT_URL` and click Edit (or Add if missing)
5. Update Production value to:
   ```
   postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres
   ```
6. Click "Save"
7. Redeploy your app

### Method 2: Vercel CLI Commands
Run these commands one by one:

```bash
cd /Users/ealanis/Development/current-projects/destino-sf

# Remove old DATABASE_URL
npx vercel env rm DATABASE_URL production

# Add correct pooled DATABASE_URL (use YOUR actual connection string)
npx vercel env add DATABASE_URL production

# When prompted, paste: postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Remove old DIRECT_URL  
npx vercel env rm DIRECT_URL production

# Add correct DIRECT_URL
npx vercel env add DIRECT_URL production

# When prompted, paste: postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres

# Deploy
vercel --prod
```

## Why This Fixes The Issue

### Before (❌ Broken)
- **Environment**: `DATABASE_URL="postgresql://...@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres"`
- **Code Expects**: Connection to pooler at `aws-0-us-east-1.pooler.supabase.com:6543`
- **Result**: "Can't reach database server" error

### After (✅ Fixed)
- **Environment**: `DATABASE_URL="postgresql://...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"`
- **Code Gets**: Correct pooled connection
- **Result**: Webhook works properly

## Additional Improvements Made

1. **Enhanced Prisma Schema**: Added `directUrl` support for better connection handling
2. **Improved Error Handling**: Better logging for connection issues in webhooks
3. **Health Check Endpoint**: Added `/api/health` to monitor database connectivity
4. **Connection Resilience**: Enhanced database client with retry logic

## Testing After Fix

1. **Health Check**: Visit `https://your-domain.vercel.app/api/health`
2. **Webhook Test**: Trigger a Square webhook and check logs
3. **Monitor Logs**: Check Vercel function logs for any remaining issues

## Connection Types Explained

| Connection Type | Use Case | URL Format |
|----------------|----------|------------|
| **Pooled** | Production apps, webhooks | `aws-0-us-east-1.pooler.supabase.com:6543` |
| **Direct** | Migrations, admin tasks | `db.avfiuivgvkgaovkqjnup.supabase.co:5432` |

The pooled connection handles high traffic and concurrent requests better, which is perfect for your webhook processing.

## Next Steps After Fix

1. **Monitor**: Watch your webhook logs for 24 hours
2. **Performance**: The pooled connection should improve response times
3. **Scale**: This setup can handle more concurrent webhook requests

---

**Priority**: 🔴 CRITICAL - Fix immediately to restore webhook functionality
**Impact**: All Square payment webhooks are currently failing
**ETA**: 5-10 minutes to implement the fix









