# Master Fix Planning: Webhook Timeout Issue on Vercel

## 🎯 Feature/Fix Overview

**Name**: Square Webhook Timeout & Database Connection Fix

**Type**: Bug Fix / Performance

**Priority**: Critical

**Estimated Complexity**: Medium (3-5 days)

**Sprint/Milestone**: Hotfix Q4 2024

### Problem Statement
Square webhooks are experiencing extreme slowness (107-157 seconds) and timeouts on Vercel production, causing payment status updates to fail. The issue does not occur locally, indicating a serverless/connection pooling problem specific to the Vercel environment.

### Success Criteria
- [ ] Webhook processing completes within 10 seconds on Vercel
- [ ] Payment status updates (`PENDING` → `PAID`) work reliably
- [ ] Order status transitions (`PENDING` → `CONFIRMED`) happen automatically
- [ ] No database connection timeouts (P1008 errors)
- [ ] No phantom $0.00 orders created
- [ ] Connection pool doesn't get exhausted

### Dependencies
- **Blocked by**: None
- **Blocks**: Payment processing, order fulfillment
- **Related Issues**: Database connection pooling, Supabase pgbouncer compatibility

---

## 🔍 Root Cause Analysis

### Identified Issues

1. **Connection Pool Exhaustion**
   - Webhooks are holding database connections for too long (120+ seconds)
   - Vercel serverless functions have limited connection capacity
   - No proper connection release in error scenarios

2. **Async Processing Architecture Flaw**
   - The async webhook processing isn't truly async
   - Still holding HTTP connections while processing
   - Square expects <1 second acknowledgment

3. **Database Query Performance**
   - Missing indexes on frequently queried fields
   - Unoptimized queries in webhook handlers
   - No query timeout limits

4. **Concurrency Control**
   - Multiple webhooks processing simultaneously
   - No rate limiting on database operations
   - Connection pool thrashing

---

## 📋 Implementation Plan

### Phase 1: Immediate Fixes (Day 1)

#### 1.1 Fix Async Webhook Processing

```typescript
// src/app/api/webhooks/square/route.ts

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Step 1: Read body once
    const bodyText = await request.text();
    
    // Step 2: Validate webhook signature (quick)
    const isValid = await quickValidation(bodyText);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }
    
    // Step 3: Parse payload
    const payload = JSON.parse(bodyText);
    
    // Step 4: Store in queue for processing
    await storeWebhookInQueue(payload);
    
    // Step 5: Return immediate acknowledgment
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Always return 200 to prevent Square retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// New queue-based processor (runs separately)
async function storeWebhookInQueue(payload: any): Promise<void> {
  // Store in database queue table
  await prisma.webhookQueue.create({
    data: {
      eventId: payload.event_id,
      eventType: payload.type,
      payload: payload,
      status: 'PENDING',
      createdAt: new Date(),
    }
  });
  
  // Trigger async processing (don't await)
  processQueuedWebhook(payload.event_id).catch(console.error);
}
```

#### 1.2 Add Database Queue Table

```sql
-- migrations/add_webhook_queue.sql
CREATE TABLE webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  INDEX idx_webhook_queue_status (status),
  INDEX idx_webhook_queue_created (created_at),
  INDEX idx_webhook_queue_event_id (event_id)
);
```

### Phase 2: Connection Optimization (Day 1-2)

#### 2.1 Optimize Database Connection Pool

```typescript
// src/lib/db-optimized.ts

import { PrismaClient } from '@prisma/client';

// Singleton with connection pooling optimization
class OptimizedPrismaClient {
  private static instance: PrismaClient;
  private static connectionCount = 0;
  private static lastActivity = Date.now();
  
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = this.createClient();
      this.startConnectionMonitor();
    }
    
    this.lastActivity = Date.now();
    return this.instance;
  }
  
  private static createClient(): PrismaClient {
    const url = new URL(process.env.DATABASE_URL!);
    
    // Vercel-specific optimizations
    if (process.env.VERCEL) {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('connection_limit', '1'); // Single connection per function
      url.searchParams.set('pool_timeout', '10'); // 10 second timeout
      url.searchParams.set('statement_timeout', '5000'); // 5 second query timeout
    }
    
    return new PrismaClient({
      datasources: { db: { url: url.toString() } },
      log: ['error', 'warn'],
    });
  }
  
  private static startConnectionMonitor(): void {
    // Auto-disconnect after 5 seconds of inactivity
    setInterval(() => {
      if (Date.now() - this.lastActivity > 5000) {
        this.instance.$disconnect().catch(console.error);
      }
    }, 5000);
  }
  
  static async withConnection<T>(
    operation: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.getInstance();
    try {
      this.connectionCount++;
      return await operation(client);
    } finally {
      this.connectionCount--;
      if (this.connectionCount === 0) {
        // Disconnect immediately when no active operations
        await client.$disconnect();
      }
    }
  }
}

export const prismaOptimized = OptimizedPrismaClient.getInstance();
export const withConnection = OptimizedPrismaClient.withConnection;
```

