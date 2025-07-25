# Fix Vercel Database Connection Issue

## ✅ CURRENT STATUS (Updated)

**COMPLETED:**
- ✅ Optimized database configuration in `src/lib/db.ts`
- ✅ Created health check endpoint at `/api/health/db`
- ✅ Verified local database connection works
- ✅ Connection test script confirms connectivity

**NEXT STEPS TO COMPLETE:**
1. **Update Vercel Environment Variables** (see recommended values below)
2. **Deploy to Vercel and test**

## 🚨 CRITICAL: Update Your Vercel Environment Variables

Your current environment variables are using direct connection instead of pooled connection. For Vercel deployment, update these:

```bash
# CURRENT (problematic for Vercel):
DATABASE_URL=postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres

# RECOMMENDED FOR VERCEL (pooled + optimized):
DATABASE_URL=postgresql://postgres.avfiuivgvkgaovkqjnup:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=15&sslmode=require

# DIRECT_URL (for migrations - keep as is):
DIRECT_URL=postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres?sslmode=require
```

**Key Changes:**
- Use `aws-0-us-east-1.pooler.supabase.com:6543` (pooled) instead of `db.avfiuivgvkgaovkqjnup.supabase.co:5432` (direct)
- Add `pgbouncer=true` for serverless optimization
- Add connection limits and timeouts
- Add `sslmode=require` for security

## Problem
The application works locally but fails in Vercel deployment with the error:
```
Can't reach database server at `aws-0-us-east-1.pooler.supabase.com:6543`
```

## Root Causes
1. **Connection Pooling Issues**: Supabase pooler might be timing out or rejecting connections from Vercel
2. **SSL/TLS Configuration**: Missing SSL parameters in the connection string
3. **Connection String Format**: Incorrect URL format for serverless environments
4. **IP Whitelisting**: Supabase might be blocking Vercel's IP addresses

## Solution Steps

### Step 1: Update Database URLs in Vercel Environment Variables

1. Go to your Vercel project settings
2. Navigate to "Settings" → "Environment Variables"
3. Update your database URLs with proper parameters:

```bash
# DATABASE_URL should use the pooler connection with proper parameters
DATABASE_URL="postgresql://[user]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=15&sslmode=require"

# DIRECT_URL should use the direct connection (non-pooled)
DIRECT_URL="postgresql://[user]:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require"

# ACTUAL KEYS: 
DATABASE_URL=postgresql://postgres.avfiuivgvkgaovkqjnup:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false

DIRECT_URL=postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres


```

Actual Supabase settings: 
# Direct connection

Ideal for applications with persistent, long-lived connections, such as those running on virtual machines or long-standing containers.

```bash
postgresql://postgres:[YOUR-PASSWORD]@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres
```

View parameters

Suitable for long-lived, persistent connections

Each client has a dedicated connection to Postgres

Not IPv4 compatibleUse Session Pooler if on a IPv4 network or purchase IPv4 add-on

