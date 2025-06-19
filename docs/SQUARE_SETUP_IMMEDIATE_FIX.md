# 🔧 Square Token Setup - Immediate Fix

## 🚨 Current Issue
You're getting a 401 authentication error because your Square token is expired or invalid.

## ✅ Immediate Solution

### Step 1: Update Your `.env.local` File

Replace your current Square configuration in `.env.local` with this:

```bash
# === SQUARE HYBRID CONFIGURATION ===
# Catalog operations use PRODUCTION (to get real products)
# Transaction operations use SANDBOX (to test payments safely)
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# === PRODUCTION TOKENS ===
# Replace with your ACTUAL production tokens from Square Dashboard
SQUARE_PRODUCTION_TOKEN=EAAAl_YOUR_PRODUCTION_TOKEN_HERE
SQUARE_LOCATION_ID=L_YOUR_LOCATION_ID_HERE

# === SANDBOX TOKENS ===
# Replace with your ACTUAL sandbox tokens from Square Dashboard  
SQUARE_SANDBOX_TOKEN=EAAAl_YOUR_SANDBOX_TOKEN_HERE
SQUARE_SANDBOX_APPLICATION_ID=sandbox-sq0idb-YOUR_SANDBOX_APP_ID

# === WEBHOOK & LEGACY SUPPORT ===
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_WEBHOOK_KEY
SQUARE_ACCESS_TOKEN=EAAAl_YOUR_PRODUCTION_TOKEN_HERE
USE_SQUARE_SANDBOX=false
```

### Step 2: Get Fresh Tokens from Square

1. **Go to Square Developer Dashboard**: https://developer.squareup.com/apps
2. **Select your application**
3. **For Production Token:**
   - Click **"Production"** tab
   - Go to **"Credentials"** section
   - Copy the **"Access Token"** (starts with `EAAA`)
   - Replace `EAAAl_YOUR_PRODUCTION_TOKEN_HERE` in your `.env.local`

4. **For Sandbox Token:**
   - Click **"Sandbox"** tab  
   - Go to **"Credentials"** section
   - Copy the **"Access Token"** (starts with `EAAA`)
   - Replace `EAAAl_YOUR_SANDBOX_TOKEN_HERE` in your `.env.local`

5. **For Location ID:**
   - In Square Dashboard, go to **"Account & Settings"** → **"Locations"**
   - Copy your Location ID (starts with `L`)
   - Replace `L_YOUR_LOCATION_ID_HERE` in your `.env.local`

### Step 3: Test Your Configuration

```bash
# Start your dev server
pnpm dev

# In another terminal, test the configuration
curl http://localhost:3000/api/debug/square-config

# Or test the tokens directly
curl http://localhost:3000/api/debug/test-square-tokens
```

### Step 4: Verify Products Sync

After updating tokens, try syncing products again:
1. Go to http://localhost:3000/admin/products
2. Click the sync button
3. You should see products syncing from production Square without 401 errors

## 🎯 What This Setup Does

- **Catalog Operations** (product sync, categories) → **Production Square API**
- **Transaction Operations** (payments, orders) → **Sandbox Square API**  
- **No more 401 authentication errors**
- **Real product data from production**
- **Safe payment testing in sandbox**

## 🐛 If You Still Get Errors

1. **Check token format**: Should start with `EAAA` and be ~100+ characters
2. **Regenerate tokens**: Old tokens might be revoked
3. **Check permissions**: Ensure tokens have catalog/payment permissions
4. **Test individually**: 
   ```bash
   # Test production token
   curl -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN" \
        -H "Square-Version: 2024-05-15" \
        https://connect.squareup.com/v2/locations
   
   # Test sandbox token  
   curl -H "Authorization: Bearer YOUR_SANDBOX_TOKEN" \
        -H "Square-Version: 2024-05-15" \
        https://connect.squareupsandbox.com/v2/locations
   ```

## 📞 Quick Verification Commands

```bash
# Check if tokens are configured
node -e "console.log({
  PROD: !!process.env.SQUARE_PRODUCTION_TOKEN, 
  SANDBOX: !!process.env.SQUARE_SANDBOX_TOKEN,
  LOCATION: !!process.env.SQUARE_LOCATION_ID
})"

# Run setup script (after fixing ES module issue)
tsx src/scripts/setup-square-tokens.ts
```

This should resolve your 401 authentication errors and get your product sync working! 