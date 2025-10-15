# 🚀 Production Enhancement Plan - Destino SF (Updated)

## 📊 Current State Analysis

Based on the codebase analysis, your application shows:

### ✅ **Strengths**

- **Modern Stack**: Next.js 15.5.3 with React 19.1.0
- **Database**: Prisma ORM with PostgreSQL (production DB configured)
- **Payment Integration**: Square SDK v42.3.0 with hybrid sandbox/production setup
- **Monitoring**: Sentry integration configured
- **Testing**: Comprehensive test suite with 40+ test scripts
- **Caching**: Upstash Redis configured for rate limiting
- **Email**: Resend API integrated

### ⚠️ **Critical Issues Identified**

1. **Environment Configuration Mismatch**
   - Production `.env.production` still points to development database
   - Mixed Square environments (sandbox for transactions)
2. **Missing Migrations**
   - Multiple migrations since January 2025 need verification
   - No rollback scripts for recent migrations

3. **Security Concerns**
   - Need to verify all dependencies are up to date
   - Rate limiting bypassed in production (`BYPASS_RATE_LIMIT=true`)

## 🎯 **Priority Enhancement Plan**

### **Phase 1: Pre-Production Critical Fixes** 🔴

**Timeline: Immediate (1-2 days)**
**Priority: CRITICAL - Must complete before production**

#### 1.1 Environment Configuration Fix

```typescript
// Fix .env.production immediately
DATABASE_URL =
  'postgresql://postgres.ocusztulyiegeawqptrs:[PROD_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
DIRECT_DATABASE_URL =
  'postgresql://postgres.ocusztulyiegeawqptrs:[PROD_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

// Update Supabase to production
NEXT_PUBLIC_SUPABASE_URL = 'https://ocusztulyiegeawqptrs.supabase.co';
NEXT_PUBLIC_SUPABASE_ANON_KEY = '[PRODUCTION_ANON_KEY]';

// Switch Square to production
SQUARE_ENVIRONMENT = production;
SQUARE_CATALOG_USE_PRODUCTION = true;
SQUARE_TRANSACTIONS_USE_SANDBOX = false; // Change to false for production
USE_SQUARE_SANDBOX = false;

// Enable rate limiting
BYPASS_RATE_LIMIT = false;
```

#### 1.2 Database Migration Verification

```bash
# Check migration status
pnpm prisma migrate status

# Apply any pending migrations
pnpm prisma migrate deploy

# Create rollback scripts for each migration
for migration in prisma/migrations/*/; do
  echo "Creating rollback for $migration"
  # Generate down.sql files
done
```

#### 1.3 Security Patches

```bash
# Update dependencies
pnpm update
pnpm audit fix

# Specifically update if needed
pnpm add axios@latest form-data@latest
```

### **Phase 2: Enhanced Monitoring & Observability** 🟡

**Timeline: 2-3 days**
**Priority: HIGH - Deploy with or shortly after launch**

#### 2.1 Comprehensive Health Checks

Create `/src/app/api/health/comprehensive/route.ts`:

```typescript
export async function GET() {
  const checks = {
    // Database health with connection pool stats
    database: await checkDatabaseHealth(),

    // Square API health
    payments: await checkSquareHealth(),

    // Redis cache health
    cache: await checkRedisHealth(),

    // Email service health
    email: await checkResendHealth(),

    // Critical business metrics
    business: {
      pendingOrders: await countPendingOrders(),
      failedPayments: await countFailedPayments(),
      activeCart: await countActiveCarts(),
    },

    // Performance metrics
    performance: {
      avgResponseTime: await getAvgResponseTime(),
      errorRate: await getErrorRate(),
      throughput: await getThroughput(),
    },
  };

  return NextResponse.json(checks);
}
```

#### 2.2 Enhanced Error Tracking

Update Sentry configuration:

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [new Sentry.Integrations.Prisma({ client: prisma }), new ProfilingIntegration()],
  beforeSend(event, hint) {
    // Filter sensitive data
    return filterSensitiveData(event);
  },
});
```

#### 2.3 Performance Monitoring

Create `/src/lib/monitoring/performance.ts`:

```typescript
export class PerformanceMonitor {
  private metrics = new Map<string, Metric[]>();

  async trackDatabaseQuery(query: string, duration: number) {
    // Track slow queries
    if (duration > 100) {
      await this.logSlowQuery(query, duration);
    }
  }

  async trackAPICall(endpoint: string, duration: number, status: number) {
    // Track API performance
    this.recordMetric('api', { endpoint, duration, status });
  }

  getP95ResponseTime(): number {
    // Calculate 95th percentile
  }
}
```

### **Phase 3: Payment System Hardening** 🟡

**Timeline: 2-3 days**
**Priority: HIGH - Critical for business operations**

#### 3.1 Payment Resilience

Update `/src/lib/square/payments-api.ts`:

```typescript
export class ResilientPaymentProcessor {
  private readonly maxRetries = 3;
  private readonly retryDelay = [1000, 2000, 4000];

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Add idempotency key
        const idempotencyKey = generateIdempotencyKey(request);

        // Process with timeout
        const result = await this.processWithTimeout(request, idempotencyKey);

        // Log success metrics
        await this.logPaymentMetrics(result, attempt);

