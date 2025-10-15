# Webhook Timeout Optimization Fix

## Summary

This document outlines the comprehensive fix for the webhook processing timeout issues that were causing database connection pool exhaustion and webhook failures.

## Problem Analysis

The original issue showed these symptoms:

- `webhook-immediate-order.created timed out after 90000ms`
- `Timed out fetching a new connection from the connection pool`
- Connection pool timeout of 60s vs webhook timeout of 90s
- Only 5 database connections available vs multiple concurrent webhooks

## Root Causes Identified

1. **Connection Pool Exhaustion**: Default 5 connections with 60s timeout, but webhooks taking 90+ seconds
2. **Concurrency Issues**: Multiple webhooks running simultaneously without limits
3. **Timeout Mismatch**: 90s webhook timeout vs 60s database pool timeout
4. **Long-running Operations**: Each webhook holding database connections too long

## Fixes Implemented

### 1. Database Connection Pool Optimization

**File**: `src/lib/db.ts`

- **Increased connection limit**: From 5 to 20 connections for production
- **Extended pool timeout**: From 60s to 120s to match webhook timeouts
- **Optimized statement timeouts**: 45s (shorter than webhook timeout)
- **Added connection timeout**: 10s to connect, 45s socket timeout

```typescript
// BEFORE
url.searchParams.set('pool_timeout', '60');
url.searchParams.delete('connection_limit'); // Default 5

// AFTER
url.searchParams.set('connection_limit', '20');
url.searchParams.set('pool_timeout', '120');
url.searchParams.set('statement_timeout', '45000');
url.searchParams.set('connect_timeout', '10');
```

### 2. Webhook Concurrency Control

**File**: `src/lib/webhook-queue.ts`

- **Added concurrency limits**: Max 3 concurrent webhooks to prevent pool exhaustion
- **Connection tracking**: Track active webhook connections
- **Queueing when at capacity**: Automatic queuing when limits reached

```typescript
// NEW: Concurrency control
private activeWebhookConnections = 0;
private readonly maxConcurrentWebhooks = 3;

// Check limits before processing
if (this.activeWebhookConnections >= this.maxConcurrentWebhooks) {
  console.log(`⏸️ Webhook processing at capacity, queuing instead`);
  // Queue with delay instead of immediate processing
}
```

### 3. Optimized Database Operations

**File**: `src/lib/db-utils.ts`

- **Created webhook-specific queries**: `safeWebhookQuery()` with reduced retries
- **Faster timeouts**: Reduced retry count from 3 to 2 for webhook operations
- **Optimized connection management**: Better connection cleanup

```typescript
// NEW: Optimized for webhooks
export async function safeWebhookQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  return withDatabaseConnection(queryFn, 2); // Reduced retries for webhooks
}
```

### 4. Database Performance Optimization

**Applied Migration**: `cleanup_unused_indexes_performance_optimization`

Removed 15+ unused indexes identified by Supabase advisor:

- `products_ordinal_idx`, `products_syncSource_idx`, `products_sync_status_idx`
- `catering_delivery_zones_*`, `payments_status_idx`, `refunds_paymentId_idx`
- `sync_history_*`, `shipping_configurations_isActive_idx`

**Benefits**:

- Faster INSERT/UPDATE operations
- Reduced index maintenance overhead
- Improved overall database performance

## Performance Improvements

### Before Fix

- ❌ 5 database connections
- ❌ 60s pool timeout vs 90s webhook timeout
- ❌ Unlimited concurrent webhooks
- ❌ Multiple unused indexes slowing operations
- ❌ Connection pool exhaustion leading to failures

### After Fix

- ✅ 20 database connections (4x increase)
- ✅ 120s pool timeout matching webhook requirements
- ✅ Maximum 3 concurrent webhooks with queuing
- ✅ Optimized database queries with faster retries
- ✅ Cleaned up unused indexes for better performance

## Expected Results

1. **Eliminated timeout errors**: Connection pool can now handle webhook load
2. **Reduced connection exhaustion**: Concurrency limits prevent overload
3. **Faster webhook processing**: Optimized queries and reduced connection hold time
4. **Better error recovery**: Improved retry logic with faster failures
5. **Improved database performance**: Removed unused indexes

## Monitoring and Validation

### Key Metrics to Monitor

1. **Webhook Success Rate**: Should increase significantly
2. **Connection Pool Usage**: Monitor active connections vs limit
3. **Webhook Processing Time**: Should be more consistent
4. **Database Response Time**: Should improve with index cleanup

### Log Patterns to Watch For

```bash
# Success patterns
🔗 Prisma configured for Vercel serverless with optimized connection pooling (20 connections, 120s pool timeout)
🔗 Starting webhook processing (1/3 active): order.created
✅ Webhook processed successfully via queue: order.created

# Concurrency control working
⏸️ Webhook processing at capacity (3/3), delaying: order.updated
⏸️ Immediate webhook processing at capacity, queuing instead: payment.created
```

### Troubleshooting

If issues persist:

1. **Check connection pool usage**: Look for "Starting webhook processing (X/3 active)" logs
2. **Monitor queue processing**: Ensure queued webhooks are being processed
3. **Database health**: Use Supabase dashboard to monitor connection pool
4. **Retry patterns**: Check if webhooks are successfully retrying

## Files Modified

1. `src/lib/db.ts` - Database connection pool optimization
2. `src/lib/webhook-queue.ts` - Concurrency control and queue management
3. `src/lib/db-utils.ts` - Optimized webhook queries
4. `src/app/api/webhooks/square/route.ts` - Updated to use optimized queries
5. Database migration - Removed unused indexes

## Configuration Changes

### Environment Variables

No environment variable changes required. The optimizations are automatic based on the `NODE_ENV` and `VERCEL` environment detection.

### Database Settings

The migration automatically removes unused indexes. No manual database configuration needed.

## Rollback Plan

If issues arise, you can:

1. **Revert code changes**: Use git to revert to previous versions
2. **Restore indexes**: Re-run Prisma migration to recreate indexes if needed
3. **Reduce connection limits**: Temporarily reduce connection limits if needed

## Success Criteria

- [ ] Webhook timeout errors eliminated
- [ ] Connection pool exhaustion resolved
- [ ] Webhook processing time improved
- [ ] Database performance optimized
- [ ] No phantom order creation issues

The fix addresses all root causes and should significantly improve webhook reliability and performance.
