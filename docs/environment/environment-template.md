# Environment Configuration Template

Copy the configuration below to your `.env.local` file and customize it for your development environment.

## Complete .env.local Template

```env
# ============================================================================
# ENVIRONMENT CONFIGURATION TEMPLATE
# Copy this to .env.local and fill in your actual values
# ============================================================================

# ============================================================================
# CORE CONFIGURATION
# ============================================================================

# Node.js Environment
NODE_ENV=development

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000

# ============================================================================
# ENVIRONMENT DETECTION
# ============================================================================

# Infrastructure Environment (uncomment one)
# USE_LOCAL_DOCKER=true          # Use local Docker stack
# USE_SUPABASE_CLOUD=true        # Use Supabase cloud services

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Main Database URL (choose one based on your setup)
# For Local Docker:
DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf
# For Local PostgreSQL:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf
# For Supabase Cloud:
# DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
# For Production:
# DATABASE_URL=your-production-database-url

# Optional: Direct URL for connection pooling (Supabase)
# DIRECT_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres?pgbouncer=true

# Alternative Database URLs for Environment Switching
LOCAL_DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf
SUPABASE_DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================

# Supabase Cloud Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ============================================================================
# SQUARE PAYMENT INTEGRATION
# ============================================================================

# Square Environment Configuration
USE_SQUARE_SANDBOX=true
SQUARE_ENVIRONMENT=sandbox

# Square API Credentials
SQUARE_APPLICATION_ID=your-square-application-id
SQUARE_LOCATION_ID=your-square-location-id

# Square Access Tokens (use sandbox for development)
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_SANDBOX_TOKEN=your-square-sandbox-token
SQUARE_PRODUCTION_TOKEN=your-square-production-token

# Square Webhook Configuration
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key
SQUARE_WEBHOOK_SECRET=your-webhook-secret

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

# Resend Email Service
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
JAMES_EMAIL=james@yourdomain.com
SHOP_NAME=Your Shop Name

# ============================================================================
# SHIPPING CONFIGURATION
# ============================================================================

# Shippo Shipping Service
SHIPPO_API_KEY=your-shippo-api-key
SHIPPO_WEBHOOK_SECRET=your-shippo-webhook-secret
SHIPPO_TEST_MODE=true

# Shipping Origin Information
SHIPPING_ORIGIN_NAME=Your Business Name
SHIPPING_ORIGIN_COMPANY=Your Company
SHIPPING_ORIGIN_STREET1=123 Your Street
SHIPPING_ORIGIN_CITY=Your City
SHIPPING_ORIGIN_STATE=CA
SHIPPING_ORIGIN_ZIP=12345
SHIPPING_ORIGIN_COUNTRY=US
SHIPPING_ORIGIN_PHONE=+1234567890
SHIPPING_ORIGIN_EMAIL=shipping@yourdomain.com

# ============================================================================
# CONTENT MANAGEMENT (SANITY)
# ============================================================================

# Sanity CMS Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-sanity-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-sanity-api-token
NEXT_PUBLIC_SANITY_API_TOKEN=your-public-sanity-token

# ============================================================================
# EXTERNAL SERVICES
# ============================================================================

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Twilio (SMS notifications)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================================================
# CACHING & RATE LIMITING
# ============================================================================

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Rate Limiting Configuration
BYPASS_RATE_LIMIT=false

# ============================================================================
# MONITORING & ANALYTICS
# ============================================================================

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

# Mixpanel Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token

# Umami Analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-umami-website-id
NEXT_PUBLIC_UMAMI_SRC=https://analytics.yourdomain.com/script.js

# ============================================================================
# DEVELOPMENT & DEBUGGING
# ============================================================================

# Debug Configuration
DEBUG=false
VERBOSE_LOGGING=true
ENABLE_DEBUG_LOGGING=true

# Feature Flags
ENABLE_CATERING=true
ENABLE_ADMIN_FEATURES=true

# ============================================================================
# ENVIRONMENT-SPECIFIC CONFIGURATIONS
# ============================================================================

# Uncomment the section below that matches your development setup:

# Option 1: Full Local Development (Docker + Local Services)
# USE_LOCAL_DOCKER=true
# USE_SQUARE_SANDBOX=true
# DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf

# Option 2: Hybrid Development (Local App + Cloud Services)
# USE_SUPABASE_CLOUD=true
# USE_SQUARE_SANDBOX=true
# DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# Option 3: Cloud Development (All Cloud Services)
# USE_SUPABASE_CLOUD=true
# SQUARE_ENVIRONMENT=sandbox
# DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
```

