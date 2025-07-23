# Destino SF - Production Deployment Implementation Plan

## 📊 **Implementation Progress**

- ✅ **Rate Limiting System** - COMPLETED (January 2025)
- ✅ **Security Headers Configuration** - COMPLETED (January 2025)
- 🔄 **Webhook Signature Validation** - NEXT (Ready to start)
- ⏳ **Sentry Integration** - FUTURE
- ⏳ **Performance Monitoring** - FUTURE
- ⏳ **Database Connection Pooling** - FUTURE
- ⏳ **Health Check System** - FUTURE
- ⏳ **Caching Strategy** - FUTURE

**Current Status**: 2/8 critical tasks completed (25% complete)

## 🔴 Critical Security & Infrastructure Tasks

### ✅ 1. Rate Limiting Implementation - COMPLETED

**Time: 6-8 hours | Priority: CRITICAL | Status: ✅ DONE**

#### ✅ Files Created:

```
✅ src/lib/rate-limit.ts                    # Rate limiting service with token bucket algorithm
✅ src/middleware/rate-limit.ts             # Rate limiting middleware functions
✅ src/types/rate-limit.d.ts                # TypeScript types for rate limiting
✅ src/app/api/test-rate-limit/route.ts     # Testing endpoint for rate limiting
```

#### ✅ Files Modified:

```
✅ src/middleware.ts                        # Integrated rate limiting before auth
✅ src/app/api/webhooks/square/route.ts     # Added webhook rate limiting (100/min)
✅ src/app/api/checkout/route.ts            # Added checkout rate limiting (10/min)
✅ src/app/api/checkout/payment/route.ts    # Added payment rate limiting (5/min)
✅ src/app/api/orders/[orderId]/retry-payment/route.ts # Added retry rate limiting (3/min)
✅ package.json                             # Added @upstash/ratelimit @upstash/redis
✅ src/env.ts                               # Added rate limiting environment variables
```

#### ✅ Implementation Completed:

1. **✅ Rate Limiter Service** (`src/lib/rate-limit.ts`)
   - ✅ Token bucket algorithm using Upstash Redis
   - ✅ Different limits for different endpoints
   - ✅ IP-based and user-based limiting with graceful degradation

2. **✅ Middleware Integration** (`src/middleware.ts`)
   - ✅ Rate limit check before Supabase auth
   - ✅ IP extraction from various headers (x-forwarded-for, cf-connecting-ip, etc.)
   - ✅ Returns 429 Too Many Requests with proper headers

3. **✅ Critical Endpoints Protected**
   - ✅ `/api/webhooks/square/*` - 100 requests/minute
   - ✅ `/api/checkout/*` - 10 requests/minute per IP
   - ✅ `/api/checkout/payment/*` - 5 requests/minute per IP
   - ✅ `/api/orders/*/retry-payment` - 3 requests/minute per user

#### ✅ Testing Infrastructure:

- ✅ Test endpoint: `/api/test-rate-limit`
- ✅ Testing script: `scripts/test-rate-limiting.sh`
- ✅ Documentation: `RATE_LIMITING_TEST_GUIDE.md`

---

### ✅ 2. Security Headers Configuration - COMPLETED

**Time: 2-3 hours | Priority: CRITICAL | Status: ✅ DONE**

#### ✅ Files Created:

```
✅ src/lib/security/csp-config.ts           # Centralized CSP configuration
✅ src/app/api/security/headers-test/route.ts # Security headers validation endpoint
```

#### ✅ Files Modified:

```
✅ next.config.js                           # Comprehensive security headers configuration
✅ src/middleware.ts                        # Enhanced security headers middleware
✅ vercel.json                              # Vercel-specific security settings
```

#### ✅ Implementation Completed:

1. **✅ Security Headers in `next.config.js`**
   - ✅ X-Frame-Options: DENY (prevent clickjacking)
   - ✅ X-Content-Type-Options: nosniff (prevent MIME sniffing)
   - ✅ X-XSS-Protection: 1; mode=block (legacy XSS protection)
   - ✅ Referrer-Policy: strict-origin-when-cross-origin
   - ✅ Permissions-Policy: camera=(), microphone=(), geolocation=(self)
   - ✅ Content-Security-Policy: Comprehensive CSP with trusted domains
   - ✅ Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

