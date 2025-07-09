# 🔗 Magic Link Authentication Fix

## 🚨 Problem Identified

Your magic link authentication is failing with this PKCE error:
```
❌ Error exchanging code for session: Error [AuthApiError]: code challenge does not match previously saved code verifier
```

## 🔍 Root Cause Analysis

The issue is that your magic links are being generated as **PKCE flows** (with `code` parameter) instead of **OTP flows** (with `token_hash` and `type` parameters). This happens when:

1. **Supabase Configuration**: Your Supabase project might be configured to force PKCE for all authentication flows
2. **URL Configuration**: The redirect URLs in Supabase might not be configured correctly
3. **Flow Mismatch**: The `signInWithOtp` function is generating PKCE codes instead of OTP tokens

## ✅ Immediate Fixes Applied

### 1. Enhanced Auth Callback Handler
- ✅ **Fixed flow detection**: OTP tokens are now checked first, then PKCE codes
- ✅ **Added fallback handling**: If PKCE fails with code verifier error, attempts to extract tokens from URL fragment
- ✅ **Improved logging**: Better debugging information to track the flow

### 2. Enhanced Magic Link Action
- ✅ **Better error handling**: More specific error messages for different failure modes
- ✅ **Improved configuration**: Added `shouldCreateUser: false` to prevent account creation via magic links
- ✅ **Enhanced logging**: Detailed logging of magic link generation process

### 3. Debug Endpoint
- ✅ **Created diagnostic endpoint**: `/api/debug/auth-config` to check your configuration
- ✅ **Environment validation**: Checks all required environment variables
- ✅ **Configuration recommendations**: Provides specific fixes for your setup

## 🔧 Required Supabase Configuration Fixes

### Step 1: Verify Environment Variables
Check that these are set correctly in your Vercel dashboard:

```env
NEXT_PUBLIC_APP_URL=https://development.destinosf.com
NEXT_PUBLIC_SUPABASE_URL=https://avfiuivgvkgaovkqjnup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Fix Supabase Auth Settings

1. **Go to your Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/projects
   - Select your project: `avfiuivgvkgaovkqjnup`

2. **Navigate to Authentication > Settings**

3. **Update Site URL**:
   ```
   Site URL: https://development.destinosf.com
   ```

4. **Update Redirect URLs**:
   ```
   Redirect URLs:
   https://development.destinosf.com/auth/callback
   https://development.destinosf.com/auth/callback/**
   ```

5. **Check Email Settings**:
   - ✅ Ensure "Enable email confirmations" is **ENABLED**
   - ✅ Verify "Secure email change" is configured properly
   - ✅ Check that your SMTP settings are working

6. **Verify Auth Flow Settings**:
   - ✅ Ensure PKCE is not forced for all flows
   - ✅ Check that magic links use OTP flow, not PKCE

### Step 3: Email Template Configuration

1. **Go to Authentication > Email Templates**
2. **Select "Magic Link" template**
3. **Verify the template uses**: `{{ .ConfirmationURL }}`
4. **Ensure it redirects to**: `/auth/callback`

## 🧪 Testing Your Fixes

### 1. Run the Diagnostic Endpoint
After deploying your changes, visit:
```
https://development.destinosf.com/api/debug/auth-config
```

This will show you:
- ✅ Environment variable status
- ✅ Supabase connection health
- ✅ Recommended configuration fixes

### 2. Test Magic Link Flow
1. Go to: `https://development.destinosf.com/sign-in`
2. Click "Magic Link" tab
3. Enter email: `emmanuel@alanis.dev` or `james@destinosf.com`
4. Check server logs for detailed flow information
5. Check email and click the magic link
6. Verify successful authentication

### 3. Check Browser Developer Tools
1. Open Network tab in browser dev tools
2. Request magic link
3. Click the link from email
4. Watch for:
   - ✅ Callback URL should have `token_hash` and `type` parameters (OTP flow)
   - ❌ If you see only `code` parameter, it's still using PKCE flow

## 🔍 Advanced Debugging

### 1. Server Logs
Watch your Vercel function logs for these messages:
```
🔗 Auth callback received: { code: 'missing', token_hash: 'present', type: 'magiclink' }
🪄 Processing magic link OTP verification...
✅ Magic link OTP verification successful
```

### 2. Expected vs. Actual Flow

**✅ Correct Magic Link URL (OTP Flow)**:
```
https://development.destinosf.com/auth/callback?token_hash=abc123&type=magiclink&redirect_to=/admin
```

**❌ Incorrect Magic Link URL (PKCE Flow)**:
```
https://development.destinosf.com/auth/callback?code=abc123&redirect_to=/admin
```

### 3. Supabase Dashboard Logs
1. Go to Supabase Dashboard > Logs
2. Filter for Auth logs
3. Look for magic link generation and verification events

## 📞 If Issues Persist

### 1. Check Supabase Project Settings
- Verify your project region matches your configuration
- Ensure you're using the correct project (not a development vs. production mix-up)

### 2. SMTP Configuration
- Verify your email delivery settings in Supabase
- Test that emails are actually being sent

### 3. Browser Cache
- Clear browser cache and cookies
- Try in incognito mode
- Test with different browsers

### 4. Magic Link Expiry
- Magic links expire after 1 hour by default
- Ensure you're clicking fresh links

## 🔄 Deployment Steps

1. **Deploy the code changes**:
   ```bash
   git add .
   git commit -m "Fix magic link authentication PKCE issue"
   git push origin development
   ```

2. **Update Supabase settings** (as described above)

3. **Test the diagnostic endpoint**:
   ```bash
   curl https://development.destinosf.com/api/debug/auth-config
   ```

4. **Test magic link authentication** with a real user account

## 🎯 Expected Results

After implementing these fixes:
- ✅ Magic links should generate with `token_hash` and `type` parameters
- ✅ Authentication callback should process OTP flow successfully
- ✅ Users should be redirected to the correct destination after authentication
- ✅ No more "code challenge does not match" errors

## 🚨 Emergency Rollback

If you need to temporarily disable magic links:
1. Comment out the magic link tab in `SignInForm.tsx`
2. Force users to use password authentication only
3. This gives you time to fix the configuration without blocking users 