## Setup Instructions

### 1. Create Your Environment File
```bash
# Create your environment file
cp docs/environment/environment-template.md .env.local

# Edit the file and remove the markdown formatting
# Keep only the content between the ```env blocks
```

### 2. Choose Your Development Environment

Pick one of these configurations:

#### Option A: Full Local Development
```env
USE_LOCAL_DOCKER=true
USE_SQUARE_SANDBOX=true
DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

#### Option B: Hybrid Development (Recommended)
```env
USE_SUPABASE_CLOUD=true
USE_SQUARE_SANDBOX=true
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

#### Option C: Cloud Development
```env
USE_SUPABASE_CLOUD=true
SQUARE_ENVIRONMENT=sandbox
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

### 3. Fill in Required Credentials

**Database (choose one):**
```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf

# Supabase Cloud
DATABASE_URL=postgresql://postgres:yourpassword@db.projectid.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://projectid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Square Payment (required):**
```env
SQUARE_ACCESS_TOKEN=your-sandbox-token
SQUARE_APPLICATION_ID=your-app-id
SQUARE_LOCATION_ID=your-location-id
```

**Email (required):**
```env
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

### 4. Test Your Configuration

```bash
# Check environment setup
pnpm env:check

# Show detailed info
pnpm env:info

# Validate all required services
pnpm env:validate
```

### 5. Start Development

```bash
# Standard development
pnpm dev

# Force specific environment
pnpm dev:local     # Local Docker
pnpm dev:cloud     # Cloud services
```

## Environment Variable Categories

### Critical (Required)
- `DATABASE_URL` - Database connection
- `NEXT_PUBLIC_APP_URL` - Application URL
- `SQUARE_ACCESS_TOKEN` - Payment processing
- `RESEND_API_KEY` - Email functionality

### Important (Recommended)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase integration
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase auth
- `SQUARE_APPLICATION_ID` - Square integration
- `NEXTAUTH_SECRET` - Authentication security

### Optional (Enhanced Features)
- `SHIPPO_API_KEY` - Shipping integration
- `UPSTASH_REDIS_REST_URL` - Caching and rate limiting
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Maps functionality
- `TWILIO_ACCOUNT_SID` - SMS notifications

### Development (Debug & Testing)
- `DEBUG` - Debug logging
- `VERBOSE_LOGGING` - Detailed logs
- `USE_LOCAL_DOCKER` - Force local environment
- `USE_SUPABASE_CLOUD` - Force cloud environment

## Quick Environment Switches

### Switch to Local Development
```bash
# Update .env.local
USE_LOCAL_DOCKER=true
DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf

# Start with local environment
pnpm dev:local
```

### Switch to Cloud Development
```bash
# Update .env.local
USE_SUPABASE_CLOUD=true
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# Start with cloud environment
pnpm dev:cloud
```

### Switch Square Environment
```bash
# For sandbox testing
USE_SQUARE_SANDBOX=true
SQUARE_ACCESS_TOKEN=your-sandbox-token

# For production testing
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=your-production-token
```

## Troubleshooting

### Missing Environment Variables
```bash
# Check what's missing
pnpm env:validate --verbose

# Show current configuration
pnpm env:info --sections config,connections
```

### Database Connection Issues
```bash
# Test database connection
pnpm db:status

# Check database environment
pnpm env:info --sections environments
```

### Square Integration Issues
```bash
# Test Square connection
pnpm square:sandbox

# Validate Square config
pnpm env:validate --require-square
```

### Debug Environment Detection
```bash
# Enable debug logging
DEBUG=true
VERBOSE_LOGGING=true
ENABLE_DEBUG_LOGGING=true

# Restart development server
pnpm dev
```

## Security Notes

### Production Environment
- Never commit `.env.local` to version control
- Use strong secrets (32+ characters) for `NEXTAUTH_SECRET`
- Use production Square tokens only in production
- Enable all security headers in production

### Development Environment
- Use sandbox/test tokens for all third-party services
- Local database credentials can be simple
- Debug logging is safe to enable
- Environment indicator helps avoid confusion

### Environment File Priority
1. `.env.local` (highest priority, local overrides)
2. `.env.development` (development-specific)
3. `.env` (shared defaults)
4. System environment variables (lowest priority)

Always use `.env.local` for your local development configuration.