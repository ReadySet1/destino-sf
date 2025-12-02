# Database Troubleshooting Guide

## Current Supabase Project IDs

| Environment | Project ID                | Region     |
| ----------- | ------------------------- | ---------- |
| Development | `drrejylrcjbeldnzodjd`    | us-west-1  |
| Production  | `ocusztulyiegeawqptrs`    | us-west-1  |

> **WARNING**: The old project ID `avfiuivgvkgaovkqjnup` is DEPRECATED and should not be used.

---

## Common Error: "FATAL: Tenant or user not found"

### What This Error Means

This PostgreSQL authentication error occurs when the DATABASE_URL has an incorrect username format. The Supabase connection pooler requires a specific username format.

### Root Cause

The Supabase pooler requires the username to be `postgres.PROJECT_ID`, not just `postgres`.

**Incorrect:**
```
postgresql://postgres:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Correct:**
```
postgresql://postgres.ocusztulyiegeawqptrs:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Required DATABASE_URL Format

```
postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false&statement_cache_size=0
```

**Components:**
- **Username**: `postgres.PROJECT_ID` (e.g., `postgres.ocusztulyiegeawqptrs`)
- **Password**: Your database password (from Supabase Dashboard)
- **Host**: `aws-0-REGION.pooler.supabase.com` (e.g., `aws-0-us-west-1.pooler.supabase.com`)
- **Port**: `6543` (transaction pooler port)
- **Database**: `postgres`
- **Required Parameters**:
  - `pgbouncer=true`
  - `prepared_statements=false`
  - `statement_cache_size=0`

### Environment-Specific Examples

**Production:**
```
postgresql://postgres.ocusztulyiegeawqptrs:YOUR_PASSWORD@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false&statement_cache_size=0
```

**Development:**
```
postgresql://postgres.drrejylrcjbeldnzodjd:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false&statement_cache_size=0
```

> **Note**: The `aws-X` prefix may vary (aws-0, aws-1, etc.). Use the exact host from your Supabase Dashboard.

### How to Fix in Vercel

1. **Check current DATABASE_URL:**
   ```bash
   vercel env ls production
   ```

2. **Remove incorrect variable:**
   ```bash
   vercel env rm DATABASE_URL production
   ```

3. **Add correct variable:**
   ```bash
   vercel env add DATABASE_URL production
   # Paste the correct URL format when prompted
   ```

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Validation Checklist

Before deploying, verify your DATABASE_URL:

- [ ] Username is `postgres.PROJECT_ID` (not just `postgres`)
- [ ] Project ID matches environment (dev vs prod)
- [ ] Port is `6543` (transaction pooler)
- [ ] Host includes correct region (`us-west-1`)
- [ ] Includes `pgbouncer=true` parameter
- [ ] Includes `prepared_statements=false` parameter
- [ ] Includes `statement_cache_size=0` parameter

---

## Other Common Errors

### "Can't reach database server" (P1001)

**Causes:**
- Supabase project is paused
- Network connectivity issues
- Incorrect host/region in DATABASE_URL

**Solutions:**
1. Check Supabase status: https://status.supabase.com
2. Verify project is not paused in Supabase Dashboard
3. Confirm host and region are correct

### "Connection pool timeout" (P2024)

**Causes:**
- Too many concurrent connections
- Long-running queries blocking connections
- Connection pool exhaustion

**Solutions:**
1. Review connection pool settings in `src/lib/db-unified.ts`
2. Check for long-running queries
3. Consider increasing pool size in Supabase Dashboard

---

## Diagnostic Tools

### Quick URL Check

The application now validates DATABASE_URL format at startup. Enable debug logging to see validation results:

```bash
DB_DEBUG=true vercel dev
```

### Connection Diagnostics

Use the diagnostics utility to troubleshoot connection issues:

```typescript
import { runConnectionDiagnostics, formatDiagnosticsReport } from '@/lib/db-diagnostics';

const diagnostics = await runConnectionDiagnostics();
console.log(formatDiagnosticsReport(diagnostics));
```

---

## Related Files

- `src/lib/db-unified.ts` - Primary database client
- `src/lib/db-environment-validator.ts` - Environment validation
- `src/lib/db-diagnostics.ts` - Diagnostic utilities
- `src/lib/db-connection-manager.ts` - Connection management

---

## Getting Help

If you continue to experience issues:

1. Enable debug logging: `DB_DEBUG=true`
2. Check Supabase Dashboard for project status
3. Review Vercel logs for detailed error messages
4. Run the connection diagnostics utility
