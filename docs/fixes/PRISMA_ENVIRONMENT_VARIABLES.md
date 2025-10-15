# Prisma Environment Variables for Production Fix

## Overview

This document outlines the required environment variables for the comprehensive Prisma prepared statement fix implemented to resolve production issues on Vercel.

## Critical Environment Variables

### Required Variables

#### `DATABASE_URL`

**Purpose**: Primary database connection string with pgBouncer compatibility parameters  
**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]?[parameters]`  
**Production Example**:

```bash
DATABASE_URL="postgresql://username:password@host.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0&prepared_statements=false"
```

**Key Parameters for Vercel Production**:

- `pgbouncer=true` - Enables pgBouncer compatibility mode
- `statement_cache_size=0` - Disables prepared statement caching (CRITICAL)
- `prepared_statements=false` - Explicitly disables prepared statements
- `pool_timeout=60` - Connection pool timeout (60 seconds)
- `statement_timeout=30000` - SQL statement timeout (30 seconds)
- `idle_in_transaction_session_timeout=30000` - Idle transaction timeout (30 seconds)

#### `VERCEL` (Auto-populated)

**Purpose**: Automatically set by Vercel to identify serverless environment  
**Value**: `"1"` when running on Vercel  
**Usage**: Used by Prisma client to apply Vercel-specific optimizations

### Optional Variables

#### `DIRECT_DATABASE_URL`

**Purpose**: Direct connection URL bypassing pooler (fallback option)  
**Format**: `postgresql://[user]:[password]@[host]:5432/[database]`  
**Usage**: Can be used as fallback for non-pooled connections if needed

#### `NODE_ENV`

**Purpose**: Environment identifier  
**Values**: `"development"`, `"production"`, `"test"`  
**Usage**: Controls logging levels and timeout configurations

## Environment-Specific Configurations

### Vercel Production Environment

```bash
# Required
DATABASE_URL="postgresql://user:pass@host.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0&prepared_statements=false&pool_timeout=60&statement_timeout=30000&idle_in_transaction_session_timeout=30000"

# Auto-populated by Vercel
VERCEL="1"
NODE_ENV="production"

# Optional fallback
DIRECT_DATABASE_URL="postgresql://user:pass@host.supabase.co:5432/postgres"
```

### Local Development Environment

```bash
# Local development (no special pooling parameters needed)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?statement_timeout=60000&idle_in_transaction_session_timeout=60000"

NODE_ENV="development"
```

### Staging/Preview Environment

```bash
# Similar to production but may use different database
DATABASE_URL="postgresql://user:pass@staging-host.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_cache_size=0&prepared_statements=false"

NODE_ENV="production"
VERCEL="1"
```

## Verification

### Health Check Endpoint

Use the enhanced health check endpoint to verify configuration:

```bash
# Check production health
curl https://your-app.vercel.app/api/health/db

# Expected response should include:
{
  "status": "healthy",
  "environment": {
    "isVercel": true,
    "nodeEnv": "production",
    "pgBouncer": true,
    "preparedStatementsDisabled": true
  },
  "prepared_statement_errors": 0
}
```

### Configuration Validation

The Prisma client will log configuration details:

```
🔗 Configuring Prisma for Vercel production with pgBouncer compatibility
🔧 Prisma configured for Vercel serverless with disabled prepared statements
```

## Troubleshooting

### Common Issues

1. **Still getting prepared statement errors**:
   - Verify `statement_cache_size=0` is in DATABASE_URL
   - Check that `prepared_statements=false` is included
   - Ensure no conflicting parameters like `prepare=true`

2. **Connection timeout errors**:
   - Increase `pool_timeout` value (default: 60 seconds)
   - Check `statement_timeout` and `idle_in_transaction_session_timeout`

3. **Performance degradation**:
   - Monitor query times through health check endpoint
   - Consider implementing Redis caching layer
   - Evaluate if direct connection is needed for specific operations

### Error Codes to Monitor

- `42P05`: "prepared statement already exists"
- `26000`: "prepared statement does not exist"
- `P1001`: Prisma connection errors
- `P1008`: Operation timeout errors

## Migration Path

### From Previous Configuration

If migrating from a previous Prisma setup:

1. **Update DATABASE_URL** with new parameters
2. **Deploy to Vercel preview** for testing
3. **Monitor health endpoint** for 24 hours
4. **Deploy to production** when stable
5. **Monitor logs** for prepared statement errors

### Rollback Plan

If issues persist:

1. **Revert to previous deployment** in Vercel dashboard
2. **Switch to DIRECT_DATABASE_URL** temporarily
3. **Implement connection rate limiting** if using direct connection

## Performance Impact

### Expected Changes

- **Slight increase** in query latency (5-15ms) due to disabled prepared statements
- **Improved reliability** with zero prepared statement errors
- **Better serverless compatibility** with pgBouncer

### Monitoring Recommendations

- Monitor `/api/health/db` endpoint regularly
- Watch for response times > 500ms (degraded status)
- Track prepared statement error count (should be 0)
- Monitor Vercel function execution times

## Related Documentation

- [Prisma Fix Plan v2](./prisma-fix-plan-v2.md)
- [Database Connection Management](../architecture/database-design.md)
- [Vercel Deployment Guide](../deployment/vercel-deployment.md)
