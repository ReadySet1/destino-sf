# 🚨 CRITICAL: Production Database Connection Fix

## Issue Summary
**Severity**: HIGH  
**Environment**: Production  
**Status**: NEEDS IMMEDIATE ATTENTION

Production webhooks are failing because the production environment is configured to connect to the development database instead of the production database.

## Root Cause
The production `DATABASE_URL` environment variable is pointing to:
- **Current (WRONG)**: `db.drrejylrcjbeldnzodjd.supabase.co:5432` (development)
- **Should be**: `db.ocusztulyiegeawqptrs.supabase.co:5432` (production)

## Error Details
```
PrismaClientInitializationError: Can't reach database server at `db.drrejylrcjbeldnzodjd.supabase.co:5432`
```

This error occurs in webhook processing at:
- Component: SquareWebhooks  
- Function: `handleOrderUpdated` → `withDatabaseConnection` → `ensureConnection`

## Immediate Fix Required

### 1. Update Production Environment Variables

**In your production environment (Vercel/deployment platform):**

Update the `DATABASE_URL` environment variable to use the production database:

```bash
# CORRECT Production DATABASE_URL format:
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.ocusztulyiegeawqptrs.supabase.co:5432/postgres?pgbouncer=true&statement_cache_size=0&prepared_statements=false"
```

### 2. Verification Steps

After updating the environment variable:

1. **Redeploy** the production application
2. **Test webhook processing** by triggering a Square webhook
3. **Monitor logs** for successful database connections
4. **Verify** no more connection errors to the development database

### 3. Database Connection Validation

Use this script to validate the connection configuration:

```typescript
// Add to a temporary validation script
import { checkDatabaseHealth } from '@/lib/db-utils';

async function validateProductionDB() {
  try {
    const health = await checkDatabaseHealth();
    console.log('Database Health:', health);
    
    if (health.connected) {
      console.log('✅ Database connection successful');
      console.log(`Response time: ${health.responseTime}ms`);
    } else {
      console.error('❌ Database connection failed:', health.error);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

validateProductionDB();
```

## Database Configuration Reference

### Development Database
- **Project ID**: `drrejylrcjbeldnzodjd`
- **Name**: `destino-development`
- **Host**: `db.drrejylrcjbeldnzodjd.supabase.co`
- **Status**: ACTIVE_HEALTHY

### Production Database  
- **Project ID**: `ocusztulyiegeawqptrs`
- **Name**: `destino-production`
- **Host**: `db.ocusztulyiegeawqptrs.supabase.co`
- **Status**: ACTIVE_HEALTHY

## Prevention Measures

### 1. Environment Validation
Add database host validation to prevent this issue:

```typescript
// Add to startup validation
function validateDatabaseEnvironment() {
  const dbUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && dbUrl?.includes('drrejylrcjbeldnzodjd')) {
    throw new Error('🚨 CRITICAL: Production environment is using development database!');
  }
  
  if (!isProduction && dbUrl?.includes('ocusztulyiegeawqptrs')) {
    console.warn('⚠️ WARNING: Development environment is using production database!');
  }
}
```

### 2. Connection Health Monitoring
Implement automated health checks to catch configuration issues early.

### 3. Environment Documentation
Maintain clear documentation of which database each environment should use.

## Timeline for Fix

1. **Immediate (0-15 minutes)**: Update production DATABASE_URL
2. **Short-term (15-30 minutes)**: Redeploy and verify fix
3. **Follow-up (1 hour)**: Implement prevention measures

## Testing the Fix

After implementing the fix, verify with these tests:

1. **Webhook Processing**: Send a test Square webhook
2. **Database Queries**: Run a simple database query via API
3. **Error Monitoring**: Check that database connection errors have stopped

## Related Files
- `/src/lib/db.ts` - Database connection configuration
- `/src/lib/db-utils.ts` - Connection health utilities  
- `/src/app/api/webhooks/square/route.ts` - Webhook handler where error occurs

## Validation Tools

### Database Configuration Validator
A new validation script has been created to detect and prevent this issue:

```bash
# Run the database configuration validator
pnpm validate-db

# Or directly with tsx
tsx scripts/validate-database-config.ts
```

This script will:
- ✅ Check database environment configuration
- ✅ Validate DATABASE_URL points to correct database
- ✅ Test database connectivity
- ✅ Report configuration issues with specific guidance

### Enhanced Error Handling
New webhook error handling has been implemented:
- Detects environment/database mismatches
- Provides specific troubleshooting guidance
- Categorizes errors by severity and type
- Includes suggested remediation actions

## Automated Prevention

The following automated safeguards are now in place:

1. **Startup Validation**: Database environment is validated on application startup
2. **Enhanced Error Messages**: Connection errors now include specific guidance
3. **Configuration Detection**: Automatically detects and warns about mismatched environments

## Notes
- Both databases are healthy and operational
- The issue is purely configuration-related
- No data corruption or loss has occurred
- This fix will immediately resolve the webhook failures
- Prevention measures are now in place to avoid recurrence
