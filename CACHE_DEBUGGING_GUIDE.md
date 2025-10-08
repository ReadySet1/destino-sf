# Cache Debugging Guide - Next.js 15 Availability Rules

This guide helps diagnose and fix persistent cache issues in the availability rules system.

## Understanding Next.js 15 Cache Layers

### 1. **Client-Side Router Cache** (30 seconds default)
- **What it caches**: React Server Component payloads
- **When it's used**: Navigation via `<Link>` or `router.push()`
- **How to clear**: `router.refresh()`
- **Status**: ✅ **IMPLEMENTED** in AvailabilityForm

### 2. **Server-Side Full Route Cache** (until revalidated)
- **What it caches**: Rendered HTML and RSC payload
- **When it's used**: Production builds
- **How to clear**: `revalidatePath()` or `export const dynamic = 'force-dynamic'`
- **Status**: ✅ **IMPLEMENTED** in actions and pages

### 3. **Server-Side Data Cache** (until revalidated)
- **What it caches**: `fetch()` results and database queries
- **When it's used**: All data fetching
- **How to clear**: `revalidatePath()` or `revalidateTag()`
- **Status**: ✅ **IMPLEMENTED** in server actions

### 4. **Browser Cache** (controlled by headers)
- **What it caches**: Static assets and API responses
- **When it's used**: All HTTP requests
- **How to clear**: Cache-Control headers
- **Status**: ⚠️ May need headers if using API routes

---

## Diagnostic Checklist

If the UI still shows stale data after updating availability rules:

### Step 1: Verify Database Update
```bash
# Connect to your database and check
psql $DATABASE_URL -c "SELECT id, name, state, \"updatedAt\" FROM availability_rules WHERE id = 'YOUR_RULE_ID';"
```

**Expected**: `state` should be 'pre_order' and `updatedAt` should be recent.

### Step 2: Check Server Cache
Add this to `/admin/products/page.tsx`:

```tsx
import { CacheDebugger } from '@/lib/cache/cache-debugger';

export default async function ProductsPage({ searchParams }: ProductPageProps) {
  // Add this at the top
  if (process.env.NODE_ENV === 'development') {
    await CacheDebugger.log('products-page');
  }

  // ... rest of component
}
```

**Expected Output**:
```
[Cache Debug: products-page] {
  timestamp: '2025-01-09T...',
  cacheStatus: 'MISS' or 'REVALIDATED',  // Should NOT be 'HIT'
  ...
}
```

### Step 3: Check Client Router Cache
Add this to your browser console after navigating back:

```js
// Check if router cache is being used
performance.getEntriesByType('navigation')[0].type
// Expected: 'reload' or 'navigate' (NOT 'back_forward')
```

### Step 4: Verify router.refresh() is Called
Add console.log to `AvailabilityForm.tsx`:

```tsx
// After successful update
router.refresh();
console.log('[AvailabilityForm] Router cache refreshed at:', new Date().toISOString());
```

---

## Solutions by Cache Layer

### Solution 1: Force Router Refresh (PRIMARY - ✅ IMPLEMENTED)

**Location**: `src/components/admin/availability/AvailabilityForm.tsx`

```tsx
// After successful update
if (successCount.length > 0) {
  toast.success('Rule updated successfully');

  // Force refresh router cache
  router.refresh();  // ✅ Already implemented

  if (onSuccess) {
    onSuccess({} as any);
  }
}
```

### Solution 2: Cache Busting via URL (FALLBACK)

If `router.refresh()` doesn't work, add timestamp to URL:

```tsx
import { getCacheBustParam } from '@/lib/cache/cache-debugger';

// After successful update
const backUrl = `/admin/products?${getCacheBustParam()}`;
router.push(backUrl);
```

### Solution 3: Disable Router Cache (NUCLEAR OPTION)

Add to `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,      // Disable router cache for dynamic routes
      static: 0,       // Disable router cache for static routes
    },
  },
}
```

⚠️ **Warning**: This disables ALL router caching and may impact performance.

### Solution 4: Use Cache Tags (ADVANCED)

**Step 1**: Add tags to server actions in `src/actions/availability.ts`:

