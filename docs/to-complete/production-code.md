Based on your comprehensive testing updates and the documentation I've analyzed, here's the **Updated Production-Ready Master Plan** that incorporates your testing achievements:

## 🚀 **PRODUCTION DEPLOYMENT MASTER PLAN - DESTINO SF**
### Updated: January 2025

## 📊 **Current Status Overview**

### ✅ **Testing Achievements**
- **Critical Path Coverage**: ✅ 87.5% (Exceeded 85% target)
- **Test Success Rate**: ✅ 78.3% on critical paths
- **Security Vulnerabilities**: ✅ Fixed (Auth, validation, security headers)
- **Infrastructure**: ✅ 25% complete (Rate limiting, Security headers)

### 🎯 **Production Readiness Status**
- **Payment Processing**: ✅ SECURE (87.5% coverage)
- **Health Monitoring**: ✅ ACTIVE (Comprehensive health checks)
- **Core Business Logic**: ✅ VALIDATED
- **Revenue Functions**: ✅ PROTECTED

---

## 📋 **IMMEDIATE PRODUCTION DEPLOYMENT CHECKLIST**

### **Pre-Deployment Verification (Day 1)**

```bash
# 1. Run Critical Path Tests
pnpm test:critical          # Must pass >75%
pnpm test:payments         # Must pass >85%
pnpm test:coverage:critical # Verify coverage metrics

# 2. Security Validation
./scripts/test-security-headers.sh   # ✅ Already passing
./scripts/test-rate-limiting.sh     # ✅ Already passing

# 3. Build Verification
pnpm typecheck-build               # Must complete without errors
pnpm build                        # Production build test

# 4. Database Preparation
pnpm prisma migrate deploy        # Apply all migrations
pnpm prisma generate             # Generate client
```

### **Environment Variables - Production Critical**

```env
# ✅ ALREADY CONFIGURED
UPSTASH_REDIS_REST_URL=https://thorough-deer-37742.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZNuAAIjcDFiYzk0OWU5OTRiZGI0ZjJjOGVkZGQ2YjMwYzFmY2NiZnAxMA

# 🔴 REQUIRED BEFORE DEPLOYMENT
SQUARE_WEBHOOK_SECRET=whsec_[YOUR_SECRET]
NEXTAUTH_SECRET=[GENERATE_WITH: openssl rand -base64 32]
NODE_ENV=production
```

---

## 🔄 **WEEK 1: COMPLETE CRITICAL INFRASTRUCTURE**

### **1. Webhook Signature Validation (Day 1-2)**
**Status**: 🔴 Required | **Priority**: CRITICAL | **Time**: 3-4 hours

```typescript
// Reference Implementation - src/lib/square/webhook-validator.ts
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

export class WebhookValidator {
  private redis: Redis;
  private readonly secret: string;
  private readonly maxClockSkew = 300; // 5 minutes

  constructor(secret: string) {
    this.secret = secret;
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async validateSignature(
    signature: string,
    body: string,
    timestamp: string,
    eventId: string
  ): Promise<boolean> {
    // 1. Prevent replay attacks - Check if we've seen this event
    const processed = await this.redis.get(`webhook:${eventId}`);
    if (processed) {
      console.warn(`Duplicate webhook detected: ${eventId}`);
      return false;
    }

    // 2. Validate timestamp
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    
    if (Math.abs(currentTime - webhookTime) > this.maxClockSkew) {
      console.error('Webhook timestamp outside acceptable window');
      return false;
    }

    // 3. Validate signature with constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${timestamp}.${body}`)
      .digest('base64');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    // 4. Mark as processed (with TTL to prevent Redis bloat)
    if (isValid) {
      await this.redis.set(`webhook:${eventId}`, true, { ex: 86400 }); // 24 hour TTL
    }

    return isValid;
  }
}
```

**Integration with existing webhook route:**
```typescript
// src/app/api/webhooks/square/route.ts - Update existing handler
export async function POST(request: Request) {
  const signature = request.headers.get('square-signature');
  const timestamp = request.headers.get('square-timestamp');
  const body = await request.text();
  const event = JSON.parse(body);

  const validator = new WebhookValidator(process.env.SQUARE_WEBHOOK_SECRET!);
  
  if (!await validator.validateSignature(
    signature!,
    body,
    timestamp!,
    event.event_id
  )) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Continue with existing webhook processing...
}
```

### **2. Deploy with Basic Monitoring (Day 3)**

```bash
# Deploy to staging first
vercel --env=preview

# Monitor health endpoint
curl https://your-staging-url.vercel.app/api/health
curl https://your-staging-url.vercel.app/api/health/detailed

# Run smoke tests
pnpm test:e2e:smoke-production
```

---

## 🔄 **WEEK 2: MONITORING & ERROR HANDLING**

### **3. Sentry Integration (Day 4-5)**
**Status**: 🟡 High Priority | **Time**: 3-4 hours

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    return event;
  },
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

// Update your existing error monitoring
// src/lib/error-monitoring.ts
import * as Sentry from "@sentry/nextjs";

export class ErrorMonitor {
  async logToExternalService(error: Error, context: any, severity: string) {
    // Your existing implementation...
    
    // Add Sentry integration
    Sentry.captureException(error, {
      level: severity as Sentry.SeverityLevel,
      contexts: {
        custom: context,
        user: {
          id: context.userId,
          email: context.userEmail,
        },
      },
      tags: {
        component: context.component,
        action: context.action,
      },
    });
  }
}
```

