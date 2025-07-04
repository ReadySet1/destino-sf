# Security Headers Implementation Testing Guide

## 🔒 Overview

This guide provides comprehensive instructions for testing the security headers implementation in Destino SF. The security headers protect against various attacks including XSS, clickjacking, MIME sniffing, and more.

## 🚀 Quick Start

### 1. Run the Automated Test Script

```bash
# Make the script executable (if not already)
chmod +x scripts/test-security-headers.sh

# Run the test script
./scripts/test-security-headers.sh

# Test against a specific URL
BASE_URL=https://your-production-domain.com ./scripts/test-security-headers.sh
```

### 2. Test Individual Endpoints

```bash
# Test main application security headers
curl -I http://localhost:3000

# Test API endpoint security headers  
curl -I http://localhost:3000/api/security/headers-test

# Test rate limiting headers
curl -I http://localhost:3000/api/test-rate-limit
```

## 📋 Security Headers Checklist

### ✅ Implemented Headers

| Header | Purpose | Expected Value |
|--------|---------|----------------|
| `X-Frame-Options` | Prevent clickjacking | `DENY` |
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-XSS-Protection` | Legacy XSS protection | `1; mode=block` |
| `Referrer-Policy` | Control referrer information | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Control browser features | `camera=(), microphone=(), geolocation=(self)...` |
| `Content-Security-Policy` | Prevent XSS and data injection | Custom policy for Square, Supabase, etc. |
| `Strict-Transport-Security` | Enforce HTTPS | `max-age=63072000; includeSubDomains; preload` |

### 🔍 Additional Security Headers

| Header | Purpose | Expected Value |
|--------|---------|----------------|
| `X-DNS-Prefetch-Control` | Control DNS prefetching | `off` |
| `X-Download-Options` | IE download options | `noopen` |
| `X-Permitted-Cross-Domain-Policies` | Adobe Flash/PDF policies | `none` |
| `X-Request-ID` | Request tracing | `req_[timestamp]_[random]` |

## 🧪 Testing Methods

### Method 1: Browser Developer Tools

1. Open your application in Chrome/Firefox
2. Open Developer Tools (F12)
3. Go to Network tab
4. Refresh the page
5. Click on the main document request
6. Check the Response Headers section

**Expected Headers in Browser:**
- All security headers should be present
- CSP violations should appear in Console if any
- No server information leakage

### Method 2: Online Security Scanners

#### SecurityHeaders.com
```bash
# Visit: https://securityheaders.com/
# Enter your domain: https://your-domain.com
# Expected Grade: A or A+
```

#### Mozilla Observatory
```bash
# Visit: https://observatory.mozilla.org/
# Enter your domain: https://your-domain.com  
# Expected Grade: A or A+
```

### Method 3: Command Line Testing

#### Basic Header Check
```bash
curl -I https://your-domain.com | grep -i "x-frame-options\|x-content-type-options\|content-security-policy"
```

#### Comprehensive Header Test
```bash
# Test all security headers at once
curl -s -I https://your-domain.com | grep -E "^(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy|Permissions-Policy|Content-Security-Policy|Strict-Transport-Security):"
```

### Method 4: CSP Testing

#### Manual CSP Test
1. Open browser console on your site
2. Try to execute: `eval('alert("XSS test")')`
3. Should be blocked by CSP with console error

#### CSP Violation Testing
```javascript
// Try in browser console - should be blocked
document.body.innerHTML += '<script src="https://evil.com/malicious.js"></script>';

// Try inline script injection - should be blocked
document.body.innerHTML += '<script>alert("XSS")</script>';
```

## 🎯 Testing Environments

### Development Testing

```bash
# Test on local development server
BASE_URL=http://localhost:3000 ./scripts/test-security-headers.sh
```

**Expected Results:**
- All security headers present
- CSP allows development tools
- Rate limiting functional
- No HSTS (development only)

### Production Testing

```bash
# Test on production domain
BASE_URL=https://your-production-domain.com ./scripts/test-security-headers.sh
```

**Expected Results:**
- All security headers present
- Strict CSP enforcement
- HSTS enabled
- Server information hidden
- Security grade A/A+

## 🔧 Configuration Testing

### CSP Domain Validation

Test that required external domains are allowed:

```bash
# Test Square payment integration
curl -s "https://your-domain.com" | grep -o "https://js.squareup.com"

# Test Supabase integration  
curl -s "https://your-domain.com" | grep -o "https://.*\.supabase\.co"

# Test Google Maps/Fonts
curl -s "https://your-domain.com" | grep -o "https://maps.googleapis.com\|https://fonts.googleapis.com"
```

### Rate Limiting Integration Test

```bash
# Test rate limiting with security headers
for i in {1..3}; do
  echo "Request $i:"
  curl -I http://localhost:3000/api/test-rate-limit | grep -E "X-RateLimit|X-Frame-Options"
  echo "---"
done
```

## 🚨 Troubleshooting

### Common Issues

#### 1. CSP Blocking Required Resources

**Symptoms:**
- Console errors about blocked resources
- Functionality not working (payments, maps, etc.)

**Solutions:**
- Check `src/lib/security/csp-config.ts`
- Add missing domains to `TRUSTED_DOMAINS`
- Update CSP in `next.config.js`

#### 2. Headers Not Appearing

**Symptoms:**
- Security headers missing in browser/curl

**Check:**
1. Next.js config: `next.config.js` headers section
2. Middleware: `src/middleware.ts` addSecurityHeaders function
3. Vercel config: `vercel.json` headers section

#### 3. Rate Limiting Not Working

**Symptoms:**
- No rate limit headers
- Rate limiting not enforced

**Check:**
1. Rate limiting service: `src/lib/rate-limit.ts`
2. Middleware integration: `src/middleware.ts`
3. Environment variables: Redis connection

### Debug Commands

```bash
# Check Next.js configuration
node -e "console.log(require('./next.config.js'))"

# Test middleware directly
curl -v http://localhost:3000/api/test-rate-limit

# Check CSP configuration
node -e "
const { validateCSPConfig } = require('./src/lib/security/csp-config.ts');
console.log(validateCSPConfig());
"
```

## 📊 Security Metrics

### Performance Impact

- Security headers add ~2-5KB to response size
- Minimal performance impact (<1ms)
- CSP parsing adds ~1-2ms client-side

### Security Improvement

| Attack Vector | Protection Level | Implementation |
|---------------|------------------|----------------|
| XSS | High | CSP + XSS Protection |
| Clickjacking | High | X-Frame-Options |
| MIME Sniffing | High | X-Content-Type-Options |
| Information Disclosure | Medium | Hidden server headers |
| HTTPS Downgrade | High | HSTS |

## 🎯 Next Steps

After successful testing:

1. **Monitor CSP Violations**
   - Set up CSP reporting endpoint
   - Monitor console for violations
   - Adjust policy as needed

2. **Production Deployment**
   - Deploy to staging first
   - Run full security scan
   - Monitor for issues

3. **Regular Audits**
   - Monthly security header checks
   - Update trusted domains list
   - Review CSP effectiveness

4. **Advanced Security**
   - Implement Subresource Integrity (SRI)
   - Add security monitoring
   - Consider additional headers

## 📚 Additional Resources

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers Best Practices](https://securityheaders.com/info)
- [Next.js Security Headers Guide](https://nextjs.org/docs/advanced-features/security-headers)

## 🔗 Test URLs

- **Security Headers Test**: `/api/security/headers-test`
- **Rate Limiting Test**: `/api/test-rate-limit`
- **CSP Validation**: Browser console on any page
- **Online Scanner**: https://securityheaders.com/

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team 