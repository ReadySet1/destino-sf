# Square API Production Fix - Immediate Action Required

## 🚨 Problem Identified

Your production deployment is failing with `"Invalid character in header content ["Authorization"]"` because of:

1. **Conflicting environment variables** in Vercel
2. **Missing token validation** allowing malformed tokens
3. **Hybrid configuration conflicts** causing wrong token selection

## ✅ Immediate Fixes Required

### 1. Fix Environment Variables in Vercel Dashboard

**Current problematic configuration:**
```
USE_SQUARE_SANDBOX=true
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_ENVIRONMENT=sandbox
```

**Replace with this corrected configuration:**

```bash
# === SQUARE FIXED CONFIGURATION ===
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true
USE_SQUARE_SANDBOX=false           # ← CHANGED: This must be false for production catalog

# === TOKENS (Keep existing values, just verify they're clean) ===
SQUARE_PRODUCTION_TOKEN=EAAAl1cr9vZhERNNLJXpZ1iNxBRnW-sL9vtvkBShEoolqsZG69tnmnlptGhl4BXj
SQUARE_SANDBOX_TOKEN=EAAAl-uQi9jcs2DbsPElJqTceFFKlfoyvZWsQbyMMHqhlnmX7dJzk9_UfMAs8rZW
SQUARE_ACCESS_TOKEN=EAAAl1cr9vZhERNNLJXpZ1iNxBRnW-sL9vtvkBShEoolqsZG69tnmnlptGhl4BXj

# === REMOVE THESE CONFLICTING VARIABLES ===
# Delete these from Vercel:
# SQUARE_ENVIRONMENT (delete this variable entirely)
```

### 2. Steps to Fix in Vercel Dashboard

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Update these variables:**
   - `USE_SQUARE_SANDBOX` → Change value to `false`
   - Delete `SQUARE_ENVIRONMENT` variable entirely (if it exists)

3. **Verify these remain unchanged:**
   - `SQUARE_CATALOG_USE_PRODUCTION=true`
   - `SQUARE_TRANSACTIONS_USE_SANDBOX=true`
   - All token values remain the same

4. **Redeploy** your application

### 3. Debug Your Current Setup

I've created a debug endpoint to help diagnose the exact issue. After deploying the code changes, visit:

```
https://your-production-domain.com/api/debug/square-production-fix
```

This will show you:
- Which tokens are being used
- If tokens have invalid characters
- Configuration conflicts
- Specific recommendations

## 🔧 Code Changes Made

I've implemented the following fixes in your codebase:

1. **Token Sanitization** (`catalog-api.ts`):
   - Removes whitespace and invalid characters from tokens
   - Validates token format before use
   - Provides clear error messages

2. **Debug Endpoint** (`/api/debug/square-production-fix`):
   - Production-safe token analysis
   - Identifies configuration conflicts
   - Provides specific recommendations

## 📋 Testing Steps

1. **Deploy the code changes**
2. **Update environment variables in Vercel**
3. **Test the debug endpoint**: `/api/debug/square-production-fix`
4. **Test Square API functionality**

## 🎯 Expected Outcome

After these fixes:
- No more "Invalid character in header content" errors
- Square API requests will use properly sanitized tokens
- Clear error messages if tokens are still invalid
- Stable production catalog operations

## 🆘 If Still Failing

If the issue persists after these fixes:

1. **Check the debug endpoint output** for specific issues
2. **Regenerate your Square tokens**:
   - Go to Square Developer Dashboard
   - Generate new Production and Sandbox tokens
   - Update them in Vercel
3. **Contact support** with the debug endpoint output

## 📞 Quick Commands

```bash
# Deploy the fixes
vercel --prod

# Check if environment variables are correct
vercel env ls

# Test the debug endpoint
curl https://your-domain.com/api/debug/square-production-fix
```

---

**Priority**: CRITICAL - Production is broken  
**Impact**: All Square API operations failing  
**Time to fix**: 5-10 minutes  
**Requires**: Vercel dashboard access 