# Vercel Square Sandbox Environment Setup

This guide provides step-by-step instructions for setting up a Square sandbox environment in Vercel for safe development and testing.

## 🎯 Overview

The sandbox environment allows you to:
- Test payment flows without real transactions
- Develop and debug order processing
- Test webhook integrations safely
- Validate Square API integrations

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Run the automated setup script
./scripts/setup-vercel-sandbox.sh
```

### Option 2: Manual Setup

Follow the sections below to manually configure your environment.

## 📋 Prerequisites

1. **Square Developer Account**
   - Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Create a new application or use existing one
   - Get sandbox credentials

2. **Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   ```

3. **Database Setup**
   - PostgreSQL database (local or cloud)
   - Supabase project (optional, for auth)

## 🔧 Environment Configuration

### 1. Square Sandbox Credentials

Get these from your Square Developer Dashboard:

```bash
# Square Sandbox Configuration
SQUARE_ENVIRONMENT=sandbox
USE_SQUARE_SANDBOX=true
SQUARE_CATALOG_USE_PRODUCTION=false
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# Sandbox Tokens
SQUARE_SANDBOX_TOKEN=EAAA...  # Your sandbox access token
SQUARE_SANDBOX_APPLICATION_ID=sandbox-sq0idb-...
SQUARE_LOCATION_ID=L...       # Your sandbox location ID

# Webhook Configuration
SQUARE_WEBHOOK_SECRET=your_webhook_secret
SQUARE_WEBHOOK_SECRET_SANDBOX=your_webhook_secret_sandbox
SQUARE_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Application URLs

```bash
# For Preview Environment
NEXT_PUBLIC_APP_URL=https://destino-sf-git-sandbox-your-username.vercel.app
NEXT_PUBLIC_SITE_URL=https://destino-sf-git-sandbox-your-username.vercel.app

# For Production with Sandbox Transactions
NEXT_PUBLIC_APP_URL=https://development.destinosf.com
NEXT_PUBLIC_SITE_URL=https://development.destinosf.com
```

### 3. Database Configuration

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database
DIRECT_URL=postgresql://username:password@host:port/database

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Authentication

```bash
# Generate a secure secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.vercel.app
```

### 5. Email Configuration

```bash
# Resend Email Service
RESEND_API_KEY=re_...
FROM_EMAIL=sandbox@destinosf.com
ADMIN_EMAIL=your-email@example.com
SHOP_NAME="Destino SF (Sandbox)"
```

## 🛠️ Manual Vercel Configuration

### Step 1: Set Environment Variables

```bash
# Navigate to your project directory
cd destino-sf

# Set environment variables for preview environment
vercel env add NEXT_PUBLIC_APP_URL preview
vercel env add SQUARE_ENVIRONMENT preview
vercel env add USE_SQUARE_SANDBOX preview
# ... continue for all variables
```

### Step 2: Deploy to Preview

```bash
# Create a new branch for sandbox testing
git checkout -b sandbox-test

# Deploy to preview environment
vercel

# Or deploy to production with sandbox config
vercel --prod
```

## 🧪 Testing Your Setup

### 1. Configuration Test

```bash
# Test Square configuration
curl https://your-domain.vercel.app/api/debug/square-config

# Expected response:
{
  "success": true,
  "envConfig": {
    "USE_SQUARE_SANDBOX": "true",
    "SQUARE_SANDBOX_TOKEN_EXISTS": true,
    "SQUARE_LOCATION_ID": "L..."
  },
  "tokenSelection": {
    "useSandbox": true,
    "selectedTokenSource": "SQUARE_SANDBOX_TOKEN",
    "hasSelectedToken": true
  }
}
```

### 2. Order Creation Test

1. Visit your deployed application
2. Add items to cart
3. Proceed to checkout
4. Complete a test order
5. Verify order appears in Square Sandbox Dashboard

### 3. Webhook Test

```bash
# Test webhook endpoint
curl -X POST https://your-domain.vercel.app/api/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## 🔍 Debugging

### Common Issues

#### 1. "Base URL missing" Error

**Problem**: `NEXT_PUBLIC_APP_URL` not set

**Solution**:
```bash
vercel env add NEXT_PUBLIC_APP_URL https://your-domain.vercel.app production
vercel --prod
```

#### 2. Square Authentication Error

**Problem**: Invalid or missing Square tokens

**Solution**:
```bash
# Check current configuration
curl https://your-domain.vercel.app/api/debug/square-production-fix

# Update tokens in Vercel
vercel env add SQUARE_SANDBOX_TOKEN your_new_token preview
```

#### 3. Database Connection Error

**Problem**: Invalid `DATABASE_URL`

**Solution**:
```bash
# Verify database URL format
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Update in Vercel
vercel env add DATABASE_URL "your_database_url" preview
```

### Debug Endpoints

Use these endpoints to diagnose issues:

- `/api/debug/square-config` - Square configuration status
- `/api/debug/square-production-fix` - Detailed Square analysis
- `/api/debug/auth-config` - Authentication configuration
- `/api/square/test-connection` - Square API connectivity

## 🔄 Environment Switching

### Switch to Production (Real Transactions)

```bash
# Update environment variables
vercel env add USE_SQUARE_SANDBOX false production
vercel env add SQUARE_CATALOG_USE_PRODUCTION true production
vercel env add SQUARE_TRANSACTIONS_USE_SANDBOX false production

# Deploy
vercel --prod
```

### Switch Back to Sandbox

```bash
# Update environment variables
vercel env add USE_SQUARE_SANDBOX true production
vercel env add SQUARE_CATALOG_USE_PRODUCTION false production
vercel env add SQUARE_TRANSACTIONS_USE_SANDBOX true production

# Deploy
vercel --prod
```

## 📊 Monitoring

### Vercel Logs

```bash
# View deployment logs
vercel logs

# View function logs
vercel logs --function=api/square/sync
```

### Square Dashboard

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to "Sandbox" tab
4. Monitor transactions and webhooks

## 🔒 Security Considerations

1. **Never commit secrets to git**
2. **Use different tokens for each environment**
3. **Regularly rotate API keys**
4. **Monitor API usage**
5. **Use environment-specific databases**

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application base URL | `https://your-domain.vercel.app` |
| `SQUARE_SANDBOX_TOKEN` | Square sandbox access token | `EAAA...` |
| `SQUARE_LOCATION_ID` | Square location ID | `L...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_SECRET` | Authentication secret | `base64-encoded-string` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_SQUARE_SANDBOX` | Enable sandbox mode | `true` |
| `SQUARE_CATALOG_USE_PRODUCTION` | Use production catalog | `false` |
| `BYPASS_RATE_LIMIT` | Bypass rate limiting | `true` |
| `NEXT_TELEMETRY_DISABLED` | Disable telemetry | `1` |

## 🚨 Troubleshooting

### Emergency Rollback

If something goes wrong:

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy with working configuration
vercel --prod
```

### Reset Environment

```bash
# Remove all environment variables
vercel env rm NEXT_PUBLIC_APP_URL production
vercel env rm SQUARE_SANDBOX_TOKEN production
# ... remove all variables

# Re-add with correct values
./scripts/setup-vercel-sandbox.sh
```

## 📞 Support

If you encounter issues:

1. Check the debug endpoints above
2. Review Vercel deployment logs
3. Check Square Developer Dashboard
4. Consult the troubleshooting documentation

## 🔄 Next Steps

After successful setup:

1. **Test all payment flows**
2. **Validate webhook processing**
3. **Test order management**
4. **Set up monitoring**
5. **Document any custom configurations** 