2. **✅ CSP Configuration**
   - ✅ Allow Square SDK (js.squareup.com, web.squarecdn.com)
   - ✅ Allow Google Maps & Fonts (maps.googleapis.com, fonts.googleapis.com)
   - ✅ Allow Supabase (\*.supabase.co)
   - ✅ Allow AWS S3 (\*.s3.amazonaws.com)
   - ✅ Block dangerous inline scripts and external resources
   - ✅ Environment-specific CSP (development vs production)

3. **✅ Additional Security Features**
   - ✅ X-Powered-By header removed (poweredByHeader: false)
   - ✅ Server information hiding
   - ✅ Request ID tracking for security monitoring
   - ✅ Enhanced cache control for sensitive routes

#### ✅ Testing Infrastructure:

- ✅ Test endpoint: `/api/security/headers-test`
- ✅ Testing script: `scripts/test-security-headers.sh`
- ✅ Documentation: `docs/SECURITY_HEADERS_TEST_GUIDE.md`
- ✅ Security summary: `docs/SECURITY_IMPLEMENTATION_SUMMARY.md`

---

### 🔄 3. Webhook Signature Validation Enhancement - NEXT

**Time: 3-4 hours | Priority: CRITICAL | Status: 🔄 READY TO START**

#### Files to Modify:

```
src/app/api/webhooks/square/route.ts
src/lib/square/webhook-validator.ts (create)
src/lib/crypto-utils.ts (create)
```

#### Implementation:

1. **Create Webhook Validator**
   - Constant-time comparison
   - Replay attack prevention (timestamp validation)
   - Request body integrity check

2. **Add Request ID Tracking**
   - Store processed webhook IDs in Redis/DB
   - Prevent duplicate processing
   - Add TTL for cleanup

---

## 🟠 Monitoring & Error Handling

### 4. Sentry Integration

**Time: 3-4 hours | Priority: HIGH**

#### Files to Create:

```
sentry.client.config.ts
sentry.server.config.ts
sentry.edge.config.ts
src/lib/sentry.ts
```

#### Files to Modify:

```
src/lib/error-monitoring.ts
src/app/layout.tsx
src/app/error.tsx
src/app/global-error.tsx
next.config.js
```

#### Implementation:

1. **Initialize Sentry**

   ```typescript
   // sentry.client.config.ts
   // Configure DSN, environment, integrations
   // Set up performance monitoring
   // Configure user context
   ```

2. **Update Error Monitor** (`src/lib/error-monitoring.ts`)

   ```typescript
   // In logToExternalService method:
   // Sentry.captureException(error, {
   //   contexts: { custom: context },
   //   level: severity
   // });
   ```

3. **Add Error Boundaries**
   - Global error boundary
   - Route-specific error boundaries
   - Fallback UI components

---

### 5. Performance Monitoring

**Time: 4-5 hours | Priority: HIGH**

#### Files to Create:

```
src/lib/performance.ts
src/lib/metrics.ts
src/components/PerformanceObserver.tsx
```

#### Files to Modify:

```
src/app/layout.tsx
src/middleware.ts
next.config.js
```

#### Implementation:

1. **Web Vitals Tracking**
   - LCP, FID, CLS, TTFB
   - Custom metrics for checkout flow
   - API response time tracking

2. **Database Query Monitoring**
   ```typescript
   // Add to Prisma client configuration
   // Log slow queries
   // Track connection pool metrics
   ```

---

## 🟡 Infrastructure & Reliability

### 6. Database Connection Pooling

**Time: 2-3 hours | Priority: HIGH**

#### Files to Modify:

```
src/lib/db.ts
prisma/schema.prisma
.env.example
```

#### Implementation:

1. **Update Prisma Client** (`src/lib/db.ts`)

   ```typescript
   // Add connection pool configuration
   // Implement retry logic
   // Add connection timeout handling
   // Monitor pool statistics
   ```

2. **Add Connection String Parameters**
   ```
   DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=30"
   ```

---

### 7. Health Check System

**Time: 2-3 hours | Priority: HIGH**

#### Files to Create:

```
src/app/api/health/route.ts
src/app/api/health/detailed/route.ts
src/lib/health-checks.ts
```

#### Implementation:

1. **Basic Health Check** (`/api/health`)

   ```typescript
   // Return 200 OK for uptime monitoring
   // Include version info
   ```

2. **Detailed Health Check** (`/api/health/detailed`)
   ```typescript
   // Check database connectivity
   // Verify Square API access
   // Test Redis connection
   // Check email service
   // Verify file storage access
   ```

---

### 8. Caching Strategy

**Time: 4-5 hours | Priority: MEDIUM**

