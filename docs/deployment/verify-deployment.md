# Deployment Verification Checklist

## Pre-Deployment Steps

1. **Update Vercel Environment Variables:**

   ```bash
   DATABASE_URL=postgresql://postgres.avfiuivgvkgaovkqjnup:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=15&sslmode=require

   DIRECT_URL=postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres?sslmode=require
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

## Post-Deployment Verification

3. **Test Health Endpoint:**

   ```bash
   curl https://your-domain.vercel.app/api/health/db
   ```

   Expected response:

   ```json
   {
     "status": "healthy",
     "database": {
       "connected": true,
       "latency": "200ms"
     },
     "environment": {
       "node_env": "production",
       "vercel_env": "production",
       "has_database_url": true,
       "has_direct_url": true,
       "database_host": "aws-0-us-east-1.pooler.supabase.com"
     }
   }
   ```

4. **Test Key Functionality:**
   - [ ] Webhook endpoints work
   - [ ] Order creation works
   - [ ] Product sync works
   - [ ] No "Can't reach database server" errors in logs

5. **Monitor Logs:**
   ```bash
   vercel logs --follow
   ```

## Troubleshooting

If issues persist:

- Check Vercel function logs
- Verify environment variables in Vercel dashboard
- Ensure Supabase connection pooling is enabled
- Consider increasing timeout values
