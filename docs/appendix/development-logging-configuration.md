# Development Logging Configuration

## Overview

This document describes the logging configuration options available during development to help debug issues without cluttering the development console.

## Database Debug Logging

### DB_DEBUG Environment Variable

The `DB_DEBUG` environment variable controls the verbosity of database connection logging.

**Default:** `false` (logging disabled)
**To enable:** Add `DB_DEBUG=true` to your `.env.local` file

#### When DB_DEBUG=false (default)
- Database connection messages are suppressed
- Prisma client initialization is silent
- Connection retry attempts are not logged
- Only errors are shown

#### When DB_DEBUG=true
- Full database connection flow is logged
- Shows environment and pooler configuration
- Displays connection attempts and retries
- Logs successful connections and verifications

### Example Output Comparison

**DB_DEBUG=false (Clean logs):**
```
 ✓ Compiled / in 4s (1544 modules)
 GET / 200 in 5057ms
 ✓ Compiled /api/spotlight-picks in 422ms (1470 modules)
 GET /api/spotlight-picks 200 in 2077ms
```

**DB_DEBUG=true (Verbose logs):**
```
 ✓ Compiled / in 4s (1544 modules)
 🔗 Building database URL for development environment
 🔗 Supabase pooler: false
 🔌 Connecting Prisma client...
 ✅ Prisma client connected successfully
 ✅ Prisma connection verified
 ✅ Unified Prisma client initialized successfully
 GET / 200 in 5057ms
```

## Implementation Details

The database debug logging is implemented in:
- `src/lib/db-unified.ts` - Main database connection handling
- `src/lib/db-optimized.ts` - Optimized Vercel connection handling

All database-related console.log statements are wrapped in:
```typescript
if (process.env.DB_DEBUG === 'true') {
  console.log('Debug message here');
}
```

## Other Logging Controls

### Error Handling
- TimeoutError messages are now filtered out of Sentry reporting
- AbortError logging is minimized in development
- Full error objects are only logged in development mode

### Timeout Error Suppression
The following timeout-related errors are automatically suppressed in production logs:
- Database connection timeouts
- API request timeouts (AbortController)
- Webhook processing timeouts

## Best Practices

1. **Default State**: Keep `DB_DEBUG=false` for normal development
2. **Debugging**: Only enable `DB_DEBUG=true` when investigating connection issues
3. **Production**: Never set `DB_DEBUG=true` in production environments
4. **Commit Safety**: Never commit `.env.local` files with debug flags enabled

## Related Configuration

- Sentry error filtering: `sentry.client.config.ts`
- Database connection settings: `src/lib/db-unified.ts`
- Webhook timeout handling: `src/lib/webhook-processor.ts`