[IPv4 add-on](https://supabase.com/dashboard/project/avfiuivgvkgaovkqjnup/settings/addons?panel=ipv4)[Pooler settings](https://supabase.com/dashboard/project/avfiuivgvkgaovkqjnup/settings/database#connection-pooling)

Some platforms are IPv4-only:

# Transaction pooler

Shared Pooler

Ideal for stateless applications like serverless functions where each interaction with Postgres is brief and isolated.

```bash
postgresql://postgres.avfiuivgvkgaovkqjnup:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Does not support PREPARE statements

View parameters

Suitable for a large number of connected clients

Pre-warmed connection pool to Postgres

IPv4 compatibleTransaction pooler connections are IPv4 proxied for free.

# Session pooler

Shared Pooler

Only recommended as an alternative to Direct Connection, when connecting via an IPv4 network.

```bash
postgresql://postgres.avfiuivgvkgaovkqjnup:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

View parameters

IPv4 compatibleSession pooler connections are IPv4 proxied for free

Only use on a IPv4 networkUse Direct Connection if connecting via an IPv6 network

### Step 2: Update Prisma Configuration

Update your `prisma/schema.prisma` to ensure it's properly configured:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Step 3: Create Optimized Database Connection for Vercel

Create a new file `src/lib/db-vercel.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Optimized Prisma configuration for Vercel/Serverless
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function for safe database operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error
      const isConnectionError = 
        error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("Connection terminated") ||
         (error as any).code === 'P1001');
      
      if (isConnectionError && i < maxRetries - 1) {
        console.log(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
```

### Step 4: Update Database Imports

Update all imports from `@/lib/db` to use the new optimized version:

```typescript
// In your webhook route and other API routes
import { prisma, withRetry } from '@/lib/db-vercel';

// Wrap database operations with retry logic
await withRetry(async () => {
  return await prisma.order.update({
    where: { squareOrderId: orderId },
    data: updateData,
  });
});
```

### Step 5: Add Connection Test Endpoint

Create `src/app/api/health/db/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db-vercel';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
```

### Step 6: Configure Vercel for Optimal Database Connections

Update `vercel.json`:

```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["sfo1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    },
    "src/app/api/webhooks/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=4096"
  }
}
```

### Step 7: Test and Deploy

1. **Test locally with production database URL**:
   ```bash
   # Create .env.local with production DATABASE_URL
   pnpm dev
   # Test the health endpoint
   curl http://localhost:3000/api/health/db
   ```

2. **Deploy to Vercel preview**:
   ```bash
   vercel --env preview
   ```

3. **Test the deployed health endpoint**:
   ```bash
   curl https://your-preview-url.vercel.app/api/health/db
   ```

### Step 8: Additional Supabase Configuration

If the issue persists:

1. **Check Supabase Connection Pooler Settings**:
   - Go to Supabase Dashboard → Settings → Database
   - Ensure "Connection Pooling" is enabled
   - Note both the "Connection string" (pooled) and "Direct connection string"

2. **Update Connection Pool Size**:
   - In Supabase Dashboard, adjust the pool size to handle Vercel's serverless nature
   - Recommended: Pool size = 15-25 for production

3. **Enable SSL Mode**:
   - Ensure `sslmode=require` is in your connection string
   - Some regions might require `sslmode=no-verify` (less secure)

### Step 9: Monitor and Debug

1. **Add detailed logging** to your webhook:
   ```typescript
   console.log('Database URL configured:', !!process.env.DATABASE_URL);
   console.log('Direct URL configured:', !!process.env.DIRECT_URL);
   console.log('Connection string prefix:', process.env.DATABASE_URL?.substring(0, 30));
   ```

2. **Use Vercel Functions Logs** to monitor:
   ```bash
   vercel logs --follow
   ```

### Step 10: Alternative Solutions

If connection issues persist:

1. **Use Supabase Edge Functions** for webhooks instead of Vercel
2. **Implement a queue system** (like Upstash) to handle webhook processing
3. **Use connection pooling service** like pgBouncer or Prisma Accelerate

## Verification Checklist

- [ ] DATABASE_URL includes `pgbouncer=true` parameter
- [ ] SSL mode is set to `require` or `no-verify`
- [ ] Connection timeout parameters are set
- [ ] Prisma client is properly configured for serverless
- [ ] Retry logic is implemented for database operations
- [ ] Health check endpoint confirms database connectivity
- [ ] Vercel environment variables match local setup
- [ ] Connection pooling is enabled in Supabase

## Common Pitfalls to Avoid

1. **Don't use transaction pooling** - Use session pooling for Prisma
2. **Don't create multiple Prisma instances** - Use singleton pattern
3. **Don't ignore connection errors** - Implement proper retry logic
4. **Don't use long-running connections** - Serverless requires quick connect/disconnect

## Next Steps

After implementing these changes:
1. Deploy to a preview branch first
2. Test all webhook endpoints thoroughly
3. Monitor logs for any connection errors
4. Gradually roll out to production

## Resources

- [Supabase Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [Prisma with Vercel Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Vercel Serverless Functions Best Practices](https://vercel.com/docs/functions/serverless-functions/runtimes#best-practices)