#### Files to Create:

```
src/lib/cache.ts
src/lib/cache-keys.ts
src/hooks/useCache.ts
```

#### Files to Modify:

```
src/app/api/products/route.ts
src/app/api/categories/route.ts
src/lib/square/catalog.ts
```

#### Implementation:

1. **Cache Service**
   - Redis/Upstash integration
   - TTL management
   - Cache invalidation strategy
   - Stale-while-revalidate

2. **Cache Key Patterns**
   ```typescript
   // products:${categoryId}:${page}
   // product:${productId}
   // user:${userId}:cart
   // square:catalog:${timestamp}
   ```

---

## 🟢 Testing & Documentation

### 9. Load Testing Suite

**Time: 4-5 hours | Priority: MEDIUM**

#### Files to Create:

```
tests/load/checkout-flow.js
tests/load/webhook-processing.js
tests/load/config.js
scripts/load-test.sh
```

#### Tools:

- K6 or Artillery for load testing
- Grafana for visualization

#### Test Scenarios:

1. **Checkout Flow**
   - 100 concurrent users
   - Complete purchase flow
   - Payment processing

2. **Webhook Processing**
   - 1000 webhooks/minute
   - Concurrent order updates
   - Error handling under load

---

### 10. API Documentation

**Time: 3-4 hours | Priority: MEDIUM**

#### Files to Create:

```
docs/api/openapi.yaml
src/lib/swagger.ts
src/app/api/docs/route.ts
```

#### Implementation:

1. **OpenAPI Specification**
   - Document all endpoints
   - Request/response schemas
   - Authentication requirements
   - Rate limits

2. **Swagger UI Integration**
   - Interactive documentation
   - Try-it-out functionality
   - Auto-generated from code

---

## 📋 Environment Variables Checklist

### ✅ Implemented for Production:

```env
# ✅ Rate Limiting (IMPLEMENTED)
UPSTASH_REDIS_REST_URL=https://thorough-deer-37742.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZNuAAIjcDFiYzk0OWU5OTRiZGI0ZjJjOGVkZGQ2YjMwYzFmY2NiZnAxMA
BYPASS_RATE_LIMIT=false  # Set to true only in development

# ✅ Security Headers (IMPLEMENTED - No additional env vars needed)
```

### 🔄 Still Required for Production:

```env
# 🔄 Security (NEXT - Webhook validation)
NEXTAUTH_SECRET=
SQUARE_WEBHOOK_SECRET=

# 🔄 Monitoring (FUTURE)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_PROJECT=
SENTRY_ORG=

# 🔄 Performance (FUTURE)
CACHE_TTL_SECONDS=
CONNECTION_POOL_SIZE=
```

---

## 🚀 Deployment Checklist

### ✅ Pre-deployment Completed:

- [x] **All TypeScript errors resolved** ✅
- [x] **Rate limiting environment variables configured** ✅
- [x] **Rate limiting tested** ✅ (scripts/test-rate-limiting.sh)
- [x] **Security headers verified** ✅ (scripts/test-security-headers.sh)

### 🔄 Pre-deployment Still Required:

- [ ] **Webhook signature validation tested** 🔄 (NEXT TASK)
- [ ] **Sentry error tracking confirmed** 🔄 (FUTURE)
- [ ] **Health checks passing** 🔄 (FUTURE)
- [ ] **Load tests completed** 🔄 (FUTURE)

### 🔄 Post-deployment Monitoring:

- [ ] **Monitor error rates** 🔄 (Ready - rate limiting in place)
- [ ] **Monitor rate limit hits** 🔄 (Ready - Redis monitoring available)
- [ ] **Review security headers** 🔄 (Ready - testing scripts available)
- [ ] **Check webhook processing** 🔄 (After webhook validation implementation)
- [ ] **Check performance metrics** 🔄 (FUTURE)
- [ ] **Verify email delivery** 🔄 (FUTURE)
- [ ] **Test checkout flow** 🔄 (FUTURE)

---

## 📊 Monitoring Dashboard Setup

### Key Metrics to Track:

1. **Application Health**
   - Response times (p50, p95, p99)
   - Error rates by endpoint
   - Active users
   - Memory/CPU usage

2. **Business Metrics**
   - Orders per hour
   - Failed payments
   - Cart abandonment rate
   - Webhook processing time

3. **Infrastructure**
   - Database connection pool
   - Cache hit rates
   - Rate limit violations
   - External API latency