        return result;
      } catch (error) {
        lastError = error;
        await this.handlePaymentError(error, attempt);

        if (!this.shouldRetry(error)) {
          throw error;
        }

        await this.delay(this.retryDelay[attempt]);
      }
    }

    // After all retries failed
    await this.alertPaymentFailure(request, lastError);
    throw lastError;
  }
}
```

#### 3.2 Webhook Reliability

Update webhook processing:

```typescript
// src/app/api/webhooks/square/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('x-square-signature');
  const body = await req.text();

  // Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Process with retry queue
  await webhookQueue.add({
    type: 'square_webhook',
    payload: JSON.parse(body),
    retries: 0,
    maxRetries: 5,
  });

  // Return immediately to avoid timeout
  return new Response('Accepted', { status: 202 });
}
```

### **Phase 4: Database Performance** 🟢

**Timeline: 3-4 days**
**Priority: MEDIUM - Can be done post-launch**

#### 4.1 Query Optimization

Create missing indexes:

```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_orders_user_id_created_at
  ON orders(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_products_category_active
  ON products(category_id, active)
  WHERE active = true;

CREATE INDEX CONCURRENTLY idx_cart_items_session_product
  ON cart_items(session_id, product_id);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_orders_pending
  ON orders(status, created_at)
  WHERE status = 'PENDING';
```

#### 4.2 Connection Pool Optimization

Update Prisma configuration:

```typescript
// src/lib/db-unified.ts
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'minimal',
});

// Connection pool settings in DATABASE_URL
// Add: ?connection_limit=20&pool_timeout=20
```

### **Phase 5: User Experience Enhancements** 🟢

**Timeline: 1 week post-launch**
**Priority: MEDIUM**

#### 5.1 Progressive Web App

Create `/public/manifest.json`:

```json
{
  "name": "Destino SF",
  "short_name": "Destino",
  "description": "Authentic Handcrafted Empanadas & Alfajores",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

#### 5.2 Service Worker for Offline

Create `/public/sw.js`:

```javascript
const CACHE_NAME = 'destino-v1';
const urlsToCache = [
  '/',
  '/menu',
  '/offline.html',
  // Critical assets
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
```

### **Phase 6: Operational Excellence** 🟢

**Timeline: 2 weeks post-launch**
**Priority: MEDIUM**

#### 6.1 Admin Dashboard Enhancement

Create `/src/app/admin/dashboard/page.tsx`:

```typescript
export default async function AdminDashboard() {
  const metrics = await getBusinessMetrics();

  return (
    <DashboardLayout>
      <MetricCards>
        <RevenueCard value={metrics.revenue} />
        <OrdersCard value={metrics.orders} />
        <ConversionCard value={metrics.conversion} />
        <InventoryCard value={metrics.inventory} />
      </MetricCards>

      <Charts>
        <SalesChart data={metrics.salesHistory} />
        <ProductPerformance data={metrics.topProducts} />
      </Charts>

      <RecentActivity>
        <OrdersList orders={metrics.recentOrders} />
        <AlertsList alerts={metrics.alerts} />
      </RecentActivity>
    </DashboardLayout>
  );
}
```

## 📋 **Implementation Checklist**

### **Week 1: Pre-Launch Critical** ⚠️

- [ ] Fix production environment variables
- [ ] Apply all database migrations
- [ ] Create migration rollback scripts
- [ ] Update security vulnerabilities
- [ ] Enable rate limiting
- [ ] Test Square production integration
- [ ] Configure production Supabase
- [ ] Set up comprehensive health checks
- [ ] Test backup and restore procedures

### **Week 2: Launch & Monitoring** 🚀

- [ ] Deploy to production
- [ ] Monitor error rates (target < 0.1%)
- [ ] Track payment success rate (target > 98%)
- [ ] Monitor response times (target P95 < 500ms)
- [ ] Set up alerting thresholds
- [ ] Daily backup verification
- [ ] Customer support preparation

### **Week 3-4: Optimization** 📈

- [ ] Implement query optimizations
- [ ] Add missing database indexes
- [ ] Set up CDN for static assets
- [ ] Implement image optimization
- [ ] Add PWA features
- [ ] Enhance admin dashboard
- [ ] A/B testing framework

## 🚨 **Critical Pre-Launch Tasks**

### **Must Complete Before Launch**

1. **Environment Variables**: Update `.env.production` with correct database
2. **Square Integration**: Switch to production mode for payments
3. **Database Migrations**: Apply all pending migrations
4. **Security**: Patch vulnerabilities and enable rate limiting
5. **Monitoring**: Set up Sentry alerts and health checks
6. **Backup**: Test backup and restore procedures

### **Launch Day Checklist**

```bash
# 1. Verify environment
pnpm run validate-db

# 2. Run migrations
pnpm prisma migrate deploy

# 3. Test critical paths
pnpm test:critical
pnpm test:payments
pnpm test:orders

# 4. Build and deploy
pnpm build
vercel --prod

# 5. Verify deployment
curl https://destinosf.com/api/health/detailed
```

## 📊 **Success Metrics**

### **Technical KPIs**

- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%
- **P95 Response Time**: < 500ms
- **Database Query Time**: < 100ms P95
- **Payment Success Rate**: > 98%

### **Business KPIs**

- **Cart Conversion**: > 85%
- **Order Completion**: > 95%
- **Customer Support Tickets**: < 2% of orders
- **Average Order Value**: Track baseline
- **Return Customer Rate**: > 30%

## 🔄 **Rollback Plan**

```bash
# If critical issues arise:
1. vercel rollback  # Revert to previous deployment
2. pnpm prisma migrate reset  # Rollback database if needed
3. Update environment variables to previous values
4. Notify team and customers of temporary maintenance
```

This plan is specifically tailored to your codebase and addresses the immediate needs for production deployment while setting up a roadmap for continuous improvement.
