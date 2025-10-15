# Master Fix Planning Template v2.0 - UPDATED

## TypeScript/Next.js/PostgreSQL Full Stack Development

### Prisma Prepared Statement Connection Pool Issue Fix - Vercel Production

---

## 🎯 Feature/Fix Overview

**Name**: Prisma Prepared Statement Connection Pool Error Fix - Vercel Serverless Environment

**Type**: Bug Fix

**Priority**: Critical

**Estimated Complexity**: Medium (2-3 days) - Simplified from original estimate

**Sprint/Milestone**: HOTFIX-2025-Q3-SPRINT-1

### Problem Statement

Production application on Vercel experiencing critical Prisma client errors with prepared statements ("prepared statement does not exist" and "prepared statement already exists") causing API failures across multiple endpoints including orders, spotlight picks, and catering orders. The issue ONLY occurs in production (Vercel deployment) and NOT in local development. This indicates a specific incompatibility between Prisma's prepared statement caching and Supabase's connection pooler (pgBouncer) in transaction pooling mode on Vercel's serverless environment.

### Key Evidence

- **Local Development**: Working perfectly - no prepared statement errors
- **Vercel Production**: Consistent failures with error code "42P05" - "prepared statement s0 already exists"
- **Affected Routes**: `/account/order/[orderId]`, `/api/user/orders`, and related endpoints
- **Root Cause**: Serverless functions in Vercel create new Prisma instances that conflict with pgBouncer's transaction pooling mode

### Success Criteria

- [ ] Zero prepared statement errors in Vercel production logs
- [ ] Order detail pages load successfully (e.g., /account/order/[orderId])
- [ ] All affected API endpoints responding successfully (orders, spotlight-picks, webhooks)
- [ ] Database connection properly configured for Supabase pooler + Vercel serverless
- [ ] Solution maintains performance parity with local development
- [ ] No regression in local development environment

### Dependencies

- **Blocked by**: None (Critical production issue)
- **Blocks**: All order-related features, order detail pages, webhook processing
- **Related PRs/Issues**: Previous Prisma prepared statement fix (partially resolved)
- **Environment-specific**: Vercel serverless + Supabase pgBouncer transaction pooling

---

## 📋 Planning Phase - SIMPLIFIED APPROACH

### 1. Root Cause Analysis

The issue is a known incompatibility between:

- **Prisma's prepared statement caching**: Prisma uses prepared statements by default for performance
- **Supabase pgBouncer in transaction mode**: Each serverless invocation gets a different connection from the pool
- **Vercel's serverless functions**: Each invocation creates a new Prisma client instance

When a new serverless function starts, it tries to create prepared statements that may already exist from a previous invocation using the same pooled connection.

### 2. Solution Options (Ranked by Simplicity)

#### Option 1: Disable Prepared Statements (RECOMMENDED - Quick Fix)

```typescript
// This is the fastest solution with minimal code changes
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true&statement_cache_size=0',
    },
  },
});
```

#### Option 2: Use Direct Connection URL for Vercel

```typescript
// Use direct connection (bypassing pooler) with connection limits
const databaseUrl =
  process.env.NODE_ENV === 'production'
    ? process.env.DIRECT_DATABASE_URL // Supabase direct connection
    : process.env.DATABASE_URL; // Local/pooled connection

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});
```

#### Option 3: Implement Prisma Data Proxy (More Complex)

- Requires setting up Prisma Data Proxy
- Adds latency but handles connection pooling properly
- More suitable for long-term scaling

### 3. Implementation Plan (Option 1 - Quick Fix)

#### Step 1: Update Prisma Client Configuration

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Detect Vercel environment
const isVercel = process.env.VERCEL === '1';

// Build connection string with proper parameters
function getDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL not defined');

  // For Vercel production, add pgBouncer compatibility parameters
  if (isVercel && process.env.NODE_ENV === 'production') {
    const url = new URL(baseUrl);
    // Disable prepared statements for pgBouncer compatibility
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('statement_cache_size', '0');
    // Optional: Set pool timeout
    url.searchParams.set('pool_timeout', '60');
    return url.toString();
  }

  return baseUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Ensure proper cleanup in serverless environment
if (isVercel) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
```

#### Step 2: Environment Variables Update

```bash
# .env.production (Vercel)
DATABASE_URL="postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://[user]:[password]@[host]:5432/postgres" # Fallback option

