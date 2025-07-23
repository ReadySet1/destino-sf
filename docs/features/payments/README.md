# Square Token Setup & Management

This document explains how to properly configure Square API tokens for the hybrid setup where **catalog operations use production** but **transactions use sandbox**.

## Environment Variables Structure

### Current Setup (Hybrid Mode)

```bash
# === SQUARE CONFIGURATION ===
# Enable hybrid mode: production catalog + sandbox transactions
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# === PRODUCTION TOKENS ===
# For catalog operations (products, categories, images)
SQUARE_PRODUCTION_TOKEN=your_production_token_here
SQUARE_LOCATION_ID=your_production_location_id

# === SANDBOX TOKENS ===
# For transactions (payments, orders)
SQUARE_SANDBOX_TOKEN=your_sandbox_token_here
SQUARE_SANDBOX_APPLICATION_ID=your_sandbox_app_id

# === LEGACY SUPPORT ===
# Fallback token (will be used if SQUARE_PRODUCTION_TOKEN not set)
SQUARE_ACCESS_TOKEN=your_production_token_here

# === WEBHOOK CONFIGURATION ===
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# === ENVIRONMENT CONTROL ===
# Overall environment flag (can be overridden by specific flags above)
USE_SQUARE_SANDBOX=false
```

### Alternative Configurations

#### Full Production Mode

```bash
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=false
USE_SQUARE_SANDBOX=false

SQUARE_PRODUCTION_TOKEN=your_production_token_here
SQUARE_LOCATION_ID=your_production_location_id
```

#### Full Sandbox Mode

```bash
SQUARE_CATALOG_USE_PRODUCTION=false
SQUARE_TRANSACTIONS_USE_SANDBOX=true
USE_SQUARE_SANDBOX=true

SQUARE_SANDBOX_TOKEN=your_sandbox_token_here
SQUARE_SANDBOX_APPLICATION_ID=your_sandbox_app_id
```

## Token Types & Purposes

### Production Tokens

- **Purpose**: Access real product catalog, categories, and images
- **Used for**: Product syncing, catalog management, image retrieval
- **API Endpoint**: `connect.squareup.com`
- **Environment Variable**: `SQUARE_PRODUCTION_TOKEN`

### Sandbox Tokens

- **Purpose**: Testing payments and transactions
- **Used for**: Order processing, payment testing, checkout flows
- **API Endpoint**: `connect.squareupsandbox.com`
- **Environment Variable**: `SQUARE_SANDBOX_TOKEN`

## How to Get/Update Tokens

### 1. Production Tokens

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your **Production** application
3. Go to "Credentials" section
4. Copy the **Production Access Token**
5. Update `SQUARE_PRODUCTION_TOKEN` in your `.env.local`

### 2. Sandbox Tokens

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your **Sandbox** application (or same app, sandbox section)
3. Go to "Credentials" section
4. Copy the **Sandbox Access Token**
5. Update `SQUARE_SANDBOX_TOKEN` in your `.env.local`

### 3. Location ID

1. In Square Dashboard, go to **Locations**
2. Copy the Location ID for your business
3. Update `SQUARE_LOCATION_ID` in your `.env.local`

## Testing Token Validity

### Using the Debug API

Visit: `http://localhost:3000/api/debug/square-config`

This will show:

- Which tokens are configured
- Which environment each operation uses
- Token lengths (for verification without exposing actual tokens)

### Using the Token Test Script

```bash
pnpm run test:square-tokens
```

## Common Issues & Solutions

### 401 Authentication Error

**Problem**: `"This request could not be authorized"`

**Solutions**:

1. **Check token expiration**: Square tokens don't expire but can be regenerated
2. **Verify token environment**: Make sure you're using production token for production API
3. **Check token permissions**: Ensure token has required scopes
4. **Regenerate tokens**: Create new tokens in Square Developer Dashboard

### Mixed Environment Errors

**Problem**: Trying to use sandbox token with production API

**Solution**: Check your environment variables:

```bash
# Make sure these are set correctly
SQUARE_CATALOG_USE_PRODUCTION=true        # Uses SQUARE_PRODUCTION_TOKEN
SQUARE_TRANSACTIONS_USE_SANDBOX=true      # Uses SQUARE_SANDBOX_TOKEN
```

### Token Not Found

**Problem**: `Square access token not configured`

**Solution**: Ensure the correct environment variable is set:

- For catalog: `SQUARE_PRODUCTION_TOKEN` or `SQUARE_ACCESS_TOKEN`
- For transactions: `SQUARE_SANDBOX_TOKEN` (in hybrid mode)

## Environment File Template

Create/update your `.env.local`:

```bash
# Copy this template and replace with your actual tokens

# === SQUARE HYBRID CONFIGURATION ===
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# === YOUR PRODUCTION TOKENS ===
SQUARE_PRODUCTION_TOKEN=EAAAl...  # Your production access token
SQUARE_LOCATION_ID=L123...        # Your location ID

# === YOUR SANDBOX TOKENS ===
SQUARE_SANDBOX_TOKEN=EAAAl...     # Your sandbox access token
SQUARE_SANDBOX_APPLICATION_ID=sandbox-sq0idb...

# === WEBHOOK & OTHER CONFIG ===
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_key
USE_SQUARE_SANDBOX=false
```

## Troubleshooting Commands

```bash
# Check current configuration
curl http://localhost:3000/api/debug/square-config

# Test token validity
pnpm run test:square-tokens

# Reset Square client (force re-initialization)
curl -X POST http://localhost:3000/api/debug/reset-square-client

# Check environment variables (without exposing tokens)
node -e "console.log({
  PROD_TOKEN: !!process.env.SQUARE_PRODUCTION_TOKEN,
  SANDBOX_TOKEN: !!process.env.SQUARE_SANDBOX_TOKEN,
  LOCATION_ID: !!process.env.SQUARE_LOCATION_ID
})"
```

## Security Notes

1. **Never commit tokens to git**: Always use `.env.local` (already in `.gitignore`)
2. **Regenerate compromised tokens**: If tokens are exposed, regenerate them immediately
3. **Use appropriate permissions**: Only grant necessary scopes to each token
4. **Monitor usage**: Check Square Dashboard for unusual API activity
