# Umami Analytics CSP Fix Implementation

## Issue Summary
The Content Security Policy (CSP) in `next.config.js` was blocking the Umami analytics script from loading. The CSP didn't include `analytics.readysetllc.com` in the allowed sources.

## Changes Made

### 1. Updated CSP Configuration in `next.config.js`

**File:** `next.config.js`  
**Lines:** ~107 and ~112

**Before:**
```javascript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com",
"connect-src 'self' https://*.supabase.co https://connect.squareup.com https://connect.squareupsandbox.com https://*.upstash.io https://api.resend.com https://vitals.vercel-insights.com",
```

**After:**
```javascript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.readysetllc.com https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com",
"connect-src 'self' https://analytics.readysetllc.com https://*.supabase.co https://connect.squareup.com https://connect.squareupsandbox.com https://*.upstash.io https://api.resend.com https://vitals.vercel-insights.com",
```

### 2. Updated Umami Configuration

**File:** `src/lib/analytics/umami.ts`  
**Line:** ~56

**Before:**
```typescript
domains: ['destinosf.com', 'www.destinosf.com'],
```

**After:**
```typescript
domains: ['destinosf.com', 'www.destinosf.com', 'development.destinosf.com'],
```

### 3. Created Test Script

**File:** `scripts/test-umami-analytics.ts`

A comprehensive test script to verify:
- Configuration values
- Environment variables
- Runtime context
- CSP configuration status
- Manual testing instructions

## Environment Variables

The following environment variables are already configured in `src/env.ts`:

```typescript
NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
NEXT_PUBLIC_UMAMI_SRC: process.env.NEXT_PUBLIC_UMAMI_SRC,
```

**Default values:**
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`: `5a0ae847-dbb0-456c-b972-9e29944de4b2`
- `NEXT_PUBLIC_UMAMI_SRC`: `https://analytics.readysetllc.com/script.js`

## Testing Instructions

### 1. Restart Development Server
```bash
# Stop your current dev server and restart
pnpm dev
```

### 2. Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"

### 3. Verify Script Loading
1. Open DevTools → Network tab
2. Filter by "analytics"
3. Refresh the page
4. Look for `script.js` from `analytics.readysetllc.com`
5. Should return 200 status

### 4. Check Console for Errors
- No CSP violation errors should appear
- Look for: `[Umami] Analytics script loaded successfully`

### 5. Test Tracking
Run in browser console:
```javascript
// Check if Umami loaded
console.log('Umami loaded:', !!window.umami);

// Test tracking
if (window.umami) {
  window.umami.track('test-event', { source: 'console' });
  console.log('Test event sent');
}
```

### 6. Run Test Script
```bash
pnpm tsx scripts/test-umami-analytics.ts
```

## Verification Checklist

- [ ] Development server restarted
- [ ] Browser cache cleared
- [ ] No CSP errors in console
- [ ] `script.js` loads with 200 status
- [ ] `[Umami] Analytics script loaded successfully` appears
- [ ] `window.umami` is available
- [ ] Test events are tracked
- [ ] Umami dashboard shows incoming data

## Production Deployment

1. Deploy changes to Vercel
2. Clear Vercel cache if needed
3. Test on production domain
4. Verify analytics data in Umami dashboard

## Troubleshooting

### If script still doesn't load:
1. Check if `analytics.readysetllc.com` is accessible
2. Verify domain is allowed in Umami dashboard
3. Check for browser extensions blocking scripts
4. Ensure no other CSP headers are being set

### If tracking doesn't work:
1. Verify website ID is correct
2. Check if auto-track is enabled
3. Ensure domain matches Umami configuration
4. Test with manual tracking calls

## Files Modified

1. `next.config.js` - Updated CSP directives
2. `src/lib/analytics/umami.ts` - Added development domain
3. `scripts/test-umami-analytics.ts` - Created test script
4. `docs/analytics/umami-csp-fix.md` - This documentation

## Implementation Date

**Date:** January 26, 2025  
**Status:** ✅ Implemented  
**Tested:** Pending restart and verification 