# Vercel-specific
VERCEL=1  # Automatically set by Vercel
```

#### Step 3: Add Connection Health Check

```typescript
// app/api/health/db/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as status`;

    // Check for prepared statement errors in recent logs
    const recentErrors = await prisma.$queryRaw`
      SELECT COUNT(*) as error_count 
      FROM pg_stat_activity 
      WHERE state = 'idle in transaction' 
      AND query LIKE '%prepared statement%'
    `.catch(() => ({ error_count: 0 }));

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: 'active',
      prepared_statement_errors: recentErrors.error_count || 0,
      environment: {
        isVercel: process.env.VERCEL === '1',
        nodeEnv: process.env.NODE_ENV,
        pgBouncer: process.env.DATABASE_URL?.includes('pgbouncer=true'),
      },
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

#### Step 4: Update Critical Routes with Error Handling

```typescript
// app/account/order/[orderId]/page.tsx
import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';

export default async function OrderPage({
  params
}: {
  params: { orderId: string }
}) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        items: true,
        user: true,
      }
    });

    if (!order) {
      notFound();
    }

    return <OrderDetails order={order} />;
  } catch (error) {
    // Log error with context
    console.error('Failed to fetch order:', {
      orderId: params.orderId,
      error: error.message,
      code: error.code
    });

    // Check if it's a prepared statement error
    if (error.code === '42P05' || error.code === '26000') {
      // Attempt one retry with a fresh connection
      try {
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));

        const order = await prisma.order.findUnique({
          where: { id: params.orderId },
          include: {
            items: true,
            user: true,
          }
        });

        if (!order) notFound();
        return <OrderDetails order={order} />;
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        throw retryError;
      }
    }

    throw error;
  }
}
```

### 4. Testing Strategy

#### Local Testing

```bash
# Test with pgBouncer parameters locally
DATABASE_URL="postgresql://localhost:5432/mydb?pgbouncer=true&statement_cache_size=0" npm run dev

# Verify no regression
npm run test
```

#### Staging Testing on Vercel

```bash
# Deploy to preview branch
vercel --env preview

# Run health check
curl https://preview-[deployment-id].vercel.app/api/health/db

# Test affected routes
curl https://preview-[deployment-id].vercel.app/api/user/orders
```

#### Production Deployment

```bash
# Deploy with monitoring
vercel --prod

# Monitor logs in real-time
vercel logs --follow

# Check for prepared statement errors
vercel logs | grep -i "prepared statement"
```

### 5. Monitoring & Rollback Plan

#### Monitoring Checklist

- [ ] Vercel Functions logs show no prepared statement errors
- [ ] Database health endpoint returns healthy status
- [ ] Order pages load within 2 seconds
- [ ] API response times remain under 500ms
- [ ] No increase in database connection errors

#### Rollback Procedure

If issues persist after deployment:

1. Revert to previous deployment in Vercel dashboard
2. Switch to DIRECT_DATABASE_URL temporarily
3. Implement Option 2 (direct connection with rate limiting)

### 6. Long-term Considerations

After the immediate fix is deployed and stable:

1. **Evaluate Prisma Accelerate**: Consider migrating to Prisma Accelerate for better serverless support
2. **Connection Pooling Strategy**: Assess whether to use Supabase's connection pooler or implement custom pooling
3. **Database Performance**: Monitor query performance without prepared statements
4. **Caching Layer**: Implement Redis caching to reduce database load

---

## 📊 Success Metrics

### Immediate (24 hours)

- Zero prepared statement errors in production
- All order pages loading successfully
- No customer complaints about order viewing

### Short-term (1 week)

- Database query performance within 10% of baseline
- API response times stable
- No memory leaks in serverless functions

### Long-term (1 month)

- Evaluate need for more sophisticated connection management
- Document lessons learned for future serverless deployments
- Consider architectural improvements for database access pattern

---

## 🚀 Quick Start Commands

```bash
# 1. Update Prisma client configuration
npm run generate

# 2. Test locally with production-like settings
DATABASE_URL="$DATABASE_URL?pgbouncer=true&statement_cache_size=0" npm run dev

# 3. Deploy to Vercel preview
vercel

# 4. Deploy to production
vercel --prod

# 5. Monitor production logs
vercel logs --follow | grep -E "(error|prepared statement|42P05|26000)"
```

---

This simplified approach focuses on the immediate fix needed to resolve the production issue, with Option 1 (disabling prepared statements) being the quickest and safest solution that can be deployed immediately.
