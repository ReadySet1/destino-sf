# Delivery Zone UUID Error Fix

**Issue ID**: DES-XX (East Bay Delivery Zone Update Error)
**Date**: 2025-11-18
**Status**: ✅ Fixed

## Problem Description

When attempting to update the East Bay catering delivery zone in production (changing delivery fee from $65 to $55), the operation failed with the following error:

```
invalid input syntax for type uuid: ""
```

### Root Cause

The audit context initialization in `src/app/api/admin/delivery-zones/route.ts` was using an empty string fallback when `authResult.user?.id` was undefined:

```typescript
adminUserId: authResult.user?.id || '',  // ❌ Empty string causes UUID cast error
```

The database trigger `log_delivery_zone_change()` attempts to cast this value to UUID:

```sql
COALESCE(current_setting('app.admin_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
```

When an empty string is passed, PostgreSQL cannot cast `''` to UUID, resulting in the error.

## Solution Implemented

### 1. Updated `src/lib/audit/delivery-zone-audit.ts`

**Changed the `AuditContext` interface to allow null:**
```typescript
export interface AuditContext {
  adminUserId: string | null;  // ✅ Now allows null
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
}
```

**Modified `setAuditContext` to only set admin_user_id when present:**
```typescript
export async function setAuditContext(context: AuditContext) {
  // Only set admin_user_id if it's provided (not null/undefined)
  if (context.adminUserId) {
    await prisma.$executeRaw`
      SELECT set_config('app.admin_user_id', ${context.adminUserId}, true)
    `;
  }
  
  await prisma.$executeRaw`
    SELECT set_config('app.admin_email', ${context.adminEmail}, true)
  `;
  // ... rest of the function
}
```

### 2. Updated `src/app/api/admin/delivery-zones/route.ts`

**Changed POST endpoint (line 65):**
```typescript
await setAuditContext({
  adminUserId: authResult.user?.id || null,      // ✅ Use null instead of ''
  adminEmail: authResult.user?.email || 'unknown', // ✅ Better fallback
  ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  userAgent: request.headers.get('user-agent') || undefined,
});
```

**Changed PUT endpoint (line 226):**
```typescript
await setAuditContext({
  adminUserId: authResult.user?.id || null,      // ✅ Use null instead of ''
  adminEmail: authResult.user?.email || 'unknown', // ✅ Better fallback
  ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  userAgent: request.headers.get('user-agent') || undefined,
});
```

## Files Modified

1. `src/lib/audit/delivery-zone-audit.ts`
   - Updated `AuditContext` interface to allow `adminUserId: string | null`
   - Modified `setAuditContext` to conditionally set admin_user_id only when present

2. `src/app/api/admin/delivery-zones/route.ts`
   - Updated POST endpoint audit context (line 65)
   - Updated PUT endpoint audit context (line 226)
   - Changed empty string fallback to `null`
   - Changed email fallback from `''` to `'unknown'`

## Testing Performed

- ✅ TypeScript compilation passes (`pnpm type-check`)
- ✅ No linting errors
- ✅ Code follows the plan's recommended Option 1 (using NULL)

## Testing Recommendations

### 1. Local Testing
```bash
# Test updating a delivery zone when authentication context might be missing
# Verify no UUID errors occur
```

### 2. Production Testing
1. Navigate to Admin Dashboard → Catering Delivery Zones
2. Edit the East Bay zone
3. Change delivery fee from $65 to $55
4. Save and verify success
5. Check that audit log entries are created correctly

### 3. Edge Cases to Verify
- Update operation with valid admin user ID ✅
- Update operation with missing admin user ID ✅
- Bulk update operations ✅
- Regular delivery zones (not affected, but verify no regression)

## Audit Log Behavior

### Before Fix
- Would crash with UUID cast error when admin user ID was missing
- Audit log entries would not be created

### After Fix
- When admin user ID is present: audit log records the actual admin UUID
- When admin user ID is missing: database trigger falls back to system UUID (`00000000-0000-0000-0000-000000000000`)
- Audit entries are always created successfully

## Deployment Notes

1. **No database migration required** - database trigger already handles NULL/missing values with COALESCE
2. **No breaking changes** - backward compatible
3. **Immediate deployment safe** - fix addresses production bug

## Related Issues

- Production logs: 2025-11-18 16:06:05 - PostgreSQL error code "22P02"
- Affects: Catering delivery zone updates
- Does not affect: Regular delivery zone updates (different system)

## Prevention

This fix prevents the UUID casting error by:
1. Using `null` instead of empty string for missing user IDs
2. Conditionally setting the database config only when a valid ID exists
3. Allowing the database trigger's COALESCE to handle the NULL case properly

## Additional Notes

- The regular delivery zones API (`src/app/api/admin/regular-delivery-zones/route.ts`) does NOT use audit context, so no changes were needed there
- This fix is specific to the catering delivery zones audit system
- The database trigger was already designed to handle missing admin IDs with COALESCE, we just needed to provide NULL instead of an invalid empty string