```tsx
import { revalidateTag } from 'next/cache';

export async function updateAvailabilityRule(
  ruleId: string,
  updates: Partial<AvailabilityRule>
) {
  // ... existing code ...

  // Instead of revalidatePath, use tags
  revalidateTag('products');
  revalidateTag(`product-${result.productId}`);
  revalidateTag('availability-rules');

  return { success: true, data: result };
}
```

**Step 2**: Add tags to queries in `src/app/(dashboard)/admin/products/page.tsx`:

```tsx
const productsFromDb = await prisma.product.findMany({
  where,
  // ... other options
});

// Tag this query
if (typeof productsFromDb !== 'undefined') {
  // Use Next.js cache API
  unstable_cache(
    async () => productsFromDb,
    ['products'],
    {
      tags: ['products', 'availability-rules'],
      revalidate: false,
    }
  );
}
```

---

## Testing the Fix

### Manual Test Procedure

1. **Setup**: Open Developer Console (F12)
2. **Navigate** to `/admin/products`
3. **Edit** an availability rule (e.g., change "view only" → "Pre-Order")
4. **Check Console**: Look for `[AvailabilityForm] Router cache refreshed at: ...`
5. **Navigate Back**: Click "Back to Overview"
6. **Verify Badge**: Product should show "Pre-Order" badge (not "view only")

### Automated Test (Add to test suite)

```tsx
// src/__tests__/availability/cache-invalidation.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { updateAvailabilityRule } from '@/actions/availability';

describe('Availability Cache Invalidation', () => {
  it('should show updated state after rule update', async () => {
    // 1. Update rule
    await updateAvailabilityRule('rule-id', { state: 'pre_order' });

    // 2. Navigate to product list
    const { rerender } = render(<ProductListPage />);

    // 3. Verify badge updated
    await waitFor(() => {
      expect(screen.getByText('Pre-Order')).toBeInTheDocument();
      expect(screen.queryByText('view only')).not.toBeInTheDocument();
    });
  });
});
```

---

## Common Issues & Fixes

### Issue 1: Badge Still Shows Old State

**Symptom**: After clicking "Back", badge shows "view only" instead of "Pre-Order"

**Diagnosis**:
1. Check if `router.refresh()` is being called
2. Check browser network tab - should see new request to `/admin/products`
3. Verify `revalidatePath('/admin/products')` in server action

**Fix**: Already implemented ✅

### Issue 2: Works in Development, Fails in Production

**Symptom**: Cache invalidation works locally but not on Vercel

**Diagnosis**:
1. Check Vercel logs for cache headers
2. Verify `export const dynamic = 'force-dynamic'` in page.tsx
3. Check if Vercel is applying additional caching

**Fix**:
```tsx
// Add to page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';  // Use Node.js runtime (not Edge)
```

### Issue 3: Multiple Users See Each Other's Changes

**Symptom**: User A's changes appear for User B without refresh

**Diagnosis**: This is actually CORRECT behavior with revalidatePath()

**Fix**: If you want user-specific caching:
```tsx
// Use cache tags with user ID
revalidateTag(`products-user-${userId}`);
```

---

## Performance Considerations

### Current Implementation Impact

✅ **Minimal**: `router.refresh()` only invalidates router cache, not all data
✅ **Scoped**: `revalidatePath('/admin/products')` only affects product list
✅ **Efficient**: No full page reload, only RSC re-fetch

### Monitoring

Add to your monitoring dashboard:
```tsx
// Track cache invalidation frequency
logger.info('Cache invalidated', {
  route: '/admin/products',
  trigger: 'availability-rule-update',
  timestamp: new Date().toISOString(),
});
```

---

## Additional Resources

- [Next.js 15 Caching Docs](https://nextjs.org/docs/app/building-your-application/caching)
- [revalidatePath() API](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [router.refresh() API](https://nextjs.org/docs/app/api-reference/functions/use-router#routerrefresh)

---

## Quick Reference

| Cache Issue | Solution | Implementation Status |
|------------|----------|---------------------|
| Stale Router Cache | `router.refresh()` | ✅ Implemented |
| Stale Server Data | `revalidatePath()` | ✅ Implemented |
| Stale Full Route | `dynamic = 'force-dynamic'` | ✅ Implemented |
| Browser Cache | Cache-Control headers | ⚠️ Use if needed |

---

**Last Updated**: 2025-01-09
**Version**: 1.0
**Status**: ✅ Primary fix implemented
