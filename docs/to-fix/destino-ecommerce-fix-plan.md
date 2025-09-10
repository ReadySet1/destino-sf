# 🚨 Destino SF - Critical eCommerce System Fix & Prevention Plan

## Executive Summary

Your Square webhook system is experiencing **critical failures** that are preventing proper order processing and payment handling. The logs show:

- **Database connection failures** ("Engine is not yet connected", "Response from the Engine was empty")
- **Missing webhook signatures** (bypassing security validation)
- **Race conditions** between webhook processing and order creation
- **Connection pool exhaustion** in Vercel's serverless environment

## 🔴 Critical Issues (Fix Immediately)

### 1. Database Connection Management Crisis
**Problem**: Prisma connection pool is failing in serverless environment
```
Invalid `prisma.webhookQueue.findFirst()` invocation:
Engine is not yet connected.
```

**Impact**: Orders and payments not being processed

**Solution**:
```typescript
// src/lib/db-connection-fix.ts
import { PrismaClient } from '@prisma/client';

class ResilientPrismaClient {
  private static instance: PrismaClient | null = null;
  private static connectionPromise: Promise<void> | null = null;
  
  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        log: ['error', 'warn'],
      });
      
      // Force connection on first use
      this.connectionPromise = this.instance.$connect();
    }
    
    // Always ensure connected before returning
    if (this.connectionPromise) {
      await this.connectionPromise;
    }
    
    return this.instance;
  }
  
  static async executeWithRetry<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const client = await this.getInstance();
        return await operation(client);
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        
        // Reset connection on failure
        if (error.message?.includes('Engine is not yet connected')) {
          this.instance = null;
          this.connectionPromise = null;
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    throw new Error('Max retries exceeded');
  }
}

export const resilientPrisma = ResilientPrismaClient;
```

### 2. Webhook Signature Validation Disabled
**Problem**: Security validation is bypassed
```typescript
console.log('🔧 TEMP: Bypassing signature validation for debugging - REMOVE IN PRODUCTION');
```

**Solution**:
```typescript
// src/lib/square/webhook-signature-fix.ts
export async function validateWebhookSignature(
  request: Request,
  body: string
): Promise<boolean> {
  const signature = request.headers.get('x-square-hmacsha256-signature');
  const timestamp = request.headers.get('x-square-hmacsha256-timestamp');
  
  // For Square webhooks without timestamp header (your current issue)
  if (signature && !timestamp) {
    // Use alternative validation method
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    if (!webhookSecret) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('base64');
    
    return expectedSignature === signature;
  }
  
  // Standard validation when both headers present
  if (signature && timestamp) {
    const payload = timestamp + body;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SQUARE_WEBHOOK_SECRET!)
      .update(payload)
      .digest('base64');
    
    return expectedSignature === signature;
  }
  
  return false;
}
```

### 3. Webhook Processing Architecture
**Problem**: Synchronous processing causing timeouts and connection exhaustion

**Solution**: Implement true async processing with queue
```typescript
// src/app/api/webhooks/square/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Read body (fast)
    const body = await request.text();
    
    // 2. Quick validation (under 100ms)
    const isValid = await validateWebhookSignature(request, body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // 3. Parse and queue (under 500ms)
    const payload = JSON.parse(body);
    await queueWebhook(payload);
    
    // 4. Return immediately (total time < 1 second)
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to prevent Square retries
    return NextResponse.json({ received: true, error: true }, { status: 200 });
  }
}

async function queueWebhook(payload: any): Promise<void> {
  // Use Redis for queue if available, otherwise database
  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL);
    await redis.lpush('webhook:queue', JSON.stringify(payload));
  } else {
    // Fallback to database queue
    await resilientPrisma.executeWithRetry(async (prisma) => {
      await prisma.webhookQueue.create({
        data: {
          eventId: payload.event_id,
          eventType: payload.type,
          payload: payload,
          status: 'PENDING',
        }
      });
    });
  }
}
```

## 🟡 Major Issues (Fix This Week)

### 4. Race Conditions in Order Creation
**Problem**: Webhooks arriving before orders are saved to database

**Solution**: Implement idempotency and eventual consistency
```typescript
// src/lib/order-processing-fix.ts
export async function processOrderWebhook(payload: any): Promise<void> {
  const squareOrderId = payload.data.id;
  
  // Retry logic for race conditions
  let order = null;
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    order = await resilientPrisma.executeWithRetry(async (prisma) => {
      return await prisma.order.findUnique({
        where: { squareOrderId }
      });
    });
    
    if (order) break;
    
    // Exponential backoff
    await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 30000)));
  }
  
  if (!order) {
    // Store for later processing instead of creating phantom order
    await storeUnmatchedWebhook(payload);
    return;
  }
  
  // Process the order update
  await updateOrderFromWebhook(order, payload);
}
```

### 5. Connection Pool Configuration
**Problem**: Default Prisma settings not optimized for serverless

**Solution**: Environment-specific configuration
```typescript
// prisma/schema.prisma connection URL parameters
// For Vercel/Serverless:
DATABASE_URL="postgresql://...?connection_limit=1&pool_timeout=10"

// For local development:
DATABASE_URL="postgresql://...?connection_limit=10"
```

