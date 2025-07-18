# Environment Variables Reference

Complete reference for all environment variables used in the Destino SF platform.

## Required Environment Variables

### Database Configuration
```env
# PostgreSQL database connection
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Example for local development
DATABASE_URL="postgresql://postgres:password@localhost:5432/destino_sf"

# Example for production (Neon, PlanetScale, etc.)
DATABASE_URL="postgresql://user:pass@host.region.provider.com:5432/dbname"
```

### Next.js Configuration
```env
# Required for authentication
NEXTAUTH_SECRET="your-secret-key-here-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"  # or your production URL

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Square Payment Integration
```env
# Square API credentials
SQUARE_APPLICATION_ID="your-square-application-id"
SQUARE_ACCESS_TOKEN="your-square-access-token"
SQUARE_ENVIRONMENT="sandbox"  # or "production"

# Square webhook signature key (for webhook verification)
SQUARE_WEBHOOK_SIGNATURE_KEY="your-webhook-signature-key"

# Public keys for frontend
NEXT_PUBLIC_SQUARE_APPLICATION_ID="your-square-application-id"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"
```

### Shippo Shipping Integration
```env
# Shippo API token
SHIPPO_TOKEN="your-shippo-api-token"

# Shippo webhook configuration
SHIPPO_WEBHOOK_SECRET="your-shippo-webhook-secret"
```

### Email Configuration
```env
# Email service provider (Resend, SendGrid, etc.)
EMAIL_FROM="noreply@destinosf.com"
RESEND_API_KEY="your-resend-api-key"

# Or for SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"

# SMTP configuration (alternative)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
```

## Optional Environment Variables

### Caching and Performance
```env
# Vercel KV (Redis) for caching
KV_REST_API_URL="your-kv-rest-api-url"
KV_REST_API_TOKEN="your-kv-rest-api-token"

# Cache TTL settings (in seconds)
CACHE_TTL_PRODUCTS="300"      # 5 minutes
CACHE_TTL_CATEGORIES="3600"   # 1 hour
CACHE_TTL_SHIPPING="900"      # 15 minutes
```

### File Storage
```env
# Vercel Blob storage
BLOB_READ_WRITE_TOKEN="your-blob-storage-token"

# Alternative: AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="your-s3-bucket-name"
AWS_S3_REGION="us-west-2"
```

### Analytics and Monitoring
```env
# Sentry error tracking
SENTRY_DSN="your-sentry-dsn"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"

# Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS="true"
```

### Feature Flags
```env
# Feature toggles
ENABLE_CATERING="true"
ENABLE_ADMIN_FEATURES="true"
ENABLE_PRODUCT_REVIEWS="false"
ENABLE_LOYALTY_PROGRAM="false"

# Maintenance mode
MAINTENANCE_MODE="false"
MAINTENANCE_MESSAGE="We're currently updating our system. Please check back soon."
```

### Rate Limiting
```env
# Rate limiting configuration
RATE_LIMIT_WINDOW="900000"    # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS="100"

# Admin rate limits
ADMIN_RATE_LIMIT_MAX="1000"
```

## Development Environment Variables

### Local Development
```env
# .env.local
NODE_ENV="development"
PORT="3000"

# Debug settings
DEBUG="false"
VERBOSE_LOGGING="true"

# Test database
TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/destino_sf_test"
```

### Testing Environment
```env
# .env.test
NODE_ENV="test"
DATABASE_URL="postgresql://postgres:password@localhost:5432/destino_sf_test"

# Test API keys (use sandbox/test credentials)
SQUARE_ACCESS_TOKEN="sandbox_test_token"
SHIPPO_TOKEN="test_shippo_token"

# Disable external services in tests
DISABLE_EMAILS="true"
DISABLE_WEBHOOKS="true"
```

## Production Environment Variables

### Security
```env
# Strong secrets for production
NEXTAUTH_SECRET="super-secure-secret-at-least-32-characters-long"

# Production URLs
NEXTAUTH_URL="https://destinosf.com"
NEXT_PUBLIC_APP_URL="https://destinosf.com"

# HTTPS only cookies
SECURE_COOKIES="true"
```

### Performance
```env
# Production optimizations
NODE_ENV="production"
OPTIMIZE_IMAGES="true"
ENABLE_COMPRESSION="true"

# CDN configuration
CDN_URL="https://cdn.destinosf.com"
IMAGE_CDN_URL="https://images.destinosf.com"
```

### Monitoring
```env
# Production monitoring
LOG_LEVEL="warn"
ENABLE_METRICS="true"
HEALTH_CHECK_INTERVAL="30000"  # 30 seconds