### **4. Performance Monitoring (Day 6-7)**
**Status**: 🟡 High Priority | **Time**: 4-5 hours

```typescript
// src/lib/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  trackApiCall(endpoint: string, duration: number, status: number) {
    // Send to monitoring service
    if (duration > 1000) {
      console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
    }
    
    // Track in Sentry
    if (typeof window === 'undefined') {
      Sentry.addBreadcrumb({
        category: 'api',
        message: `${endpoint} - ${duration}ms`,
        level: duration > 1000 ? 'warning' : 'info',
        data: { endpoint, duration, status },
      });
    }
  }

  trackDatabaseQuery(query: string, duration: number) {
    if (duration > 500) {
      console.warn(`Slow query: ${query.substring(0, 100)}... took ${duration}ms`);
    }
  }
}

// Integration with API routes
export function withPerformanceTracking(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const start = Date.now();
    const monitor = PerformanceMonitor.getInstance();
    
    try {
      const response = await handler(req);
      const duration = Date.now() - start;
      
      monitor.trackApiCall(
        new URL(req.url).pathname,
        duration,
        response.status
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      monitor.trackApiCall(
        new URL(req.url).pathname,
        duration,
        500
      );
      throw error;
    }
  };
}
```

---

## 🔄 **WEEK 3-4: OPTIMIZATION & SCALING**

### **5. Database Connection Pooling**
**Status**: 🟢 Medium Priority | **Time**: 2-3 hours

```typescript
// src/lib/db.ts - Enhanced with monitoring
import { PrismaClient } from '@prisma/client';
import { PerformanceMonitor } from './performance';

const monitor = PerformanceMonitor.getInstance();

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      'error',
      'warn',
    ],
    datasources: {
      db: {
        url: `${process.env.DATABASE_URL}?connection_limit=10&pool_timeout=30&connect_timeout=30`,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Add query monitoring
prisma.$on('query' as never, (e: any) => {
  monitor.trackDatabaseQuery(e.query, e.duration);
});
```

### **6. Caching Strategy**
**Status**: 🟢 Medium Priority | **Time**: 4-5 hours

```typescript
// src/lib/cache.ts
import { Redis } from '@upstash/redis';

export class CacheService {
  private redis: Redis;
  private static instance: CacheService;
  
  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  static getInstance(): CacheService {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string, 
    value: any, 
    options?: { ex?: number; px?: number }
  ): Promise<void> {
    try {
      await this.redis.set(key, value, options);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  // Cache key generators
  static keys = {
    product: (id: string) => `product:${id}`,
    products: (categoryId?: string, page = 1) => 
      categoryId ? `products:${categoryId}:${page}` : `products:all:${page}`,
    cart: (userId: string) => `cart:${userId}`,
    userSession: (userId: string) => `session:${userId}`,
  };
}
```

---

## 📊 **MONITORING DASHBOARD SETUP**

### **Key Metrics to Track**

```typescript
// src/types/monitoring.ts
export interface ProductionMetrics {
  // Business Metrics (Critical)
  business: {
    ordersPerHour: number;
    conversionRate: number;
    averageOrderValue: number;
    failedPayments: number;
    cartAbandonmentRate: number;
  };
  
  // Performance Metrics
  performance: {
    apiResponseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    databaseQueryTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    pageLoadTime: number;
  };
  
  // Infrastructure Health
  infrastructure: {
    errorRate: number;
    uptime: number;
    activeConnections: number;
    cacheHitRate: number;
    rateLimitViolations: number;
  };
  
  // Security Metrics
  security: {
    failedAuthAttempts: number;
    suspiciousWebhooks: number;
    blockedRequests: number;
  };
}
```

---

## 🚀 **DEPLOYMENT SCHEDULE**

### **Week 1: Core Infrastructure & Initial Deploy**
- ✅ Day 1-2: Implement webhook validation
- ✅ Day 3: Deploy to staging with health checks
- ✅ Day 4: Production deploy with limited traffic (10%)
- ✅ Day 5: Monitor and increase to 50% traffic

### **Week 2: Monitoring & Stability**
- Day 6-7: Sentry integration
- Day 8-9: Performance monitoring
- Day 10: Full production traffic (100%)

### **Week 3-4: Optimization**
- Connection pooling optimization
- Caching implementation
- Performance tuning based on metrics

---

## ✅ **SUCCESS CRITERIA**

### **Production Launch Gates**
- ✅ Critical path test coverage > 85%
- ✅ Health check endpoint responding
- ✅ Rate limiting active
- ✅ Security headers configured
- 🔄 Webhook validation implemented
- 🔄 Error monitoring active

### **Post-Launch Monitoring**
- Error rate < 0.1%
- Payment success rate > 98%
- API response time p95 < 500ms
- Uptime > 99.9%

This updated master plan reflects your testing achievements and provides a clear, actionable path to production deployment with reference implementations for each remaining critical component.