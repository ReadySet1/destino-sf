# 🛡️ Rate Limiting Test Guide

## ✅ **Redis Connection Verified**
Your Upstash Redis credentials have been tested and are working correctly!

## 🚀 **Testing Steps**

### **Step 1: Environment Setup**
Create `.env.local` file in your project root:

```env
# Rate Limiting Configuration (Upstash Redis) 
UPSTASH_REDIS_REST_URL="https://thorough-deer-37742.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AZNuAAIjcDFiYzk0OWU5OTRiZGI0ZjJjOGVkZGQ2YjMwYzFmY2NiZnAxMA"
BYPASS_RATE_LIMIT="false"
NODE_ENV="development"
```

### **Step 2: Start Development Server**
```bash
pnpm dev
```

### **Step 3: Test Rate Limiting**

#### **Option A: Automated Test Script**
```bash
./test-rate-limiting.sh
```

#### **Option B: Manual Testing with curl**

**Test GET endpoint (5 requests/minute limit):**
```bash
# First 5 requests should succeed (HTTP 200)
curl -i http://localhost:3000/api/test-rate-limit

# 6th request should be rate limited (HTTP 429)
curl -i http://localhost:3000/api/test-rate-limit
```

**Test POST endpoint (2 requests/minute limit):**
```bash
# First 2 requests should succeed
curl -X POST -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -i http://localhost:3000/api/test-rate-limit

# 3rd request should be rate limited
curl -X POST -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -i http://localhost:3000/api/test-rate-limit
```

#### **Option C: Browser Testing**
1. Open: `http://localhost:3000/api/test-rate-limit`
2. Refresh the page 6 times quickly
3. After the 5th request, you should see a rate limit error

## 🔍 **What to Look For**

### **Successful Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Rate limiting test endpoint",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "clientIp": "127.0.0.1",
  "note": "This endpoint allows 5 requests per minute per IP"
}
```

**Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640995200
```

### **Rate Limited Response (HTTP 429):**
```json
{
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 5,
  "remaining": 0,
  "reset": 1640995200,
  "retryAfter": 45
}
```

**Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 45
```

## 🛡️ **Rate Limiting Configuration**

Your implementation includes these protections:

### **Endpoint-Specific Limits:**
- **Webhooks**: 100 requests/minute
- **Checkout**: 10 requests/minute per IP
- **Payment**: 5 requests/minute per IP
- **Orders**: 30 requests/minute per user
- **Admin**: 120 requests/minute
- **General API**: 60 requests/minute

### **Protected Endpoints:**
- ✅ `/api/webhooks/square` - Webhook rate limiting
- ✅ `/api/checkout` - Strict checkout protection
- ✅ `/api/checkout/payment` - Payment protection
- ✅ `/api/orders/[id]/retry-payment` - User-based limiting
- ✅ All other `/api/*` routes - General API protection

## 🐛 **Troubleshooting**

### **Rate Limiting Not Working:**
1. Check `.env.local` file exists with correct credentials
2. Verify `BYPASS_RATE_LIMIT="false"`
3. Restart development server after env changes
4. Check browser console/network tab for rate limit headers

### **Redis Connection Issues:**
1. Run: `node test-redis-connection.cjs`
2. Verify Upstash Redis instance is active
3. Check token hasn't expired

### **Build Errors:**
The rate limiting middleware is separate from build issues. Even if there are TypeScript errors in test files, the rate limiting should work in development mode.

## ✅ **Expected Test Results**

When working correctly:
1. **First 5 GET requests**: HTTP 200 responses
2. **6th+ GET requests**: HTTP 429 rate limit errors
3. **First 2 POST requests**: HTTP 200 responses  
4. **3rd+ POST requests**: HTTP 429 rate limit errors
5. **Rate limit headers**: Present in all responses
6. **Redis counters**: Increment with each request
7. **Automatic reset**: Counters reset after 1 minute

## 🔄 **Next Steps After Testing**

Once rate limiting is confirmed working:
1. Remove test endpoint: `src/app/api/test-rate-limit/route.ts`
2. Clean up test files: `test-redis-connection.cjs`, `test-rate-limiting.sh`
3. Proceed to next security implementation: **Security Headers Configuration**

---

**💡 Tip**: In production, set `BYPASS_RATE_LIMIT="false"` and use your production Redis credentials. 