# Error reporting
SENTRY_ENVIRONMENT="production"
SENTRY_RELEASE="1.0.0"
```

## Environment-Specific Configurations

### Development (.env.local)
```env
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/destino_sf"
NEXTAUTH_SECRET="development-secret-key-minimum-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Square Sandbox
SQUARE_APPLICATION_ID="sandbox-sq0idb-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
SQUARE_ACCESS_TOKEN="EAAAEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
SQUARE_ENVIRONMENT="sandbox"
NEXT_PUBLIC_SQUARE_APPLICATION_ID="sandbox-sq0idb-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"

# Shippo Test
SHIPPO_TOKEN="shippo_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Email (development)
EMAIL_FROM="dev@destinosf.com"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Debug settings
DEBUG="true"
VERBOSE_LOGGING="true"
```

### Staging (.env.staging)
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@staging-db.com:5432/destino_staging"
NEXTAUTH_SECRET="staging-secret-key-different-from-prod"
NEXTAUTH_URL="https://staging.destinosf.com"
NEXT_PUBLIC_APP_URL="https://staging.destinosf.com"

# Square Sandbox (staging uses sandbox)
SQUARE_APPLICATION_ID="sandbox-sq0idb-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
SQUARE_ACCESS_TOKEN="EAAAEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
SQUARE_ENVIRONMENT="sandbox"
NEXT_PUBLIC_SQUARE_APPLICATION_ID="sandbox-sq0idb-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="sandbox"

# Shippo Test
SHIPPO_TOKEN="shippo_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Email (staging)
EMAIL_FROM="staging@destinosf.com"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Monitoring
SENTRY_DSN="https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx"
SENTRY_ENVIRONMENT="staging"
```

### Production (.env.production)
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-db.com:5432/destino_production"
NEXTAUTH_SECRET="production-secret-very-secure-and-unique"
NEXTAUTH_URL="https://destinosf.com"
NEXT_PUBLIC_APP_URL="https://destinosf.com"

# Square Production
SQUARE_APPLICATION_ID="sq0idp-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
SQUARE_ACCESS_TOKEN="EAAAEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
SQUARE_ENVIRONMENT="production"
NEXT_PUBLIC_SQUARE_APPLICATION_ID="sq0idp-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_SQUARE_ENVIRONMENT="production"

# Shippo Production
SHIPPO_TOKEN="shippo_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Email (production)
EMAIL_FROM="orders@destinosf.com"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Performance
ENABLE_COMPRESSION="true"
OPTIMIZE_IMAGES="true"

# Monitoring
SENTRY_DSN="https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx"
SENTRY_ENVIRONMENT="production"
LOG_LEVEL="error"
```

## Validation and Security

### Environment Variable Validation
```typescript
// lib/env.ts - Environment validation
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // Square
  SQUARE_APPLICATION_ID: z.string(),
  SQUARE_ACCESS_TOKEN: z.string(),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']),
  
  // Shippo
  SHIPPO_TOKEN: z.string(),
  
  // Email
  EMAIL_FROM: z.string().email(),
  RESEND_API_KEY: z.string().optional(),
  
  // Optional
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
});

export const env = envSchema.parse(process.env);
```

### Security Best Practices

1. **Never commit sensitive values to version control**
2. **Use different secrets for each environment**
3. **Rotate secrets regularly**
4. **Use strong, randomly generated secrets**
5. **Validate environment variables at startup**
6. **Use least privilege principle for API keys**

### Vercel Environment Variable Setup

```bash
# Set production environment variables
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add SQUARE_ACCESS_TOKEN production

# Set staging environment variables
vercel env add NEXTAUTH_SECRET preview
vercel env add DATABASE_URL preview

# Development environment variables are in .env.local
```

## Troubleshooting

### Common Issues

**Database Connection Errors**
```env
# Ensure DATABASE_URL is correctly formatted
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

**Square Payment Errors**
```env
# Verify Square environment matches token type
SQUARE_ENVIRONMENT="sandbox"  # for sandbox tokens
SQUARE_ENVIRONMENT="production"  # for production tokens
```

**Authentication Issues**
```env
# Ensure NEXTAUTH_SECRET is at least 32 characters
NEXTAUTH_SECRET="your-very-long-secret-key-here-minimum-32-characters"

# NEXTAUTH_URL must match your deployment URL
NEXTAUTH_URL="https://yourdomain.com"  # not localhost in production
```

### Environment Variable Debugging

```typescript
// Add to your page or API route for debugging
export function GET() {
  const envStatus = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    SQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  };
  
  return Response.json(envStatus);
}
```

## Related Documentation

- [Environment Setup Guide](../getting-started/environment-setup.md)
- [Development Setup](../getting-started/development-setup.md)
- [Deployment Configuration](../deployment/environment-configuration.md)
- [Security Overview](../security/overview.md)

---

Keep this reference handy when setting up new environments or troubleshooting configuration issues.