#### 2.2 Implement Query Optimization

```typescript
// src/lib/webhook-queries.ts

// Optimized queries for webhook processing
export const webhookQueries = {
  // Use select to minimize data transfer
  findCateringOrderForPayment: (squareOrderId: string) => 
    prisma.cateringOrder.findUnique({
      where: { squareOrderId },
      select: {
        id: true,
        paymentStatus: true,
        status: true,
      }
    }),
  
  // Batch updates to reduce round trips
  updatePaymentStatus: async (updates: Array<{id: string, status: string}>) => {
    const queries = updates.map(u => 
      prisma.order.update({
        where: { id: u.id },
        data: { paymentStatus: u.status }
      })
    );
    return prisma.$transaction(queries);
  },
  
  // Use raw queries for complex operations
  checkOrderExists: (squareOrderId: string) =>
    prisma.$queryRaw<{exists: boolean}[]>`
      SELECT EXISTS(
        SELECT 1 FROM "Order" WHERE "squareOrderId" = ${squareOrderId}
        UNION ALL
        SELECT 1 FROM "CateringOrder" WHERE "squareOrderId" = ${squareOrderId}
      ) as exists
    `
};
```

### Phase 3: Queue Processing System (Day 2-3)

#### 3.1 Background Queue Processor

```typescript
// src/lib/webhook-processor.ts

export class WebhookProcessor {
  private processing = false;
  private readonly maxConcurrent = 2; // Process 2 at a time
  private activeProcessing = 0;
  
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    
    try {
      while (this.processing) {
        if (this.activeProcessing >= this.maxConcurrent) {
          await this.sleep(1000);
          continue;
        }
        
        // Get next pending webhook
        const webhook = await this.getNextWebhook();
        if (!webhook) {
          await this.sleep(5000); // Wait 5 seconds if queue empty
          continue;
        }
        
        // Process without blocking
        this.processWebhook(webhook).catch(console.error);
      }
    } finally {
      this.processing = false;
    }
  }
  
  private async getNextWebhook() {
    return prisma.webhookQueue.findFirst({
      where: {
        status: 'PENDING',
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
  
  private async processWebhook(webhook: any): Promise<void> {
    this.activeProcessing++;
    
    try {
      // Mark as processing
      await prisma.webhookQueue.update({
        where: { id: webhook.id },
        data: { 
          status: 'PROCESSING',
          lastAttemptAt: new Date(),
          attempts: { increment: 1 }
        }
      });
      
      // Process with timeout
      await this.processWithTimeout(webhook.payload, 30000);
      
      // Mark as completed
      await prisma.webhookQueue.update({
        where: { id: webhook.id },
        data: { 
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
    } catch (error) {
      // Mark as failed
      await prisma.webhookQueue.update({
        where: { id: webhook.id },
        data: { 
          status: webhook.attempts >= 4 ? 'FAILED' : 'PENDING',
          errorMessage: (error as Error).message
        }
      });
    } finally {
      this.activeProcessing--;
    }
  }
  
  private async processWithTimeout(payload: any, timeout: number): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), timeout);
    });
    
    const processingPromise = this.handleWebhookPayload(payload);
    
    await Promise.race([processingPromise, timeoutPromise]);
  }
  
  private async handleWebhookPayload(payload: any): Promise<void> {
    // Your existing webhook handlers
    switch (payload.type) {
      case 'payment.updated':
        await this.handlePaymentUpdated(payload);
        break;
      // ... other cases
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 3.2 Vercel Cron Job for Queue Processing

```typescript
// src/app/api/cron/process-webhooks/route.ts

import { WebhookProcessor } from '@/lib/webhook-processor';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const processor = new WebhookProcessor();
  
  // Process for up to 55 seconds (leaving buffer)
  const timeout = setTimeout(() => {
    processor.stop();
  }, 55000);
  
  try {
    await processor.processQueue();
    clearTimeout(timeout);
    return Response.json({ processed: true });
  } catch (error) {
    clearTimeout(timeout);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-webhooks",
      "schedule": "* * * * *" // Every minute
    }
  ]
}
```

### Phase 4: Database Indexes (Day 3)

```sql
-- migrations/add_webhook_indexes.sql