### 6. Missing Monitoring & Alerting
**Solution**: Add comprehensive monitoring
```typescript
// src/lib/webhook-monitoring.ts
export class WebhookMonitor {
  static async trackWebhook(
    eventType: string,
    eventId: string,
    operation: () => Promise<void>
  ): Promise<void> {
    const start = Date.now();
    const metrics = {
      eventType,
      eventId,
      timestamp: new Date(),
      duration: 0,
      success: false,
      error: null as string | null,
    };
    
    try {
      await operation();
      metrics.success = true;
    } catch (error: any) {
      metrics.error = error.message;
      
      // Alert on critical errors
      if (error.message?.includes('Engine is not yet connected')) {
        await this.sendCriticalAlert('Database connection lost in webhook processing');
      }
      
      throw error;
    } finally {
      metrics.duration = Date.now() - start;
      
      // Log to monitoring service
      await this.logMetrics(metrics);
      
      // Alert if slow
      if (metrics.duration > 10000) {
        await this.sendAlert(`Slow webhook: ${eventType} took ${metrics.duration}ms`);
      }
    }
  }
  
  private static async sendCriticalAlert(message: string): Promise<void> {
    // Send to Slack, email, or monitoring service
    console.error(`🚨 CRITICAL: ${message}`);
    // Implement actual alerting here
  }
}
```

## 🟢 Preventive Measures (Implement This Month)

### 7. Database Indexes
```sql
-- Add missing indexes for webhook queries
CREATE INDEX CONCURRENTLY idx_order_square_order_id 
  ON "Order"("squareOrderId");

CREATE INDEX CONCURRENTLY idx_catering_order_square_order_id 
  ON "CateringOrder"("squareOrderId");

CREATE INDEX CONCURRENTLY idx_webhook_queue_status_created 
  ON "webhook_queue"("status", "createdAt");
```

### 8. Circuit Breaker Pattern
```typescript
// src/lib/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
}
```

### 9. Background Job Processing
```typescript
// src/app/api/cron/process-webhooks/route.ts
export async function GET(request: Request) {
  // Process queued webhooks every minute
  const processor = new WebhookProcessor();
  
  try {
    await processor.processQueue({
      maxItems: 50,
      timeout: 55000, // 55 seconds (Vercel limit is 60)
    });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Queue processing failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### 10. Health Checks
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: false,
    redis: false,
    square: false,
    timestamp: new Date(),
  };
  
  // Check database
  try {
    await resilientPrisma.executeWithRetry(async (prisma) => {
      await prisma.$queryRaw`SELECT 1`;
    });
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      checks.redis = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }
  }
  
  const allHealthy = checks.database && (!process.env.REDIS_URL || checks.redis);
  
  return Response.json(checks, { 
    status: allHealthy ? 200 : 503 
  });
}
```

## 📋 Implementation Checklist

### Week 1 (Critical Fixes)
- [ ] Fix database connection management with retry logic
- [ ] Re-enable webhook signature validation with proper handling
- [ ] Implement async webhook processing with immediate acknowledgment
- [ ] Add webhook queue table migration
- [ ] Deploy connection pool optimization

### Week 2 (Stability)
- [ ] Add monitoring and alerting system
- [ ] Implement circuit breaker for external services
- [ ] Add database indexes for performance
- [ ] Set up background job processing
- [ ] Implement health checks

### Week 3 (Optimization)
- [ ] Add Redis for queue management (optional but recommended)
- [ ] Implement webhook deduplication
- [ ] Add comprehensive logging
- [ ] Performance testing and optimization
- [ ] Documentation update

### Week 4 (Prevention)
- [ ] Set up automated testing for webhooks
- [ ] Implement rate limiting
- [ ] Add dashboard for webhook metrics
- [ ] Create runbook for common issues
- [ ] Team training on new system

## 🚀 Deployment Strategy

1. **Test in Development**
   - Run all fixes locally first
   - Use ngrok to test real Square webhooks

2. **Deploy to Staging**
   - Test with Square Sandbox
   - Run load tests
   - Monitor for 24 hours

3. **Production Rollout**
   - Use feature flags for gradual rollout
   - Monitor closely for first 48 hours
   - Have rollback plan ready

## 📊 Success Metrics

- **Webhook processing time**: < 5 seconds (currently 100+ seconds)
- **Success rate**: > 99.9% (currently ~70%)
- **Database connection errors**: 0 (currently frequent)
- **Payment processing reliability**: 100%
- **Order status accuracy**: 100%

## 🆘 Emergency Contacts

- **Database Issues**: Check Supabase/PostgreSQL logs
- **Square API**: Check Square Developer Dashboard
- **Vercel Issues**: Check Vercel Functions logs
- **Critical Alerts**: Set up PagerDuty/Opsgenie integration

## Final Recommendations

1. **Immediate Action**: Fix the database connection management - this is causing most of your issues
2. **Security**: Re-enable webhook signature validation immediately
3. **Architecture**: Move to async processing to prevent timeouts
4. **Monitoring**: You're flying blind without proper monitoring
5. **Testing**: Implement automated webhook testing to catch issues early

This plan will transform your unreliable webhook system into a robust, scalable solution that can handle your eCommerce operations reliably.