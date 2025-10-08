# Fix Square Product Sync Issues

## Context

I have a Next.js application with a Square API product synchronization script at `/api/square/unified-sync`. The sync works but has three issues that need fixing.

## Issues to Fix

### 1. Duplicate EMPANADAS Category

**Problem:** The sync processes an "EMPANADAS" category twice with different Square category IDs (CBCQ... and SDG...), suggesting duplicate categories in Square.

**Required Fix:**

- Investigate the category fetching logic to identify why duplicates exist
- Add deduplication logic to handle categories with the same name
- Implement a warning system that logs when duplicate category names are detected
- Ensure only unique categories are processed (prefer the most recently updated or the one with more items)

### 2. TypeScript Configuration

**Problem:** Next.js warning about missing TypeScript plugin:

```
Your tsconfig.json extends another configuration, which means we cannot add the Next.js TypeScript plugin automatically.
```

**Required Fix:**

- Locate and update `tsconfig.json`
- Add the Next.js TypeScript plugin to the plugins array:

```json
{
  "compilerOptions": {
    // ... existing config
  },
  "plugins": [{ "name": "next" }]
}
```

### 3. Performance Optimization

**Problem:** Sequential API calls take 57 seconds for 16 categories. This could scale poorly with more categories.

**Required Fix:**

- Refactor the category sync loop to use parallel API calls
- Implement `Promise.all()` or `Promise.allSettled()` for concurrent Square API requests
- Maintain the same error handling and logging functionality
- Keep the bulk database operations efficient
- Ensure cache misses/hits are properly tracked for each parallel request
- Add safeguards to prevent API rate limiting (consider batching if needed)

## Technical Constraints

- **Stack:** Next.js, TypeScript, PostgreSQL
- **API:** Square API with caching (600s TTL)
- **Database Operations:** Must use bulk operations (creates/updates)
- **Error Handling:** Must maintain current error logging
- **Cache System:** Must preserve existing cache hit/miss tracking

## Files to Review

1. `/api/square/unified-sync` - Main sync endpoint
2. `tsconfig.json` - TypeScript configuration
3. Any utility files handling Square API calls
4. Database service files for bulk operations
5. Category definition/configuration files

## Expected Outcome

After fixes:

- ✅ No duplicate category processing
- ✅ Clear warnings when duplicate category names detected
- ✅ TypeScript plugin properly configured
- ✅ Sync time reduced from ~57s to ~15-20s (approximate)
- ✅ All 131 items still sync successfully
- ✅ Archive verification still works correctly
- ✅ Maintains cache effectiveness

## Testing Requirements

After implementation, verify:

1. Run sync and confirm only unique categories are processed
2. Check that TypeScript IntelliSense works properly in IDE
3. Measure sync performance improvement
4. Ensure all products sync correctly (count = 131)
5. Verify archive check still identifies orphaned products
6. Confirm cache system still functions (check for cache hits during archive verification)

## Additional Context

The sync follows this flow:

1. Clear cache
2. Iterate categories → fetch from Square → cache → process → bulk DB update
3. Archive verification using active Square product IDs
4. Final report

Maintain this flow but optimize step 2 for parallel execution and add deduplication before processing.

---

**Start by analyzing the current implementation, then propose a refactoring plan before making changes.**