-- Critical indexes for webhook queries
CREATE INDEX CONCURRENTLY idx_order_square_order_id 
  ON "Order"("squareOrderId") 
  WHERE "squareOrderId" IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_catering_order_square_order_id 
  ON "CateringOrder"("squareOrderId") 
  WHERE "squareOrderId" IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_payment_square_payment_id 
  ON "Payment"("squarePaymentId") 
  WHERE "squarePaymentId" IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_order_status_payment 
  ON "Order"("status", "paymentStatus") 
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY idx_catering_order_status_payment 
  ON "CateringOrder"("status", "paymentStatus");

-- Analyze tables for query planner
ANALYZE "Order";
ANALYZE "CateringOrder";
ANALYZE "Payment";
```

### Phase 5: Monitoring & Alerting (Day 4)

```typescript
// src/lib/webhook-monitoring.ts

interface WebhookMetrics {
  eventType: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export class WebhookMonitor {
  private static metrics: WebhookMetrics[] = [];
  
  static async track<T>(
    eventType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    let success = false;
    let error: string | undefined;
    
    try {
      const result = await operation();
      success = true;
      return result;
    } catch (err) {
      error = (err as Error).message;
      throw err;
    } finally {
      const duration = Date.now() - start;
      
      this.metrics.push({
        eventType,
        duration,
        success,
        error,
        timestamp: new Date()
      });
      
      // Alert if processing takes too long
      if (duration > 10000) {
        console.error(`⚠️ SLOW WEBHOOK: ${eventType} took ${duration}ms`);
        // Send alert to monitoring service
      }
      
      // Alert if error rate is high
      const recentErrors = this.metrics
        .filter(m => m.eventType === eventType)
        .filter(m => Date.now() - m.timestamp.getTime() < 300000) // Last 5 min
        .filter(m => !m.success);
      
      if (recentErrors.length > 5) {
        console.error(`🚨 HIGH ERROR RATE: ${eventType} has ${recentErrors.length} errors`);
        // Send critical alert
      }
    }
  }
  
  static getMetrics() {
    return {
      byType: this.groupByEventType(),
      slowest: this.getSlowestWebhooks(),
      errorRate: this.getErrorRate(),
    };
  }
  
  private static groupByEventType() {
    // Group and calculate averages by event type
    const grouped = new Map<string, {count: number, totalDuration: number, errors: number}>();
    
    for (const metric of this.metrics) {
      const existing = grouped.get(metric.eventType) || {count: 0, totalDuration: 0, errors: 0};
      existing.count++;
      existing.totalDuration += metric.duration;
      if (!metric.success) existing.errors++;
      grouped.set(metric.eventType, existing);
    }
    
    return Array.from(grouped.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgDuration: Math.round(data.totalDuration / data.count),
      errorRate: (data.errors / data.count * 100).toFixed(2) + '%'
    }));
  }
  
  private static getSlowestWebhooks() {
    return this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }
  
  private static getErrorRate() {
    const total = this.metrics.length;
    const errors = this.metrics.filter(m => !m.success).length;
    return total > 0 ? (errors / total * 100).toFixed(2) + '%' : '0%';
  }
}
```

### Phase 6: Environment Variables Update

```bash
# .env.production

# Database - Optimize for Vercel
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
DATABASE_POOL_URL="postgresql://user:pass@host:6543/db" # If using Supabase pooler

# Webhook Processing
WEBHOOK_PROCESSING_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=5
WEBHOOK_CONCURRENT_LIMIT=2

# Monitoring
ENABLE_WEBHOOK_MONITORING=true
SLOW_WEBHOOK_THRESHOLD=10000

# Cron
CRON_SECRET=your-secure-cron-secret
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// src/__tests__/lib/webhook-processor.test.ts

describe('WebhookProcessor', () => {
  it('should process webhooks within timeout', async () => {
    const processor = new WebhookProcessor();
    const startTime = Date.now();
    
    await processor.processWebhook({
      payload: mockPaymentPayload,
      timeout: 5000
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });
  
  it('should handle connection failures gracefully', async () => {
    // Mock connection failure
    jest.spyOn(prisma, '$connect').mockRejectedValue(new Error('Connection failed'));
    
    const processor = new WebhookProcessor();
    await expect(processor.processQueue()).resolves.not.toThrow();
  });
});
```

### Load Testing

```typescript
// scripts/load-test-webhooks.ts

async function loadTest() {
  const webhooks = Array.from({ length: 100 }, (_, i) => ({
    type: 'payment.updated',
    event_id: `test-${i}`,
    data: {
      id: `payment-${i}`,
      object: { /* payment data */ }
    }
  }));
  
  const results = await Promise.allSettled(
    webhooks.map(webhook => 
      fetch('https://your-app.vercel.app/api/webhooks/square', {
        method: 'POST',
        body: JSON.stringify(webhook),
        headers: { 'Content-Type': 'application/json' }
      })
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Success rate: ${successful}/${results.length}`);
}
```

---

## 🚀 Deployment & Rollback

### Deployment Steps

1. **Database Migration**
   ```bash
   # Run migrations first
   prisma migrate deploy
   
   # Create indexes (can be done live)
   psql $DATABASE_URL < migrations/add_webhook_indexes.sql
   ```

2. **Deploy to Preview**
   ```bash
   vercel --env preview
   # Test webhooks in preview environment
   ```

3. **Gradual Rollout**
   ```typescript
   // Use feature flag for gradual rollout
   const useNewWebhookSystem = process.env.USE_NEW_WEBHOOK_SYSTEM === 'true';
   
   if (useNewWebhookSystem) {
     await processWithQueue(payload);
   } else {
     await processDirectly(payload);
   }
   ```

4. **Monitor Metrics**
   - Watch webhook processing times
   - Monitor error rates
   - Check database connection pool usage

### Rollback Strategy

```typescript
// Quick rollback via environment variable
USE_NEW_WEBHOOK_SYSTEM=false

// Or revert to previous deployment
vercel rollback
```

---

## 📊 Success Metrics

### Before Fix
- Webhook processing time: 107-157 seconds
- Timeout rate: ~30%
- Connection errors: P1008 frequent
- Payment updates failing: Yes

### After Fix (Target)
- Webhook processing time: <5 seconds
- Timeout rate: <1%
- Connection errors: None
- Payment updates: 100% success

### Monitoring Dashboard

```typescript
// src/app/api/admin/webhook-metrics/route.ts

export async function GET() {
  const metrics = await prisma.webhookQueue.aggregate({
    _count: { _all: true },
    _avg: { processingTime: true },
    where: {
      createdAt: { gte: new Date(Date.now() - 86400000) } // Last 24h
    }
  });
  
  const byStatus = await prisma.webhookQueue.groupBy({
    by: ['status'],
    _count: { _all: true }
  });
  
  return Response.json({
    totalWebhooks: metrics._count._all,
    avgProcessingTime: metrics._avg.processingTime,
    statusBreakdown: byStatus,
    connectionPoolUsage: getConnectionPoolMetrics(),
  });
}
```

---

## 🔧 Additional Optimizations

### 1. Edge Function for Webhook Receipt
```typescript
// Use Edge Runtime for faster acknowledgment
export const runtime = 'edge';

export async function POST(request: Request) {
  // Quick acknowledgment from edge
  const body = await request.text();
  
  // Store in KV or queue service
  await env.WEBHOOK_QUEUE.put(eventId, body);
  
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 2. Database Connection Pooling Service
Consider using a connection pooling service like:
- PgBouncer (if self-hosted)
- Supabase Pooler (built-in with Supabase)
- Prisma Data Proxy

### 3. Webhook Deduplication
```typescript
// Prevent duplicate processing
const processed = await redis.get(`webhook:${eventId}`);
if (processed) {
  console.log(`Webhook ${eventId} already processed`);
  return;
}

await redis.setex(`webhook:${eventId}`, 3600, 'processed');
```

---

## 📋 Action Items

### Immediate (Day 1)
1. [ ] Implement async webhook acknowledgment
2. [ ] Add webhook queue table
3. [ ] Deploy connection pool optimization
4. [ ] Add basic monitoring

### Short-term (Week 1)
1. [ ] Complete queue processing system
2. [ ] Add all database indexes
3. [ ] Implement retry logic
4. [ ] Set up cron jobs

### Long-term (Month 1)
1. [ ] Move to Edge Functions
2. [ ] Implement webhook deduplication
3. [ ] Add comprehensive monitoring dashboard
4. [ ] Consider managed queue service (BullMQ, etc.)

---

## 🎯 Key Recommendations

1. **Immediate Fix**: Implement true async processing with immediate acknowledgment
2. **Connection Management**: Use single connection per serverless function
3. **Query Optimization**: Add indexes and use selective queries
4. **Monitoring**: Track every webhook for performance issues
5. **Gradual Rollout**: Use feature flags for safe deployment

This plan should resolve your webhook timeout issues on Vercel while maintaining reliability and performance.